import { storage } from "./storage";
import { aiAgent } from "./ai";
import type { Customer, Message } from "@shared/schema";

export interface WhatsAppMessage {
  from: string;
  text: string;
  timestamp: number;
}

export interface WhatsAppResponse {
  to: string;
  message: string;
}

export class WhatsAppService {
  private accessToken: string | null = null;
  private phoneNumberId: string | null = null;
  private webhookVerifyToken: string | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    const settings = await storage.getWhatsAppSettings();
    this.accessToken = settings.accessToken;
    this.phoneNumberId = settings.phoneNumberId;
    this.webhookVerifyToken = settings.webhookVerifyToken;
  }

  async isConfigured(): Promise<boolean> {
    const settings = await storage.getWhatsAppSettings();
    return settings.isConfigured && 
           !!settings.accessToken && 
           !!settings.phoneNumberId;
  }

  async verifyWebhook(mode: string, token: string, challenge: string): Promise<string | null> {
    await this.initialize();
    
    if (mode === "subscribe" && token === this.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }

  async handleIncomingMessage(webhookData: any): Promise<void> {
    try {
      console.log("Received webhook data:", JSON.stringify(webhookData, null, 2));
      
      // Parse WhatsApp webhook data
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      
      console.log("Parsed value:", JSON.stringify(value, null, 2));
      
      if (!value?.messages) {
        console.log("No messages found in webhook data");
        return;
      }

      for (const message of value.messages) {
        console.log("Processing message:", JSON.stringify(message, null, 2));
        if (message.type === "text") {
          await this.processTextMessage({
            from: message.from,
            text: message.text.body,
            timestamp: parseInt(message.timestamp) * 1000,
          });
        }
      }
    } catch (error) {
      console.error("Error handling WhatsApp message:", error);
    }
  }

  private async processTextMessage(message: WhatsAppMessage): Promise<void> {
    try {
      console.log("Processing text message from:", message.from, "Content:", message.text);
      
      // Find or create customer
      let customer = await storage.getCustomerByPhoneNumber(message.from);
      if (!customer) {
        console.log("Creating new customer for phone:", message.from);
        customer = await storage.createCustomer({
          phoneNumber: message.from,
          name: null,
          email: null,
        });
      }

      // Find or create conversation
      let conversation = await storage.getConversationByCustomer(customer.id);
      if (!conversation) {
        conversation = await storage.createConversation({
          customerId: customer.id,
          isActive: true,
        });
      } else if (!conversation.isActive) {
        // Reactivate conversation
        await storage.updateConversation(conversation.id, { isActive: true });
      }

      // Save customer message
      await storage.createMessage({
        conversationId: conversation.id,
        content: message.text,
        isFromAI: false,
      });

      // Get conversation history for context
      const messages = await storage.getMessages(conversation.id);
      const conversationHistory = messages.map(msg => ({
        content: msg.content,
        isFromAI: msg.isFromAI,
      }));

      // Process with AI
      const aiResponse = await aiAgent.processMessage(
        message.text,
        customer,
        conversationHistory
      );

      // Handle order intent
      if (aiResponse.orderIntent) {
        await this.handleOrderIntent(customer, aiResponse.orderIntent);
      }

      // Send AI response
      await this.sendMessage(customer.phoneNumber, aiResponse.message);

      // Save AI response message
      await storage.createMessage({
        conversationId: conversation.id,
        content: aiResponse.message,
        isFromAI: true,
      });

      // Send suggested products if any
      if (aiResponse.suggestedProducts && aiResponse.suggestedProducts.length > 0) {
        const productMessage = this.formatProductSuggestions(aiResponse.suggestedProducts);
        await this.sendMessage(customer.phoneNumber, productMessage);
        
        await storage.createMessage({
          conversationId: conversation.id,
          content: productMessage,
          isFromAI: true,
        });
      }

    } catch (error) {
      console.error("Error processing WhatsApp message:", error);
      
      // Send error message to customer
      await this.sendMessage(
        message.from,
        "I apologize, but I'm experiencing technical difficulties. Please try again in a moment."
      );
    }
  }

  private async handleOrderIntent(customer: Customer, orderIntent: any): Promise<void> {
    try {
      if (orderIntent.customerInfo) {
        // Update customer information
        await storage.updateCustomer(customer.id, orderIntent.customerInfo);
      }

      if (orderIntent.products && orderIntent.products.length > 0) {
        // Calculate total
        let total = 0;
        const orderItems = [];

        for (const item of orderIntent.products) {
          const product = await storage.getProduct(item.productId);
          if (product) {
            const itemTotal = parseFloat(product.price) * item.quantity;
            total += itemTotal;
            orderItems.push({
              productId: item.productId,
              quantity: item.quantity,
              price: product.price,
            });
          }
        }

        // Create order
        if (orderItems.length > 0) {
          const order = await storage.createOrder({
            customerId: customer.id,
            status: "pending",
            items: orderItems,
            total: total.toFixed(2),
            notes: "Order placed via WhatsApp AI assistant",
          });

          // Send order confirmation
          const confirmationMessage = `🎉 *Order Confirmed!*\n\nOrder #${order.id}\nTotal: $${total.toFixed(2)}\n\nThank you! We'll process your order and contact you for delivery details.`;
          await this.sendMessage(customer.phoneNumber, confirmationMessage);
        }
      }
    } catch (error) {
      console.error("Error handling order intent:", error);
    }
  }

  private formatProductSuggestions(products: any[]): string {
    let message = "Here are some products you might like:\n\n";
    
    products.forEach((product, index) => {
      message += `${index + 1}. *${product.name}* - $${product.price}\n`;
      message += `   ${product.description}\n\n`;
    });

    message += "Would you like to know more about any of these products or place an order?";
    return message;
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    if (!await this.isConfigured()) {
      console.log("WhatsApp not configured. Message would be sent:", { to, message });
      return false;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: to,
            type: "text",
            text: { body: message },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      return false;
    }
  }

  async sendWelcomeMessage(phoneNumber: string): Promise<void> {
    const customer = await storage.getCustomerByPhoneNumber(phoneNumber);
    if (customer) {
      const welcomeMessage = await aiAgent.generateWelcomeMessage(customer);
      await this.sendMessage(phoneNumber, welcomeMessage);
    }
  }

  async updateConfiguration(config: {
    phoneNumberId?: string;
    accessToken?: string;
    webhookVerifyToken?: string;
  }): Promise<void> {
    const isConfigured = !!(config.phoneNumberId && config.accessToken && config.webhookVerifyToken);
    
    await storage.updateWhatsAppSettings({
      ...config,
      isConfigured,
    });

    // Re-initialize with new settings
    await this.initialize();
  }
}

export const whatsappService = new WhatsAppService();
