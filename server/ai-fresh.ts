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
    let state = this.conversationStates.get(customerId);

    // Initialize conversation state if not exists
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

    // Update language if it changed
    state.language = this.detectLanguage(customerMessage);
    state.lastUpdated = new Date();

    try {
      // Process based on current phase
      switch (state.phase) {
        case 'greeting':
          return await this.handleGreeting(customerMessage, state);
        case 'service_selection':
          return await this.handleServiceSelection(customerMessage, state);
        case 'location_selection':
          return await this.handleLocationSelection(customerMessage, state);
        case 'staff_selection':
          return await this.handleStaffSelection(customerMessage, state);
        case 'time_selection':
          return await this.handleTimeSelection(customerMessage, state);
        case 'customer_info':
          return await this.handleCustomerInfo(customerMessage, state, customer);
        case 'payment_method':
          return await this.handlePaymentMethod(customerMessage, state);
        case 'confirmation':
          return await this.handleConfirmation(customerMessage, state, customer);
        default:
          return this.createResponse(state, "I'm sorry, something went wrong. Let's start over!");
      }
    } catch (error) {
      console.error('AI processing error:', error);
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