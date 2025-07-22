import { 
  products, customers, orders, conversations, messages, freshAISettings, whatsappSettings, appointments,
  type Product, type InsertProduct, type Customer, type InsertCustomer, 
  type Order, type InsertOrder, type Conversation, type InsertConversation,
  type Message, type InsertMessage, type FreshAISettings, type InsertFreshAISettings,
  type WhatsAppSettings, type InsertWhatsAppSettings, type Appointment, type InsertAppointment
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerById(id: number): Promise<Customer | null>;
  getCustomerByPhoneNumber(phoneNumber: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;

  // Orders
  getOrders(): Promise<(Order & { customer: Customer })[]>;
  getOrder(id: number): Promise<(Order & { customer: Customer }) | undefined>;
  getOrdersByCustomer(customerId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined>;

  // Conversations
  getConversations(): Promise<(Conversation & { customer: Customer })[]>;
  getActiveConversations(): Promise<(Conversation & { customer: Customer })[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationByCustomer(customerId: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, conversation: Partial<InsertConversation>): Promise<Conversation | undefined>;

  // Messages
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: number): Promise<boolean>;

  // Conversation deletion
  deleteConversation(id: number): Promise<boolean>;

  // Fresh AI Settings
  getFreshAISettings(): Promise<FreshAISettings>;
  updateFreshAISettings(settings: Partial<InsertFreshAISettings>): Promise<FreshAISettings>;

  // WhatsApp Settings
  getWhatsAppSettings(): Promise<WhatsAppSettings>;
  updateWhatsAppSettings(settings: Partial<InsertWhatsAppSettings>): Promise<WhatsAppSettings>;

  // Appointments
  getAppointments(): Promise<(Appointment & { customer: Customer, service: Product })[]>;
  getAppointment(id: number): Promise<(Appointment & { customer: Customer, service: Product }) | undefined>;
  getAppointmentsByCustomer(customerId: number): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;

  // Analytics
  getDashboardStats(): Promise<{
    totalOrders: number;
    activeConversations: number;
    revenueToday: number;
    aiResponseRate: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeDefaults();
  }

  private async initializeDefaults() {
    try {
      // Initialize Fresh AI settings if they don't exist
      const existingFreshAI = await db.select().from(freshAISettings).limit(1);
      if (existingFreshAI.length === 0) {
        await db.insert(freshAISettings).values({
          businessName: "NailIt Salon",
          assistantName: "NailIt Assistant",
          welcomeMessageEN: "Welcome to NailIt! How can I help you today?",
          welcomeMessageAR: "مرحباً بك في نيل إت! كيف يمكنني مساعدتك اليوم؟",
          conversationTone: "professional",
          responseStyle: "concise",
          defaultLanguage: "en",
          openaiModel: "gpt-4",
          openaiTemperature: "0.3",
          maxTokens: 500,
          autoStaffAssignment: true,
          collectCustomerInfo: true,
          requireEmailConfirmation: true,
          defaultPaymentMethod: "cash",
          systemPromptEN: "You are a professional customer service agent for NailIt salon in Kuwait. Be helpful, friendly, and guide customers through the booking process naturally.",
          systemPromptAR: "أنت وكيل خدمة عملاء مهني لصالون نيل إت في الكويت. كن مفيداً وودوداً وأرشد العملاء خلال عملية الحجز بطريقة طبيعية.",
          showServicePrices: true,
          showServiceDuration: true,
          showStaffNames: true,
          maxServicesDisplay: 4,
          useNailItAPI: true,
          fallbackToDatabase: true
        });
      }

      // Initialize WhatsApp settings if they don't exist
      const existingWhatsApp = await db.select().from(whatsappSettings).limit(1);
      if (existingWhatsApp.length === 0) {
        await db.insert(whatsappSettings).values({
          phoneNumberId: null,
          accessToken: null,
          webhookVerifyToken: null,
          isConfigured: false,
        });
      }
    } catch (error) {
      console.error("Error initializing defaults:", error);
    }
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct || undefined;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerById(id: number): Promise<Customer | null> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || null;
  }

  async getCustomerByPhoneNumber(phoneNumber: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.phoneNumber, phoneNumber));
    return customer || undefined;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updatedCustomer] = await db
      .update(customers)
      .set(customer)
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer || undefined;
  }

  // Orders
  async getOrders(): Promise<(Order & { customer: Customer })[]> {
    const ordersWithCustomers = await db
      .select()
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .orderBy(desc(orders.createdAt));

    return ordersWithCustomers.map(row => ({
      ...row.orders,
      customer: row.customers!
    }));
  }

  async getOrder(id: number): Promise<(Order & { customer: Customer }) | undefined> {
    const [orderWithCustomer] = await db
      .select()
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.id, id));

    if (!orderWithCustomer || !orderWithCustomer.customers) return undefined;

    return {
      ...orderWithCustomer.orders,
      customer: orderWithCustomer.customers
    };
  }

  async getOrdersByCustomer(customerId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.customerId, customerId));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set(order)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder || undefined;
  }

  // Conversations
  async getConversations(): Promise<(Conversation & { customer: Customer })[]> {
    const conversationsWithCustomers = await db
      .select()
      .from(conversations)
      .leftJoin(customers, eq(conversations.customerId, customers.id))
      .orderBy(desc(conversations.lastMessageAt));

    return conversationsWithCustomers.map(row => ({
      ...row.conversations,
      customer: row.customers!
    }));
  }

  async getActiveConversations(): Promise<(Conversation & { customer: Customer })[]> {
    const activeConversations = await db
      .select()
      .from(conversations)
      .leftJoin(customers, eq(conversations.customerId, customers.id))
      .where(eq(conversations.isActive, true))
      .orderBy(desc(conversations.lastMessageAt));

    return activeConversations.map(row => ({
      ...row.conversations,
      customer: row.customers!
    }));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationByCustomer(customerId: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.customerId, customerId));
    return conversation || undefined;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db.insert(conversations).values(conversation).returning();
    return newConversation;
  }

  async updateConversation(id: number, conversation: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const [updatedConversation] = await db
      .update(conversations)
      .set(conversation)
      .where(eq(conversations.id, id))
      .returning();
    return updatedConversation || undefined;
  }

  // Messages
  async getMessages(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    
    // Update conversation's lastMessageAt
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, message.conversationId));

    return newMessage;
  }

  async deleteMessage(id: number): Promise<boolean> {
    const result = await db
      .delete(messages)
      .where(eq(messages.id, id));
    return (result.rowCount || 0) > 0;
  }

  async deleteConversation(id: number): Promise<boolean> {
    // First delete all messages in the conversation
    await db
      .delete(messages)
      .where(eq(messages.conversationId, id));
    
    // Then delete the conversation
    const result = await db
      .delete(conversations)
      .where(eq(conversations.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Fresh AI Settings
  async getFreshAISettings(): Promise<FreshAISettings> {
    let [settings] = await db.select().from(freshAISettings).limit(1);
    
    if (!settings) {
      // Create default settings if none exist
      [settings] = await db.insert(freshAISettings).values({
        businessName: "NailIt Salon",
        assistantName: "NailIt Assistant",
        welcomeMessageEN: "Welcome to NailIt! How can I help you today?",
        welcomeMessageAR: "مرحباً بك في نيل إت! كيف يمكنني مساعدتك اليوم؟",
        conversationTone: "professional",
        responseStyle: "concise",
        defaultLanguage: "en",
        openaiModel: "gpt-4",
        openaiTemperature: "0.3",
        maxTokens: 500,
        autoStaffAssignment: true,
        collectCustomerInfo: true,
        requireEmailConfirmation: true,
        defaultPaymentMethod: "cash",
        systemPromptEN: "You are a professional customer service agent for NailIt salon in Kuwait. Be helpful, friendly, and guide customers through the booking process naturally.",
        systemPromptAR: "أنت وكيل خدمة عملاء مهني لصالون نيل إت في الكويت. كن مفيداً وودوداً وأرشد العملاء خلال عملية الحجز بطريقة طبيعية.",
        showServicePrices: true,
        showServiceDuration: true,
        showStaffNames: true,
        maxServicesDisplay: 4,
        useNailItAPI: true,
        fallbackToDatabase: true
      }).returning();
    }
    
    return settings;
  }

  async updateFreshAISettings(settings: Partial<InsertFreshAISettings>): Promise<FreshAISettings> {
    const [updatedSettings] = await db
      .update(freshAISettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(freshAISettings.id, 1))
      .returning();
    
    return updatedSettings;
  }

  // WhatsApp Settings
  async getWhatsAppSettings(): Promise<WhatsAppSettings> {
    const [settings] = await db.select().from(whatsappSettings).limit(1);
    if (!settings) {
      // Create default settings if none exist
      const [newSettings] = await db.insert(whatsappSettings).values({
        phoneNumberId: null,
        accessToken: null,
        webhookVerifyToken: null,
        isConfigured: false,
      }).returning();
      return newSettings;
    }
    return settings;
  }

  async updateWhatsAppSettings(settings: Partial<InsertWhatsAppSettings>): Promise<WhatsAppSettings> {
    // Get the current settings to determine which record to update
    const currentSettings = await this.getWhatsAppSettings();
    
    const [updatedSettings] = await db
      .update(whatsappSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(whatsappSettings.id, currentSettings.id))
      .returning();
    return updatedSettings;
  }

  // Appointments
  async getAppointments(): Promise<(Appointment & { customer: Customer, service: Product })[]> {
    const result = await db
      .select()
      .from(appointments)
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(products, eq(appointments.serviceId, products.id))
      .orderBy(desc(appointments.appointmentDate));

    return result.map(row => ({
      ...row.appointments,
      customer: row.customers!,
      service: row.products!
    }));
  }

  async getAppointment(id: number): Promise<(Appointment & { customer: Customer, service: Product }) | undefined> {
    const [result] = await db
      .select()
      .from(appointments)
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(products, eq(appointments.serviceId, products.id))
      .where(eq(appointments.id, id));

    if (!result) return undefined;

    return {
      ...result.appointments,
      customer: result.customers!,
      service: result.products!
    };
  }

  async getAppointmentsByCustomer(customerId: number): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.customerId, customerId))
      .orderBy(desc(appointments.appointmentDate));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db
      .insert(appointments)
      .values(appointment)
      .returning();
    return newAppointment;
  }

  async updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [updated] = await db
      .update(appointments)
      .set(appointment)
      .where(eq(appointments.id, id))
      .returning();
    return updated || undefined;
  }

  // Analytics
  async getDashboardStats(): Promise<{
    totalOrders: number;
    activeConversations: number;
    revenueToday: number;
    aiResponseRate: number;
  }> {
    const allOrders = await db.select().from(orders);
    const allConversations = await db.select().from(conversations).where(eq(conversations.isActive, true));
    const allMessages = await db.select().from(messages);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all completed orders for total revenue (regardless of date)
    const completedOrders = allOrders.filter(order => order.status === 'completed');
    
    // Calculate today's revenue from completed orders created today
    const completedTodayOrders = allOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= today && orderDate < tomorrow && order.status === 'completed';
    });

    // Calculate actual revenue from completed orders
    const totalRevenue = completedOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
    const todaysRevenue = completedTodayOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
    
    // Show today's revenue if there are orders today, otherwise show total revenue
    const revenueToday = completedTodayOrders.length > 0 ? todaysRevenue : totalRevenue;

    // Calculate AI response rate from actual message data
    const userMessages = allMessages.filter(msg => !msg.isFromAI);
    const aiResponses = allMessages.filter(msg => msg.isFromAI);
    const aiResponseRate = userMessages.length > 0 
      ? Math.round((aiResponses.length / userMessages.length) * 100)
      : 0;

    return {
      totalOrders: allOrders.length,
      activeConversations: allConversations.length,
      revenueToday,
      aiResponseRate: Math.min(aiResponseRate, 100), // Cap at 100%
    };
  }
}

export const storage = new DatabaseStorage();