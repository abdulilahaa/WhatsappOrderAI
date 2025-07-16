import { storage } from "./storage";
import { freshAI } from "./ai-fresh";
import type { Customer, Message } from "@shared/schema";
import { nailItAPI } from "./nailit-api";

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

      // Process with Fresh AI Agent
      const aiResponse = await freshAI.processMessage(
        message.text,
        customer,
        conversationHistory
      );

      // Handle Fresh AI completion (if order is ready for booking)
      if (aiResponse.collectedData?.readyForBooking) {
        await this.handleFreshAIBooking(customer, aiResponse.collectedData);
      }

      // Send AI response
      await this.sendMessage(customer.phoneNumber, aiResponse.message);

      // Save AI response message
      await storage.createMessage({
        conversationId: conversation.id,
        content: aiResponse.message,
        isFromAI: true,
      });

      // Send suggested services if any (only for Fresh AI format)
      if (aiResponse.suggestedServices && aiResponse.suggestedServices.length > 0) {
        const serviceMessage = this.formatNailItServiceSuggestions(aiResponse.suggestedServices);
        if (serviceMessage) {
          await this.sendMessage(customer.phoneNumber, serviceMessage);
          
          await storage.createMessage({
            conversationId: conversation.id,
            content: serviceMessage,
            isFromAI: true,
          });
        }
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
        
        console.log("Creating appointment through NailIt API...");
        
        // Get NailIt service IDs from our product descriptions
        const nailItServices = [];
        let totalPrice = 0;
        const serviceDetails = [];
        let totalDuration = 0;
        
        for (const service of services) {
          const serviceInfo = await storage.getProduct(service.serviceId);
          if (serviceInfo) {
            // Extract NailIt ID from product description
            const nailItIdMatch = serviceInfo.description?.match(/\[NailIt ID: (\d+)\]/);
            const durationMatch = serviceInfo.description?.match(/\[Duration: (\d+)min\]/);
            
            if (nailItIdMatch) {
              const nailItServiceId = parseInt(nailItIdMatch[1]);
              const duration = durationMatch ? parseInt(durationMatch[1]) : 60;
              
              nailItServices.push({
                serviceId: nailItServiceId,
                serviceName: serviceInfo.name,
                quantity: service.quantity || 1,
                price: parseFloat(serviceInfo.price),
                duration: duration
              });
              
              const servicePrice = parseFloat(serviceInfo.price) * (service.quantity || 1);
              totalPrice += servicePrice;
              totalDuration += duration * (service.quantity || 1);
              serviceDetails.push({
                name: serviceInfo.name,
                price: servicePrice,
                quantity: service.quantity || 1
              });
            }
          }
        }
        
        if (nailItServices.length === 0) {
          console.error("No NailIt services found for booking");
          await this.sendMessage(customer.phoneNumber, "Sorry, there was an issue processing your booking. Please try again or contact us directly.");
          return;
        }

        // Get service availability and book through NailIt API
        try {
          const appointmentDate = nailItAPI.formatDateForAPI(new Date(appointmentIntent.preferredDate));
          
          // Get availability for the first service (main service)
          const availability = await aiAgent.getNailItServiceAvailability(
            nailItServices[0].serviceId,
            appointmentIntent.locationId,
            appointmentDate
          );
          
          if (availability.staff.length === 0 || availability.timeSlots.length === 0) {
            await this.sendMessage(customer.phoneNumber, "Sorry, no availability found for your requested date and time. Please choose a different time or date.");
            return;
          }
          
          // Find the requested time slot
          const requestedTime = appointmentIntent.preferredTime;
          const timeSlot = availability.timeSlots.find(slot => 
            slot.time.includes(requestedTime.replace(':', ':')) || 
            slot.time === requestedTime
          );
          
          if (!timeSlot) {
            const availableTimes = availability.timeSlots.map(slot => slot.time).join(', ');
            await this.sendMessage(customer.phoneNumber, `Sorry, ${requestedTime} is not available. Available times: ${availableTimes}`);
            return;
          }

          // Get payment types and select default (cash on arrival)
          const paymentTypes = await aiAgent.getNailItPaymentTypes();
          const cashPayment = paymentTypes.find(pt => pt.code === 'COD') || paymentTypes[0];
          
          if (!cashPayment) {
            console.error("No payment types available");
            await this.sendMessage(customer.phoneNumber, "Sorry, there was an issue with payment processing. Please try again.");
            return;
          }

          // Create order through NailIt API
          const orderData = {
            customerId: customer.id,
            customerName: appointmentIntent.customerInfo.name,
            customerEmail: appointmentIntent.customerInfo.email,
            customerPhone: customer.phoneNumber,
            services: nailItServices.map(service => ({
              serviceId: service.serviceId,
              serviceName: service.serviceName,
              quantity: service.quantity,
              price: service.price,
              staffId: availability.staff[0].id, // Use first available staff
              timeSlotIds: [timeSlot.id],
              appointmentDate: appointmentDate
            })),
            locationId: appointmentIntent.locationId,
            paymentTypeId: cashPayment.id
          };

          const orderResult = await aiAgent.createNailItOrder(orderData);
          
          if (orderResult.success) {
            console.log(`NailIt order created successfully: ${orderResult.orderId}`);
            
            // Also create local appointment for dashboard tracking
            const localAppointment = await storage.createAppointment({
              customerId: customer.id,
              serviceId: services[0].serviceId,
              appointmentDate: appointmentIntent.preferredDate,
              appointmentTime: appointmentIntent.preferredTime,
              duration: totalDuration,
              locationId: appointmentIntent.locationId,
              locationName: appointmentIntent.locationName,
              status: "confirmed",
              paymentMethod: appointmentIntent.paymentMethod,
              paymentStatus: "pending",
              totalPrice: totalPrice.toFixed(2),
              notes: `NailIt Order ID: ${orderResult.orderId}. Services: ${serviceDetails.map(s => `${s.name} (${s.quantity}x)`).join(', ')}. Staff: ${availability.staff[0].name}`,
            });

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
              `👩‍💼 *Staff:* ${availability.staff[0].name}\n` +
              `💳 *Payment:* Cash at appointment\n` +
              `🎫 *NailIt Order #${orderResult.orderId}*\n\n` +
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
            
          } else {
            console.error("Failed to create NailIt order:", orderResult.error);
            await this.sendMessage(customer.phoneNumber, "Sorry, there was an issue confirming your appointment. Please try again or contact us directly.");
          }
          
        } catch (nailItError) {
          console.error("NailIt API error:", nailItError);
          await this.sendMessage(customer.phoneNumber, "Sorry, there was an issue connecting to our booking system. Please try again or contact us directly.");
        }
      }
    } catch (error) {
      console.error("Error handling appointment intent:", error);
      await this.sendMessage(customer.phoneNumber, "Sorry, there was an unexpected error. Please try again or contact us directly.");
    }
  }

  private async handleFreshAIBooking(customer: Customer, collectedData: any): Promise<void> {
    try {
      console.log("Processing Fresh AI booking:", JSON.stringify(collectedData, null, 2));
      
      // Get user from NailIt API or create new user
      const userData = {
        Address: "Kuwait City, Kuwait",
        Email_Id: collectedData.customerEmail,
        Name: collectedData.customerName,
        Mobile: customer.phoneNumber,
        Login_Type: 1,
        Image_Name: ""
      };

      const userId = await nailItAPI.getOrCreateUser(userData);
      if (!userId) {
        throw new Error("Failed to create user in NailIt system");
      }

      // Prepare order details
      const orderDetails = collectedData.selectedServices.map(service => ({
        Prod_Id: service.itemId,
        Prod_Name: service.itemName,
        Qty: service.quantity,
        Rate: service.price,
        Amount: service.price * service.quantity,
        Size_Id: null,
        Size_Name: "",
        Promotion_Id: 0,
        Promo_Code: "",
        Discount_Amount: 0,
        Net_Amount: service.price * service.quantity,
        Staff_Id: collectedData.staffId || 0,
        TimeFrame_Ids: collectedData.timeSlotIds || [],
        Appointment_Date: collectedData.appointmentDate || nailItAPI.formatDateForURL(new Date())
      }));

      // Create NailIt order
      const orderData = {
        Gross_Amount: collectedData.totalAmount,
        Payment_Type_Id: collectedData.paymentTypeId,
        Order_Type: 1,
        UserId: userId,
        FirstName: collectedData.customerName,
        Mobile: customer.phoneNumber,
        Email: collectedData.customerEmail,
        Discount_Amount: 0,
        Net_Amount: collectedData.totalAmount,
        POS_Location_Id: collectedData.locationId,
        OrderDetails: orderDetails
      };

      const orderResult = await nailItAPI.saveOrder(orderData);
      
      if (orderResult && orderResult.Status === 1) {
        // Create local order for dashboard tracking
        const localOrder = await storage.createOrder({
          customerId: customer.id,
          status: "confirmed",
          items: collectedData.selectedServices.map(service => ({
            productId: service.itemId,
            quantity: service.quantity,
            price: service.price.toString()
          })),
          total: collectedData.totalAmount.toString(),
          notes: `Fresh AI booking - NailIt Order ID: ${orderResult.OrderId}`
        });

        // Send confirmation message
        const confirmationMessage = `🎉 *Booking Confirmed!*\n\n` +
          `Order ID: ${orderResult.OrderId}\n` +
          `Location: ${collectedData.locationName}\n` +
          `Date: ${collectedData.appointmentDate}\n` +
          `Time: ${collectedData.timeSlotNames?.join(', ')}\n` +
          `Total: ${collectedData.totalAmount} KWD\n\n` +
          `Thank you ${collectedData.customerName}! Your appointment is confirmed. We'll see you soon!`;

        await this.sendMessage(customer.phoneNumber, confirmationMessage);
        
        // Clear conversation state after successful booking
        freshAI.clearConversationState(customer.id.toString());
        
        console.log(`Fresh AI booking successful: NailIt Order ${orderResult.OrderId}, Local Order ${localOrder.id}`);
      } else {
        throw new Error(`NailIt order creation failed: ${orderResult?.Message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error handling Fresh AI booking:", error);
      await this.sendMessage(customer.phoneNumber, "Sorry, there was an issue processing your booking. Please try again or contact us directly.");
    }
  }

  private formatServiceSuggestions(services: any[]): string {
    let message = "Here are some services we offer:\n\n";
    
    services.forEach((service, index) => {
      const price = service.Special_Price || service.Primary_Price;
      message += `${index + 1}. *${service.Item_Name}* - ${price} KWD\n`;
      if (service.Item_Desc) {
        const cleanDesc = service.Item_Desc.replace(/<[^>]*>/g, '').slice(0, 100);
        message += `   ${cleanDesc}...\n`;
      }
      if (service.Duration) {
        message += `   Duration: ${service.Duration} minutes\n`;
      }
      message += "\n";
    });
    
    message += "Which service interests you?";
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

  private formatNailItServiceSuggestions(services: any[]): string {
    if (!services || services.length === 0) return "";
    
    const suggestions = services.slice(0, 3).map((service, index) => {
      const price = service.Special_Price || service.Primary_Price || 0;
      return `${index + 1}. ${service.Item_Name} - ${price} KWD`;
    }).join('\n');
    
    return `Here are some service suggestions:\n\n${suggestions}\n\nWhich service would you like to book?`;
  }

  async sendWelcomeMessage(phoneNumber: string): Promise<void> {
    const customer = await storage.getCustomerByPhoneNumber(phoneNumber);
    if (customer) {
      const welcomeMessage = "Welcome to NailIt! I'm here to help you book your nail care appointment. What service would you like today?";
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
