import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, date, time } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull().unique(),
  name: text("name"),
  email: text("email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  status: text("status").notNull().default("pending"), // pending, confirmed, processing, completed, cancelled
  items: jsonb("items").notNull(), // Array of {productId, quantity, price}
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  isActive: boolean("is_active").notNull().default(true),
  lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  content: text("content").notNull(),
  isFromAI: boolean("is_from_ai").notNull().default(false),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Fresh AI Settings - Specifically designed for the Fresh AI Agent
export const freshAISettings = pgTable("fresh_ai_settings", {
  id: serial("id").primaryKey(),
  // Business Identity
  businessName: text("business_name").notNull().default("NailIt Salon"),
  assistantName: text("assistant_name").notNull().default("NailIt Assistant"),
  welcomeMessageEN: text("welcome_message_en").notNull().default("Welcome to NailIt! How can I help you today?"),
  welcomeMessageAR: text("welcome_message_ar").notNull().default("مرحباً بك في نيل إت! كيف يمكنني مساعدتك اليوم؟"),
  
  // Conversation Settings
  conversationTone: text("conversation_tone").notNull().default("professional"), // natural, friendly, professional, enthusiastic
  responseStyle: text("response_style").notNull().default("concise"), // concise, detailed, conversational
  defaultLanguage: text("default_language").notNull().default("en"), // en, ar, both
  
  // OpenAI Configuration
  openaiModel: text("openai_model").notNull().default("gpt-4"),
  openaiTemperature: text("openai_temperature").notNull().default("0.3"), // Store as text for frontend compatibility
  maxTokens: integer("max_tokens").notNull().default(500),
  
  // Booking Behavior
  autoStaffAssignment: boolean("auto_staff_assignment").notNull().default(true),
  collectCustomerInfo: boolean("collect_customer_info").notNull().default(true),
  requireEmailConfirmation: boolean("require_email_confirmation").notNull().default(true),
  defaultPaymentMethod: text("default_payment_method").default("cash"), // cash, card, knet
  
  // System Prompts
  systemPromptEN: text("system_prompt_en").notNull().default("You are a professional customer service agent for a salon in Kuwait."),
  systemPromptAR: text("system_prompt_ar").notNull().default("أنت وكيل خدمة عملاء مهني لصالون في الكويت."),
  
  // Response Preferences
  showServicePrices: boolean("show_service_prices").notNull().default(true),
  showServiceDuration: boolean("show_service_duration").notNull().default(true),
  showStaffNames: boolean("show_staff_names").notNull().default(true),
  maxServicesDisplay: integer("max_services_display").notNull().default(4),
  
  // Integration Settings
  useNailItAPI: boolean("use_nail_it_api").notNull().default(true),
  fallbackToDatabase: boolean("fallback_to_database").notNull().default(true),
  
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  serviceId: integer("service_id").references(() => products.id), // Products can represent services
  appointmentDate: text("appointment_date").notNull(), // YYYY-MM-DD format
  appointmentTime: text("appointment_time").notNull(), // HH:MM format
  duration: integer("duration").notNull().default(60), // in minutes
  locationId: integer("location_id"), // Which branch/location
  locationName: text("location_name"), // Location name for display
  status: text("status").notNull().default("pending"), // pending, confirmed, completed, cancelled
  paymentMethod: text("payment_method"), // card, cash
  paymentStatus: text("payment_status").default("pending"), // pending, paid, failed
  notes: text("notes"),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const whatsappSettings = pgTable("whatsapp_settings", {
  id: serial("id").primaryKey(),
  phoneNumberId: text("phone_number_id"),
  accessToken: text("access_token"),
  webhookVerifyToken: text("webhook_verify_token"),
  isConfigured: boolean("is_configured").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Optimized Service Storage for ReAct Orchestration
export const servicesRag = pgTable("services_rag", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().unique(), // From NailIt API (Item_Id)
  name: text("name").notNull(), // Display name (EN/AR)
  description: text("description"), // Textual summary of the service
  keywords: jsonb("keywords"), // Preprocessed list: ["oily", "growth", "nail"]
  category: text("category").notNull(), // Hair, Nails, Facial, etc.
  durationMinutes: integer("duration_minutes").notNull(), // Duration as integer
  priceKwd: decimal("price_kwd", { precision: 10, scale: 2 }).notNull(), // Cost
  locationIds: jsonb("location_ids").notNull(), // Which locations offer it
  isActive: boolean("is_active").notNull().default(true), // Hide services when removed upstream
  lastUpdatedAt: timestamp("last_updated_at").notNull().defaultNow(), // For resync control
  
  // Additional fields for compatibility
  imageUrl: text("image_url"),
  itemTypeId: integer("item_type_id"),
  groupId: integer("group_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const nailItLocations = pgTable("nailit_locations", {
  id: serial("id").primaryKey(),
  nailitId: integer("nailit_id").notNull().unique(), // NailIt Location_Id - actual column name
  locationName: text("location_name").notNull(),
  address: text("address"),
  phone: text("phone"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  fromTime: text("from_time"), // "11:00"
  toTime: text("to_time"), // "20:30"
  workingDays: text("working_days"),
  website: text("website"),
  isActive: boolean("is_active").notNull().default(true),
  
  // Sync tracking
  lastSyncedAt: timestamp("last_synced_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const nailItStaff = pgTable("nailit_staff", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(), // NailIt Staff ID
  staffName: text("staff_name").notNull(),
  nailitLocationId: integer("nailit_location_id").notNull(), // Reference to location
  extraTime: integer("extra_time").default(0),
  imageUrl: text("image_url"),
  staffGroups: jsonb("staff_groups"), // Services they can perform
  isActive: boolean("is_active").notNull().default(true),
  
  // Sync tracking
  lastSyncedAt: timestamp("last_synced_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const nailItPaymentTypes = pgTable("nailit_payment_types", {
  id: serial("id").primaryKey(),
  nailitId: integer("nailit_id").notNull().unique(), // NailIt Payment Type ID - actual column name
  paymentTypeName: text("payment_type_name").notNull(),
  paymentTypeCode: text("payment_type_code"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  imageUrl: text("image_url"),
  
  // Sync tracking
  lastSyncedAt: timestamp("last_synced_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Enhanced conversation state for RAG
export const enhancedConversationStates = pgTable("enhanced_conversation_states", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  phoneNumber: text("phone_number").notNull(),
  currentPhase: text("current_phase").notNull().default("greeting"),
  language: text("language").default("en"),
  
  // Service selection data
  selectedServices: jsonb("selected_services"), // Array of selected NailIt services
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  totalDuration: integer("total_duration"), // Total minutes
  
  // Location and timing
  locationId: integer("location_id"),
  locationName: text("location_name"),
  appointmentDate: text("appointment_date"), // DD-MM-YYYY
  appointmentTime: text("appointment_time"), // HH:MM
  timeSlots: jsonb("time_slots"), // Array of time slot IDs
  
  // Staff assignment
  assignedStaff: jsonb("assigned_staff"), // Array of assigned staff
  
  // Customer information
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  paymentMethod: text("payment_method"),
  
  // Validation and progress
  dataCompletionPercentage: integer("data_completion_percentage").default(0),
  validationErrors: jsonb("validation_errors"),
  canProceedToBooking: boolean("can_proceed_to_booking").default(false),
  
  // Timestamps
  lastInteractionAt: timestamp("last_interaction_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations for RAG tables
export const servicesRagRelations = relations(servicesRag, ({ many }) => ({
  // Add relations as needed
}));

export const nailItLocationsRelations = relations(nailItLocations, ({ many }) => ({
  // Add relations as needed  
}));

export const enhancedConversationStatesRelations = relations(enhancedConversationStates, ({ one }) => ({
  customer: one(customers, {
    fields: [enhancedConversationStates.customerId],
    references: [customers.id],
  }),
}));

// Insert schemas for RAG tables
export const insertServicesRagSchema = createInsertSchema(servicesRag).omit({
  id: true,
  createdAt: true,
  lastUpdatedAt: true,
});

export const insertNailItLocationSchema = createInsertSchema(nailItLocations).omit({
  id: true,
  createdAt: true,
  lastSyncedAt: true,
});

export const insertNailItStaffSchema = createInsertSchema(nailItStaff).omit({
  id: true,
  createdAt: true,
  lastSyncedAt: true,
});

export const insertNailItPaymentTypeSchema = createInsertSchema(nailItPaymentTypes).omit({
  id: true,
  createdAt: true,
  lastSyncedAt: true,
});

export const insertEnhancedConversationStateSchema = createInsertSchema(enhancedConversationStates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

export const insertFreshAISettingsSchema = createInsertSchema(freshAISettings).omit({
  id: true,
  updatedAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsAppSettingsSchema = createInsertSchema(whatsappSettings).omit({
  id: true,
  updatedAt: true,
});

// Relations
export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orders),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
  conversations: many(conversations),
  appointments: many(appointments),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  customer: one(customers, {
    fields: [conversations.customerId],
    references: [customers.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  customer: one(customers, {
    fields: [appointments.customerId],
    references: [customers.id],
  }),
  service: one(products, {
    fields: [appointments.serviceId],
    references: [products.id],
  }),
}));

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Customer = typeof customers.$inferSelect;
export type FreshAISettings = typeof freshAISettings.$inferSelect;
export type InsertFreshAISettings = z.infer<typeof insertFreshAISettingsSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type WhatsAppSettings = typeof whatsappSettings.$inferSelect;
export type InsertWhatsAppSettings = z.infer<typeof insertWhatsAppSettingsSchema>;

// RAG Types
export type NailItService = typeof nailItServices.$inferSelect;
export type InsertNailItService = z.infer<typeof insertNailItServiceSchema>;
export type NailItLocation = typeof nailItLocations.$inferSelect;
export type InsertNailItLocation = z.infer<typeof insertNailItLocationSchema>;
export type NailItStaff = typeof nailItStaff.$inferSelect;
export type InsertNailItStaff = z.infer<typeof insertNailItStaffSchema>;
export type NailItPaymentType = typeof nailItPaymentTypes.$inferSelect;
export type InsertNailItPaymentType = z.infer<typeof insertNailItPaymentTypeSchema>;
export type EnhancedConversationState = typeof enhancedConversationStates.$inferSelect;
export type InsertEnhancedConversationState = z.infer<typeof insertEnhancedConversationStateSchema>;
