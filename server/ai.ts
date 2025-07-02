import OpenAI from "openai";
import { storage } from "./storage";
import type { Product, Customer, AISettings } from "@shared/schema";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AIResponse {
  message: string;
  suggestedProducts?: Product[];
  requiresOrderInfo?: boolean;
  orderIntent?: {
    products: Array<{ productId: number; quantity: number }>;
    customerInfo?: Partial<Customer>;
  };
  appointmentIntent?: {
    serviceId?: number;
    preferredDate?: string;
    preferredTime?: string;
    duration?: number;
    customerInfo?: Partial<Customer>;
  };
  requiresAppointmentInfo?: boolean;
  appointmentCreated?: {
    id: number;
    date: string;
    time: string;
    serviceId: number;
  };
}

export class AIAgent {
  private settings: AISettings;
  private products: Product[];

  constructor() {
    this.settings = {} as AISettings;
    this.products = [];
    this.initialize();
  }

  private async initialize() {
    this.settings = await storage.getAISettings();
    this.products = await storage.getProducts();
  }

  // Method to reload configuration when settings are updated
  async reloadConfiguration(): Promise<void> {
    await this.initialize();
  }

  async processMessage(
    customerMessage: string,
    customer: Customer,
    conversationHistory: Array<{ content: string; isFromAI: boolean }>
  ): Promise<AIResponse> {
    await this.initialize(); // Refresh settings and products

    const systemPrompt = this.buildSystemPrompt();
    const contextPrompt = this.buildContextPrompt(customer, conversationHistory);
    const businessType = this.settings.businessType || 'ecommerce';
    let userPrompt = `Customer message: "${customerMessage}"

Please analyze this message and respond appropriately based on the business type.`;

    if (businessType === 'appointment_based') {
      userPrompt += `

Respond in JSON format with:
{
  "message": "your response to the customer",
  "suggestedProducts": [optional array of relevant service IDs],
  "requiresAppointmentInfo": boolean (true if you need more info to complete booking),
  "appointmentIntent": {
    "serviceId": number (if service selected),
    "preferredDate": "YYYY-MM-DD" (if provided),
    "preferredTime": "HH:MM" (if provided),
    "duration": number (in minutes),
    "locationId": number (if location selected),
    "locationName": "string" (location name),
    "customerInfo": {"name": "string", "email": "string"},
    "paymentMethod": "pending" | "card" | "cash",
    "readyForConfirmation": boolean (true when all info collected, show order summary),
    "confirmed": boolean (true only when customer explicitly says "confirmed")
  }
}`;
    } else if (businessType === 'hybrid') {
      userPrompt += `

Respond in JSON format with:
{
  "message": "your response to the customer",
  "suggestedProducts": [optional array of relevant IDs],
  "requiresOrderInfo": boolean (for product orders),
  "requiresAppointmentInfo": boolean (for service bookings),
  "orderIntent": {
    "products": [{"productId": number, "quantity": number}],
    "customerInfo": {"name": "string", "email": "string"}
  },
  "appointmentIntent": {
    "serviceId": number,
    "preferredDate": "YYYY-MM-DD",
    "preferredTime": "HH:MM",
    "duration": number,
    "customerInfo": {"name": "string", "email": "string"},
    "paymentMethod": "pending" | "card" | "cash",
    "readyForConfirmation": boolean (true when all info collected, show order summary),
    "confirmed": boolean (true only when customer explicitly says "confirmed")
  }
}`;
    } else {
      userPrompt += `

Respond in JSON format with:
{
  "message": "your response to the customer",
  "suggestedProducts": [optional array of relevant product IDs],
  "requiresOrderInfo": boolean (true if you need more info to complete an order),
  "orderIntent": {
    "products": [{"productId": number, "quantity": number}],
    "customerInfo": {"name": "string", "email": "string"}
  }
}`;
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contextPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const aiResponse = JSON.parse(response.choices[0].message.content || "{}");
      
      // Enhance with actual product data if suggested
      if (aiResponse.suggestedProducts) {
        aiResponse.suggestedProducts = await this.getProductsByIds(aiResponse.suggestedProducts);
      }

      // Ensure proper response structure based on business type
      const businessType = this.settings.businessType || 'ecommerce';
      if (businessType === 'appointment_based') {
        // For appointment-based businesses, ensure we have appointment fields
        if (!aiResponse.appointmentIntent) {
          aiResponse.appointmentIntent = {};
        }
        if (!aiResponse.hasOwnProperty('requiresAppointmentInfo')) {
          aiResponse.requiresAppointmentInfo = false;
        }
        // Remove order-specific fields for appointment businesses
        delete aiResponse.orderIntent;
        delete aiResponse.requiresOrderInfo;
      } else if (businessType === 'ecommerce') {
        // For e-commerce, ensure we have order fields
        if (!aiResponse.orderIntent) {
          aiResponse.orderIntent = { products: [] };
        }
        if (!aiResponse.hasOwnProperty('requiresOrderInfo')) {
          aiResponse.requiresOrderInfo = false;
        }
        // Remove appointment-specific fields for e-commerce
        delete aiResponse.appointmentIntent;
        delete aiResponse.requiresAppointmentInfo;
      }

      return aiResponse;
    } catch (error) {
      console.error("AI processing error:", error);
      return {
        message: `Hello! I'm ${this.settings.assistantName} from ${this.settings.businessName}. I'm having a small technical issue right now, but I'm here to help! Could you please repeat your question?`,
      };
    }
  }

  private getToneGuidelines(): string {
    if (this.settings.tone === 'natural') {
      return `Natural & Conversational:
- Greet briefly, confirm understanding, state next steps simply
- Use conversational connectives: "sure," "of course," "no worries," "I'll check for you"
- Keep replies 40-250 characters (split longer messages into chunks)
- Add slight warmth with polite, natural phrasing
- End with open loops: "Let me know if you need to change the time" or "Happy to help with anything else"
- Avoid formal phrases like "Kindly be informed" or "It is required that"`;
    }
    return this.settings.tone;
  }

  private buildSystemPrompt(): string {
    const businessType = this.settings.businessType || 'ecommerce';
    
    if (businessType === 'appointment_based') {
      return `You are ${this.settings.assistantName}, a ${this.settings.tone === 'natural' ? 'natural, conversational' : 'professional'} appointment scheduler for ${this.settings.businessName}.

BUSINESS SETTINGS:
- Business Type: Appointment-based service
- Communication Style: ${this.getToneGuidelines()}
- Default appointment duration: ${this.settings.appointmentDuration || 60} minutes
- Lead time required: ${this.settings.bookingLeadTime || 24} hours

AVAILABLE SERVICES:
${this.products.map(p => `• ${p.name} - ${p.price} KWD (Service ID: ${p.id})\n  Description: ${p.description}\n  Duration: ${this.settings.appointmentDuration || 60} minutes`).join('\n')}

APPOINTMENT WORKFLOW:
1. GREETING: Welcome customers and ask about their service needs
2. SERVICE INQUIRY: Explain available services with pricing and duration
3. BOOKING REQUEST: When customer wants to book, confirm service choice
4. SCHEDULING: Ask for preferred date and time, check availability
5. CONFIRMATION: Confirm appointment details and collect contact info

BOOKING RULES:
- When customer wants to book a service, set appointmentIntent with serviceId
- Ask for preferred date and time (must be at least ${this.settings.bookingLeadTime || 24} hours in advance)
- ALWAYS collect customer name and email for booking confirmation
- Set requiresAppointmentInfo=true when you need any missing information
- Calculate total cost including service price
- After collecting all details, provide order summary and payment options (card payment link or cash payment)
- Use Kuwait timezone (UTC+3) for all time references
- Use exact service names and IDs from the catalog above

BOOKING WORKFLOW:
1. Service selection and pricing
2. Date/time preference (Kuwait timezone)
3. Customer contact details (name + email required)
4. Payment method selection (card payment link or cash)
5. Complete order summary presentation
6. Customer must say "confirmed" to finalize booking
7. Booking completion and confirmation message

EXAMPLE BOOKING FLOW:
Customer: "I want to book a manicure"
Response: "Perfect! Our Classic Manicure service is $35 and takes 60 minutes. What date and time would work best for you? (All times are in Kuwait timezone - UTC+3). Please note we need at least 24 hours advance notice."

After date/time: "Great! To complete your booking, I need your full name and email address for confirmation."

After payment method: "Perfect! Here's your complete order summary:

📋 APPOINTMENT DETAILS:
• Service: Classic Manicure 
• Duration: 60 minutes
• Date: [date]
• Time: [time] (Kuwait Time - UTC+3)
• Location: NailIt Studio

👤 CUSTOMER:
• Name: [customer name]
• Email: [customer email]

💰 PAYMENT:
• Total: $35 KWD
• Method: [card payment/cash at appointment]

Please review all details carefully. To confirm this appointment, please reply with 'confirmed'. Only after your confirmation will the appointment be officially booked."

JSON FORMAT: { "message": "response", "suggestedProducts": [], "requiresAppointmentInfo": boolean, "appointmentIntent": {"serviceId": number, "preferredDate": "YYYY-MM-DD", "preferredTime": "HH:MM", "duration": number} }`;
    
    } else if (businessType === 'hybrid') {
      return `You are ${this.settings.assistantName}, a friendly receptionist at ${this.settings.businessName}. Talk like a real person - warm, natural, and helpful.

OUR SERVICES:
${this.products.map(p => `• ${p.name} - ${p.price} KWD`).join('\n')}

HOW TO TALK:
- Use simple, natural language like a real receptionist would
- Ask one question at a time 
- Don't list services unless they ask "what do you offer?"
- Be conversational, not robotic
- Only mention specific services when relevant

CONVERSATION EXAMPLES:
- Start: "Hi! How can I help you today?"
- If they ask about services: "We offer manicures, pedicures, and gel polish. What are you interested in?"
- For booking: "When would be good for you?" then "What's your name and email?" 
- For payment: "Would you prefer to pay by card or cash at your appointment?"

BOOKING STEPS (one at a time):
1. Ask what they're looking for
2. Help them choose a service 
3. Ask which location they prefer
4. Ask when they'd like to come (date and time)
5. Get their name and email
6. Ask payment preference (card or cash)
7. Show complete summary and ask them to confirm
8. Only book after they say "confirmed"

CURRENT DATE: ${new Date().toISOString().split('T')[0]} (July 2, 2025)

LOCATIONS AVAILABLE:
${(this.settings.locations as any[])?.map ? (this.settings.locations as any[]).map((loc: any) => {
  let locationText = `• ${loc.name} - ${loc.address}`;
  if (loc.googleMapsLink) {
    locationText += `\n  Google Maps: ${loc.googleMapsLink}`;
  }
  return locationText;
}).join('\n') : '• Main Branch - Kuwait City'}

IMPORTANT CONVERSATION RULES:
- Never overwhelm with options
- Sound like a real person, not a chatbot
- Ask natural follow-up questions
- Get ALL info before showing summary: service, location, date, time, name, email, payment method
- Kuwait timezone, minimum 24 hours advance from current date
- Always wait for "confirmed" before booking
- Use KWD currency only (not dollars)
- Current date is July 2, 2025
- When asking about location, present each option with address and Google Maps link if available

${this.settings.tone === 'natural' ? `
NATURAL CONVERSATION STYLE:
- Keep messages 40-250 characters (split longer messages)
- Use connectives: "sure," "of course," "no worries," "I'll check for you"
- Greet briefly, confirm understanding, state next steps simply
- End with open loops like "Let me know if you need to change the time"
- Avoid formal phrases like "Kindly be informed" or "It is required that"
- Add slight warmth with polite, natural phrasing` : ''}`;
    
    } else {
      // Default e-commerce flow
      return `You are ${this.settings.assistantName}, a helpful sales assistant for ${this.settings.businessName}.

BUSINESS SETTINGS:
- Business Type: E-commerce
- Tone: ${this.settings.tone}
- Auto-suggest products: ${this.settings.autoSuggestProducts ? 'Yes' : 'No'}

PRODUCT CATALOG:
${this.products.map(p => `• ${p.name} - $${p.price} (Product ID: ${p.id})\n  Description: ${p.description}`).join('\n')}

ORDER WORKFLOW:
1. GREETING: Welcome customers and ask how you can help
2. PRODUCT INQUIRY: Describe available products with prices
3. ORDER TAKING: Confirm items and quantities
4. ORDER CONFIRMATION: Calculate total and collect delivery info
5. ORDER COMPLETION: Provide order summary

JSON FORMAT: { "message": "response", "suggestedProducts": [], "requiresOrderInfo": boolean, "orderIntent": {"products": [{"productId": number, "quantity": number}]} }`;
    }
  }

  private buildContextPrompt(
    customer: Customer,
    conversationHistory: Array<{ content: string; isFromAI: boolean }>
  ): string {
    let context = `CUSTOMER CONTEXT:
- Name: ${customer.name || "Customer"}
- Phone: ${customer.phoneNumber}
- Email: ${customer.email || "Not provided"}

`;

    if (conversationHistory.length > 0) {
      context += `CONVERSATION HISTORY:\n`;
      const recentHistory = conversationHistory.slice(-5);
      recentHistory.forEach((msg, index) => {
        const sender = msg.isFromAI ? this.settings.assistantName : (customer.name || "Customer");
        context += `${sender}: ${msg.content}\n`;
      });
      context += `\nRespond naturally to the customer's latest message based on this context.\n`;
    } else {
      context += `This is the first interaction with this customer. Use your professional greeting.\n`;
    }

    return context;
  }

  private async getProductsByIds(productIds: number[]): Promise<Product[]> {
    const products: Product[] = [];
    for (const id of productIds) {
      const product = await storage.getProduct(id);
      if (product && product.isActive) {
        products.push(product);
      }
    }
    return products;
  }

  async generateWelcomeMessage(customer: Customer): Promise<string> {
    await this.initialize();
    
    const hasName = customer.name && customer.name.trim() !== '';
    const greeting = hasName 
      ? `Hello ${customer.name}! ${this.settings.welcomeMessage}` 
      : this.settings.welcomeMessage;

    return greeting;
  }

  async suggestProducts(query: string): Promise<Product[]> {
    if (!this.settings.autoSuggestProducts) {
      return [];
    }

    // Simple keyword matching for product suggestions
    const keywords = query.toLowerCase().split(' ');
    const relevantProducts = this.products.filter(product => {
      const productText = `${product.name} ${product.description}`.toLowerCase();
      return keywords.some(keyword => productText.includes(keyword));
    });

    return relevantProducts.slice(0, 3); // Return top 3 matches
  }
}

export const aiAgent = new AIAgent();
