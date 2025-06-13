import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
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

export const aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull().default("My Business"),
  assistantName: text("assistant_name").notNull().default("AI Assistant"),
  tone: text("tone").notNull().default("friendly"), // friendly, professional, enthusiastic, helpful
  responseSpeed: text("response_speed").notNull().default("natural"), // instant, quick, natural, thoughtful
  autoSuggestProducts: boolean("auto_suggest_products").notNull().default(true),
  collectCustomerInfo: boolean("collect_customer_info").notNull().default(true),
  welcomeMessage: text("welcome_message").notNull().default("Hello! How can I help you today?"),
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

export const insertAISettingsSchema = createInsertSchema(aiSettings).omit({
  id: true,
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

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type AISettings = typeof aiSettings.$inferSelect;
export type InsertAISettings = z.infer<typeof insertAISettingsSchema>;
export type WhatsAppSettings = typeof whatsappSettings.$inferSelect;
export type InsertWhatsAppSettings = z.infer<typeof insertWhatsAppSettingsSchema>;
