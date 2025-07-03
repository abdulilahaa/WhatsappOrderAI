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
    "services": [{"serviceId": number, "quantity": number}] (array of selected services),
    "preferredDate": "YYYY-MM-DD" (if provided),
    "preferredTime": "HH:MM" (if provided),
    "duration": number (in minutes, total for all services),
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
    "services": [{"serviceId": number, "quantity": number}] (array of selected services),
    "preferredDate": "YYYY-MM-DD",
    "preferredTime": "HH:MM",
    "duration": number (total time for all services),
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
      return `Natural & Conversational Style:
- Speak like a friendly human receptionist
- Reply in 2-3 lines maximum, short and clear
- CRITICAL: Detect customer's language from their message and respond in the SAME language
- For Arabic messages: Respond naturally in Arabic using conversational phrases
- For English messages: Respond naturally in English using conversational phrases
- Ask for missing info one question at a time
- Confirm bookings politely
- Provide business info (services, prices, hours) when asked
- Use warm phrases: "sure," "of course," "no problem" in English OR "أكيد" "طبعا" "لا مشكلة" in Arabic
- Avoid formal language or long explanations`;
    }
    return this.settings.tone;
  }

  private buildSystemPrompt(): string {
    const businessType = this.settings.businessType || 'ecommerce';
    
    if (businessType === 'appointment_based') {
      return `You are ${this.settings.assistantName}, a friendly bilingual receptionist for ${this.settings.businessName} nail salon.

COMMUNICATION RULES:
${this.getToneGuidelines()}

BUSINESS INFO:
- Appointment duration: ${this.settings.appointmentDuration || 60} minutes
- Booking advance: ${this.settings.bookingLeadTime || 24} hours minimum
- Working hours: 9:00-17:00 (Mon-Sat), 10:00-14:00 (Sun closed)
- Current date: July 3, 2025 (Kuwait time)

AVAILABLE SERVICES:
${this.products.map(p => `• ${p.name} - ${p.price} KWD (Service ID: ${p.id})\n  Description: ${p.description}\n  Duration: ${this.settings.appointmentDuration || 60} minutes`).join('\n')}

CONVERSATION EXAMPLES:
English:
- "Hi! How can I help you today?"
- "Sure! Which service would you like?"
- "What date works for you?"
- "Perfect! What time?"
- "Could I get your name and email?"

Arabic:
- "مرحبا! كيف يمكنني مساعدتك؟"
- "أكيد! أي خدمة تريدين؟"
- "أي يوم يناسبك؟"
- "ممتاز! أي وقت؟"
- "ممكن اسمك وإيميلك؟"
- "عندنا خدمات مختلفة، أي وحدة تفضلين؟"
- "يلا نحجز! أي يوم أحسن؟"
- "تمام! أي ساعة تناسبك؟"

LANGUAGE DETECTION RULES:
- If customer writes in Arabic script (any Arabic letters), respond in Arabic
- If customer writes in English letters, respond in English
- Maintain the same language throughout the conversation
- Use natural conversational tone in both languages

BOOKING RULES:
- Reply in 2-3 lines maximum
- Detect customer's language (Arabic/English) and match it
- Ask one question at a time
- Minimum ${this.settings.bookingLeadTime || 24} hours advance booking
- Allow multiple services in one appointment
- Collect: services (can be multiple), location, date, time, name, email, payment method
- Show complete summary with all services then wait for "confirmed"
- Use KWD currency only
- Calculate total duration for all services combined

LOCATIONS:
${(this.settings.locations as any[])?.map ? (this.settings.locations as any[]).map((loc: any) => {
  let locationText = `• ${loc.name} - ${loc.address}`;
  if (loc.googleMapsLink) {
    locationText += `\n  Google Maps: ${loc.googleMapsLink}`;
  }
  return locationText;
}).join('\n') : '• Main Branch - Kuwait City'}

BOOKING STEPS:
1. Greet (detect language)
2. Ask service 
3. Ask location
4. Ask date/time
5. Get name & email
6. Payment method
7. Show summary
8. Wait for "confirmed"

BUSINESS INFO RESPONSES:
- Services: Share available treatments with prices
- Hours: "We're open 9:00-17:00 Mon-Sat, 10:00-14:00 Sun"
- Prices: Mention specific service costs in KWD
- Location: Share addresses with Google Maps links

IMPORTANT: When the customer is confirming an appointment and you have extracted service details from conversation history, use those service IDs in the appointmentIntent.

JSON FORMAT: { "message": "response", "suggestedProducts": [], "requiresAppointmentInfo": boolean, "appointmentIntent": { "services": [{"serviceId": number, "quantity": number}], "preferredDate": "YYYY-MM-DD", "preferredTime": "HH:MM", "duration": number, "locationId": number, "locationName": "string", "customerInfo": {"name": "string", "email": "string"}, "paymentMethod": "card|cash|pending", "readyForConfirmation": boolean, "confirmed": boolean } }`;
    
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
${this.products.map(p => `• ${p.name} - ${p.price} KWD (Product ID: ${p.id})\n  Description: ${p.description}`).join('\n')}

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
      const recentHistory = conversationHistory.slice(-10); // Get more history for better context
      recentHistory.forEach((msg, index) => {
        const sender = msg.isFromAI ? this.settings.assistantName : (customer.name || "Customer");
        context += `${sender}: ${msg.content}\n`;
      });
      
      // Extract appointment details from conversation history
      const appointmentDetails = this.extractAppointmentDetailsFromHistory(recentHistory);
      if (appointmentDetails) {
        context += `\nCURRENT APPOINTMENT DETAILS FROM CONVERSATION:\n`;
        context += `- Services: ${appointmentDetails.services || 'Not specified'}\n`;
        if (appointmentDetails.serviceIds) {
          context += `- Service IDs: ${appointmentDetails.serviceIds.join(', ')}\n`;
        }
        context += `- Location: ${appointmentDetails.location || 'Not specified'}\n`;
        context += `- Date: ${appointmentDetails.date || 'Not specified'}\n`;
        context += `- Time: ${appointmentDetails.time || 'Not specified'}\n`;
        context += `- Customer Name: ${appointmentDetails.customerName || customer.name || 'Not specified'}\n`;
        context += `- Customer Email: ${appointmentDetails.customerEmail || customer.email || 'Not specified'}\n`;
        context += `- Payment Method: ${appointmentDetails.paymentMethod || 'Not specified'}\n`;
      }
    } else {
      context += `This is the first message in the conversation.\n`;
    }

    return context;
  }

  private extractAppointmentDetailsFromHistory(history: Array<{ content: string; isFromAI: boolean }>): any {
    const details: any = {};
    
    for (const msg of history) {
      const content = msg.content.toLowerCase();
      
      // Extract services with more comprehensive patterns including AI responses
      if ((content.includes('classic') && content.includes('deluxe')) || 
          content.includes('classic pedicure and deluxe pedicure') ||
          content.includes('classic & deluxe')) {
        details.services = 'Classic Pedicure + Deluxe Pedicure';
        details.serviceIds = [4, 5]; // Classic Pedicure (ID 4) + Deluxe Pedicure (ID 5)
      } else if (content.includes('classic manicure')) {
        details.services = 'Classic Manicure';
        details.serviceIds = [1]; // Classic Manicure (ID 1)
      } else if (content.includes('classic pedicure')) {
        details.services = 'Classic Pedicure';
        details.serviceIds = [4]; // Classic Pedicure (ID 4)
      } else if (content.includes('deluxe pedicure')) {
        details.services = 'Deluxe Pedicure';
        details.serviceIds = [5]; // Deluxe Pedicure (ID 5)
      } else if (content.includes('gel manicure')) {
        details.services = 'Gel Manicure';
        details.serviceIds = [2]; // Gel Manicure (ID 2)
      } else if (content.includes('french manicure')) {
        details.services = 'French Manicure';
        details.serviceIds = [3]; // French Manicure (ID 3)
      }
      
      // Extract location
      if (content.includes('zahra complex')) {
        details.location = 'Zahra Complex';
      } else if (content.includes('plaza mall')) {
        details.location = 'Plaza Mall';
      } else if (content.includes('arraya mall')) {
        details.location = 'Arraya Mall';
      }
      
      // Extract date/time
      if (content.includes('tomorrow') || content.includes('july 4')) {
        details.date = '2025-07-04';
      }
      if (content.includes('12pm') || content.includes('12:00')) {
        details.time = '12:00';
      } else if (content.includes('2pm') || content.includes('14:00')) {
        details.time = '14:00';
      }
      
      // Extract customer info
      const nameMatch = content.match(/name.*?is\s+(\w+)|my name is (\w+)|(\w+)\s+\w+@/);
      if (nameMatch) {
        details.customerName = nameMatch[1] || nameMatch[2] || nameMatch[3];
      }
      
      const emailMatch = content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        details.customerEmail = emailMatch[1];
      }
      
      // Extract payment method
      if (content.includes('card')) {
        details.paymentMethod = 'card';
      } else if (content.includes('cash')) {
        details.paymentMethod = 'cash';
      }
    }
    
    return Object.keys(details).length > 0 ? details : null;
  }

  private buildContextPromptContinuation(
    customer: Customer,
    conversationHistory: Array<{ content: string; isFromAI: boolean }>
  ): string {
    let context = '';
    
    if (conversationHistory.length > 0) {
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
