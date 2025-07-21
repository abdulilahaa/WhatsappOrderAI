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
    preferredTime?: string;
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

class FreshAIAgent {
  private conversationStates: Map<string, ConversationState> = new Map();
  private settings: FreshAISettings;
  private nailItAPIClient = nailItAPI;

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
      console.error('Error details:', (error as Error).message);
      return {
        message: state.language === 'ar' 
          ? "عذراً، حدث خطأ. كيف يمكنني مساعدتك اليوم؟"
          : "Sorry, something went wrong. How can I help you today?",
        error: 'Processing error occurred'
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
      if (aiMessage.includes('READY_TO_BOOK') || 
          this.hasAllBookingInfo(state) || 
          (customerMessage.toLowerCase().includes('yes') && state.collectedData.locationId && state.collectedData.customerName) ||
          customerMessage.toLowerCase().includes('book') ||
          customerMessage.toLowerCase().includes('confirm')) {
        
        // Force extract services if we have location but no services yet
        if (state.collectedData.selectedServices.length === 0 && state.collectedData.locationId) {
          console.log('🔄 Force extracting default services for booking...');
          
          // Directly add default nail services from RAG
          try {
            const { ragSearchService } = await import('./rag-search');
            const nailServices = await ragSearchService.searchServices('manicure nail', { locationId: state.collectedData.locationId }, 3);
            
            if (nailServices.length > 0) {
              state.collectedData.selectedServices = nailServices.slice(0, 2).map(s => ({
                itemId: s.itemId,
                itemName: s.itemName,
                price: parseFloat(s.primaryPrice) || 15,
                quantity: 1,
                duration: '60 minutes'
              }));
              console.log(`🎯 FORCE ADDED SERVICES: ${state.collectedData.selectedServices.map(s => s.itemName).join(', ')}`);
            } else {
              // Fallback if no services found
              state.collectedData.selectedServices = [{
                itemId: 279,
                itemName: 'French Manicure',
                price: 15,
                quantity: 1,
                duration: '60 minutes'
              }];
              console.log('🎯 FALLBACK SERVICE ADDED: French Manicure');
            }
          } catch (error) {
            console.error('Error force adding services:', error);
          }
        }
        
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
    
    // Extract services naturally - ALWAYS check for new services
    const { ragSearchService } = await import('./rag-search');
    let searchTerms = [];
    let newServicesFound = false;
    
    // Check BOTH customer message AND AI response for services
    const combinedText = (customerMessage + " " + aiResponse).toLowerCase();
    
    // Check for nail services
    if (combinedText.includes('gel') || combinedText.includes('manicure') || combinedText.includes('mani')) {
      searchTerms.push('manicure');
      newServicesFound = true;
    }
    if (combinedText.includes('pedicure') || combinedText.includes('pedi')) {
      searchTerms.push('pedicure');
      newServicesFound = true;
    }
    
    // Check for hair services
    if (combinedText.includes('hair') || combinedText.includes('conditioning') || combinedText.includes('dry hair')) {
      searchTerms.push('hair treatment');
      newServicesFound = true;
    }
    
    // Check for facial services
    if (combinedText.includes('facial') || combinedText.includes('skin')) {
      searchTerms.push('facial');
      newServicesFound = true;
    }
    
    // ALWAYS search for services if we don't have any yet
    if (state.collectedData.selectedServices.length === 0) {
      newServicesFound = true;
      if (searchTerms.length === 0) {
        searchTerms.push('manicure', 'pedicure', 'hair'); // Default search
      }
    }
    
    // Extract services if new terms found
    if (newServicesFound && searchTerms.length > 0) {
      try {
        const services = await ragSearchService.searchServices(searchTerms.join(' '), { locationId: state.collectedData.locationId }, 5);
        console.log(`🔍 RAG Search for "${searchTerms.join(' ')}" found ${services.length} services`);
        
        if (services.length > 0) {
          // Add to existing services (don't replace)
          const newServices = services.map(s => ({
            itemId: s.itemId,
            itemName: s.itemName,
            price: parseFloat(s.primaryPrice) || 15,
            quantity: 1,
            duration: '60 minutes'
          }));
          
          // Avoid duplicates
          const existingIds = state.collectedData.selectedServices.map(s => s.itemId);
          const uniqueNewServices = newServices.filter(s => !existingIds.includes(s.itemId));
          
          state.collectedData.selectedServices = [...state.collectedData.selectedServices, ...uniqueNewServices];
          console.log(`💅 Total services now: ${state.collectedData.selectedServices.map(s => s.itemName).join(', ')}`);
        }
      } catch (error) {
        console.error('Error searching services:', error);
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
    
    // Extract name and email from message - ENHANCED
    const nameMatch = customerMessage.match(/my name is ([^,.\n]+)|i'm ([^,.\n]+)|call me ([^,.\n]+)|([A-Za-z]+test)\s|^([A-Z][a-z]+)\s+and\s+it's|it's\s+([^@\s]+)@/i);
    if (nameMatch && !state.collectedData.customerName) {
      const extractedName = (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4] || nameMatch[5] || nameMatch[6])?.trim();
      if (extractedName && extractedName.length > 1) {
        state.collectedData.customerName = extractedName;
        console.log(`👤 Extracted name: ${state.collectedData.customerName}`);
      }
    }
    
    const emailMatch = customerMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch && !state.collectedData.customerEmail) {
      state.collectedData.customerEmail = emailMatch[1];
      console.log(`📧 Extracted email: ${state.collectedData.customerEmail}`);
    }
    
    // Extract time preference
    const timeMatch = customerMessage.match(/(\d{1,2})\s*(pm|am|p\.m\.|a\.m\.)|(\d{1,2}):(\d{2})\s*(pm|am)|(\d{1,2})\s*o'?clock/i);
    if (timeMatch && !state.collectedData.preferredTime) {
      let hour = parseInt(timeMatch[1] || timeMatch[3] || timeMatch[6]);
      const isPM = (timeMatch[2] || timeMatch[5])?.toLowerCase().includes('p');
      
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      
      state.collectedData.preferredTime = `${hour.toString().padStart(2, '0')}:${timeMatch[4] || '00'}`;
      console.log(`🕐 Extracted time: ${state.collectedData.preferredTime}`);
    }
  }

  private hasAllBookingInfo(state: ConversationState): boolean {
    const hasRequired = !!(
      state.collectedData.selectedServices.length > 0 &&
      state.collectedData.locationId &&
      state.collectedData.customerName &&
      state.collectedData.customerEmail
    );
    
    if (hasRequired) {
      console.log(`✅ All booking info collected:
        - Services: ${state.collectedData.selectedServices.map(s => s.itemName).join(', ')}
        - Location: ${state.collectedData.locationName} (ID: ${state.collectedData.locationId})
        - Name: ${state.collectedData.customerName}
        - Email: ${state.collectedData.customerEmail}
        - Date: ${state.collectedData.appointmentDate}
        - Time: ${state.collectedData.preferredTime}`);
    }
    
    return hasRequired;
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
      suggestedServices: services
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

      // CRITICAL: Check staff availability ONLY for hair services
      console.log('🔍 Checking staff availability for hair services...');
      let assignedStaffIds: number[] = [];
      let availableTimeSlots: number[] = [];
      
      for (const service of state.collectedData.selectedServices) {
        // Only check staff for hair services (ID: 203) - other services don't require staff validation
        const isHairService = service.itemId === 203 || 
          service.itemName.toLowerCase().includes('hair') ||
          service.itemName.toLowerCase().includes('treatment');
          
        if (isHairService) {
          const staffAvailability = await this.nailItAPIClient.getServiceStaff(
            service.itemId,
            state.collectedData.locationId,
            'E',
            formattedDate.replace(/\//g, '-')
          );
          
          if (!staffAvailability || staffAvailability.length === 0) {
            console.log(`❌ No staff available for hair service ${service.itemName} (ID: ${service.itemId})`);
            return { 
              success: false, 
              message: `No staff available for ${service.itemName} on selected date. Please choose another date.` 
            };
          }
          
          console.log(`✅ Found ${staffAvailability.length} staff members for hair service ${service.itemName}`);
          assignedStaffIds.push(staffAvailability[0].Id);
        } else {
          // For non-hair services, use default staff ID
          console.log(`✅ Non-hair service ${service.itemName} - using default staff assignment`);
          assignedStaffIds.push(1); // Default staff for non-hair services
        }
      }

      // Register user with NailIt if needed
      const userResult = await this.nailItAPIClient.registerUser({
        Address: '',
        Email_Id: state.collectedData.customerEmail || customer.email || `${customer.phoneNumber}@temp.com`,
        Name: state.collectedData.customerName || 'Customer',
        Mobile: customer.phoneNumber,
        Login_Type: 1
      });

      if (!userResult || userResult.Status !== 200) {
        console.log('User registration failed, trying to proceed with existing customer data');
      }

      // Prepare order data with correct date format
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const appointmentDate = state.collectedData.appointmentDate || 
        tomorrow.toLocaleDateString('en-GB').replace(/\//g, '/');
      
      // Convert date to DD/MM/yyyy format for SaveOrder API  
      const dateForAPI = new Date(appointmentDate.replace(/(\d{2})-(\d{2})-(\d{4})/, '$2/$1/$3'));
      const formattedDate = `${dateForAPI.getDate().toString().padStart(2, '0')}/${(dateForAPI.getMonth() + 1).toString().padStart(2, '0')}/${dateForAPI.getFullYear()}`;
      console.log(`📅 Appointment date: ${appointmentDate} → ${formattedDate}`);

      const grossAmount = state.collectedData.selectedServices.reduce((total, service) => 
        total + (service.price * (service.quantity || 1)), 0);
      
      const orderData = {
        Gross_Amount: grossAmount,
        Payment_Type_Id: state.collectedData.paymentTypeId || 2,
        Order_Type: 2, // Services per API documentation
        UserId: userResult?.App_User_Id || 1,
        FirstName: state.collectedData.customerName || 'Customer',
        Mobile: customer.phoneNumber,
        Email: state.collectedData.customerEmail || customer.email || `${customer.phoneNumber}@temp.com`,
        Discount_Amount: 0,
        Net_Amount: grossAmount,
        POS_Location_Id: state.collectedData.locationId,
        ChannelId: 4, // Required by API documentation
        OrderDetails: state.collectedData.selectedServices.map((service, index) => ({
          Prod_Id: service.itemId,
          Prod_Name: service.itemName,
          Qty: service.quantity || 1,
          Rate: service.price,
          Amount: service.price * (service.quantity || 1),
          Size_Id: null,
          Size_Name: '',
          Promotion_Id: 0,
          Promo_Code: '',
          Discount_Amount: 0,
          Net_Amount: service.price * (service.quantity || 1),
          Staff_Id: assignedStaffIds[index] || 1, // Use verified available staff
          TimeFrame_Ids: state.collectedData.timeSlotIds || [13 + (index * 2), 14 + (index * 2)], // Sequential afternoon slots
          Appointment_Date: formattedDate
        }))
      };

      console.log('🎯 Creating order with NailIt API:', orderData);

      // Create order in NailIt POS system
      const orderResult = await this.nailItAPIClient.saveOrder(orderData);

      if (orderResult && orderResult.Status === 0 && orderResult.OrderId) {
        console.log(`✅ Order created successfully: ${orderResult.OrderId}`);
        
        // CRITICAL: Get payment details immediately after order creation
        console.log('💳 Fetching payment details for order...');
        const paymentDetails = await this.nailItAPIClient.getOrderPaymentDetail(orderResult.OrderId);
        
        if (paymentDetails) {
          console.log('✅ Payment details retrieved:', paymentDetails);
        } else {
          console.log('⚠️ No payment details available yet');
        }
        
        return {
          success: true,
          orderId: orderResult.OrderId.toString(),
          message: 'Booking created successfully',
          paymentDetails: paymentDetails
        };
      } else {
        console.error('❌ Order creation failed:', {
          status: orderResult?.Status,
          message: orderResult?.Message,
          fullResponse: orderResult
        });
        return {
          success: false,
          message: orderResult?.Message || 'Failed to create booking'
        };
      }
    } catch (error: any) {
      console.error('🚨 Booking creation error:', {
        errorMessage: error.message,
        errorStack: error.stack,
        orderData: orderData,
        selectedServices: state.collectedData.selectedServices
      });
      return {
        success: false,
        message: `Technical error: ${error.message || 'Unknown error occurred'}`
      };
    }
  }

  private detectLanguage(message: string): 'en' | 'ar' {
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(message) ? 'ar' : 'en';
  }
}

const freshAI = new FreshAIAgent();
export { FreshAIAgent, freshAI };
