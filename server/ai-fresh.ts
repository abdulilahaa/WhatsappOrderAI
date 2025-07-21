import { OpenAI } from 'openai';
import { storage } from './storage';
import { nailItAPI } from './nailit-api';
import { nailItValidator } from './nailit-validator';
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
    console.log('🔄 Fresh AI Settings loaded:', {
      systemPromptEN: this.settings.systemPromptEN?.substring(0, 100) + '...',
      systemPromptAR: this.settings.systemPromptAR?.substring(0, 50) + '...'
    });
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
      
      // NATURAL CONVERSATION WITH REAL BOOKING INTEGRATION
      return await this.handleNaturalConversation(customerMessage, state, customer, conversationHistory);
    } catch (error) {
      console.error('AI processing error:', error);
      console.error('Error details:', error.message);
      return {
        message: state.language === 'ar' 
          ? "عذراً، حدث خطأ. كيف يمكنني مساعدتك اليوم؟"
          : "Sorry, something went wrong. How can I help you today?",
        conversationState: state
      };
    }
  }

  private async handleNaturalConversation(
    customerMessage: string,
    state: ConversationState,
    customer: Customer,
    conversationHistory: Array<{ content: string; isFromAI: boolean }>
  ): Promise<AIResponse> {
    try {
      console.log('🚀 Natural conversation with real booking integration');
      
      // Enhanced system prompt that guides natural conversation AND real booking
      const enhancedSystemPrompt = `You are Tamy, a friendly and natural AI assistant for NailIt Spa Kuwait. 

CONVERSATION STYLE:
- Be natural, warm, and conversational
- Don't be robotic or list-like
- Understand customer intent naturally
- Flow the conversation smoothly

AVAILABLE INFORMATION:
- Current conversation data: ${JSON.stringify(state.collectedData)}
- Customer phone: ${customer.phoneNumber}
- We have 3 locations: Al-Plaza Mall (ID: 1), Zahra Complex (ID: 52), Arraya Mall (ID: 53)

BOOKING PROCESS:
When you have these details, create a real booking:
- Services requested (match from our catalog)
- Location preference 
- Date/time preference
- Customer name and email

IMPORTANT: 
- If customer says "plaza" they mean "Al-Plaza Mall"
- Be natural in responses, don't show lists unless needed
- When ready to book, say "READY_TO_BOOK" and provide all details
- Always create REAL bookings, never fake ones

Current conversation context: Customer wants ${customerMessage}`;

      const conversationMessages = [
        {
          role: 'system' as const,
          content: enhancedSystemPrompt
        },
        ...conversationHistory.slice(-6).map(msg => ({
          role: msg.isFromAI ? 'assistant' as const : 'user' as const,
          content: msg.content
        })),
        {
          role: 'user' as const,
          content: customerMessage
        }
      ];
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: conversationMessages,
        temperature: 0.7,
        max_tokens: 300
      });

      const aiMessage = response.choices[0]?.message?.content || 
        (state.language === 'ar' ? 'عذراً، لم أفهم طلبك.' : "Sorry, I didn't understand your request.");
      
      console.log('🤖 AI Response:', aiMessage);
      
      // NATURAL INFORMATION EXTRACTION - Update state from conversation
      await this.extractAndUpdateInformation(customerMessage, aiMessage, state);
      
      // CHECK IF READY TO BOOK - Look for booking indicators
      if (aiMessage.includes('READY_TO_BOOK') || this.hasAllBookingInfo(state)) {
        console.log('✅ Ready to create REAL booking in NailIt POS');
        return await this.createRealBooking(state, customer, aiMessage);
      }
      
      // Continue natural conversation
      return this.createResponse(state, aiMessage.replace('READY_TO_BOOK', '').trim());
    } catch (error) {
      console.error('Natural conversation error:', error);
      return this.createResponse(state, 
        state.language === 'ar' 
          ? "عذراً، حدث خطأ. كيف يمكنني مساعدتك؟"
          : "Sorry, something went wrong. How can I help you?"
      );
    }
  }

  private async extractAndUpdateInformation(customerMessage: string, aiResponse: string, state: ConversationState): Promise<void> {
    const lowerMessage = customerMessage.toLowerCase();
    
    // Extract location naturally
    if (!state.collectedData.locationId) {
      if (lowerMessage.includes('plaza') || lowerMessage.includes('al-plaza')) {
        state.collectedData.locationId = 1;
        state.collectedData.locationName = 'Al-Plaza Mall';
        console.log('📍 Extracted location: Al-Plaza Mall');
      } else if (lowerMessage.includes('zahra')) {
        state.collectedData.locationId = 52;
        state.collectedData.locationName = 'Zahra Complex';
        console.log('📍 Extracted location: Zahra Complex');
      } else if (lowerMessage.includes('arraya')) {
        state.collectedData.locationId = 53;
        state.collectedData.locationName = 'Arraya Mall';
        console.log('📍 Extracted location: Arraya Mall');
      }
    }
    
    // Extract services naturally
    if (state.collectedData.selectedServices.length === 0) {
      const { ragSearchService } = await import('./rag-search');
      let searchTerms = [];
      
      if (lowerMessage.includes('nail') || lowerMessage.includes('manicure') || lowerMessage.includes('pedicure')) {
        searchTerms.push('nail');
      }
      if (lowerMessage.includes('hair')) {
        searchTerms.push('hair');
      }
      if (lowerMessage.includes('facial')) {
        searchTerms.push('facial');
      }
      
      if (searchTerms.length > 0) {
        const services = await ragSearchService.searchServices(searchTerms.join(' '), { limit: 3 });
        if (services.length > 0) {
          state.collectedData.selectedServices = services.map(s => ({
            itemId: s.itemId,
            itemName: s.itemName,
            price: s.itemPrice || 15,
            quantity: 1,
            duration: '60 minutes'
          }));
          console.log(`💅 Extracted services: ${services.map(s => s.itemName).join(', ')}`);
        }
      }
    }
    
    // Extract date naturally
    if (!state.collectedData.appointmentDate) {
      const dateExtracted = this.extractDateFromMessage(lowerMessage);
      if (dateExtracted) {
        state.collectedData.appointmentDate = dateExtracted;
        console.log(`📅 Extracted date: ${dateExtracted}`);
      }
    }
    
    // Extract name and email from message
    const nameMatch = customerMessage.match(/my name is ([^,.\n]+)|i'm ([^,.\n]+)|call me ([^,.\n]+)/i);
    if (nameMatch && !state.collectedData.customerName) {
      state.collectedData.customerName = (nameMatch[1] || nameMatch[2] || nameMatch[3]).trim();
      console.log(`👤 Extracted name: ${state.collectedData.customerName}`);
    }
    
    const emailMatch = customerMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch && !state.collectedData.customerEmail) {
      state.collectedData.customerEmail = emailMatch[1];
      console.log(`📧 Extracted email: ${state.collectedData.customerEmail}`);
    }
  }

  private hasAllBookingInfo(state: ConversationState): boolean {
    return !!(
      state.collectedData.selectedServices.length > 0 &&
      state.collectedData.locationId &&
      state.collectedData.customerName &&
      state.collectedData.customerEmail
    );
  }

  private async createRealBooking(state: ConversationState, customer: Customer, aiMessage: string): Promise<AIResponse> {
    // Set default date if not provided
    if (!state.collectedData.appointmentDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      state.collectedData.appointmentDate = tomorrow.toLocaleDateString('en-GB').replace(/\//g, '-');
    }

    // Set default payment method to KNet
    if (!state.collectedData.paymentTypeId) {
      state.collectedData.paymentTypeId = 2; // KNet
    }

    console.log('🎯 Creating REAL booking with data:', state.collectedData);
    
    const bookingResult = await this.createBooking(state, customer);
    
    if (bookingResult.success && bookingResult.orderId) {
      const confirmationMessage = state.language === 'ar'
        ? `🎉 تم تأكيد حجزك في نيل إت!\n\n📋 رقم الطلب: ${bookingResult.orderId}\n💅 الخدمات: ${state.collectedData.selectedServices.map(s => s.itemName).join('، ')}\n📍 الفرع: ${state.collectedData.locationName}\n📅 التاريخ: ${state.collectedData.appointmentDate}\n\n💳 اكمل الدفع:\nhttp://nailit.innovasolution.net/knet.aspx?orderId=${bookingResult.orderId}\n\nنتطلع لرؤيتك! ✨`
        : `🎉 Your NailIt booking is confirmed!\n\n📋 Order ID: ${bookingResult.orderId}\n💅 Services: ${state.collectedData.selectedServices.map(s => s.itemName).join(', ')}\n📍 Location: ${state.collectedData.locationName}\n📅 Date: ${state.collectedData.appointmentDate}\n\n💳 Complete payment:\nhttp://nailit.innovasolution.net/knet.aspx?orderId=${bookingResult.orderId}\n\nLooking forward to pampering you! ✨`;
      
      state.phase = 'completed';
      return this.createResponse(state, confirmationMessage);
    } else {
      const errorMessage = state.language === 'ar'
        ? `عذراً، حدث خطأ في الحجز. ${bookingResult.message || 'يرجى المحاولة مرة أخرى.'}`
        : `Sorry, there was a booking error. ${bookingResult.message || 'Please try again.'}`;
      
      return this.createResponse(state, errorMessage);
    }
  }

  private extractDateFromMessage(message: string): string | null {
    const today = new Date();
    
    if (message.includes('today') || message.includes('اليوم')) {
      return today.toLocaleDateString('en-GB').replace(/\//g, '-');
    }
    
    if (message.includes('tomorrow') || message.includes('غداً') || message.includes('غدا')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toLocaleDateString('en-GB').replace(/\//g, '-');
    }
    
    // Default to tomorrow for any future reference
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow.toLocaleDateString('en-GB').replace(/\//g, '-');
  }

  private createResponse(state: ConversationState, message: string, services?: any[]): AIResponse {
    return {
      message,
      conversationState: state
    };
  }

  private async createBooking(state: ConversationState, customer: Customer): Promise<{ success: boolean; orderId?: string; message?: string }> {
    try {
      // Ensure all required data is present
      if (!state.collectedData.selectedServices.length) {
        return { success: false, message: 'No services selected' };
      }

      if (!state.collectedData.locationId) {
        return { success: false, message: 'No location selected' };
      }

      // Register user with NailIt if needed
      const userResult = await this.nailItAPI.registerUser({
        fullName: state.collectedData.customerName || 'Customer',
        email: state.collectedData.customerEmail || customer.email || `${customer.phoneNumber}@temp.com`,
        phoneNumber: customer.phoneNumber,
        password: '123456',
        confirmPassword: '123456'
      });

      if (!userResult.success) {
        console.log('User registration failed, trying to proceed with existing customer data');
      }

      // Prepare order data
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const appointmentDate = state.collectedData.appointmentDate || 
        tomorrow.toLocaleDateString('en-GB').replace(/\//g, '/');

      const orderData = {
        Customer_Name: state.collectedData.customerName || 'Customer',
        Customer_Email: state.collectedData.customerEmail || customer.email || `${customer.phoneNumber}@temp.com`,
        Customer_Mobile: customer.phoneNumber,
        Location_Id: state.collectedData.locationId,
        Appointment_Date: appointmentDate,
        TimeFrame_Ids: [1, 2], // Default time slots
        Payment_Type_Id: state.collectedData.paymentTypeId || 2, // KNet
        Channel_Id: 4, // WhatsApp
        OrderDetails: state.collectedData.selectedServices.map(service => ({
          Item_Id: service.itemId,
          Quantity: service.quantity || 1,
          Unit_Price: service.price || 15
        }))
      };

      console.log('🎯 Creating order with NailIt API:', orderData);

      // Create order in NailIt POS system
      const orderResult = await this.nailItAPI.saveOrder(orderData);

      if (orderResult.success && orderResult.orderId) {
        console.log(`✅ Order created successfully: ${orderResult.orderId}`);
        return {
          success: true,
          orderId: orderResult.orderId,
          message: 'Booking created successfully'
        };
      } else {
        console.error('❌ Order creation failed:', orderResult.message);
        return {
          success: false,
          message: orderResult.message || 'Failed to create booking'
        };
      }
    } catch (error) {
      console.error('Booking creation error:', error);
      return {
        success: false,
        message: 'Technical error occurred'
      };
    }
  }

  private detectLanguage(message: string): 'en' | 'ar' {
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(message) ? 'ar' : 'en';
  }
}

export { FreshAIAgent };
      return {
        message: state.language === 'ar' 
  private createResponse(state: ConversationState, message: string, services?: NailItItem[]): AIResponse {
