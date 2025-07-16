import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { whatsappService } from "./whatsapp";
import { freshAI } from "./ai-fresh";
import { webScraper } from "./scraper";
import { processPDFServices } from "./pdf-processor";
import { nailItAPI } from "./nailit-api";
import { insertProductSchema, insertAISettingsSchema, insertWhatsAppSettingsSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import multer from "multer";

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

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

  // Staff availability routes
  app.get("/api/nailit/staff-availability", async (req, res) => {
    const { getStaffAvailability } = await import("./routes/staff-availability");
    await getStaffAvailability(req, res);
  });

  app.get("/api/analytics/services", async (req, res) => {
    const { getServiceAnalytics } = await import("./routes/staff-availability");
    await getServiceAnalytics(req, res);
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
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: "Error deleting product: " + error.message });
    }
  });

  // Web Scraping API
  app.post("/api/products/scrape", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: "URL is required" });
      }

      // Scrape the website
      const result = await webScraper.scrapeProductsFromUrl(url);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: result.error || "Failed to scrape website",
          url: result.url 
        });
      }

      // If products were found, optionally create them automatically
      // or return them for user review
      res.json({
        success: true,
        url: result.url,
        products: result.products,
        message: `Found ${result.products.length} products`
      });
      
    } catch (error: any) {
      res.status(500).json({ message: "Error scraping website: " + error.message });
    }
  });

  app.post("/api/products/import", async (req, res) => {
    try {
      const { products } = req.body;
      
      if (!Array.isArray(products)) {
        return res.status(400).json({ message: "Products array is required" });
      }

      const createdProducts = [];
      const errors = [];

      for (const productData of products) {
        try {
          // Validate product data
          const validatedProduct = insertProductSchema.parse({
            name: productData.name,
            description: productData.description,
            price: productData.price,
            imageUrl: productData.imageUrl || null,
            isActive: true
          });

          const product = await storage.createProduct(validatedProduct);
          createdProducts.push(product);
        } catch (error: any) {
          errors.push({
            product: productData.name || 'Unknown',
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        created: createdProducts.length,
        errors: errors.length,
        products: createdProducts,
        errorDetails: errors
      });
      
    } catch (error: any) {
      res.status(500).json({ message: "Error importing products: " + error.message });
    }
  });

  // PDF Processing API
  app.post("/api/products/upload-pdf", upload.single('pdf'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "PDF file is required" });
      }

      // Process the PDF to extract services
      const result = await processPDFServices(req.file.buffer, req.file.originalname);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: result.error || "Failed to process PDF",
          extractedText: result.extractedText
        });
      }

      res.json({
        success: true,
        filename: req.file.originalname,
        services: result.services,
        extractedText: result.extractedText,
        message: `Found ${result.services.length} services in PDF`
      });
      
    } catch (error: any) {
      res.status(500).json({ message: "Error processing PDF: " + error.message });
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

  // Fresh AI Test Route
  app.post("/api/fresh-ai/test", async (req, res) => {
    const { testFreshAI } = await import("./routes/fresh-ai");
    await testFreshAI(req, res);
  });

  // Fresh AI Conversation Management
  app.post("/api/ai-fresh/clear-conversation/:customerId", async (req, res) => {
    try {
      const { customerId } = req.params;
      freshAI.clearConversationState(customerId);
      res.json({ success: true, message: "Conversation cleared" });
    } catch (error: any) {
      res.status(500).json({ message: "Error clearing conversation: " + error.message });
    }
  });

  // AI Welcome Message Test
  app.post("/api/ai/welcome", async (req, res) => {
    try {
      const { customer } = req.body;
      
      if (!customer) {
        return res.status(400).json({ message: "Customer is required" });
      }

      // Find or create the test customer in the database
      let dbCustomer = await storage.getCustomerByPhoneNumber(customer.phoneNumber);
      if (!dbCustomer) {
        dbCustomer = await storage.createCustomer({
          phoneNumber: customer.phoneNumber,
          name: customer.name || null,
          email: customer.email || null,
        });
      }

      // AI welcome message functionality moved to Fresh AI
      res.json({ message: "Hello! Welcome to our service. How can I help you today?" });
    } catch (error: any) {
      console.error("AI welcome message error:", error);
      res.status(500).json({ message: "Error generating welcome message: " + error.message });
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

      // Old AI agent removed - redirect to Fresh AI
      return res.status(400).json({ message: "Please use the Fresh AI test route at /api/fresh-ai/test instead" });

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

  // NailIt API Integration Routes
  app.post("/api/nailit/sync-services", async (req, res) => {
    try {
      // Service sync functionality moved to Fresh AI system
      const products = await storage.getProducts();
      res.json({ 
        success: true,
        message: "Services available from database",
        count: products.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Error fetching services: " + error.message });
    }
  });

  // Additional sync endpoints for integration dashboard
  app.post("/api/nailit/sync-locations", async (req, res) => {
    try {
      const locations = await nailItAPI.getLocations('E');
      res.json({ 
        success: true, 
        message: "Locations refreshed successfully",
        count: locations.length,
        locations,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/nailit/sync-payment-types", async (req, res) => {
    try {
      const paymentTypes = await nailItAPI.getPaymentTypes('E');
      res.json({ 
        success: true, 
        message: "Payment types refreshed successfully",
        count: paymentTypes.length,
        paymentTypes,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/nailit/test-integration", async (req, res) => {
    try {
      // Test full integration cycle
      const tests = {
        deviceRegistration: false,
        locationsAvailable: false,
        servicesAvailable: false,
        staffRetrievable: false,
        orderCreatable: false,
        paymentTypesAvailable: false
      };

      // Test device registration
      tests.deviceRegistration = await nailItAPI.registerDevice();

      // Test locations
      const locations = await nailItAPI.getLocations('E');
      tests.locationsAvailable = locations.length > 0;

      // Test services
      const services = await storage.getProducts();
      tests.servicesAvailable = services.length > 0;

      // Test staff retrieval
      if (services.length > 0 && locations.length > 0) {
        try {
          const testService = services[0];
          const testLocation = locations[0];
          const staff = await nailItAPI.getServiceStaff(
            testService.id,
            testLocation.Location_Id,
            'E',
            nailItAPI.formatDateForURL(new Date())
          );
          tests.staffRetrievable = true; // API call succeeded
        } catch (error) {
          console.error('Staff retrieval test failed:', error);
          tests.staffRetrievable = false;
        }
      }

      // Test payment types
      const paymentTypes = await nailItAPI.getPaymentTypes('E');
      tests.paymentTypesAvailable = paymentTypes.length > 0;

      // Check if order can be created (all prerequisites met)
      tests.orderCreatable = tests.deviceRegistration && 
                            tests.locationsAvailable && 
                            tests.servicesAvailable && 
                            tests.paymentTypesAvailable;

      const passedTests = Object.values(tests).filter(t => t).length;
      const totalTests = Object.keys(tests).length;

      res.json({
        success: true,
        integrationHealth: {
          score: Math.round((passedTests / totalTests) * 100),
          status: passedTests === totalTests ? 'fully_integrated' : passedTests >= 4 ? 'partially_integrated' : 'integration_issues',
          tests,
          summary: `${passedTests}/${totalTests} integration tests passed`
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/ai/sync-services", async (req, res) => {
    try {
      // Service sync functionality moved to Fresh AI system
      const products = await storage.getProducts();
      res.json({ 
        success: true, 
        message: "Services available from database", 
        count: products.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching services: " + error.message });
    }
  });

  app.get("/api/nailit/locations", async (req, res) => {
    try {
      const locations = await nailItAPI.getLocations('E');
      res.json(locations);
    } catch (error: any) {
      console.error("Error fetching NailIt locations:", error);
      res.status(500).json({ message: "Error fetching locations: " + error.message });
    }
  });

  // Get products/services by location from NailIt API (fast version)
  app.get("/api/nailit/products-by-location/:locationId", async (req, res) => {
    try {
      const { locationId } = req.params;
      const { itemType = "2" } = req.query; // Default to services (2)
      
      console.log(`🏢 Quick fetch for location ${locationId}`);
      
      // First try to get data from already synced products in database
      const dbProducts = await storage.getProducts();
      const locationProducts = dbProducts.filter(product => 
        product.description && product.description.includes(`Location ${locationId}`)
      );
      
      if (locationProducts.length > 0) {
        console.log(`📦 Found ${locationProducts.length} synced products for location ${locationId}`);
        return res.json({
          success: true,
          locationId: Number(locationId),
          products: locationProducts,
          totalFound: locationProducts.length,
          message: `Showing ${locationProducts.length} synced services for location ${locationId}`
        });
      }
      
      // If no synced data, fetch ALL pages from API
      try {
        const currentDate = nailItAPI.formatDateForAPI(new Date());
        console.log(`🔄 Fetching ALL services for location ${locationId}...`);
        
        // Get first page to determine total items and pages needed
        const firstPage = await nailItAPI.getItemsByDate({
          itemTypeId: 2,
          groupId: 0, 
          selectedDate: currentDate,
          pageNo: 1,
          locationIds: [Number(locationId)]
        });
        
        console.log(`📊 Location ${locationId}: ${firstPage.totalItems} total items available`);
        
        const totalItems = firstPage.totalItems;
        const itemsPerPage = firstPage.items.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        let allItems = [...firstPage.items];
        
        // Fetch remaining pages if there are more than 1 page
        if (totalPages > 1) {
          console.log(`📄 Fetching ${totalPages - 1} additional pages for location ${locationId}...`);
          
          const pagePromises = [];
          for (let page = 2; page <= totalPages; page++) {
            pagePromises.push(
              nailItAPI.getItemsByDate({
                itemTypeId: 2,
                groupId: 0,
                selectedDate: currentDate,
                pageNo: page,
                locationIds: [Number(locationId)]
              })
            );
          }
          
          // Execute all page requests in parallel for faster loading
          const additionalPages = await Promise.all(pagePromises);
          
          // Combine all items
          additionalPages.forEach(pageResponse => {
            allItems.push(...pageResponse.items);
          });
        }
        
        console.log(`✅ Location ${locationId}: Successfully fetched ${allItems.length} out of ${totalItems} services`);
        
        // Transform items to product format
        const products = allItems.map(item => ({
          id: item.Item_Id,
          name: item.Item_Name,
          description: item.Item_Desc ? item.Item_Desc.replace(/<[^>]*>/g, '') : '',
          price: item.Special_Price > 0 ? item.Special_Price : item.Primary_Price,
          image: item.Image_Url ? `https://api.nailit.com/${item.Image_Url}` : '/placeholder-service.jpg',
          category: 'NailIt Service',
          duration: item.Duration || 30,
          locationId: Number(locationId),
          nailItData: {
            Item_Id: item.Item_Id,
            Primary_Price: item.Primary_Price,
            Special_Price: item.Special_Price,
            Duration: item.Duration,
            Available_Qty: item.Available_Qty,
            Location_Ids: item.Location_Ids,
            Is_Favorite: item.Is_Favorite,
            Sizes: item.Sizes || []
          }
        }));
        
        res.json({
          success: true,
          locationId: Number(locationId),
          products,
          totalFound: allItems.length,
          message: `Showing all ${allItems.length} services for location ${locationId}`,
          paginationInfo: {
            totalPages,
            itemsPerPage,
            totalItems
          }
        });
      } catch (apiError) {
        console.log(`⚠️ API call failed, returning empty: ${apiError.message}`);
        res.json({
          success: true,
          locationId: Number(locationId), 
          products: [],
          totalFound: 0,
          message: `No services available for location ${locationId} - API temporarily unavailable`
        });
      }
      
    } catch (error: any) {
      console.error(`Error fetching products for location ${req.params.locationId}:`, error);
      res.status(500).json({ 
        success: false,
        message: "Error fetching location products: " + error.message 
      });
    }
  });

  // Comprehensive API Testing
  app.get("/api/nailit/test-all-endpoints", async (req, res) => {
    try {
      console.log("🧪 Testing all NailIt API endpoints...");
      const results = await nailItAPI.testAllEndpoints();
      
      const successCount = Object.values(results).filter(r => r.success).length;
      const totalCount = Object.keys(results).length;
      
      console.log(`✅ API Test Results: ${successCount}/${totalCount} endpoints working`);
      
      res.json({
        success: true,
        summary: {
          total: totalCount,
          successful: successCount,
          failed: totalCount - successCount
        },
        details: results
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        message: "Error testing endpoints: " + error.message 
      });
    }
  });

  // Register User
  app.post("/api/nailit/register-user", async (req, res) => {
    try {
      const result = await nailItAPI.registerUser(req.body);
      if (result) {
        res.json(result);
      } else {
        res.status(400).json({ message: "Failed to register user" });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Error registering user: " + error.message });
    }
  });

  // Test Register User with sample data
  app.post("/api/nailit/test-register-user", async (req, res) => {
    try {
      console.log("🧪 Testing NailIt Register User API with fresh data...");
      
      // Use unique data to avoid conflicts
      const timestamp = Date.now();
      const sampleUserData = {
        Address: "123 Kuwait City, Kuwait",
        Email_Id: `testuser${timestamp}@example.com`,
        Name: "Test User",
        Mobile: `+96599${timestamp.toString().slice(-6)}`,
        Login_Type: 1,
        Image_Name: ""
      };

      console.log("📋 Sample user data:", JSON.stringify(sampleUserData, null, 2));
      
      const result = await nailItAPI.registerUser(sampleUserData);
      
      if (result) {
        console.log("✅ User registration successful:", result);
        res.json({
          success: true,
          message: "User successfully registered in NailIt POS",
          nailItResponse: result,
          sampleData: sampleUserData,
          appUserId: result.App_User_Id
        });
      } else {
        console.log("❌ User registration failed - might already exist");
        res.status(400).json({
          success: false,
          message: "Failed to register user (may already exist)",
          sampleData: sampleUserData
        });
      }
    } catch (error: any) {
      console.error("User registration error:", error);
      res.status(500).json({ 
        success: false,
        message: "Error testing user registration: " + error.message 
      });
    }
  });

  // Save Order to NailIt POS
  app.post("/api/nailit/save-order", async (req, res) => {
    try {
      console.log("🛒 Creating order in NailIt POS:", JSON.stringify(req.body, null, 2));
      const result = await nailItAPI.saveOrder(req.body);
      if (result) {
        console.log("✅ Order created successfully:", result);
        res.json(result);
      } else {
        console.log("❌ Order creation failed");
        res.status(400).json({ message: "Failed to create order in NailIt POS" });
      }
    } catch (error: any) {
      console.error("Order creation error:", error);
      res.status(500).json({ message: "Error creating order: " + error.message });
    }
  });

  // Test Save Order with sample data
  app.post("/api/nailit/test-save-order", async (req, res) => {
    try {
      console.log("🧪 Testing NailIt Save Order with sample data...");
      const testOrder = nailItAPI.createTestOrder();
      
      const result = await nailItAPI.saveOrder(testOrder);
      
      if (result) {
        res.json({
          success: true,
          message: "Order successfully created in NailIt POS",
          orderId: result.OrderId,
          customerId: result.CustomerId,
          nailItResponse: result,
          testOrderData: testOrder
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Failed to create order in NailIt POS",
          testOrderData: testOrder
        });
      }
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        message: "Error testing save order: " + error.message 
      });
    }
  });

  // Fresh AI Agent Testing Endpoints
  app.post("/api/fresh-ai/test", async (req, res) => {
    const { testFreshAI } = await import("./routes/fresh-ai");
    await testFreshAI(req, res);
  });

  app.delete("/api/fresh-ai/conversation/:customerId", async (req, res) => {
    const { clearConversationState } = await import("./routes/fresh-ai");
    await clearConversationState(req, res);
  });

  app.get("/api/fresh-ai/conversation/:customerId", async (req, res) => {
    const { getConversationState } = await import("./routes/fresh-ai");
    await getConversationState(req, res);
  });

  // Create order with user integration using form data
  app.post("/api/nailit/create-order-with-user", async (req, res) => {
    try {
      console.log("🛒 Creating integrated order with user data from form...");
      console.log("📋 Request data:", JSON.stringify(req.body, null, 2));
      
      const result = await nailItAPI.createOrderWithUser(req.body);
      
      if (result && result.Status === 0) {
        res.json({
          success: true,
          message: "Integrated order created successfully!",
          nailItResponse: result,
          formData: req.body,
          orderId: result.OrderId,
          customerId: result.CustomerId
        });
      } else {
        res.status(400).json({
          success: false,
          message: result ? `Order failed: ${result.Message}` : "Failed to create integrated order",
          nailItResponse: result,
          formData: req.body
        });
      }
    } catch (error: any) {
      console.error("Integrated order creation error:", error);
      res.status(500).json({ 
        success: false,
        message: "Error creating integrated order: " + error.message 
      });
    }
  });

  // Test Integrated Order Creation (User Registration + Order)
  app.post("/api/nailit/test-integrated-order", async (req, res) => {
    try {
      console.log("🧪 Testing integrated user registration + order creation...");
      
      const testOrderData = {
        customerInfo: {
          name: "Ahmed Al-Kuwaiti",
          mobile: "+96599887766",
          email: "ahmed.test@nailit.com",
          address: "Al-Salmiya, Kuwait City"
        },
        orderDetails: {
          serviceId: 203,
          serviceName: "Manicure & Pedicure",
          price: 15.0,
          locationId: 1,
          appointmentDate: nailItAPI.formatDateForAPI(new Date()),
          paymentTypeId: 1, // Cash on Arrival
          staffId: 48,
          timeFrameIds: [5, 6] // Available time slots
        }
      };
      
      console.log("📋 Test order data:", JSON.stringify(testOrderData, null, 2));
      
      const result = await nailItAPI.createOrderWithUser(testOrderData);
      
      if (result && result.Status === 0) {
        res.json({
          success: true,
          message: "Integrated order created successfully!",
          nailItResponse: result,
          testData: testOrderData,
          orderId: result.OrderId,
          customerId: result.CustomerId
        });
      } else {
        res.status(400).json({
          success: false,
          message: result ? `Order failed: ${result.Message}` : "Failed to create integrated order",
          nailItResponse: result,
          testData: testOrderData
        });
      }
    } catch (error: any) {
      console.error("Integrated order test error:", error);
      res.status(500).json({ 
        success: false,
        message: "Error testing integrated order: " + error.message 
      });
    }
  });

  // Test complete flow with availability check
  app.post("/api/nailit/test-complete-flow", async (req, res) => {
    try {
      console.log("🌊 Testing complete flow with availability check...");
      console.log("📋 Flow data:", JSON.stringify(req.body, null, 2));
      
      const { customerInfo, serviceId, locationId, appointmentDate } = req.body;
      let flowSummary: any = {};
      let step = "initialization";
      
      try {
        // Step 1: Check service availability
        step = "availability_check";
        console.log("1️⃣ Checking service availability...");
        // Get service staff directly from NailIt API
        const availability = await nailItAPI.getServiceStaff(
          Number(serviceId),
          Number(locationId),
          'E',
          appointmentDate
        );
        
        flowSummary.availability = availability;
        
        if (!availability || !availability.staff || availability.staff.length === 0) {
          return res.status(400).json({
            success: false,
            message: "No staff available for selected service and date",
            step,
            flowSummary
          });
        }
        
        // Step 2: Get available time slots
        step = "time_slots";
        console.log("2️⃣ Getting available time slots...");
        const slots = await nailItAPI.getAvailableSlots(
          'E', // Language
          Number(locationId),
          appointmentDate.split('/').join('/')  // Ensure proper date format
        );
        
        flowSummary.timeSlots = slots;
        
        if (!slots || slots.length === 0) {
          return res.status(400).json({
            success: false,
            message: "No time slots available for selected date",
            step,
            flowSummary
          });
        }
        
        // Step 3: Create order with user
        step = "order_creation";
        console.log("3️⃣ Creating order with user...");
        
        const orderData = {
          customerInfo: {
            name: customerInfo.name,
            mobile: customerInfo.mobile,
            email: customerInfo.email,
            address: customerInfo.address || "Kuwait City, Kuwait"
          },
          orderDetails: {
            serviceId: Number(serviceId),
            serviceName: `Service ${serviceId}`,
            price: 15.0,
            locationId: Number(locationId),
            appointmentDate: appointmentDate,
            paymentTypeId: 1, // Cash on Arrival
            staffId: availability.staff[0].Id, // Use first available staff
            timeFrameIds: slots.slice(0, 2).map((slot: any) => slot.TimeFrame_Id) // Use first 2 slots
          }
        };
        
        const orderResult = await nailItAPI.createOrderWithUser(orderData);
        
        flowSummary.order = orderResult;
        flowSummary.service = `Service ${serviceId}`;
        flowSummary.staff = availability.staff[0].Name;
        flowSummary.timeSlots = slots.slice(0, 2).map((s: any) => s.TimeFrame_Name);
        
        if (orderResult && orderResult.Status === 0) {
          res.json({
            success: true,
            message: "Complete flow test successful!",
            orderId: orderResult.OrderId,
            customerId: orderResult.CustomerId,
            flowSummary,
            step: "completed"
          });
        } else {
          res.status(400).json({
            success: false,
            message: orderResult ? `Flow failed at order creation: ${orderResult.Message}` : "Order creation failed",
            step,
            flowSummary
          });
        }
        
      } catch (stepError: any) {
        console.error(`Flow failed at step ${step}:`, stepError);
        res.status(500).json({
          success: false,
          message: `Flow failed at ${step}: ${stepError.message}`,
          step,
          flowSummary
        });
      }
      
    } catch (error: any) {
      console.error("Complete flow test error:", error);
      res.status(500).json({ 
        success: false,
        message: "Error testing complete flow: " + error.message,
        step: "error"
      });
    }
  });

  app.get("/api/nailit/services/search", async (req, res) => {
    try {
      const { query, date } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }

      // Service search functionality moved to Fresh AI system
      const services = await nailItAPI.searchServices(query, date as string);
      res.json(services);
    } catch (error: any) {
      console.error("Error searching NailIt services:", error);
      res.status(500).json({ message: "Error searching services: " + error.message });
    }
  });

  app.get("/api/nailit/service/:serviceId/availability", async (req, res) => {
    try {
      const { serviceId } = req.params;
      const { locationId, date } = req.query;

      if (!locationId || !date) {
        return res.status(400).json({ message: "Location ID and date are required" });
      }

      // Get service staff directly from NailIt API
      const availability = await nailItAPI.getServiceStaff(
        parseInt(serviceId),
        parseInt(locationId as string),
        'E',
        date as string
      );

      res.json(availability);
    } catch (error: any) {
      console.error("Error fetching service availability:", error);
      res.status(500).json({ message: "Error fetching availability: " + error.message });
    }
  });

  app.get("/api/nailit/payment-types", async (req, res) => {
    try {
      const paymentTypes = await nailItAPI.getPaymentTypes('E');
      res.json(paymentTypes);
    } catch (error: any) {
      console.error("Error fetching payment types:", error);
      res.status(500).json({ message: "Error fetching payment types: " + error.message });
    }
  });

  app.post("/api/nailit/create-order", async (req, res) => {
    try {
      const orderData = req.body;
      
      // Validate required fields
      if (!orderData.customerId || !orderData.services || !orderData.locationId) {
        return res.status(400).json({ 
          message: "Customer ID, services, and location ID are required" 
        });
      }

      // Order creation functionality moved to Fresh AI system
      const result = await nailItAPI.createOrderWithUser(orderData);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json({ message: result.error });
      }
    } catch (error: any) {
      console.error("Error creating NailIt order:", error);
      res.status(500).json({ message: "Error creating order: " + error.message });
    }
  });

  app.post("/api/nailit/register-device", async (req, res) => {
    try {
      const success = await nailItAPI.registerDevice();
      
      if (success) {
        res.json({ message: "Device registered successfully with NailIt API" });
      } else {
        res.status(500).json({ message: "Failed to register device with NailIt API" });
      }
    } catch (error: any) {
      console.error("Error registering device:", error);
      res.status(500).json({ message: "Error registering device: " + error.message });
    }
  });

  // Comprehensive NailIt API Testing Endpoints
  app.get("/api/nailit/test-groups", async (req, res) => {
    try {
      const groups = await nailItAPI.getGroups(2);
      res.json({ success: true, groups, count: groups.length });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        groups: [],
        note: "GetGroups endpoint returns 404 on NailIt server" 
      });
    }
  });

  app.get("/api/nailit/test-subgroups/:parentId", async (req, res) => {
    try {
      const parentId = parseInt(req.params.parentId);
      const subGroups = await nailItAPI.getSubGroups('E', parentId);
      res.json({ success: true, subGroups, count: subGroups.length });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        subGroups: [],
        note: "GetSubGroups endpoint likely has same issue as GetGroups"
      });
    }
  });

  app.get("/api/nailit/test-payment-types", async (req, res) => {
    try {
      const paymentTypes = await nailItAPI.getPaymentTypes('E');
      res.json({ success: true, paymentTypes, count: paymentTypes.length });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        paymentTypes: [],
        note: "PaymentTypes endpoint test"
      });
    }
  });

  app.get("/api/nailit/test-items/:groupId", async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const locations = await nailItAPI.getLocations('E');
      const locationIds = locations.map(loc => loc.Location_Id);
      
      const result = await nailItAPI.getItemsByDate({
        groupId,
        locationIds,
        selectedDate: nailItAPI.formatDateForAPI(new Date()),
        itemTypeId: 2
      });
      
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        items: [],
        note: "GetItemsByDate test for group " + groupId
      });
    }
  });

  // Test GetItemsByDate without group restriction
  app.get("/api/nailit/test-all-items", async (req, res) => {
    try {
      const locations = await nailItAPI.getLocations('E');
      const locationIds = locations.map(loc => loc.Location_Id);
      
      const result = await nailItAPI.getItemsByDate({
        groupId: 0, // No group restriction
        locationIds,
        selectedDate: nailItAPI.formatDateForAPI(new Date()),
        itemTypeId: 2 // Services
      });
      
      res.json({ 
        success: true, 
        strategy: "No group restriction (Group_Id: 0)",
        ...result 
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        items: [],
        strategy: "No group restriction failed"
      });
    }
  });

  // Test multiple group IDs from documentation
  app.get("/api/nailit/test-known-groups", async (req, res) => {
    const locations = await nailItAPI.getLocations('E');
    const locationIds = locations.map(loc => loc.Location_Id);
    const currentDate = nailItAPI.formatDateForAPI(new Date());
    
    const knownGroups = [6, 7, 10, 42, 2091]; // From API documentation
    const results = {};

    for (const groupId of knownGroups) {
      try {
        const result = await nailItAPI.getItemsByDate({
          groupId,
          locationIds,
          selectedDate: currentDate,
          itemTypeId: 2
        });
        
        results[`group_${groupId}`] = {
          success: true,
          groupId,
          totalItems: result.totalItems,
          items: result.items
        };
      } catch (error: any) {
        results[`group_${groupId}`] = {
          success: false,
          groupId,
          error: error.message
        };
      }
    }

    res.json({
      strategy: "Known group IDs from API documentation",
      testedGroups: knownGroups,
      results
    });
  });

  app.get("/api/nailit/test-staff/:serviceId/:locationId", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const locationId = parseInt(req.params.locationId);
      const selectedDate = nailItAPI.formatDateForURL(new Date()); // Use DD-MM-YYYY format
      
      console.log(`🧪 Testing GetServiceStaff with CORRECT API format: serviceId=${serviceId}, locationId=${locationId}, date=${selectedDate}`);
      
      const staff = await nailItAPI.getServiceStaff(
        serviceId,
        locationId,
        'E',
        selectedDate
      );
      
      res.json({ 
        success: true, 
        staff, 
        count: staff.length,
        testParams: { serviceId, locationId, selectedDate },
        endpoint: `GetServiceStaff1/${serviceId}/${locationId}/E/${selectedDate}`,
        apiDocFormat: "ItemId/LocationId/Language/SelectedDate"
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        staff: [],
        note: "ServiceStaff endpoint test - Using DD-MM-YYYY date format per API docs"
      });
    }
  });

  app.get("/api/nailit/test-slots/:staffId/:serviceId", async (req, res) => {
    try {
      const staffId = parseInt(req.params.staffId);
      const serviceId = parseInt(req.params.serviceId);
      
      const slots = await nailItAPI.getAvailableSlots(
        staffId,
        serviceId,
        nailItAPI.formatDateForAPI(new Date())
      );
      
      res.json({ success: true, slots, count: slots.length });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message, 
        slots: [],
        note: "AvailableSlots endpoint test"
      });
    }
  });

  app.post("/api/nailit/test-order", async (req, res) => {
    try {
      const { orderData } = req.body;
      
      // This is a test endpoint - don't actually create orders
      res.json({ 
        success: true, 
        note: "Test endpoint - would create order with provided data",
        providedData: orderData,
        message: "Use actual create-order endpoint for real orders"
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message,
        note: "SaveOrder endpoint test"
      });
    }
  });

  // Working GetServiceStaff test endpoint with direct API call  
  app.get("/api/nailit/test-service-staff-direct/:itemId/:locationId", async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const locationId = parseInt(req.params.locationId);
      const today = new Date();
      const selectedDate = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
      
      console.log(`🧪 DIRECT API TEST: GetServiceStaff1/${itemId}/${locationId}/E/${selectedDate}`);
      
      // Make direct API call to test correct format
      const response = await fetch(`http://nailit.innovasolution.net/GetServiceStaff1/${itemId}/${locationId}/E/${selectedDate}`, {
        method: 'GET',
        headers: {
          'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh',
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.Status === 0) {
        res.json({
          success: true,
          staff: data.Specialists || [],
          count: (data.Specialists || []).length,
          testParams: { itemId, locationId, selectedDate },
          correctEndpoint: `GetServiceStaff1/${itemId}/${locationId}/E/${selectedDate}`,
          status: "WORKING - Direct API call successful"
        });
      } else {
        res.json({
          success: false,
          error: data.Message || "API returned error status",
          testParams: { itemId, locationId, selectedDate },
          apiResponse: data
        });
      }
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message,
        note: "Direct GetServiceStaff API test failed"
      });
    }
  });

  // NEW V2.1 API: Get Order Payment Detail endpoint
  app.get("/api/nailit/order/:orderId/payment-details", async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      
      if (!orderId || isNaN(orderId)) {
        return res.status(400).json({
          success: false,
          error: "Valid order ID is required"
        });
      }

      const paymentDetails = await nailItAPI.getOrderPaymentDetail(orderId);
      
      if (paymentDetails) {
        res.json({
          success: true,
          orderDetails: paymentDetails,
          summary: {
            orderId: paymentDetails.OrderId,
            status: paymentDetails.OrderStatus,
            paymentType: paymentDetails.PayType,
            amount: paymentDetails.PayAmount,
            customer: paymentDetails.Customer_Name,
            location: paymentDetails.Location_Name,
            bookingDate: paymentDetails.MinBookingDate,
            servicesCount: paymentDetails.Services.length
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: "Order payment details not found or API error"
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        note: "Order payment details retrieval failed"
      });
    }
  });

  // Enhanced order tracking endpoint with payment status
  app.get("/api/nailit/order/:orderId/status", async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const paymentDetails = await nailItAPI.getOrderPaymentDetail(orderId);
      
      if (paymentDetails) {
        res.json({
          success: true,
          orderId,
          status: {
            orderStatus: paymentDetails.OrderStatus,
            orderStatusId: paymentDetails.Order_Status_Id,
            paymentStatus: paymentDetails.PayType,
            lastUpdate: paymentDetails.PayDate
          },
          customer: {
            name: paymentDetails.Customer_Name,
            customerId: paymentDetails.CustomerId
          },
          booking: {
            location: paymentDetails.Location_Name,
            bookingDateTime: paymentDetails.Booking_Datetime,
            minBookingDate: paymentDetails.MinBookingDate,
            expiryDate: paymentDetails.PayNowExpireDate
          },
          services: paymentDetails.Services.map(service => ({
            name: service.Service_Name,
            date: service.Service_Date,
            timeSlots: service.Service_Time_Slots,
            staff: service.Staff_Name,
            price: service.Price
          })),
          payment: {
            amount: paymentDetails.PayAmount,
            type: paymentDetails.PayType,
            date: paymentDetails.PayDate,
            tip: paymentDetails.Tip,
            earnedPoints: paymentDetails.EarnedPoints
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: "Order not found"
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Comprehensive API status endpoint with all integrations
  app.get("/api/nailit/test-all-endpoints", async (req, res) => {
    const results = await nailItAPI.testAllEndpoints();
    
    res.json({
      success: true,
      summary: results.summary,
      details: results.details,
      timestamp: new Date().toISOString(),
      requiredCustomerData: {
        forOrders: [
          "Full Name",
          "Mobile Number (with country code)",
          "Email Address",
          "Preferred Location",
          "Service Selection",
          "Preferred Date/Time",
          "Staff Preference (optional)",
          "Payment Method"
        ],
        forAppointments: [
          "Service(s) to book",
          "Appointment Date",
          "Preferred Time Slot",
          "Location Selection",
          "Staff Selection",
          "Customer Name",
          "Contact Number",
          "Email (optional)"
        ]
      }
    });
  });

  // Initialize NailIt device registration on server startup
  (async () => {
    try {
      console.log("Initializing NailIt API integration...");
      const deviceRegistered = await nailItAPI.registerDevice();
      
      if (deviceRegistered) {
        console.log("✅ NailIt device registered successfully");
        
        // Service sync functionality moved to Fresh AI system
        console.log("✅ NailIt services available through Fresh AI");
      } else {
        console.warn("⚠️  Failed to register device with NailIt API");
      }
    } catch (error) {
      console.error("❌ Error initializing NailIt integration:", error);
    }
  })();

  // Register NailIt order flow routes
  const { registerNailItOrderFlowRoutes } = await import("./routes/nailit-order-flow");
  registerNailItOrderFlowRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
