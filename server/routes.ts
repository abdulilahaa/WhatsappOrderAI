import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { whatsappService } from "./whatsapp";
import { aiAgent } from "./ai";
import { insertProductSchema, insertAISettingsSchema, insertWhatsAppSettingsSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Dashboard Stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching dashboard stats: " + error.message });
    }
  });

  // Products API
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching products: " + error.message });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching product: " + error.message });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      
      // Reload AI agent with updated product catalog
      await aiAgent.reloadConfiguration();
      
      res.status(201).json(product);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating product: " + error.message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(id, validatedData);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Reload AI agent with updated product catalog
      await aiAgent.reloadConfiguration();
      
      res.json(product);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating product: " + error.message });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(id, validatedData);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating product: " + error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProduct(id);
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Reload AI agent with updated product catalog
      await aiAgent.reloadConfiguration();
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: "Error deleting product: " + error.message });
    }
  });

  // Orders API
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching orders: " + error.message });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching order: " + error.message });
    }
  });

  app.put("/api/orders/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!["pending", "confirmed", "processing", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const order = await storage.updateOrder(id, { status });
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: "Error updating order status: " + error.message });
    }
  });

  // Bulk order operations
  app.put("/api/orders/bulk/status", async (req, res) => {
    try {
      const { orderIds, status } = req.body;
      
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ message: "orderIds must be a non-empty array" });
      }
      
      if (!["pending", "confirmed", "processing", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updatedOrders = [];
      for (const id of orderIds) {
        const order = await storage.updateOrder(parseInt(id), { status });
        if (order) {
          updatedOrders.push(order);
        }
      }

      res.json({ updatedOrders, count: updatedOrders.length });
    } catch (error: any) {
      res.status(500).json({ message: "Error updating orders: " + error.message });
    }
  });

  // Order analytics
  app.get("/api/orders/analytics", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      
      const analytics = {
        totalOrders: orders.length,
        statusBreakdown: {
          pending: orders.filter(o => o.status === "pending").length,
          confirmed: orders.filter(o => o.status === "confirmed").length,
          processing: orders.filter(o => o.status === "processing").length,
          completed: orders.filter(o => o.status === "completed").length,
          cancelled: orders.filter(o => o.status === "cancelled").length,
        },
        totalRevenue: orders
          .filter(o => o.status === "completed")
          .reduce((sum, order) => sum + parseFloat(order.total), 0),
        averageOrderValue: orders.length > 0 
          ? orders.reduce((sum, order) => sum + parseFloat(order.total), 0) / orders.length 
          : 0,
        ordersToday: orders.filter(o => {
          const today = new Date();
          const orderDate = new Date(o.createdAt);
          return orderDate.toDateString() === today.toDateString();
        }).length,
      };

      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching order analytics: " + error.message });
    }
  });

  // Conversations API
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching conversations: " + error.message });
    }
  });

  app.get("/api/conversations/active", async (req, res) => {
    try {
      const conversations = await storage.getActiveConversations();
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching active conversations: " + error.message });
    }
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const messages = await storage.getMessages(id);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching messages: " + error.message });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      const success = await storage.deleteConversation(conversationId);
      if (!success) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      res.json({ message: "Conversation deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Error deleting conversation: " + error.message });
    }
  });

  // AI Settings API
  app.get("/api/ai-settings", async (req, res) => {
    try {
      const settings = await storage.getAISettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching AI settings: " + error.message });
    }
  });

  app.put("/api/ai-settings", async (req, res) => {
    try {
      const validatedData = insertAISettingsSchema.partial().parse(req.body);
      const settings = await storage.updateAISettings(validatedData);
      
      // Reload AI agent configuration with new settings
      await aiAgent.reloadConfiguration();
      
      res.json(settings);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating AI settings: " + error.message });
    }
  });

  // WhatsApp Settings API
  app.get("/api/whatsapp-settings", async (req, res) => {
    try {
      const settings = await storage.getWhatsAppSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching WhatsApp settings: " + error.message });
    }
  });

  app.put("/api/whatsapp-settings", async (req, res) => {
    try {
      const validatedData = insertWhatsAppSettingsSchema.partial().parse(req.body);
      await whatsappService.updateConfiguration({
        phoneNumberId: validatedData.phoneNumberId || undefined,
        accessToken: validatedData.accessToken || undefined,
        webhookVerifyToken: validatedData.webhookVerifyToken || undefined,
      });
      const settings = await storage.updateWhatsAppSettings(validatedData);
      res.json(settings);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating WhatsApp settings: " + error.message });
    }
  });

  // WhatsApp Webhook
  app.get("/api/whatsapp/webhook", async (req, res) => {
    try {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      const result = await whatsappService.verifyWebhook(
        mode as string,
        token as string,
        challenge as string
      );

      if (result) {
        res.status(200).send(result);
      } else {
        res.status(403).send("Forbidden");
      }
    } catch (error: any) {
      res.status(500).json({ message: "Webhook verification error: " + error.message });
    }
  });

  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      await whatsappService.handleIncomingMessage(req.body);
      res.status(200).send("OK");
    } catch (error: any) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ message: "Webhook processing error: " + error.message });
    }
  });

  // Test WhatsApp Message (for development)
  app.post("/api/whatsapp/test-message", async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({ message: "Phone number and message are required" });
      }

      const success = await whatsappService.sendMessage(phoneNumber, message);
      res.json({ success, message: success ? "Message sent" : "Message failed to send" });
    } catch (error: any) {
      res.status(500).json({ message: "Error sending test message: " + error.message });
    }
  });

  // AI Agent Testing
  app.post("/api/ai/test", async (req, res) => {
    try {
      const { message, customer, conversationHistory = [] } = req.body;
      
      if (!message || !customer) {
        return res.status(400).json({ message: "Message and customer are required" });
      }

      // Find or create the test customer in the database
      let dbCustomer = await storage.getCustomerByPhoneNumber(customer.phoneNumber);
      if (!dbCustomer) {
        dbCustomer = await storage.createCustomer({
          phoneNumber: customer.phoneNumber,
          name: customer.name || null,
          email: customer.email || null,
        });
      } else if (customer.name && !dbCustomer.name) {
        // Update customer name if we have it and it's not in the database
        dbCustomer = await storage.updateCustomer(dbCustomer.id, {
          name: customer.name,
          email: customer.email || dbCustomer.email,
        }) || dbCustomer;
      }

      // Find or create conversation for this customer
      let conversation = await storage.getConversationByCustomer(dbCustomer.id);
      if (!conversation) {
        conversation = await storage.createConversation({
          customerId: dbCustomer.id,
          isActive: true,
        });
      } else {
        // Update conversation status
        await storage.updateConversation(conversation.id, {
          isActive: true,
        });
      }

      // Save the user's message
      await storage.createMessage({
        conversationId: conversation.id,
        content: message,
        isFromAI: false,
      });

      // Process the message with AI
      const response = await aiAgent.processMessage(message, dbCustomer, conversationHistory);

      // Save the AI's response
      await storage.createMessage({
        conversationId: conversation.id,
        content: response.message,
        isFromAI: true,
      });

      // Handle appointment booking if the AI indicates appointment intent
      if (response.appointmentIntent && response.appointmentIntent.serviceId) {
        const appointmentData = response.appointmentIntent;
        
        // Update customer info if provided in appointment intent
        if (appointmentData.customerInfo) {
          const updatedInfo: any = {};
          if (appointmentData.customerInfo.name) updatedInfo.name = appointmentData.customerInfo.name;
          if (appointmentData.customerInfo.email) updatedInfo.email = appointmentData.customerInfo.email;
          
          if (Object.keys(updatedInfo).length > 0) {
            dbCustomer = await storage.updateCustomer(dbCustomer.id, updatedInfo) || dbCustomer;
          }
        }

        // Create the appointment if we have all required info
        if (appointmentData.serviceId && appointmentData.preferredDate && appointmentData.preferredTime) {
          try {
            const appointment = await storage.createAppointment({
              customerId: dbCustomer.id,
              serviceId: appointmentData.serviceId,
              appointmentDate: appointmentData.preferredDate,
              appointmentTime: appointmentData.preferredTime,
              duration: appointmentData.duration || 60,
              status: "pending",
              paymentMethod: "cash", // Default payment method
              paymentStatus: "cash_pending",
              notes: `Appointment booked via AI assistant for ${dbCustomer.name || 'customer'}`,
              totalPrice: null, // Will be set based on service price
            });

            // Add appointment confirmation to the response
            response.appointmentCreated = {
              id: appointment.id,
              date: appointmentData.preferredDate,
              time: appointmentData.preferredTime,
              serviceId: appointmentData.serviceId,
            };
          } catch (appointmentError) {
            console.error("Error creating appointment:", appointmentError);
            // Don't fail the whole request if appointment creation fails
          }
        }
      }

      res.json(response);
    } catch (error: any) {
      console.error("AI test processing error:", error);
      res.status(500).json({ message: "AI processing error: " + error.message });
    }
  });

  // Mock Payment Intent (for MVP)
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount } = req.body;
      
      // Mock Stripe payment intent for MVP
      const mockClientSecret = `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`;
      
      res.json({ 
        clientSecret: mockClientSecret,
        amount: Math.round(amount * 100), // Convert to cents
        status: "requires_payment_method"
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Customers API
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching customers: " + error.message });
    }
  });

  // Stripe Payment Integration
  app.post("/api/create-payment-intent", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe not configured. Please add STRIPE_SECRET_KEY environment variable." });
    }

    try {
      const { amount, currency = "usd", metadata = {} } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valid amount is required" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id 
      });
    } catch (error: any) {
      console.error("Stripe payment intent error:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Webhook for Stripe payment confirmations
  app.post("/webhook/stripe", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe not configured" });
    }

    try {
      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.warn("Stripe webhook secret not configured");
        return res.status(200).send("OK");
      }

      const event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Update order status to paid
        if (paymentIntent.metadata.orderId) {
          const orderId = parseInt(paymentIntent.metadata.orderId);
          await storage.updateOrder(orderId, { 
            status: "paid",
            notes: `Payment completed via Stripe. Payment Intent: ${paymentIntent.id}`
          });
        }
      }

      res.status(200).send("OK");
    } catch (error: any) {
      console.error("Stripe webhook error:", error);
      res.status(400).send("Webhook signature verification failed");
    }
  });

  // Appointment booking endpoint
  app.post("/api/appointments", async (req, res) => {
    try {
      const appointmentData = req.body;
      
      if (!appointmentData.customerInfo || !appointmentData.customerInfo.name || !appointmentData.customerInfo.email) {
        return res.status(400).json({ message: "Customer name and email are required" });
      }

      if (!appointmentData.serviceId || !appointmentData.appointmentDate || !appointmentData.appointmentTime) {
        return res.status(400).json({ message: "Service, date, and time are required" });
      }

      // Create or find customer by email
      let customer = await storage.getCustomerByEmail(appointmentData.customerInfo.email);
      if (!customer) {
        customer = await storage.createCustomer({
          phoneNumber: appointmentData.customerInfo.phoneNumber || appointmentData.phoneNumber || '',
          name: appointmentData.customerInfo.name,
          email: appointmentData.customerInfo.email
        });
      }

      const service = await storage.getProduct(appointmentData.serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      const appointment = await storage.createAppointment({
        customerId: customer.id,
        serviceId: appointmentData.serviceId,
        appointmentDate: appointmentData.appointmentDate,
        appointmentTime: appointmentData.appointmentTime,
        duration: appointmentData.duration || 60,
        status: appointmentData.paymentMethod === 'cash' ? 'confirmed' : 'pending',
        paymentMethod: appointmentData.paymentMethod || 'pending',
        paymentStatus: appointmentData.paymentMethod === 'cash' ? 'cash_pending' : 'pending',
        totalPrice: service.price,
        notes: appointmentData.notes || null
      });

      // If card payment, create payment intent
      let paymentLink = null;
      if (appointmentData.paymentMethod === 'card' && stripe) {
        try {
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(parseFloat(service.price) * 100),
            currency: "kwd",
            metadata: {
              appointmentId: appointment.id.toString(),
              customerEmail: customer.email || '',
              serviceName: service.name
            },
            automatic_payment_methods: {
              enabled: true,
            },
          });
          
          paymentLink = `${req.protocol}://${req.get('host')}/checkout?payment_intent=${paymentIntent.client_secret}`;
        } catch (stripeError) {
          console.warn("Stripe payment creation failed:", stripeError);
        }
      }

      res.status(201).json({
        ...appointment,
        customer: {
          name: customer.name,
          email: customer.email,
          phoneNumber: customer.phoneNumber
        },
        service: {
          name: service.name,
          price: service.price
        },
        paymentLink
      });
    } catch (error: any) {
      console.error("Appointment creation error:", error);
      res.status(500).json({ message: "Failed to create appointment: " + error.message });
    }
  });

  app.get("/api/appointments", async (req, res) => {
    try {
      const appointments = await storage.getAppointments();
      res.json(appointments);
    } catch (error: any) {
      console.error("Get appointments error:", error);
      res.status(500).json({ message: "Failed to fetch appointments: " + error.message });
    }
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const updates = req.body;
      
      const appointment = await storage.updateAppointment(appointmentId, updates);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      res.json(appointment);
    } catch (error: any) {
      console.error("Update appointment error:", error);
      res.status(500).json({ message: "Failed to update appointment: " + error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
