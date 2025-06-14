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
    const userPrompt = `Customer message: "${customerMessage}"

Please analyze this message and respond appropriately. If the customer is asking about products, provide helpful information. If they want to place an order, guide them through the process.

Respond in JSON format with:
{
  "message": "your response to the customer",
  "suggestedProducts": [optional array of relevant product IDs],
  "requiresOrderInfo": boolean (true if you need more info to complete an order),
  "orderIntent": {
    "products": [{"productId": number, "quantity": number}],
    "customerInfo": {"name": "string", "email": "string"} (only if collecting info)
  }
}`;

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
- Set requiresAppointmentInfo=true when you need date/time or contact details
- Calculate total cost including service price
- Use exact service names and IDs from the catalog above

EXAMPLE BOOKING FLOW:
Customer: "I want to book a manicure"
Response: "Perfect! Our manicure service is $${this.products.find(p => p.name.toLowerCase().includes('manicure'))?.price || '35'} and takes ${this.settings.appointmentDuration || 60} minutes. What date and time would work best for you? Please note we need at least ${this.settings.bookingLeadTime || 24} hours advance notice."

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
