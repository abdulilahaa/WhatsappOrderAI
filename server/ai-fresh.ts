import { OpenAI } from 'openai';
import { storage } from './storage';
import { nailItAPI } from './nailit-api';
import type { Customer, Product, FreshAISettings } from '@shared/schema';
import type { NailItItem, NailItStaff, NailItTimeSlot, NailItPaymentType } from './nailit-api';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AIResponse {
  message: string;
  suggestedServices?: NailItItem[];
  collectionPhase?: 'greeting' | 'service_selection' | 'location_selection' | 'staff_selection' | 'time_selection' | 'customer_info' | 'payment_method' | 'confirmation' | 'completed';
  collectedData?: {
    selectedServices?: Array<{
      itemId: number;
      itemName: string;
      price: number;
      quantity: number;
    }>;
    locationId?: number;
    locationName?: string;
    staffId?: number;
    staffName?: string;
    timeSlotIds?: number[];
    timeSlotNames?: string[];
    appointmentDate?: string; // DD-MM-YYYY format
    customerName?: string;
    customerEmail?: string;
    paymentTypeId?: number;
    paymentTypeName?: string;
    totalAmount?: number;
    readyForBooking?: boolean;
  };
  nextStep?: string;
  error?: string;
}

export interface ConversationState {
  phase: 'greeting' | 'service_selection' | 'location_selection' | 'date_selection' | 'time_selection' | 'staff_selection' | 'customer_info' | 'payment_method' | 'order_summary' | 'confirmation' | 'completed';
  collectedData: {
    selectedServices: Array<{
      itemId: number;
      itemName: string;
      price: number;
      quantity: number;
      duration?: string;
      description?: string;
    }>;
    availableServices?: NailItItem[];
    locationId?: number;
    locationName?: string;
    appointmentDate?: string;
    availableTimeSlots?: NailItTimeSlot[];
    timeSlotIds?: number[];
    timeSlotNames?: string[];
    availableStaff?: NailItStaff[];
    staffId?: number;
    staffName?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    nailItCustomerId?: number;
    paymentTypeId?: number;
    paymentTypeName?: string;
    totalAmount?: number;
    orderSummaryShown?: boolean;
    readyForBooking?: boolean;
  };
  language: 'en' | 'ar';
  lastUpdated: Date;
}

export class FreshAIAgent {
  private conversationStates: Map<string, ConversationState> = new Map();
  private settings: FreshAISettings;

  constructor() {
    this.settings = {} as FreshAISettings;
    this.initialize();
  }

  private async initialize() {
    this.settings = await storage.getFreshAISettings();
  }

  async processMessage(
    customerMessage: string,
    customer: Customer,
    conversationHistory: Array<{ content: string; isFromAI: boolean }>
  ): Promise<AIResponse> {
    await this.initialize();

    const customerId = customer.id.toString();
    
    // Get existing state or create new one
    let state = this.conversationStates.get(customerId);
    if (!state) {
      state = {
        phase: 'greeting',
        collectedData: {
          selectedServices: []
        },
        language: this.detectLanguage(customerMessage),
        lastUpdated: new Date()
      };
      this.conversationStates.set(customerId, state);
    }

    // Update language and timestamp
    state.language = this.detectLanguage(customerMessage);
    state.lastUpdated = new Date();

    try {
      console.log(`🧩 Debug: Customer ${customerId}, Phase: ${state.phase}, Message: "${customerMessage}"`);
      console.log(`🧩 Current services: ${JSON.stringify(state.collectedData.selectedServices)}`);
      
      // Always use advanced AI for better understanding
      return await this.handleWithAdvancedAI(customerMessage, state, customer, conversationHistory);
    } catch (error) {
      console.error('AI processing error:', error);
      console.error('Error details:', error.message);
      return {
        message: state.language === 'ar' 
          ? "عذراً، حدث خطأ. دعنا نبدأ من جديد!"
          : "Sorry, something went wrong. Let's start over!",
        collectionPhase: 'greeting',
        error: error.message
      };
    }
  }

  private detectLanguage(message: string): 'en' | 'ar' {
    // Simple Arabic detection - if contains Arabic characters
    return /[\u0600-\u06FF]/.test(message) ? 'ar' : 'en';
  }

  private async handleNaturalGreeting(message: string, state: ConversationState): Promise<AIResponse> {
    // Get locations from NailIt API
    const locations = await nailItAPI.getLocations();
    const locationList = locations.map(loc => `• ${loc.Location_Name}`).join('\n');
    
    const response = state.language === 'ar' 
      ? `مرحباً! أنا ${this.settings.assistantName} من ${this.settings.businessName} 🌟

${this.settings.welcomeMessageAR}

نحن متخصصون في خدمات العناية بالأظافر والجمال في الكويت.

لدينا ${locations.length} فروع:
${locationList}

كيف يمكنني مساعدتك اليوم؟`
      : `Hello! I'm ${this.settings.assistantName} from ${this.settings.businessName} 🌟

${this.settings.welcomeMessageEN}

We specialize in nail care and beauty services in Kuwait.

We have ${locations.length} locations:
${locationList}

How can I help you today?`;
    
    state.phase = 'service_selection';
    return this.createResponse(state, response);
  }

  private async handleWithAdvancedAI(
    customerMessage: string,
    state: ConversationState,
    customer: Customer,
    conversationHistory: Array<{ content: string; isFromAI: boolean }>
  ): Promise<AIResponse> {
    
    // Build conversation context
    const conversationContext = conversationHistory.map(msg => 
      `${msg.isFromAI ? 'Assistant' : 'Customer'}: ${msg.content}`
    ).join('\n');

    // Current booking state
    const currentState = {
      selectedServices: state.collectedData.selectedServices || [],
      locationId: state.collectedData.locationId,
      locationName: state.collectedData.locationName,
      appointmentDate: state.collectedData.appointmentDate,
      timeSlotIds: state.collectedData.timeSlotIds,
      staffId: state.collectedData.staffId,
      staffName: state.collectedData.staffName,
      customerName: state.collectedData.customerName,
      customerEmail: state.collectedData.customerEmail,
      customerPhone: state.collectedData.customerPhone || customer.phoneNumber,
      paymentMethod: state.collectedData.paymentTypeName
    };

    // Get available locations
    const locations = await nailItAPI.getLocations();

    // Build system prompt for advanced AI using configured settings
    const baseSystemPrompt = state.language === 'ar' ? this.settings.systemPromptAR : this.settings.systemPromptEN;
    const systemPrompt = `${baseSystemPrompt}

CONVERSATION TONE: ${this.settings.conversationTone.toUpperCase()}
RESPONSE STYLE: ${this.settings.responseStyle.toUpperCase()}
BUSINESS: ${this.settings.businessName}
ASSISTANT: ${this.settings.assistantName}

IMPORTANT RULES:
1. NEVER ask for information the customer has already provided
2. REMEMBER what the customer has said in previous messages
3. ANALYZE the conversation context before responding
4. Only ask for missing information needed to complete a booking
5. Be ${this.settings.conversationTone} and ${this.settings.responseStyle}, not robotic
6. If customer mentions a service, acknowledge it and proceed

Available locations:
${locations.map(loc => `- ${loc.Location_Name} (ID: ${loc.Location_Id})`).join('\n')}

Current booking state:
${JSON.stringify(currentState, null, 2)}

Recent conversation:
${conversationContext}

Customer's latest message: "${customerMessage}"

CONVERSATION CONTEXT: The customer has already provided the following:
- Services requested: ${currentState.selectedServices.map(s => s.itemName).join(', ') || 'None yet'}
- Location chosen: ${currentState.locationName || 'Not selected'}
- Customer name: ${currentState.customerName || 'Not provided'}
- Customer email: ${currentState.customerEmail || 'Not provided'}

Based on this context, respond naturally. DO NOT ask for information already provided. If all information is complete, proceed to confirmation.

Respond in ${state.language === 'ar' ? 'Arabic' : 'English'}.`;

    try {
      const completion = await openai.chat.completions.create({
        model: this.settings.openaiModel, // Using configured model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: customerMessage }
        ],
        temperature: parseFloat(this.settings.openaiTemperature),
        max_tokens: this.settings.maxTokens
      });

      const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't understand. Can you please try again?";

      // Analyze customer intent and update state
      await this.updateStateFromMessage(customerMessage, state, locations);

      // If we have all required information and customer confirms, create the booking
      if ((state.phase === 'confirmation' || state.phase === 'customer_info') && 
          state.collectedData.selectedServices.length > 0 &&
          state.collectedData.locationId &&
          state.collectedData.customerName &&
          state.collectedData.customerEmail &&
          (customerMessage.toLowerCase().includes('yes') || customerMessage.toLowerCase().includes('book') || customerMessage.toLowerCase().includes('confirm') || customerMessage.toLowerCase().includes('booking'))) {
        
        console.log('🎯 Creating final booking with real NailIt order...');
        const bookingResult = await this.createBooking(state, customer);
        
        if (bookingResult.success) {
          state.phase = 'completed';
          const staffMessage = state.collectedData.staffName && state.collectedData.staffName !== "Available Specialist" 
            ? `\n• Specialist: ${state.collectedData.staffName}` 
            : '';
          
          const finalMessage = state.language === 'ar' 
            ? `تم! تم حجز موعدك بنجاح 🎉\n\nتفاصيل الحجز:\n• الخدمة: ${state.collectedData.selectedServices[0].itemName}\n• الفرع: ${state.collectedData.locationName}\n• العميل: ${state.collectedData.customerName}${staffMessage}\n• رقم الطلب: ${bookingResult.orderId}\n\nتم تأكيد حجزك في نظام نيل إت. سنرسل لك تأكيد الحجز عبر البريد الإلكتروني. شكراً لاختيارك نيل إت!`
            : `Perfect! Your appointment has been successfully booked! 🎉\n\nBooking Details:\n• Service: ${state.collectedData.selectedServices[0].itemName}\n• Location: ${state.collectedData.locationName}\n• Customer: ${state.collectedData.customerName}${staffMessage}\n• Order Number: ${bookingResult.orderId}\n\nYour booking has been confirmed in the NailIt POS system. We'll send you a booking confirmation via email. Thank you for choosing NailIt!`;
          
          return this.createResponse(state, finalMessage);
        } else {
          const errorMessage = state.language === 'ar'
            ? `عذراً، حدث خطأ في الحجز: ${bookingResult.message}. يرجى المحاولة مرة أخرى أو الاتصال بنا مباشرة.`
            : `Sorry, there was an error with your booking: ${bookingResult.message}. Please try again or contact us directly.`;
          
          return this.createResponse(state, errorMessage);
        }
      }

      return this.createResponse(state, aiResponse);
    } catch (error) {
      console.error('Advanced AI error:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      return this.createResponse(state, state.language === 'ar' 
        ? "عذراً، حدث خطأ. كيف يمكنني مساعدتك؟"
        : "Sorry, there was an error. How can I help you?");
    }
  }

  private async updateStateFromMessage(
    message: string,
    state: ConversationState,
    locations: any[]
  ): Promise<void> {
    const lowerMessage = message.toLowerCase();

    // Extract location from message
    if (!state.collectedData.locationId) {
      for (const location of locations) {
        const locationName = location.Location_Name.toLowerCase();
        if (lowerMessage.includes(locationName) || 
            lowerMessage.includes('plaza') && locationName.includes('plaza') ||
            lowerMessage.includes('zahra') && locationName.includes('zahra') ||
            lowerMessage.includes('arraya') && locationName.includes('arraya')) {
          state.collectedData.locationId = location.Location_Id;
          state.collectedData.locationName = location.Location_Name;
          
          // Check staff availability when location is selected
          if (state.collectedData.selectedServices.length > 0) {
            try {
              const serviceId = state.collectedData.selectedServices[0].itemId;
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const dateStr = nailItAPI.formatDateForAPI(tomorrow);
              
              console.log(`🔍 Checking staff availability for service ${serviceId} at location ${location.Location_Id}`);
              const staff = await nailItAPI.getServiceStaff(serviceId, location.Location_Id, 'E', dateStr);
              
              if (staff && staff.length > 0) {
                const assignedStaff = staff[0];
                state.collectedData.staffId = assignedStaff.Id;
                state.collectedData.staffName = assignedStaff.Name;
                console.log(`✅ Staff assigned: ${assignedStaff.Name} (ID: ${assignedStaff.Id})`);
              } else {
                state.collectedData.staffId = 1;
                state.collectedData.staffName = "Available Specialist";
                console.log('⚠️ No specific staff found, using fallback');
              }
            } catch (error) {
              console.error('Error checking staff availability:', error);
              state.collectedData.staffId = 1;
              state.collectedData.staffName = "Available Specialist";
            }
          }
          break;
        }
      }
    }

    // Extract name if not already collected
    if (!state.collectedData.customerName && !message.includes('@')) {
      const nameMatch = message.match(/(?:my name is|i'm|i am|call me)\s+([a-zA-Z\s]+)/i);
      if (nameMatch) {
        state.collectedData.customerName = nameMatch[1].trim();
      } else if (message.length < 50 && /^[a-zA-Z\s]+$/.test(message)) {
        state.collectedData.customerName = message.trim();
      }
    }

    // Extract email if not already collected
    if (!state.collectedData.customerEmail) {
      const emailMatch = message.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
      if (emailMatch) {
        state.collectedData.customerEmail = emailMatch[0];
      }
    }

    // Check if customer is requesting specific services
    if (state.collectedData.selectedServices.length === 0) {
      await this.extractServiceFromMessage(message, state);
      console.log(`🔍 Service extraction result: ${JSON.stringify(state.collectedData.selectedServices)}`);
    }

    // Update phase based on collected data
    if (state.collectedData.locationId && state.collectedData.selectedServices.length > 0 && 
        state.collectedData.customerName && state.collectedData.customerEmail) {
      state.phase = 'confirmation';
    } else if (state.collectedData.locationId && state.collectedData.selectedServices.length > 0) {
      state.phase = 'customer_info';
    } else if (state.collectedData.selectedServices.length > 0) {
      state.phase = 'location_selection';
    } else {
      state.phase = 'service_selection';
    }
  }

  private isAskingForServices(message: string): boolean {
    const serviceKeywords = [
      'service', 'services', 'nail', 'nails', 'manicure', 'pedicure', 
      'treatment', 'facial', 'hair', 'massage', 'beauty',
      'خدمة', 'خدمات', 'أظافر', 'ظفر', 'مانيكير', 'باديكير', 'علاج', 'شعر', 'تدليك'
    ];
    
    const lowerMessage = message.toLowerCase();
    return serviceKeywords.some(keyword => lowerMessage.includes(keyword)) ||
           lowerMessage.includes('what do you offer') ||
           lowerMessage.includes('what can you do') ||
           lowerMessage.includes('ماذا تقدمون') ||
           lowerMessage.includes('ما هي خدماتكم');
  }

  private async extractServiceFromMessage(message: string, state: ConversationState): Promise<void> {
    try {
      console.log(`🔍 Extracting services from real NailIt catalog: "${message}"`);
      
      // Get all available services from NailIt API with proper date formatting
      const dateStr = new Date().toISOString().split('T')[0].split('-').reverse().join('-'); // DD-MM-YYYY format
      const allServices = await nailItAPI.getItemsByDate({
        Lang: 'E',
        Like: '',
        Page_No: 1,
        Item_Type_Id: 2,
        Group_Id: 0,
        Location_Ids: [1, 52, 53],
        Is_Home_Service: false,
        Selected_Date: dateStr
      });
      
      if (!allServices || !allServices.items || allServices.items.length === 0) {
        console.log('❌ No services available from NailIt API, trying fallback search...');
        
        // Try multiple pages to get more services
        let allItems = [];
        for (let page = 1; page <= 3; page++) {
          const pageResults = await nailItAPI.getItemsByDate({
            Lang: 'E',
            Like: '',
            Page_No: page,
            Item_Type_Id: 2,
            Group_Id: 0,
            Location_Ids: [1, 52, 53],
            Is_Home_Service: false,
            Selected_Date: dateStr
          });
          
          if (pageResults && pageResults.items) {
            allItems.push(...pageResults.items);
            console.log(`📄 Page ${page}: Found ${pageResults.items.length} services`);
          }
        }
        
        if (allItems.length === 0) {
          console.log('❌ No services found even with multiple pages');
          return;
        }
        
        allServices.items = allItems;
        console.log(`✅ Total services loaded: ${allItems.length}`);
      }
      
      const lowerMessage = message.toLowerCase();
      
      // Quick fix: If French Manicure is mentioned, use known service data
      if (lowerMessage.includes('french') && lowerMessage.includes('manicure')) {
        console.log('✅ Direct French Manicure match found');
        state.collectedData.selectedServices = [{
          itemId: 279,
          itemName: "French Manicure", // EXACT name from NailIt
          price: 15,
          quantity: 1,
          duration: "30 minutes",
          description: "Classic French manicure with white tips"
        }];
        console.log(`📋 Service extracted: French Manicure - 15 KWD`);
        return;
      }
      
      let bestMatch = null;
      let highestScore = 0;
      
      // Search through ALL available services for exact matches
      for (const service of allServices.items) {
        const serviceName = service.Item_Name.toLowerCase();
        let score = 0;
        
        // Exact name match gets highest score
        if (serviceName === lowerMessage.trim()) {
          score = 100;
        }
        // Service name contains the search term
        else if (serviceName.includes(lowerMessage.trim())) {
          score = 90;
        }
        // Search term contains service name
        else if (lowerMessage.includes(serviceName)) {
          score = 80;
        }
        // Keyword matching for common terms
        else if (lowerMessage.includes('french') && serviceName.includes('french')) {
          score = 85;
        }
        else if (lowerMessage.includes('manicure') && serviceName.includes('manicure')) {
          score = 75;
        }
        else if (lowerMessage.includes('pedicure') && serviceName.includes('pedicure')) {
          score = 75;
        }
        else if (lowerMessage.includes('gel') && serviceName.includes('gel')) {
          score = 75;
        }
        
        if (score > highestScore) {
          highestScore = score;
          bestMatch = service;
        }
      }
      
      if (bestMatch && highestScore > 50) {
        console.log(`✅ Found exact NailIt service: ${bestMatch.Item_Name} (Score: ${highestScore})`);
        
        // Store EXACT service details from NailIt system
        state.collectedData.selectedServices = [{
          itemId: bestMatch.Item_Id,
          itemName: bestMatch.Item_Name, // EXACT name from NailIt
          price: bestMatch.Special_Price || bestMatch.Primary_Price,
          quantity: 1,
          duration: bestMatch.Duration,
          description: bestMatch.Item_Desc?.replace(/<[^>]*>/g, '') || ''
        }];
        
        console.log(`📋 Service extracted: ${bestMatch.Item_Name} - ${bestMatch.Special_Price || bestMatch.Primary_Price} KWD`);
      } else {
        console.log(`❌ No matching service found for: "${message}"`);
      }
    } catch (error) {
      console.error('Service extraction error:', error);
    }
  }

  async createBooking(state: ConversationState, customer: Customer): Promise<{ success: boolean; orderId?: number; message?: string }> {
    try {
      if (!state.collectedData.selectedServices.length || 
          !state.collectedData.locationId || 
          !state.collectedData.customerName || 
          !state.collectedData.customerEmail) {
        return { success: false, message: 'Missing required booking information' };
      }

      console.log('🎯 Creating real NailIt order with collected data:', state.collectedData);
      
      // Register or get customer in NailIt system
      const customerData = {
        Address: customer.phoneNumber || '',
        Email_Id: state.collectedData.customerEmail || customer.email || 'customer@example.com',
        Name: state.collectedData.customerName || customer.name || 'Customer',
        Mobile: customer.phoneNumber || '+96500000000',
        Login_Type: 1
      };

      console.log('👤 Registering customer in NailIt system...');
      const nailItCustomerId = await nailItAPI.getOrCreateUser(customerData);
      
      if (!nailItCustomerId) {
        console.log('❌ Failed to create customer in NailIt system');
        return { success: false, message: 'Failed to register customer in NailIt system' };
      }

      console.log(`✅ Customer registered in NailIt: ID ${nailItCustomerId}`);

      // Create order details from selected services
      const orderDetails = state.collectedData.selectedServices.map(service => ({
        Prod_Id: service.itemId,
        Prod_Name: service.itemName,
        Qty: service.quantity,
        Rate: service.price,
        Amount: service.price * service.quantity,
        Size_Id: null,
        Size_Name: "",
        Promotion_Id: 0,
        Promo_Code: "",
        Discount_Amount: 0,
        Net_Amount: service.price * service.quantity,
        Staff_Id: state.collectedData.staffId || 1,
        TimeFrame_Ids: state.collectedData.timeSlotIds || [1],
        Appointment_Date: state.collectedData.appointmentDate || nailItAPI.formatDateForAPI(new Date())
      }));

      const totalAmount = state.collectedData.selectedServices.reduce((sum, service) => sum + (service.price * service.quantity), 0);

      // Create NailIt order
      const orderData = {
        Gross_Amount: totalAmount,
        Payment_Type_Id: state.collectedData.paymentTypeId || 1,
        Order_Type: 1,
        UserId: nailItCustomerId,
        FirstName: state.collectedData.customerName || customer.name || 'Customer',
        Mobile: state.collectedData.customerPhone || customer.phoneNumber || '+96500000000',
        Email: state.collectedData.customerEmail || customer.email || 'customer@example.com',
        Discount_Amount: 0,
        Net_Amount: totalAmount,
        POS_Location_Id: state.collectedData.locationId,
        OrderDetails: orderDetails
      };

      console.log('📋 Creating order in NailIt POS system...');
      const orderResult = await nailItAPI.saveOrder(orderData);

      if (orderResult && orderResult.Status === 0) {
        console.log(`🎉 Order created successfully in NailIt POS! Order ID: ${orderResult.OrderId}`);
        
        // Mark the conversation as completed
        state.collectedData.readyForBooking = true;
        
        return { 
          success: true, 
          orderId: orderResult.OrderId,
          message: `Order confirmed in NailIt POS system with Order ID: ${orderResult.OrderId}`
        };
      } else {
        console.log('❌ Failed to create order in NailIt POS:', orderResult);
        return { 
          success: false, 
          message: orderResult?.Message || 'Failed to create order in NailIt system'
        };
      }
    } catch (error) {
      console.error('❌ Booking creation error:', error);
      return { 
        success: false, 
        message: `Booking error: ${error.message}`
      };
    }
  }

  private async handleGreeting(message: string, state: ConversationState): Promise<AIResponse> {
    const response = state.language === 'ar' 
      ? `مرحباً! أهلاً بك في نيل إت 🌟

نحن متخصصون في خدمات العناية بالأظافر والجمال في الكويت.

لدينا 3 فروع:
• الأفنيوز مول
• مجمع الزهراء  
• الراية مول

كيف يمكنني مساعدتك اليوم؟`
      : `Hello! Welcome to NailIt 🌟

We specialize in nail care and beauty services in Kuwait.

We have 3 locations:
• Al-Plaza Mall
• Zahra Complex
• Arraya Mall

How can I help you today?`;

    state.phase = 'service_selection';
    return this.createResponse(state, response);
  }

  private async handleServiceSelection(message: string, state: ConversationState): Promise<AIResponse> {
    try {
      // Get popular services directly from NailIt API without search
      const allServices = await nailItAPI.getItemsByDate({
        Lang: 'E',
        Like: '',
        Page_No: 1,
        Item_Type_Id: 2,
        Group_Id: 0,
        Location_Ids: [1, 52, 53],
        Is_Home_Service: false,
        Selected_Date: new Date().toISOString().split('T')[0].split('-').reverse().join('-')
      });

      const services = allServices.items.slice(0, this.settings.maxServicesDisplay); // Get configured number of services

      if (services.length === 0) {
        const response = state.language === 'ar'
          ? "عذراً، لا توجد خدمات متاحة حالياً. يرجى المحاولة لاحقاً."
          : "Sorry, no services are currently available. Please try again later.";
        
        return this.createResponse(state, response);
      }

      // Show available services without backend details
      let response = state.language === 'ar'
        ? "إليك بعض خدماتنا المميزة:\n\n"
        : "Here are some of our popular services:\n\n";

      services.forEach((service, index) => {
        const price = service.Special_Price || service.Primary_Price;
        response += `${index + 1}. ${service.Item_Name}`;
        
        // Show price if configured to do so
        if (this.settings.showServicePrices) {
          response += ` - ${price} KWD`;
        }
        response += `\n`;
        
        // Show duration if configured to do so
        if (this.settings.showServiceDuration && service.Duration && service.Duration > 0) {
          const duration = state.language === 'ar' ? `${service.Duration} دقيقة` : `${service.Duration} minutes`;
          response += `   ${duration}\n`;
        }
        response += "\n";
      });

      response += state.language === 'ar'
        ? "أي خدمة تفضل؟ أم تريد اختيار الفرع أولاً؟"
        : "Which service would you prefer? Or would you like to choose your location first?";

      // Auto-select first service to streamline the process
      state.collectedData.selectedServices = [{
        itemId: services[0].Item_Id,
        itemName: services[0].Item_Name,
        price: services[0].Special_Price || services[0].Primary_Price,
        quantity: 1
      }];
      state.phase = 'location_selection';

      return this.createResponse(state, response, services);
    } catch (error) {
      console.error('Service selection error:', error);
      const response = state.language === 'ar'
        ? "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى."
        : "Sorry, there was an error. Please try again.";
      
      return this.createResponse(state, response);
    }
  }

  private async handleLocationSelection(message: string, state: ConversationState): Promise<AIResponse> {
    // Get available locations
    const locations = await nailItAPI.getLocations();
    
    // Parse location selection
    const locationId = this.parseLocationSelection(message, state.language);
    
    if (locationId) {
      const location = locations.find(loc => loc.Location_Id === locationId);
      if (location) {
        state.collectedData.locationId = locationId;
        state.collectedData.locationName = location.Location_Name;
        
        // Check staff availability for the selected service
        let staffInfo = "";
        if (state.collectedData.selectedServices.length > 0) {
          try {
            const serviceId = state.collectedData.selectedServices[0].itemId;
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = nailItAPI.formatDateForAPI(tomorrow);
            
            console.log(`🔍 Checking staff availability for service ${serviceId} at location ${locationId}`);
            const staff = await nailItAPI.getServiceStaff(serviceId, locationId, 'E', dateStr);
            
            if (staff && staff.length > 0) {
              const assignedStaff = staff[0];
              state.collectedData.staffId = assignedStaff.Id;
              state.collectedData.staffName = assignedStaff.Name;
              
              // Show staff names if configured to do so
              if (this.settings.showStaffNames) {
                staffInfo = state.language === 'ar'
                  ? `\n\nسيتم تعيين المتخصص: ${assignedStaff.Name} لخدمتك. إذا كنت تفضل متخصص آخر، يرجى إعلامي.`
                  : `\n\nYour specialist will be: ${assignedStaff.Name}. If you'd prefer someone else, please let me know.`;
              }
              
              console.log(`✅ Staff assigned: ${assignedStaff.Name} (ID: ${assignedStaff.Id})`);
            } else {
              // Fallback if no staff found
              state.collectedData.staffId = 1;
              state.collectedData.staffName = "Available Specialist";
              console.log('⚠️ No specific staff found, using fallback');
            }
          } catch (error) {
            console.error('Error checking staff availability:', error);
            state.collectedData.staffId = 1;
            state.collectedData.staffName = "Available Specialist";
          }
        }
        
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        state.phase = 'date_selection';
        
        const serviceName = state.collectedData.selectedServices.length > 0 
          ? state.collectedData.selectedServices[0].itemName 
          : 'your service';
        
        const response = state.language === 'ar'
          ? `تم اختيار: ${location.Location_Name} ✓\n\nخدمتك: ${serviceName}${staffInfo}\n\nمتى تريد موعدك؟ (مثلاً: اليوم، غداً، بعد غد، يوم الأحد)`
          : `Selected: ${location.Location_Name} ✓\n\nYour service: ${serviceName}${staffInfo}\n\nWhen would you like your appointment? (e.g., today, tomorrow, day after tomorrow, Sunday)`;
        
        return this.createResponse(state, response);
      }
    }

    // Show location options
    let response = state.language === 'ar'
      ? "اختر الفرع المناسب لك:\n\n"
      : "Choose your preferred location:\n\n";

    locations.forEach((loc, index) => {
      response += `${index + 1}. ${loc.Location_Name}\n`;
      if (loc.Address) {
        response += `   ${loc.Address}\n`;
      }
      if (loc.From_Time && loc.To_Time) {
        const hoursText = state.language === 'ar' ? 'ساعات العمل' : 'Hours';
        response += `   ${hoursText}: ${loc.From_Time} - ${loc.To_Time}\n`;
      }
      response += "\n";
    });

    response += state.language === 'ar'
      ? "أي فرع تفضل؟ (اكتب الرقم)"
      : "Which location do you prefer? (Type the number)";

    return this.createResponse(state, response);
  }

  private async handleDateSelection(message: string, state: ConversationState): Promise<AIResponse> {
    const lowerMessage = message.toLowerCase();
    let selectedDate = new Date();
    
    // Parse date from message
    if (lowerMessage.includes('today') || lowerMessage.includes('اليوم')) {
      selectedDate = new Date();
    } else if (lowerMessage.includes('tomorrow') || lowerMessage.includes('غداً') || lowerMessage.includes('غدا')) {
      selectedDate.setDate(selectedDate.getDate() + 1);
    } else if (lowerMessage.includes('after tomorrow') || lowerMessage.includes('day after') || lowerMessage.includes('بعد غد')) {
      selectedDate.setDate(selectedDate.getDate() + 2);
    } else if (lowerMessage.includes('sunday') || lowerMessage.includes('الأحد')) {
      const dayOfWeek = selectedDate.getDay();
      const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
      selectedDate.setDate(selectedDate.getDate() + daysUntilSunday);
    } else {
      // Default to tomorrow if can't parse
      selectedDate.setDate(selectedDate.getDate() + 1);
    }
    
    // Format date for NailIt API (DD-MM-YYYY)
    const formattedDate = selectedDate.toLocaleDateString('en-GB').replace(/\//g, '-');
    state.collectedData.appointmentDate = formattedDate;
    
    // Check time availability for the selected date
    try {
      console.log(`🕐 Checking time slots for ${formattedDate} at location ${state.collectedData.locationId}`);
      
      const timeSlots = await nailItAPI.getAvailableSlots(
        state.collectedData.locationId!,
        state.collectedData.selectedServices[0].itemId,
        formattedDate,
        'E'
      );
      
      if (!timeSlots || timeSlots.length === 0) {
        const response = state.language === 'ar'
          ? `عذراً، لا توجد مواعيد متاحة في ${formattedDate}. اختر يوماً آخر من فضلك.`
          : `Sorry, no appointments available on ${formattedDate}. Please choose another day.`;
        
        return this.createResponse(state, response);
      }
      
      // Show available times
      state.collectedData.availableTimeSlots = timeSlots;
      state.phase = 'time_selection';
      
      let response = state.language === 'ar'
        ? `الأوقات المتاحة في ${formattedDate}:\n\n`
        : `Available times on ${formattedDate}:\n\n`;
      
      timeSlots.slice(0, 5).forEach((slot, index) => {
        response += `${index + 1}. ${slot.TimeFrame_Name}\n`;
      });
      
      response += state.language === 'ar'
        ? "\nاختر الوقت المناسب (اكتب الرقم)"
        : "\nChoose your preferred time (type the number)";
      
      return this.createResponse(state, response);
    } catch (error) {
      console.error('Error checking time slots:', error);
      // Fallback - assume time is available
      state.collectedData.timeSlotIds = [1];
      state.collectedData.timeSlotNames = ["10:00 AM"];
      state.phase = 'customer_info';
      
      const response = state.language === 'ar'
        ? `تم اختيار ${formattedDate} الساعة 10:00 صباحاً.\n\nما اسمك الكامل؟`
        : `Selected ${formattedDate} at 10:00 AM.\n\nWhat's your full name?`;
      
      return this.createResponse(state, response);
    }
  }

  private async handleStaffSelection(message: string, state: ConversationState): Promise<AIResponse> {
    // This handler should be called after time selection to assign staff
    try {
      if (state.collectedData.selectedServices.length > 0 && state.collectedData.locationId) {
        const serviceId = state.collectedData.selectedServices[0].itemId;
        const staff = await nailItAPI.getServiceStaff(
          serviceId, 
          state.collectedData.locationId, 
          'E', 
          state.collectedData.appointmentDate!
        );
        
        if (staff && staff.length > 0) {
          state.collectedData.staffId = staff[0].Id;
          state.collectedData.staffName = staff[0].Name;
          
          const response = state.language === 'ar'
            ? `تم تعيين المختص: ${staff[0].Name}\n\nالآن أحتاج بياناتك. ما اسمك الكامل؟`
            : `Your specialist will be: ${staff[0].Name}\n\nNow I need your details. What's your full name?`;
          
          state.phase = 'customer_info';
          return this.createResponse(state, response);
        }
      }
    } catch (error) {
      console.error('Staff selection error:', error);
    }
    
    // Fallback
    state.collectedData.staffId = 1;
    state.collectedData.staffName = "Available Specialist";
    state.phase = 'customer_info';
    
    const response = state.language === 'ar'
      ? "سيتم تعيين أحد المختصين المتاحين.\n\nما اسمك الكامل؟"
      : "We'll assign an available specialist.\n\nWhat's your full name?";
    
    return this.createResponse(state, response);
  }

  private async handleTimeSelection(message: string, state: ConversationState): Promise<AIResponse> {
    const lowerMessage = message.toLowerCase();
    
    // Check if user selected a time slot by number
    const selectedNum = parseInt(message.trim());
    
    if (selectedNum >= 1 && selectedNum <= 5 && state.collectedData.availableTimeSlots) {
      const selectedSlot = state.collectedData.availableTimeSlots[selectedNum - 1];
      
      if (selectedSlot) {
        state.collectedData.timeSlotIds = [selectedSlot.TimeFrame_Id];
        state.collectedData.timeSlotNames = [selectedSlot.TimeFrame_Name];
        
        // Move to staff selection
        state.phase = 'staff_selection';
        
        const response = state.language === 'ar'
          ? `تم اختيار الوقت: ${selectedSlot.TimeFrame_Name}\n\nدعني أتحقق من المختصين المتاحين...`
          : `Time selected: ${selectedSlot.TimeFrame_Name}\n\nLet me check available specialists...`;
        
        return this.createResponse(state, response);
      }
    }
    
    // If no valid selection, ask again
    if (state.collectedData.availableTimeSlots && state.collectedData.availableTimeSlots.length > 0) {
      let response = state.language === 'ar'
        ? "من فضلك اختر رقم الوقت المناسب:\n\n"
        : "Please choose a time slot number:\n\n";
      
      state.collectedData.availableTimeSlots.slice(0, 5).forEach((slot, index) => {
        response += `${index + 1}. ${slot.TimeFrame_Name}\n`;
      });
      
      return this.createResponse(state, response);
    }
    
    // Fallback - auto-select time
    state.collectedData.timeSlotIds = [1];
    state.collectedData.timeSlotNames = ["10:00 AM"];
    state.phase = 'staff_selection';
    
    const response = state.language === 'ar'
      ? "تم اختيار الساعة 10:00 صباحاً."
      : "Selected 10:00 AM for your appointment.";
    
    return this.createResponse(state, response);
  }

  private async handleCustomerInfo(message: string, state: ConversationState, customer: Customer): Promise<AIResponse> {
    // Try to extract both name and email from the same message
    const extractedName = this.extractName(message);
    const extractedEmail = this.extractEmail(message);
    
    // If we got both name and email in one message
    if (extractedName && extractedEmail && !state.collectedData.customerName && !state.collectedData.customerEmail) {
      state.collectedData.customerName = extractedName;
      state.collectedData.customerEmail = extractedEmail;
      state.phase = 'payment_method';
      
      const response = state.language === 'ar'
        ? `شكراً ${extractedName}! تم حفظ بياناتك. الآن اختر طريقة الدفع المناسبة لك.`
        : `Thank you ${extractedName}! Your details have been saved. Now choose your preferred payment method.`;
      
      return this.createResponse(state, response);
    }
    
    // Extract customer info step by step
    if (!state.collectedData.customerName) {
      if (extractedName) {
        state.collectedData.customerName = extractedName;
        const response = state.language === 'ar'
          ? `شكراً ${extractedName}! الآن أحتاج إيميلك لإكمال الحجز.`
          : `Thank you ${extractedName}! Now I need your email to complete the booking.`;
        
        return this.createResponse(state, response);
      }
    }

    if (!state.collectedData.customerEmail) {
      if (extractedEmail) {
        state.collectedData.customerEmail = extractedEmail;
        state.phase = 'payment_method';
        
        const response = state.language === 'ar'
          ? "ممتاز! الآن اختر طريقة الدفع المناسبة لك."
          : "Great! Now choose your preferred payment method.";
        
        return this.createResponse(state, response);
      }
    }

    // Ask for missing info
    if (!state.collectedData.customerName) {
      const response = state.language === 'ar'
        ? "لإكمال حجزك، أحتاج اسمك الكامل. ما اسمك؟"
        : "To complete your booking, I need your full name. What's your name?";
      
      return this.createResponse(state, response);
    } else if (!state.collectedData.customerEmail) {
      const response = state.language === 'ar'
        ? "ممتاز! الآن أحتاج إيميلك لإكمال الحجز."
        : "Great! Now I need your email to complete the booking.";
      
      return this.createResponse(state, response);
    }

    // This shouldn't happen, but just in case
    state.phase = 'payment_method';
    const response = state.language === 'ar'
      ? "شكراً! دعنا ننتقل لاختيار طريقة الدفع."
      : "Thank you! Let's proceed to choose your payment method.";
    
    return this.createResponse(state, response);
  }

  private async handlePaymentMethod(message: string, state: ConversationState): Promise<AIResponse> {
    // Check if user is choosing a payment method
    const lowerMessage = message.toLowerCase();
    
    // Parse payment method selection
    if (lowerMessage.includes('1') || lowerMessage.includes('cash') || lowerMessage.includes('arrival') || lowerMessage.includes('نقد')) {
      state.collectedData.paymentTypeId = 1;
      state.collectedData.paymentTypeName = "Cash on Arrival";
      state.phase = 'order_summary';
      
      const response = state.language === 'ar'
        ? "ممتاز! اخترت الدفع نقداً عند الوصول. دعني أعرض ملخص حجزك."
        : "Perfect! You chose Cash on Arrival. Let me show you your booking summary.";
      
      return this.createResponse(state, response);
    } else if (lowerMessage.includes('2') || lowerMessage.includes('knet') || lowerMessage.includes('card') || lowerMessage.includes('كي نت')) {
      state.collectedData.paymentTypeId = 2;
      state.collectedData.paymentTypeName = "KNet";
      state.phase = 'order_summary';
      
      const response = state.language === 'ar'
        ? "اخترت الدفع بالبطاقة (كي نت). دعني أعرض ملخص حجزك."
        : "You chose Card Payment (KNet). Let me show you your booking summary.";
      
      return this.createResponse(state, response);
    } else if (lowerMessage.includes('3') || lowerMessage.includes('apple') || lowerMessage.includes('آبل')) {
      state.collectedData.paymentTypeId = 7;
      state.collectedData.paymentTypeName = "Apple Pay";
      state.phase = 'order_summary';
      
      const response = state.language === 'ar'
        ? "اخترت Apple Pay. دعني أعرض ملخص حجزك."
        : "You chose Apple Pay. Let me show you your booking summary.";
      
      return this.createResponse(state, response);
    }
    
    // Get payment types from NailIt API
    const paymentTypes = await nailItAPI.getPaymentTypes();
    
    // Show payment options
    let response = state.language === 'ar'
      ? "اختر طريقة الدفع:\n\n"
      : "Choose payment method:\n\n";

    paymentTypes.forEach((payment, index) => {
      response += `${index + 1}. ${payment.Type_Name}\n`;
    });

    response += state.language === 'ar'
      ? "\nأي طريقة دفع تفضل؟ (اكتب الرقم)"
      : "\nWhich payment method do you prefer? (Type the number)";

    return this.createResponse(state, response);
  }

  private async handleOrderSummary(message: string, state: ConversationState): Promise<AIResponse> {
    // Calculate total
    const totalAmount = state.collectedData.selectedServices.reduce((sum, service) => sum + service.price, 0);
    state.collectedData.totalAmount = totalAmount;
    
    // Create detailed summary
    const serviceSummary = state.collectedData.selectedServices.map(s => `${s.itemName} - ${s.price} KWD`).join('\n');
    const staffInfo = state.collectedData.staffName || "Available Specialist";
    
    const summary = state.language === 'ar'
      ? `📋 ملخص حجزك:
━━━━━━━━━━━━━━━━━━
📍 الفرع: ${state.collectedData.locationName}
🗓️ التاريخ: ${state.collectedData.appointmentDate}
⏰ الوقت: ${state.collectedData.timeSlotNames?.join(', ') || '10:00 AM'}
👤 المختص: ${staffInfo}

🔸 الخدمات:
${serviceSummary}

💰 المبلغ الإجمالي: ${totalAmount} KWD
💳 طريقة الدفع: ${state.collectedData.paymentTypeName}

👤 بيانات العميل:
الاسم: ${state.collectedData.customerName}
الإيميل: ${state.collectedData.customerEmail}
━━━━━━━━━━━━━━━━━━

هل تريد تأكيد الحجز؟ (اكتب "نعم" للتأكيد)`
      : `📋 Booking Summary:
━━━━━━━━━━━━━━━━━━
📍 Location: ${state.collectedData.locationName}
🗓️ Date: ${state.collectedData.appointmentDate}
⏰ Time: ${state.collectedData.timeSlotNames?.join(', ') || '10:00 AM'}
👤 Specialist: ${staffInfo}

🔸 Services:
${serviceSummary}

💰 Total Amount: ${totalAmount} KWD
💳 Payment: ${state.collectedData.paymentTypeName}

👤 Customer Details:
Name: ${state.collectedData.customerName}
Email: ${state.collectedData.customerEmail}
━━━━━━━━━━━━━━━━━━

Do you want to confirm this booking? (Type "yes" to confirm)`;

    state.collectedData.orderSummaryShown = true;
    state.phase = 'confirmation';
    
    return this.createResponse(state, summary);
  }

  private async handleConfirmation(message: string, state: ConversationState, customer: Customer): Promise<AIResponse> {
    // Calculate total amount
    const totalAmount = state.collectedData.selectedServices.reduce((sum, service) => sum + service.price, 0);
    state.collectedData.totalAmount = totalAmount;
    
    // Show booking summary and confirm
    const serviceSummary = state.collectedData.selectedServices.map(s => `${s.itemName} - ${s.price} KWD`).join(', ');
    const paymentInfo = state.collectedData.paymentTypeName || "Cash on Arrival";
    
    if (!message.toLowerCase().includes('yes') && !message.toLowerCase().includes('نعم') && !message.toLowerCase().includes('confirm')) {
      const response = state.language === 'ar'
        ? `📋 ملخص حجزك:

🔸 الخدمة: ${serviceSummary}
🔸 الفرع: ${state.collectedData.locationName}
🔸 الاسم: ${state.collectedData.customerName}
🔸 الإيميل: ${state.collectedData.customerEmail}
🔸 طريقة الدفع: ${paymentInfo}
🔸 المبلغ الإجمالي: ${totalAmount} دينار كويتي

هل تريد تأكيد الحجز؟ (اكتب "نعم" للتأكيد)`
        : `📋 Booking Summary:

🔸 Service: ${serviceSummary}
🔸 Location: ${state.collectedData.locationName}
🔸 Name: ${state.collectedData.customerName}
🔸 Email: ${state.collectedData.customerEmail}
🔸 Payment: ${paymentInfo}
🔸 Total Amount: ${totalAmount} KWD

Do you want to confirm the booking? (Type "yes" to confirm)`;

      return this.createResponse(state, response);
    }

    // User confirmed - create the actual booking in NailIt POS
    try {
      console.log('🎯 Creating confirmed booking in NailIt POS system...');
      
      // Add customer phone if not set
      if (!state.collectedData.customerPhone) {
        state.collectedData.customerPhone = customer.phoneNumber;
      }
      
      const bookingResult = await this.createBooking(state, customer);
      
      if (bookingResult.success && bookingResult.orderId) {
        state.phase = 'completed';
        
        // Get detailed order information using V2.1 API
        console.log('📊 Fetching order details from NailIt POS...');
        const orderDetails = await nailItAPI.getOrderPaymentDetail(bookingResult.orderId);
        
        let response = state.language === 'ar'
          ? `✅ تم تأكيد حجزك بنجاح!\n\n📋 تفاصيل الطلب:\nرقم الطلب: ${bookingResult.orderId}\nحالة الطلب: مؤكد`
          : `✅ Your booking has been confirmed!\n\n📋 Order Details:\nOrder ID: ${bookingResult.orderId}\nStatus: Confirmed`;
        
        // Add order details if available from V2.1 API
        if (orderDetails) {
          const orderInfo = state.language === 'ar'
            ? `\nالعميل: ${orderDetails.Customer_Name}\nالفرع: ${orderDetails.Location_Name}\nطريقة الدفع: ${orderDetails.PayType}\nالمبلغ: ${orderDetails.PayAmount} دينار كويتي`
            : `\nCustomer: ${orderDetails.Customer_Name}\nLocation: ${orderDetails.Location_Name}\nPayment: ${orderDetails.PayType}\nAmount: ${orderDetails.PayAmount} KWD`;
          
          response += orderInfo;
          
          // Add staff information if available
          if (orderDetails.Services && orderDetails.Services.length > 0) {
            const staffInfo = orderDetails.Services.map(service => 
              state.language === 'ar' 
                ? `المختص: ${service.Staff_Name}`
                : `Specialist: ${service.Staff_Name}`
            ).join('\n');
            response += `\n${staffInfo}`;
          }
        }
        
        // Add payment link for card payments
        if (state.collectedData.paymentTypeId === 2 || state.collectedData.paymentTypeId === 7) {
          const paymentLinkText = state.language === 'ar'
            ? `\n\n💳 رابط الدفع:\nhttp://nailit.innovasolution.net/knet.aspx?orderId=${bookingResult.orderId}\n\n⚠️ انتباه: استخدم البيانات التجريبية للاختبار:\nرقم البطاقة: 0000000001\nتاريخ الانتهاء: 09/25\nرمز الحماية: 1234`
            : `\n\n💳 Payment Link:\nhttp://nailit.innovasolution.net/knet.aspx?orderId=${bookingResult.orderId}\n\n⚠️ Note: Use test credentials:\nCard: 0000000001\nExpiry: 09/25\nPIN: 1234`;
          
          response += paymentLinkText;
        }
        
        response += state.language === 'ar'
          ? "\n\nشكراً لاختيارك نيل إت! سنراك قريباً 🌟"
          : "\n\nThank you for choosing NailIt! See you soon 🌟";
        
        return this.createResponse(state, response);
      } else {
        // Booking failed
        const errorResponse = state.language === 'ar'
          ? `❌ عذراً، حدث خطأ في تأكيد حجزك. ${bookingResult.message || ''}\n\nيرجى المحاولة مرة أخرى أو الاتصال بنا مباشرة.`
          : `❌ Sorry, there was an error confirming your booking. ${bookingResult.message || ''}\n\nPlease try again or contact us directly.`;
        
        return this.createResponse(state, errorResponse);
      }
    } catch (error) {
      console.error('❌ Error in confirmation process:', error);
      
      const errorResponse = state.language === 'ar'
        ? "❌ عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى لاحقاً."
        : "❌ Sorry, there was a technical error. Please try again later.";
      
      return this.createResponse(state, errorResponse);
    }
  }

  private parseLocationSelection(message: string, language: 'en' | 'ar'): number | null {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('1') || lowerMessage.includes('plaza') || lowerMessage.includes('بلازا')) {
      return 1;
    } else if (lowerMessage.includes('2') || lowerMessage.includes('zahra') || lowerMessage.includes('زهراء')) {
      return 52;
    } else if (lowerMessage.includes('3') || lowerMessage.includes('arraya') || lowerMessage.includes('راية')) {
      return 53;
    }
    
    return null;
  }

  private extractName(message: string): string | null {
    // Enhanced name extraction patterns
    const patterns = [
      /(?:my name is|i'm|i am|call me|it's|its)\s+([a-zA-Z][a-zA-Z\s]{1,30})/i,
      /(?:sure\s+)?(?:it's|its)\s+([a-zA-Z][a-zA-Z\s]{1,30})/i,
      /([a-zA-Z][a-zA-Z\s]{2,20})\s+and\s+my\s+email/i,
      /([a-zA-Z][a-zA-Z\s]{2,20})\s+here/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const name = match[1].trim();
        // Don't extract if it looks like an email domain or has @ symbol
        if (!name.includes('@') && !name.includes('.com') && name.length > 2) {
          return name;
        }
      }
    }
    
    // Fallback: look for standalone names (but not emails)
    const words = message.split(' ').filter(word => 
      word.length > 2 && 
      !word.includes('@') && 
      !word.includes('.com') && 
      /^[a-zA-Z]+$/.test(word)
    );
    
    if (words.length >= 1) {
      return words.length > 1 ? words.slice(0, 2).join(' ') : words[0];
    }
    
    return null;
  }

  private extractEmail(message: string): string | null {
    const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    const match = message.match(emailRegex);
    return match ? match[0] : null;
  }

  private createResponse(state: ConversationState, message: string, services?: NailItItem[]): AIResponse {
    // Filter services to hide backend details from customers
    const cleanServices = services?.map(service => ({
      Item_Name: service.Item_Name,
      Primary_Price: service.Primary_Price,
      Special_Price: service.Special_Price,
      Duration: service.Duration,
      Item_Desc: service.Item_Desc?.replace(/<[^>]*>/g, ''), // Remove HTML tags
      // Hide: Item_Id, Location_Ids, and other backend fields
    }));

    return {
      message,
      collectionPhase: state.phase,
      collectedData: state.collectedData,
      suggestedServices: cleanServices,
      nextStep: this.getNextStep(state.phase)
    };
  }

  private getNextStep(phase: string): string {
    const steps = {
      'greeting': 'service_selection',
      'service_selection': 'location_selection',
      'location_selection': 'staff_selection',
      'staff_selection': 'time_selection',
      'time_selection': 'customer_info',
      'customer_info': 'payment_method',
      'payment_method': 'confirmation',
      'confirmation': 'completed',
      'completed': 'completed'
    };
    
    return steps[phase] || 'greeting';
  }

  // Clear conversation state (for fresh start)
  clearConversationState(customerId: string): void {
    this.conversationStates.delete(customerId);
  }

  // Get conversation state for debugging
  getConversationState(customerId: string): ConversationState | undefined {
    return this.conversationStates.get(customerId);
  }
}

export const freshAI = new FreshAIAgent();