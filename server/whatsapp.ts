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

      // Handle appointment intent
      if (aiResponse.appointmentIntent) {
        await this.handleAppointmentIntent(customer, aiResponse.appointmentIntent);
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
          const confirmationMessage = `🎉 *Order Confirmed!*\n\nOrder #${order.id}\nTotal: ${total.toFixed(2)} KWD\n\nThank you! We'll process your order and contact you for delivery details.`;
          await this.sendMessage(customer.phoneNumber, confirmationMessage);
        }
      }
    } catch (error) {
      console.error("Error handling order intent:", error);
    }
  }

  async handleAppointmentIntent(customer: Customer, appointmentIntent: any): Promise<void> {
    try {
      console.log("Processing appointment intent:", JSON.stringify(appointmentIntent, null, 2));
      
      if (appointmentIntent.customerInfo) {
        // Update customer information
        await storage.updateCustomer(customer.id, appointmentIntent.customerInfo);
      }

      // Handle both old single service format and new multiple services format
      let services = appointmentIntent.services || 
                    (appointmentIntent.serviceId ? [{ serviceId: appointmentIntent.serviceId, quantity: 1 }] : []);
      
      // If no services in appointment intent but customer is confirming, extract from conversation history
      if (services.length === 0 && appointmentIntent.confirmed === true) {
        console.log("No services in intent but customer confirming - extracting from conversation history");
        
        // Get conversation to extract services from history
        const conversation = await storage.getConversationByCustomer(customer.id);
        if (conversation) {
          const conversationHistory = await storage.getMessages(conversation.id);
          const extractedServices = await this.extractServicesFromConversation(conversationHistory);
          if (extractedServices.length > 0) {
            services = extractedServices;
            console.log("Extracted services from conversation:", services);
          }
        }
      }
      
      // Only create appointment if customer has explicitly confirmed after seeing complete order summary
      if (services.length > 0 &&
          appointmentIntent.preferredDate && 
          appointmentIntent.preferredTime && 
          appointmentIntent.locationId &&
          appointmentIntent.locationName &&
          appointmentIntent.customerInfo?.name && 
          appointmentIntent.customerInfo?.email &&
          appointmentIntent.paymentMethod &&
          appointmentIntent.confirmed === true) {
        
        // Calculate total price and prepare service details
        let totalPrice = 0;
        const serviceDetails = [];
        let totalDuration = 0;
        
        for (const service of services) {
          const serviceInfo = await storage.getProduct(service.serviceId);
          if (serviceInfo) {
            const servicePrice = parseFloat(serviceInfo.price) * (service.quantity || 1);
            totalPrice += servicePrice;
            totalDuration += (appointmentIntent.duration || 60) * (service.quantity || 1);
            serviceDetails.push({
              name: serviceInfo.name,
              price: servicePrice,
              quantity: service.quantity || 1
            });
          }
        }

        // Create appointment for the first service (main appointment)
        const mainService = services[0];
        const appointment = await storage.createAppointment({
          customerId: customer.id,
          serviceId: mainService.serviceId,
          appointmentDate: appointmentIntent.preferredDate,
          appointmentTime: appointmentIntent.preferredTime,
          duration: totalDuration,
          locationId: appointmentIntent.locationId,
          locationName: appointmentIntent.locationName,
          status: "confirmed",
          paymentMethod: appointmentIntent.paymentMethod,
          paymentStatus: appointmentIntent.paymentMethod === "cash" ? "pending" : "pending",
          totalPrice: totalPrice.toFixed(2),
          notes: `Multiple services booked via WhatsApp AI assistant. Services: ${serviceDetails.map(s => `${s.name} (${s.quantity}x)`).join(', ')}. Customer: ${appointmentIntent.customerInfo.name}, Email: ${appointmentIntent.customerInfo.email}`,
        });

        console.log("Appointment created:", appointment);

        // Send comprehensive confirmation message
        const servicesText = serviceDetails.map(s => 
          s.quantity > 1 ? `${s.name} (${s.quantity}x) - ${s.price.toFixed(2)} KWD` : `${s.name} - ${s.price.toFixed(2)} KWD`
        ).join('\n');

        const confirmationMessage = `✅ *Appointment Confirmed!*\n\n` +
          `📋 *Booking Details:*\n` +
          `${servicesText}\n` +
          `Date: ${appointmentIntent.preferredDate}\n` +
          `Time: ${appointmentIntent.preferredTime} (Kuwait Time)\n` +
          `Duration: ${totalDuration} minutes\n` +
          `Total: ${totalPrice.toFixed(2)} KWD\n\n` +
          `👤 *Customer:*\n` +
          `Name: ${appointmentIntent.customerInfo.name}\n` +
          `Email: ${appointmentIntent.customerInfo.email}\n\n` +
          `📍 *Location:* ${appointmentIntent.locationName}\n` +
          `💳 *Payment:* ${appointmentIntent.paymentMethod === 'cash' ? 'Cash at appointment' : 'Card payment'}\n\n` +
          `📞 *Contact:* For any changes, reply to this chat.\n\n` +
          `Thank you for choosing NailIt! We look forward to seeing you.`;

        await this.sendMessage(customer.phoneNumber, confirmationMessage);
        
        // Save confirmation message
        const conversation = await storage.getConversationByCustomer(customer.id);
        if (conversation) {
          await storage.createMessage({
            conversationId: conversation.id,
            content: confirmationMessage,
            isFromAI: true,
          });
        }
      }
    } catch (error) {
      console.error("Error handling appointment intent:", error);
    }
  }

  private formatProductSuggestions(products: any[]): string {
    let message = "Here are some products you might like:\n\n";
    
    products.forEach((product, index) => {
      message += `${index + 1}. *${product.name}* - ${product.price} KWD\n`;
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

  private async extractServicesFromConversation(messages: any[]): Promise<Array<{ serviceId: number; quantity: number }>> {
    const services: Array<{ serviceId: number; quantity: number }> = [];
    
    // Look through conversation messages for service selections
    for (const message of messages) {
      const content = message.content.toLowerCase();
      
      // Customer said they want classic & deluxe
      if (content.includes('classic') && content.includes('deluxe')) {
        services.push({ serviceId: 4, quantity: 1 }); // Classic Pedicure
        services.push({ serviceId: 5, quantity: 1 }); // Deluxe Pedicure
        break; // Found the service selection
      }
      // Individual service selections
      else if (content.includes('classic manicure')) {
        services.push({ serviceId: 1, quantity: 1 });
        break;
      }
      else if (content.includes('classic pedicure')) {
        services.push({ serviceId: 4, quantity: 1 });
        break;
      }
      else if (content.includes('deluxe pedicure')) {
        services.push({ serviceId: 5, quantity: 1 });
        break;
      }
      else if (content.includes('gel manicure')) {
        services.push({ serviceId: 2, quantity: 1 });
        break;
      }
      else if (content.includes('french manicure')) {
        services.push({ serviceId: 3, quantity: 1 });
        break;
      }
      // AI confirmed specific services - extract from AI responses
      else if (message.isFromAI && content.includes('classic pedicure and deluxe pedicure')) {
        services.push({ serviceId: 4, quantity: 1 }); // Classic Pedicure
        services.push({ serviceId: 5, quantity: 1 }); // Deluxe Pedicure
        break;
      }
    }
    
    return services;
  }
}

export const whatsappService = new WhatsAppService();
