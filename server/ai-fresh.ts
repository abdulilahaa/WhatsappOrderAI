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
      ? `مرحباً! أهلاً بك في نيل إت. كيف يمكنني مساعدتك اليوم؟

لدينا أكثر من 1000 خدمة متاحة في 3 فروع:
• الأفنيوز مول (378 خدمة)
• مجمع الزهراء (330 خدمة)  
• الراية مول (365 خدمة)

ما الخدمة التي تريدها؟`
      : `Hello! Welcome to NailIt. How can I help you today?

We have over 1000 services available across 3 locations:
• Al-Plaza Mall (378 services)
• Zahra Complex (330 services)
• Arraya Mall (365 services)

What service are you looking for?`;

    state.phase = 'service_selection';
    return this.createResponse(state, response);
  }

  private async handleServiceSelection(message: string, state: ConversationState): Promise<AIResponse> {
    try {
      // Search for services using NailIt API
      const services = await nailItAPI.searchServices(message);
      
      if (services.length === 0) {
        const response = state.language === 'ar'
          ? "لم أجد خدمات تطابق طلبك. يمكنك البحث عن خدمات الأظافر، الشعر، أو العناية بالبشرة. ما نوع الخدمة التي تريدها؟"
          : "I couldn't find services matching your request. You can search for nail services, hair treatments, or skincare. What type of service would you like?";
        
        return this.createResponse(state, response);
      }

      // Show available services
      let response = state.language === 'ar'
        ? "إليك الخدمات المتاحة:\n\n"
        : "Here are the available services:\n\n";

      services.slice(0, 5).forEach((service, index) => {
        response += `${index + 1}. ${service.Item_Name} - ${service.Special_Price || service.Primary_Price} KWD\n`;
        if (service.Duration) {
          response += `   مدة الخدمة: ${service.Duration} دقيقة\n`;
        }
        response += "\n";
      });

      response += state.language === 'ar'
        ? "أي خدمة تريدها؟ (اكتب الرقم أو اسم الخدمة)"
        : "Which service would you like? (Type the number or service name)";

      return this.createResponse(state, response, services);
    } catch (error) {
      console.error('Service search error:', error);
      const response = state.language === 'ar'
        ? "عذراً، حدث خطأ في البحث. يرجى المحاولة مرة أخرى."
        : "Sorry, there was an error searching for services. Please try again.";
      
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
        state.phase = 'staff_selection';
        
        const response = state.language === 'ar'
          ? `تم اختيار: ${location.Location_Name}\nالآن سأعرض لك المتخصصين المتاحين...`
          : `Selected: ${location.Location_Name}\nNow showing available specialists...`;
        
        return this.createResponse(state, response);
      }
    }

    // Show location options
    let response = state.language === 'ar'
      ? "اختر الفرع المناسب لك:\n\n"
      : "Choose your preferred location:\n\n";

    locations.forEach((loc, index) => {
      response += `${index + 1}. ${loc.Location_Name}\n`;
      response += `   ${loc.Address}\n`;
      response += `   ساعات العمل: ${loc.From_Time} - ${loc.To_Time}\n\n`;
    });

    response += state.language === 'ar'
      ? "أي فرع تفضل؟ (اكتب الرقم)"
      : "Which location do you prefer? (Type the number)";

    return this.createResponse(state, response);
  }

  private async handleStaffSelection(message: string, state: ConversationState): Promise<AIResponse> {
    // This would get staff for the selected service and location
    // For now, simplified implementation
    const response = state.language === 'ar'
      ? "جاري البحث عن المتخصصين المتاحين..."
      : "Searching for available specialists...";
    
    state.phase = 'time_selection';
    return this.createResponse(state, response);
  }

  private async handleTimeSelection(message: string, state: ConversationState): Promise<AIResponse> {
    // This would get available time slots
    // For now, simplified implementation
    const response = state.language === 'ar'
      ? "جاري البحث عن الأوقات المتاحة..."
      : "Searching for available time slots...";
    
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
    // Simple name extraction
    const words = message.split(' ');
    if (words.length >= 1 && words[0].length > 2) {
      return words[0];
    }
    return null;
  }

  private extractEmail(message: string): string | null {
    const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    const match = message.match(emailRegex);
    return match ? match[0] : null;
  }

  private createResponse(state: ConversationState, message: string, services?: NailItItem[]): AIResponse {
    return {
      message,
      collectionPhase: state.phase,
      collectedData: state.collectedData,
      suggestedServices: services,
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