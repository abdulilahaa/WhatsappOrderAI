import { 
  products, customers, orders, conversations, messages, aiSettings, whatsappSettings,
  type Product, type InsertProduct, type Customer, type InsertCustomer, 
  type Order, type InsertOrder, type Conversation, type InsertConversation,
  type Message, type InsertMessage, type AISettings, type InsertAISettings,
  type WhatsAppSettings, type InsertWhatsAppSettings
} from "@shared/schema";

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
  getCustomerByPhoneNumber(phoneNumber: string): Promise<Customer | undefined>;
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

  // AI Settings
  getAISettings(): Promise<AISettings>;
  updateAISettings(settings: Partial<InsertAISettings>): Promise<AISettings>;

  // WhatsApp Settings
  getWhatsAppSettings(): Promise<WhatsAppSettings>;
  updateWhatsAppSettings(settings: Partial<InsertWhatsAppSettings>): Promise<WhatsAppSettings>;

  // Analytics
  getDashboardStats(): Promise<{
    totalOrders: number;
    activeConversations: number;
    revenueToday: number;
    aiResponseRate: number;
  }>;
}

export class MemStorage implements IStorage {
  private products: Map<number, Product> = new Map();
  private customers: Map<number, Customer> = new Map();
  private orders: Map<number, Order> = new Map();
  private conversations: Map<number, Conversation> = new Map();
  private messages: Map<number, Message> = new Map();
  private aiSettings: AISettings;
  private whatsappSettings: WhatsAppSettings;
  private currentId = 1;

  constructor() {
    // Initialize default settings
    this.aiSettings = {
      id: 1,
      businessName: "OrderBot AI",
      assistantName: "Emma",
      tone: "friendly",
      responseSpeed: "natural",
      autoSuggestProducts: true,
      collectCustomerInfo: true,
      welcomeMessage: "Hello! Welcome to OrderBot AI. How can I help you today?",
      updatedAt: new Date(),
    };

    this.whatsappSettings = {
      id: 1,
      phoneNumberId: null,
      accessToken: null,
      webhookVerifyToken: null,
      isConfigured: false,
      updatedAt: new Date(),
    };

    // Add sample data
    this.seedData();
  }

  private seedData() {
    // Sample products
    const sampleProducts = [
      {
        name: "Premium Coffee Beans",
        description: "Fresh roasted arabica coffee beans from Colombia",
        price: "24.99",
        imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        isActive: true,
        createdAt: new Date(),
      },
      {
        name: "Artisan Pastries",
        description: "Freshly baked croissants and pastries made daily",
        price: "8.99",
        imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        isActive: true,
        createdAt: new Date(),
      },
      {
        name: "Organic Green Tea",
        description: "Premium organic green tea leaves from Japan",
        price: "16.99",
        imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        isActive: true,
        createdAt: new Date(),
      },
      {
        name: "Chocolate Chip Cookies",
        description: "Homemade cookies with premium chocolate chips",
        price: "12.99",
        imageUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        isActive: true,
        createdAt: new Date(),
      },
    ];

    sampleProducts.forEach(product => {
      const id = this.currentId++;
      this.products.set(id, { ...product, id });
    });

    // Sample customers
    const sampleCustomers = [
      {
        phoneNumber: "+15551234567",
        name: "Sarah Johnson",
        email: "sarah@example.com",
        createdAt: new Date(),
      },
      {
        phoneNumber: "+15559876543",
        name: "Mike Chen",
        email: "mike@example.com",
        createdAt: new Date(),
      },
      {
        phoneNumber: "+15554567890",
        name: "Emma Davis",
        email: "emma@example.com",
        createdAt: new Date(),
      },
    ];

    sampleCustomers.forEach(customer => {
      const id = this.currentId++;
      this.customers.set(id, { ...customer, id });
    });

    // Sample orders
    const now = new Date();
    const sampleOrders = [
      {
        customerId: 1,
        status: "completed",
        items: [{ productId: 1, quantity: 2, price: "24.99" }],
        total: "49.98",
        notes: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        customerId: 2,
        status: "processing",
        items: [{ productId: 2, quantity: 1, price: "8.99" }],
        total: "8.99",
        notes: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        customerId: 3,
        status: "confirmed",
        items: [{ productId: 3, quantity: 3, price: "16.99" }],
        total: "50.97",
        notes: "Extra packaging please",
        createdAt: now,
        updatedAt: now,
      },
    ];

    sampleOrders.forEach(order => {
      const id = this.currentId++;
      this.orders.set(id, { ...order, id });
    });

    // Sample conversations
    sampleCustomers.forEach((_, index) => {
      const id = this.currentId++;
      const conversation: Conversation = {
        id,
        customerId: index + 1,
        isActive: index === 0, // Only first conversation is active
        lastMessageAt: now,
        createdAt: now,
      };
      this.conversations.set(id, conversation);

      // Add sample messages for first conversation
      if (index === 0) {
        const messages = [
          {
            conversationId: id,
            content: "Hi! Do you have any coffee available?",
            isFromAI: false,
            timestamp: new Date(now.getTime() - 300000), // 5 minutes ago
          },
          {
            conversationId: id,
            content: "Hello! Yes, we have several coffee options available. Would you like to see our coffee menu?",
            isFromAI: true,
            timestamp: new Date(now.getTime() - 280000), // 4 minutes 40 seconds ago
          },
          {
            conversationId: id,
            content: "Yes please! And what sizes do you have?",
            isFromAI: false,
            timestamp: new Date(now.getTime() - 240000), // 4 minutes ago
          },
        ];

        messages.forEach(message => {
          const messageId = this.currentId++;
          this.messages.set(messageId, { ...message, id: messageId });
        });
      }
    });
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentId++;
    const newProduct: Product = {
      ...product,
      id,
      createdAt: new Date(),
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const existing = this.products.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...product };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomerByPhoneNumber(phoneNumber: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(c => c.phoneNumber === phoneNumber);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.currentId++;
    const newCustomer: Customer = {
      ...customer,
      id,
      createdAt: new Date(),
    };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const existing = this.customers.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...customer };
    this.customers.set(id, updated);
    return updated;
  }

  // Orders
  async getOrders(): Promise<(Order & { customer: Customer })[]> {
    const orders = Array.from(this.orders.values());
    return orders.map(order => ({
      ...order,
      customer: this.customers.get(order.customerId)!,
    })).filter(order => order.customer);
  }

  async getOrder(id: number): Promise<(Order & { customer: Customer }) | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const customer = this.customers.get(order.customerId);
    if (!customer) return undefined;

    return { ...order, customer };
  }

  async getOrdersByCustomer(customerId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.customerId === customerId);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.currentId++;
    const now = new Date();
    const newOrder: Order = {
      ...order,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const existing = this.orders.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...order, updatedAt: new Date() };
    this.orders.set(id, updated);
    return updated;
  }

  // Conversations
  async getConversations(): Promise<(Conversation & { customer: Customer })[]> {
    const conversations = Array.from(this.conversations.values());
    return conversations.map(conversation => ({
      ...conversation,
      customer: this.customers.get(conversation.customerId)!,
    })).filter(conversation => conversation.customer);
  }

  async getActiveConversations(): Promise<(Conversation & { customer: Customer })[]> {
    const conversations = await this.getConversations();
    return conversations.filter(conversation => conversation.isActive);
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationByCustomer(customerId: number): Promise<Conversation | undefined> {
    return Array.from(this.conversations.values()).find(c => c.customerId === customerId);
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const id = this.currentId++;
    const now = new Date();
    const newConversation: Conversation = {
      ...conversation,
      id,
      lastMessageAt: now,
      createdAt: now,
    };
    this.conversations.set(id, newConversation);
    return newConversation;
  }

  async updateConversation(id: number, conversation: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const existing = this.conversations.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...conversation };
    this.conversations.set(id, updated);
    return updated;
  }

  // Messages
  async getMessages(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.currentId++;
    const newMessage: Message = {
      ...message,
      id,
      timestamp: new Date(),
    };
    this.messages.set(id, newMessage);

    // Update conversation last message time
    const conversation = this.conversations.get(message.conversationId);
    if (conversation) {
      conversation.lastMessageAt = newMessage.timestamp;
      this.conversations.set(conversation.id, conversation);
    }

    return newMessage;
  }

  // AI Settings
  async getAISettings(): Promise<AISettings> {
    return this.aiSettings;
  }

  async updateAISettings(settings: Partial<InsertAISettings>): Promise<AISettings> {
    this.aiSettings = {
      ...this.aiSettings,
      ...settings,
      updatedAt: new Date(),
    };
    return this.aiSettings;
  }

  // WhatsApp Settings
  async getWhatsAppSettings(): Promise<WhatsAppSettings> {
    return this.whatsappSettings;
  }

  async updateWhatsAppSettings(settings: Partial<InsertWhatsAppSettings>): Promise<WhatsAppSettings> {
    this.whatsappSettings = {
      ...this.whatsappSettings,
      ...settings,
      updatedAt: new Date(),
    };
    return this.whatsappSettings;
  }

  // Analytics
  async getDashboardStats(): Promise<{
    totalOrders: number;
    activeConversations: number;
    revenueToday: number;
    aiResponseRate: number;
  }> {
    const orders = Array.from(this.orders.values());
    const conversations = Array.from(this.conversations.values());
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysOrders = orders.filter(order => order.createdAt >= today);
    const revenueToday = todaysOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
    
    return {
      totalOrders: orders.length,
      activeConversations: conversations.filter(c => c.isActive).length,
      revenueToday,
      aiResponseRate: 98.5, // Mock rate for now
    };
  }
}

export const storage = new MemStorage();
