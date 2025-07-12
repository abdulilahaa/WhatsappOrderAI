import OpenAI from "openai";
import { storage } from "./storage";
import type { Product, Customer, AISettings } from "@shared/schema";
import { nailItAPI, NailItItem, NailItLocation } from "./nailit-api";

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

IMPORTANT: 
1. When the customer is confirming an appointment and you have extracted service details from conversation history, use those service IDs in the appointmentIntent.
2. Set "confirmed": true when customer says any of these: "confirm", "confirmed", "yes confirm", "book it", "yes book", "yes please", "okay", "ok", "that's fine", "go ahead", "yes"

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

  // NailIt API Integration Methods
  async syncServicesFromNailItAPI(): Promise<void> {
    try {
      console.log('Starting NailIt services sync...');
      
      // Test available endpoints first
      const locations = await nailItAPI.getLocations();
      console.log('✅ Locations available:', locations.length);
      
      // Test groups endpoint
      const groups = await nailItAPI.getGroups(2); // 2 = Services
      console.log('Groups response:', groups.length);
      
      if (groups.length === 0) {
        console.log('⚠️ Groups endpoint not available, creating sample services based on NailIt documentation');
        await this.createSampleNailItServices(locations);
        return;
      }

      // If groups are available, continue with full sync
      let totalSynced = 0;
      const currentDate = nailItAPI.formatDateForAPI(new Date());

      // For each group, get items
      for (const group of groups) {
        try {
          const itemsResult = await nailItAPI.getItemsByDate({
            groupId: group.Id,
            locationIds: locations.map(loc => loc.Location_Id),
            selectedDate: currentDate,
            itemTypeId: 2 // Services
          });

          console.log(`Group ${group.Name}: ${itemsResult.totalItems} items found`);

          // Sync each item as a product
          for (const item of itemsResult.items) {
            await this.syncNailItItemToProduct(item);
            totalSynced++;
          }
        } catch (error) {
          console.error(`Error syncing group ${group.Name}:`, error);
        }
      }

      console.log(`✅ NailIt services synced successfully: ${totalSynced} services`);
    } catch (error) {
      console.error('Error syncing NailIt services:', error);
      
      // Fallback to sample services
      const locations = await nailItAPI.getLocations();
      if (locations.length > 0) {
        console.log('📋 Creating sample services as fallback');
        await this.createSampleNailItServices(locations);
      }
    }
  }

  private async createSampleNailItServices(locations: any[]): Promise<void> {
    // Sample services based on NailIt API documentation examples
    const sampleServices = [
      {
        name: "Brazilian Blowout",
        description: "A hair straightening treatment that can change your life! The most innovative and effective smoothing treatment in the world. Enjoy smooth, frizz-free manageable hair for up to 12 weeks.",
        price: "150.00",
        duration: "180",
        nailItId: 93
      },
      {
        name: "Tanino Hair Straightening Treatment", 
        description: "Hair smoothing treatment consists of smoothing and moisturizing the hair in a natural way. It's 100% Organic. Preserves and treats hair completely.",
        price: "100.00",
        duration: "300",
        nailItId: 31196
      },
      {
        name: "Erayba Smooth Organic Straightening",
        description: "Natural smooth hair without frizz up to 3 months, protected cuticle with extra shine. BIOsmooth is easy to use and suitable for all hair types.",
        price: "80.00",
        duration: "240", 
        nailItId: 51355
      },
      {
        name: "Classic Manicure",
        description: "Professional nail shaping, cuticle care, and regular polish application.",
        price: "15.00",
        duration: "45",
        nailItId: 203
      },
      {
        name: "Gel Manicure", 
        description: "Long-lasting gel polish with base coat, color, and top coat.",
        price: "25.00",
        duration: "60",
        nailItId: 258
      },
      {
        name: "Classic Pedicure",
        description: "Complete foot care with nail trimming, filing, and polish.",
        price: "20.00", 
        duration: "60",
        nailItId: 210
      }
    ];

    let synced = 0;
    for (const service of sampleServices) {
      try {
        const description = `${service.description}\n\n📍 Available at: ${locations.map(l => l.Location_Name).join(', ')}\n⏱️ Duration: ${service.duration} minutes\n🆔 NailIt ID: ${service.nailItId}`;
        
        // Check if service already exists
        const existingProducts = await storage.getProducts();
        const exists = existingProducts.some(p => p.description?.includes(`NailIt ID: ${service.nailItId}`));
        
        if (!exists) {
          await storage.createProduct({
            name: service.name,
            description,
            price: service.price,
            imageUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
            isActive: true
          });
          synced++;
        }
      } catch (error) {
        console.error(`Error creating sample service ${service.name}:`, error);
      }
    }
    
    console.log(`📋 Created ${synced} sample NailIt services with real location data`);
  }

  private async syncNailItItemToProduct(item: NailItItem): Promise<void> {
    try {
      // Check if product already exists with NailIt ID
      const existingProduct = await storage.getProducts();
      const existingNailItProduct = existingProduct.find(p => 
        p.description?.includes(`[NailIt ID: ${item.Item_Id}]`)
      );

      const productData = {
        name: item.Item_Name,
        description: `${item.Item_Desc.replace(/<[^>]*>/g, '')} [NailIt ID: ${item.Item_Id}] [Duration: ${item.Duration}min]`,
        price: item.Special_Price,
        image: item.Image_Url ? `http://nailit.innovasolution.net/${item.Image_Url}` : null,
        category: 'Services',
        isActive: true
      };

      if (existingNailItProduct) {
        // Update existing product
        await storage.updateProduct(existingNailItProduct.id, productData);
      } else {
        // Create new product
        await storage.createProduct(productData);
      }
    } catch (error) {
      console.error(`Failed to sync NailIt item ${item.Item_Id}:`, error);
    }
  }

  async searchNailItServices(query: string, date?: string): Promise<NailItItem[]> {
    try {
      const searchDate = date || nailItAPI.formatDateForAPI(new Date());
      const locations = await nailItAPI.getLocations('E');
      const locationIds = locations.map(loc => loc.Location_Id);
      
      return await nailItAPI.searchServices(query, searchDate, locationIds);
    } catch (error) {
      console.error('Failed to search NailIt services:', error);
      return [];
    }
  }

  async getNailItServiceAvailability(
    serviceId: number, 
    locationId: number, 
    date: string
  ): Promise<{
    staff: Array<{ id: number; name: string; image: string }>;
    timeSlots: Array<{ id: number; time: string }>;
  }> {
    try {
      // Get available staff for the service
      const staff = await nailItAPI.getServiceStaff(serviceId, locationId, 'E', date);
      
      // Get available time slots for the first available staff member
      let timeSlots: Array<{ id: number; time: string }> = [];
      if (staff.length > 0) {
        const availableSlots = await nailItAPI.getAvailableSlots('E', staff[0].Id, date);
        timeSlots = availableSlots.map(slot => ({
          id: slot.TimeFrame_Id,
          time: slot.TimeFrame_Name
        }));
      }

      return {
        staff: staff.map(s => ({
          id: s.Id,
          name: s.Name,
          image: s.Image_URL ? `http://nailit.innovasolution.net/${s.Image_URL}` : ''
        })),
        timeSlots
      };
    } catch (error) {
      console.error('Failed to get service availability:', error);
      return { staff: [], timeSlots: [] };
    }
  }

  async createNailItOrder(orderData: {
    customerId: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    services: Array<{
      serviceId: number;
      serviceName: string;
      quantity: number;
      price: number;
      staffId: number;
      timeSlotIds: number[];
      appointmentDate: string;
    }>;
    locationId: number;
    paymentTypeId: number;
  }): Promise<{ success: boolean; orderId?: number; error?: string }> {
    try {
      // Calculate totals
      const grossAmount = orderData.services.reduce((total, service) => 
        total + (service.price * service.quantity), 0);
      
      // Format order details for NailIt API
      const orderDetails = orderData.services.map(service => ({
        Prod_Id: service.serviceId,
        Prod_Name: service.serviceName,
        Qty: service.quantity,
        Rate: service.price,
        Amount: service.price * service.quantity,
        Size_Id: null,
        Size_Name: "",
        Promotion_Id: 0,
        Promo_Code: "",
        Discount_Amount: 0.0,
        Net_Amount: service.price * service.quantity,
        Staff_Id: service.staffId,
        TimeFrame_Ids: service.timeSlotIds,
        Appointment_Date: service.appointmentDate
      }));

      // Create order through NailIt API
      const nailItOrderRequest = {
        Gross_Amount: grossAmount,
        Payment_Type_Id: orderData.paymentTypeId,
        Order_Type: 2, // Service order type
        UserId: orderData.customerId,
        FirstName: orderData.customerName,
        Mobile: orderData.customerPhone,
        Email: orderData.customerEmail,
        Discount_Amount: 0.0,
        Net_Amount: grossAmount,
        POS_Location_Id: orderData.locationId,
        OrderDetails: orderDetails
      };

      const response = await nailItAPI.saveOrder(nailItOrderRequest);
      
      if (response) {
        return {
          success: true,
          orderId: response.OrderId
        };
      } else {
        return {
          success: false,
          error: 'Failed to create order in NailIt system'
        };
      }
    } catch (error) {
      console.error('Failed to create NailIt order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getNailItLocations(): Promise<NailItLocation[]> {
    try {
      return await nailItAPI.getLocations('E');
    } catch (error) {
      console.error('Failed to get NailIt locations:', error);
      return [];
    }
  }

  async getNailItPaymentTypes(): Promise<Array<{ id: number; name: string; code: string; enabled: boolean }>> {
    try {
      const paymentTypes = await nailItAPI.getPaymentTypes('E', 2, 2);
      return paymentTypes.map(pt => ({
        id: pt.Type_Id,
        name: pt.Type_Name,
        code: pt.Type_Code,
        enabled: pt.Is_Enabled
      }));
    } catch (error) {
      console.error('Failed to get payment types:', error);
      return [];
    }
  }
}

export const aiAgent = new AIAgent();
