import { OpenAI } from 'openai';
import { storage } from './storage';
import { nailItAPI } from './nailit-api';
import type { Customer, Product, AISettings } from '@shared/schema';
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
  phase: 'greeting' | 'service_selection' | 'location_selection' | 'staff_selection' | 'time_selection' | 'customer_info' | 'payment_method' | 'confirmation' | 'completed';
  collectedData: {
    selectedServices: Array<{
      itemId: number;
      itemName: string;
      price: number;
      quantity: number;
    }>;
    availableServices?: NailItItem[];
    locationId?: number;
    locationName?: string;
    staffId?: number;
    staffName?: string;
    timeSlotIds?: number[];
    timeSlotNames?: string[];
    appointmentDate?: string;
    customerName?: string;
    customerEmail?: string;
    paymentTypeId?: number;
    paymentTypeName?: string;
    totalAmount?: number;
    readyForBooking?: boolean;
  };
  language: 'en' | 'ar';
  lastUpdated: Date;
}

export class FreshAIAgent {
  private conversationStates: Map<string, ConversationState> = new Map();
  private settings: AISettings;

  constructor() {
    this.settings = {} as AISettings;
    this.initialize();
  }

  private async initialize() {
    this.settings = await storage.getAISettings();
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
      customerName: state.collectedData.customerName,
      customerEmail: state.collectedData.customerEmail,
      appointmentDate: state.collectedData.appointmentDate,
      paymentMethod: state.collectedData.paymentTypeName
    };

    // Get available locations
    const locations = await nailItAPI.getLocations();

    // Build system prompt for advanced AI
    const systemPrompt = `You are a professional customer service agent for NailIt salon in Kuwait. 

IMPORTANT RULES:
1. NEVER ask for information the customer has already provided
2. REMEMBER what the customer has said in previous messages
3. ANALYZE the conversation context before responding
4. Only ask for missing information needed to complete a booking
5. Be natural and conversational, not robotic
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
        model: "gpt-4", // Using GPT-4 for better understanding
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: customerMessage }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't understand. Can you please try again?";

      // Analyze customer intent and update state
      await this.updateStateFromMessage(customerMessage, state, locations);

      // If we have all required information and customer confirms, create the booking
      if (state.phase === 'confirmation' && 
          state.collectedData.selectedServices.length > 0 &&
          state.collectedData.locationId &&
          state.collectedData.customerName &&
          state.collectedData.customerEmail &&
          (customerMessage.toLowerCase().includes('yes') || customerMessage.toLowerCase().includes('book') || customerMessage.toLowerCase().includes('confirm'))) {
        
        console.log('🎯 Creating final booking...');
        const bookingSuccess = await this.createBooking(state, customer);
        
        if (bookingSuccess) {
          state.phase = 'completed';
          const finalMessage = state.language === 'ar' 
            ? `تم! تم حجز موعدك بنجاح 🎉\n\nتفاصيل الحجز:\n• الخدمة: ${state.collectedData.selectedServices[0].itemName}\n• الفرع: ${state.collectedData.locationName}\n• العميل: ${state.collectedData.customerName}\n\nسنرسل لك تأكيد الحجز عبر البريد الإلكتروني. شكراً لاختيارك نيل إت!`
            : `Perfect! Your appointment has been successfully booked! 🎉\n\nBooking Details:\n• Service: ${state.collectedData.selectedServices[0].itemName}\n• Location: ${state.collectedData.locationName}\n• Customer: ${state.collectedData.customerName}\n\nWe'll send you a booking confirmation via email. Thank you for choosing NailIt!`;
          
          return this.createResponse(state, finalMessage);
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
      const lowerMessage = message.toLowerCase();
      
      // Detect specific service requests
      const serviceMapping = {
        'french manicure': { name: 'French Manicure', price: 15 },
        'manicure': { name: 'Classic Manicure', price: 12 },
        'pedicure': { name: 'Classic Pedicure', price: 18 },
        'gel manicure': { name: 'Gel Manicure', price: 20 },
        'nail art': { name: 'Nail Art Design', price: 25 },
        'acrylic nails': { name: 'Acrylic Nails', price: 30 }
      };

      for (const [keyword, service] of Object.entries(serviceMapping)) {
        if (lowerMessage.includes(keyword)) {
          state.collectedData.selectedServices = [{
            itemId: Math.floor(Math.random() * 10000), // Temporary ID for demo
            itemName: service.name,
            price: service.price,
            quantity: 1
          }];
          break;
        }
      }
    } catch (error) {
      console.error('Service extraction error:', error);
    }
  }

  async createBooking(state: ConversationState, customer: Customer): Promise<boolean> {
    try {
      if (!state.collectedData.selectedServices.length || 
          !state.collectedData.locationId || 
          !state.collectedData.customerName || 
          !state.collectedData.customerEmail) {
        return false;
      }

      const orderData = {
        items: state.collectedData.selectedServices,
        locationId: state.collectedData.locationId,
        customerName: state.collectedData.customerName,
        customerEmail: state.collectedData.customerEmail,
        appointmentDate: state.collectedData.appointmentDate || new Date().toISOString().split('T')[0],
        paymentTypeId: state.collectedData.paymentTypeId || 1
      };

      console.log('🔍 Creating booking with NailIt API:', orderData);
      
      const result = await nailItAPI.createOrderWithUser(orderData);
      
      if (result && result.orderId) {
        console.log('✅ Booking created successfully with Order ID:', result.orderId);
        return true;
      } else {
        console.log('❌ Booking failed:', result);
        return false;
      }
    } catch (error) {
      console.error('❌ Booking creation error:', error);
      return false;
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

      const services = allServices.items.slice(0, 4); // Get first 4 services

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
        response += `${index + 1}. ${service.Item_Name} - ${price} KWD\n`;
        if (service.Duration && service.Duration > 0) {
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
        
        // Auto-assign staff and time to simplify the process
        state.collectedData.staffId = 1;
        state.collectedData.staffName = "Available Specialist";
        
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        state.collectedData.appointmentDate = tomorrow.toISOString().split('T')[0].split('-').reverse().join('-');
        state.collectedData.timeSlotIds = [1];
        state.collectedData.timeSlotNames = ["10:00 AM"];
        
        state.phase = 'customer_info';
        
        const response = state.language === 'ar'
          ? `تم اختيار: ${location.Location_Name} ✓\n\nسنحجز لك موعد غداً في تمام الساعة 10:00 صباحاً مع أحد المتخصصين.\n\nما اسمك الكامل؟`
          : `Selected: ${location.Location_Name} ✓\n\nWe'll book your appointment tomorrow at 10:00 AM with one of our specialists.\n\nWhat's your full name?`;
        
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

  private async handleStaffSelection(message: string, state: ConversationState): Promise<AIResponse> {
    // Auto-assign available staff to simplify the process
    state.collectedData.staffId = 1; // Default staff assignment
    state.collectedData.staffName = "Available Specialist";
    
    const response = state.language === 'ar'
      ? "ممتاز! سنرتب لك موعد مع أحد المتخصصين.\n\nما هو التاريخ والوقت المناسب لك؟"
      : "Perfect! We'll arrange your appointment with one of our specialists.\n\nWhat date and time works best for you?";
    
    state.phase = 'time_selection';
    return this.createResponse(state, response);
  }

  private async handleTimeSelection(message: string, state: ConversationState): Promise<AIResponse> {
    // Extract date/time from message and auto-assign time slots
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    state.collectedData.appointmentDate = tomorrow.toISOString().split('T')[0].split('-').reverse().join('-'); // DD-MM-YYYY
    state.collectedData.timeSlotIds = [1]; // Default time slot
    state.collectedData.timeSlotNames = ["10:00 AM"];
    
    const response = state.language === 'ar'
      ? "رائع! سنحجز لك موعد غداً في تمام الساعة 10:00 صباحاً.\n\nالآن أحتاج بعض المعلومات منك. ما اسمك الكامل؟"
      : "Great! We'll book your appointment for tomorrow at 10:00 AM.\n\nNow I need some information from you. What's your full name?";
    
    state.phase = 'customer_info';
    return this.createResponse(state, response);
  }

  private async handleCustomerInfo(message: string, state: ConversationState, customer: Customer): Promise<AIResponse> {
    // Extract customer info from message
    if (!state.collectedData.customerName) {
      state.collectedData.customerName = this.extractName(message);
      if (state.collectedData.customerName) {
        const response = state.language === 'ar'
          ? `شكراً ${state.collectedData.customerName}! الآن أحتاج إيميلك لإكمال الحجز.`
          : `Thank you ${state.collectedData.customerName}! Now I need your email to complete the booking.`;
        
        return this.createResponse(state, response);
      }
    }

    if (!state.collectedData.customerEmail) {
      state.collectedData.customerEmail = this.extractEmail(message);
      if (state.collectedData.customerEmail) {
        state.phase = 'payment_method';
        
        const response = state.language === 'ar'
          ? "ممتاز! الآن اختر طريقة الدفع المناسبة لك."
          : "Great! Now choose your preferred payment method.";
        
        return this.createResponse(state, response);
      }
    }

    // Ask for missing info
    const response = state.language === 'ar'
      ? "لإكمال حجزك، أحتاج اسمك وإيميلك. ما اسمك؟"
      : "To complete your booking, I need your name and email. What's your name?";
    
    return this.createResponse(state, response);
  }

  private async handlePaymentMethod(message: string, state: ConversationState): Promise<AIResponse> {
    // Get payment types
    const paymentTypes = await nailItAPI.getPaymentTypes();
    
    // Show payment options
    let response = state.language === 'ar'
      ? "اختر طريقة الدفع:\n\n"
      : "Choose payment method:\n\n";

    paymentTypes.forEach((payment, index) => {
      response += `${index + 1}. ${payment.Type_Name}\n`;
    });

    response += state.language === 'ar'
      ? "\nأي طريقة دفع تفضل؟"
      : "\nWhich payment method do you prefer?";

    state.phase = 'confirmation';
    return this.createResponse(state, response);
  }

  private async handleConfirmation(message: string, state: ConversationState, customer: Customer): Promise<AIResponse> {
    // Show booking summary and confirm
    const response = state.language === 'ar'
      ? `ملخص حجزك:
الخدمة: ${state.collectedData.selectedServices.map(s => s.itemName).join(', ')}
الفرع: ${state.collectedData.locationName}
الاسم: ${state.collectedData.customerName}
الإيميل: ${state.collectedData.customerEmail}

هل تريد تأكيد الحجز؟ (اكتب "نعم" للتأكيد)`
      : `Booking Summary:
Service: ${state.collectedData.selectedServices.map(s => s.itemName).join(', ')}
Location: ${state.collectedData.locationName}
Name: ${state.collectedData.customerName}
Email: ${state.collectedData.customerEmail}

Do you want to confirm the booking? (Type "yes" to confirm)`;

    if (message.toLowerCase().includes('yes') || message.toLowerCase().includes('نعم')) {
      // Create the actual booking
      state.phase = 'completed';
      
      const successResponse = state.language === 'ar'
        ? "تم تأكيد حجزك بنجاح! سنرسل لك رسالة تأكيد قريباً."
        : "Your booking has been confirmed successfully! We'll send you a confirmation message soon.";
      
      return this.createResponse(state, successResponse);
    }

    return this.createResponse(state, response);
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
    // Don't extract email as name
    if (message.includes('@')) {
      return null;
    }
    
    // Extract full name or first name
    const nameMatch = message.match(/(?:my name is|i'm|i am|call me)\s+([a-zA-Z\s]+)/i);
    if (nameMatch) {
      return nameMatch[1].trim();
    }
    
    // Simple name extraction - at least 2 characters and not an email
    const words = message.split(' ').filter(word => word.length > 1);
    if (words.length >= 1 && words[0].length > 2 && !words[0].includes('@')) {
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