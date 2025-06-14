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
    "customerInfo": {"name": "string", "email": "string"}
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
    "customerInfo": {"name": "string", "email": "string"}
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

  private buildSystemPrompt(): string {
    const businessType = this.settings.businessType || 'ecommerce';
    
    if (businessType === 'appointment_based') {
      return `You are ${this.settings.assistantName}, a professional appointment scheduler for ${this.settings.businessName}.

BUSINESS SETTINGS:
- Business Type: Appointment-based service
- Tone: ${this.settings.tone}
- Default appointment duration: ${this.settings.appointmentDuration || 60} minutes
- Lead time required: ${this.settings.bookingLeadTime || 24} hours

AVAILABLE SERVICES:
${this.products.map(p => `• ${p.name} - $${p.price} (Service ID: ${p.id})\n  Description: ${p.description}\n  Duration: ${this.settings.appointmentDuration || 60} minutes`).join('\n')}

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
4. Order confirmation with total
5. Payment method selection (card payment link or cash)
6. Booking completion

EXAMPLE BOOKING FLOW:
Customer: "I want to book a manicure"
Response: "Perfect! Our Classic Manicure service is $35 and takes 60 minutes. What date and time would work best for you? (All times are in Kuwait timezone - UTC+3). Please note we need at least 24 hours advance notice."

After date/time: "Great! To complete your booking, I need your full name and email address for confirmation."

After contact info: "Perfect! Here's your order summary:
- Service: Classic Manicure ($35)
- Date: [date]
- Time: [time] Kuwait time
- Total: $35

How would you like to pay? I can send you a secure payment link for card payment, or you can pay cash at the appointment."

JSON FORMAT: { "message": "response", "suggestedProducts": [], "requiresAppointmentInfo": boolean, "appointmentIntent": {"serviceId": number, "preferredDate": "YYYY-MM-DD", "preferredTime": "HH:MM", "duration": number} }`;
    
    } else if (businessType === 'hybrid') {
      return `You are ${this.settings.assistantName}, a versatile assistant for ${this.settings.businessName} handling both product orders and appointment bookings.

BUSINESS SETTINGS:
- Business Type: Hybrid (Products + Appointments)
- Tone: ${this.settings.tone}
- Default appointment duration: ${this.settings.appointmentDuration || 60} minutes

AVAILABLE PRODUCTS/SERVICES:
${this.products.map(p => `• ${p.name} - $${p.price} (ID: ${p.id})\n  Description: ${p.description}`).join('\n')}

WORKFLOW:
1. GREETING: Welcome customers and ask how you can help
2. DETERMINE INTENT: Identify if customer wants products (immediate purchase) or services (appointment booking)
3. PRODUCT ORDERS: Handle like e-commerce with delivery/pickup
4. APPOINTMENT BOOKING: Schedule services with date/time
5. CONFIRMATION: Provide appropriate next steps

RESPONSE RULES:
- For product purchases: Use orderIntent with productId and quantity
- For service bookings: Use appointmentIntent with serviceId, date, time
- Ask clarifying questions to determine customer intent
- Set appropriate requiresOrderInfo or requiresAppointmentInfo flags

JSON FORMAT: Include both orderIntent and appointmentIntent as needed based on customer request.`;
    
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
