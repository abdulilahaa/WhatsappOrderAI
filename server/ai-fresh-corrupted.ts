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
          });
          
          state.phase = 'completed';
          return this.createResponse(state, confirmationMessage);
        } else {
          return this.createResponse(state, 
            `I'm sorry, there was an issue creating your booking: ${bookingResult.message}. Let me help you try again.`
          );
        }
      }
      
      return this.createResponse(state, naturalResponse);
      
    } catch (error: any) {
      console.error('Enhanced conversation error:', error);
      return this.createResponse(state, 
        "I apologize, let me help you with your booking. What treatments are you interested in today?"
      );
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
      console.log(`🔍 Analyzing customer needs from message: "${message}"`);
      
      // Import RAG search service for cached services
      const { ragSearchService } = await import('./rag-search');
      
      // Step 1: Determine location from conversation
      let locationId = state.collectedData.locationId;
      let locationName = state.collectedData.locationName;
      
      if (!locationId) {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('al-plaza') || lowerMessage.includes('al plaza')) {
          locationId = 1;
          locationName = 'Al-Plaza Mall';
          state.collectedData.locationId = 1;
          state.collectedData.locationName = 'Al-Plaza Mall';
          console.log(`📍 Location detected: Al-Plaza Mall (ID: 1)`);
        } else if (lowerMessage.includes('zahra')) {
          locationId = 52;
          locationName = 'Zahra Complex';
          state.collectedData.locationId = 52;
          state.collectedData.locationName = 'Zahra Complex';
          console.log(`📍 Location detected: Zahra Complex (ID: 52)`);
        } else if (lowerMessage.includes('arraya')) {
          locationId = 53;
          locationName = 'Arraya Mall';
          state.collectedData.locationId = 53;
          state.collectedData.locationName = 'Arraya Mall';
          console.log(`📍 Location detected: Arraya Mall (ID: 53)`);
        } else {
          console.log(`❓ No location specified in message`);
        }
      } else {
        console.log(`📍 Using existing location: ${locationName} (ID: ${locationId})`);
      }
      
      // CRITICAL FIX #1: Enhanced problem-based service analysis with specific targeting
      const problemAnalysis = {
        'oily scalp': {
          searchTerms: ['purifying', 'cleansing', 'oil control', 'scalp detox', 'deep clean'],
          exactMatch: true,
          response: '🌿 For your oily scalp concern, I recommend these specialized treatments:'
        },
        'dandruff': {
          searchTerms: ['anti-dandruff', 'scalp treatment', 'medicated', 'flaking'],
          exactMatch: true,
          response: '✨ For dandruff issues, these targeted treatments will help:'
        },
        'dry hair': {
          searchTerms: ['hydrating', 'moisturizing', 'deep conditioning', 'hair repair'],
          exactMatch: true,
          response: '💧 For dry hair, these intensive treatments restore moisture:'
        },
        'damaged hair': {
          searchTerms: ['repair', 'reconstruction', 'keratin', 'strengthen'],
          exactMatch: true,
          response: '🔧 For damaged hair, these restoration treatments rebuild:'
        }
      };
      
      const lowerMessage = message.toLowerCase();
      let detectedProblem = null;
      let specificSearchTerms = [];
      
      // CRITICAL: First detect specific customer problems
      for (const [problem, config] of Object.entries(problemAnalysis)) {
        if (lowerMessage.includes(problem)) {
          detectedProblem = problem;
          specificSearchTerms = config.searchTerms;
          console.log(`🎯 CUSTOMER PROBLEM DETECTED: "${problem}"`);
          console.log(`🔍 Specific search terms: ${specificSearchTerms.join(', ')}`);
          break;
        }
      }
      
      // If no specific problem, fallback to service type detection
      if (!detectedProblem) {
        const serviceWords = ['manicure', 'pedicure', 'facial', 'hair', 'massage', 'scalp'];
        for (const word of serviceWords) {
          if (lowerMessage.includes(word)) {
            specificSearchTerms = [word];
            console.log(`📋 Service type detected: "${word}"`);
            break;
          }
        }
      }
      
      if (specificSearchTerms.length === 0) {
        specificSearchTerms = ['popular'];
        console.log(`🔍 Using default search: "treatment"`);
      }
      
      // Step 3: Search location-specific cached services using RAG
      const searchQuery = specificSearchTerms.join(' ');
      console.log(`💾 Searching cached services for location ${locationId} with query: "${searchQuery}"`);
      
      const ragResults = await ragSearchService.searchServices(searchQuery, 
        locationId ? { locationId } : {}, 15);
      
      console.log(`📊 RAG search results: ${ragResults.length} services found`);
      if (locationId) {
        console.log(`📍 Filtered for location: ${locationName} (ID: ${locationId})`);
      }
      
      if (ragResults.length === 0) {
        console.log(`❌ No matching services found for: "${searchQuery}"`);
        console.log(`🔄 Trying broader search for location ${locationId}...`);
        
        const broadResults = await ragSearchService.searchServices('', 
          locationId ? { locationId } : {}, 20);
        
        if (broadResults.length > 0) {
          ragResults.push(...broadResults.slice(0, 10));
          console.log(`✅ Found ${broadResults.length} general services for location ${locationId}`);
        } else {
          console.log(`❌ No services available for location ${locationId}`);
          return;
        }
      }
      
      // Log first few services for debugging
      ragResults.slice(0, 3).forEach((service, index) => {
        console.log(`  ${index + 1}. ${service.itemName} - ${service.primaryPrice} KWD`);
      });
      
      console.log(`🔍 Service extraction result: ${ragResults.map(s => s.itemName).slice(0, 3)}`);
      
      // Fix #2: Don't auto-select services, just store them as recommendations
      if (ragResults.length > 0) {
        // Store recommendations but don't auto-select
        state.collectedData.availableServices = ragResults.slice(0, 5).map(service => ({
          Item_Id: service.itemId,
          Item_Name: service.itemName,
          Item_Desc: service.itemDesc,
          Primary_Price: parseFloat(service.primaryPrice),
          Duration: service.durationMinutes ? service.durationMinutes.toString() : '45',
          Special_Price: parseFloat(service.primaryPrice)
        }));
        
        console.log(`✅ Found ${ragResults.length} service recommendations (not auto-selected)`);
        
        // Only add to selectedServices if customer explicitly chooses
        if (detectedProblem) {
          console.log(`🎯 Problem-based recommendations ready for customer selection`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error in extractServiceFromMessage:', error);
    }
  }

  async createBooking(state: ConversationState, customer: Customer): Promise<{ success: boolean; orderId?: number; message?: string; orderDetails?: any }> {
    try {
      // Validate booking data using NailIt validator
      const validationResult = await nailItValidator.validateBookingData(state.collectedData);
      
      if (!validationResult.isValid) {
        console.log('❌ Booking validation failed:', validationResult.message);
        return { success: false, message: validationResult.message };
      }

      console.log('🎯 Creating real NailIt order with validated data:', state.collectedData);
      
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
        Payment_Type_Id: state.collectedData.paymentTypeId || 2,  // Default to KNet payment
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
        
        // Enhanced payment verification using V2.1 API
        console.log('💳 Verifying payment status for Order ID:', orderResult.OrderId);
        const paymentVerification = await nailItAPI.verifyPaymentStatus(orderResult.OrderId);
        
        // Mark the conversation as completed
        state.collectedData.readyForBooking = true;
        
        return { 
          success: true, 
          orderId: orderResult.OrderId,
          message: `Order confirmed in NailIt POS system with Order ID: ${orderResult.OrderId}`,
          orderDetails: paymentVerification.paymentDetails,
          paymentVerification
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
      // CRITICAL FIX: Analyze customer request and match services
      console.log(`🎯 Analyzing customer service request: "${message}"`);
      
      // Use RAG system to find matching services based on customer needs
      const { ragSearchService } = await import('./rag-search');
      
      // Extract service keywords from customer message
      const lowerMessage = message.toLowerCase();
      let searchTerms = [];
      
      // Detect specific service requests
      if (lowerMessage.includes('hair') || lowerMessage.includes('شعر')) {
        searchTerms.push('hair');
      }
      if (lowerMessage.includes('nail') || lowerMessage.includes('أظافر') || 
          lowerMessage.includes('manicure') || lowerMessage.includes('pedicure')) {
        searchTerms.push('nail');
      }
      if (lowerMessage.includes('facial') || lowerMessage.includes('وجه')) {
        searchTerms.push('facial');
      }
      if (lowerMessage.includes('massage') || lowerMessage.includes('مساج')) {
        searchTerms.push('massage');
      }
      
      // If no specific services detected, show popular services
      if (searchTerms.length === 0) {
        searchTerms = ['popular'];
      }
      
      // Search for relevant services using RAG
      const searchResults = await ragSearchService.searchServices(searchTerms.join(' '), 10);
      
      if (searchResults.length === 0) {
        // Fallback to API if RAG returns no results
        console.log('📋 No RAG results, falling back to NailIt API...');
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
        
        const services = allServices.items.slice(0, 10);
        
        // Convert API services to our format
        const convertedServices = services.map(service => ({
          itemId: service.Item_Id,
          itemName: service.Item_Name,
          price: service.Selling_Price,
          quantity: 1,
          duration: '60 minutes',
          description: service.Item_Description || ''
        }));
        
        // Ask customer to choose from available services
        let response = state.language === 'ar'
          ? "هذه بعض خدماتنا المتاحة:\n\n"
          : "Here are some of our available services:\n\n";
        
        convertedServices.forEach((service, index) => {
          response += `${index + 1}. ${service.itemName} - ${service.price} KWD\n`;
        });
        
        response += state.language === 'ar'
          ? "\nاختر الخدمات التي تريدها (اكتب الأرقام مثل: 1, 3, 5)"
          : "\nChoose the services you want (type numbers like: 1, 3, 5)";
        
        state.collectedData.availableServices = convertedServices;
        return this.createResponse(state, response);
      }
      
      // Check if customer is choosing from previously shown services
      const numbers = message.match(/\d+/g);
      if (numbers && state.collectedData.availableServices && state.collectedData.availableServices.length > 0) {
        console.log(`🔢 Customer selecting services by numbers: ${numbers.join(', ')}`);
        
        const selectedServices = [];
        for (const num of numbers) {
          const index = parseInt(num) - 1;
          if (index >= 0 && index < state.collectedData.availableServices.length) {
            selectedServices.push(state.collectedData.availableServices[index]);
          }
        }
        
        if (selectedServices.length > 0) {
          state.collectedData.selectedServices = selectedServices;
          state.phase = 'location_selection';
          
          const serviceNames = selectedServices.map(s => s.itemName).join(', ');
          const total = selectedServices.reduce((sum, s) => sum + s.price, 0);
          
          const response = state.language === 'ar'
            ? `ممتاز! اخترت: ${serviceNames}\nالإجمالي: ${total} دينار كويتي\n\nأي فرع تفضل؟`
            : `Great! You selected: ${serviceNames}\nTotal: ${total} KWD\n\nWhich location do you prefer?`;
          
          return this.createResponse(state, response);
        }
      }
      
      // Show matching services from RAG
      console.log(`✅ Found ${searchResults.length} matching services from RAG`);
      
      let response = state.language === 'ar'
        ? "بناءً على طلبك، هذه الخدمات المناسبة:\n\n"
        : "Based on your request, here are suitable services:\n\n";
      
      searchResults.forEach((service, index) => {
        response += `${index + 1}. ${service.itemName} - ${service.price} KWD\n`;
        if (service.description) {
          response += `   ${service.description}\n`;
        }
      });
      
      response += state.language === 'ar'
        ? "\nاختر الخدمات التي تريدها (اكتب الأرقام مثل: 1, 3)"
        : "\nChoose the services you want (type numbers like: 1, 3)";
      
      // Store available services for selection
      state.collectedData.availableServices = searchResults.map(service => ({
        itemId: service.itemId,
        itemName: service.itemName,
        price: service.price,
        quantity: 1,
        duration: '60 minutes',
        description: service.description || ''
      }));
      
      return this.createResponse(state, response);
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
        
}
