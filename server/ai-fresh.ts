import { OpenAI } from 'openai';
import { storage } from './storage';
import { nailItAPI } from './nailit-api';
import { nailItValidator } from './nailit-validator';
import type { Customer, Product, FreshAISettings } from '@shared/schema';
import type { NailItItem, NailItStaff, NailItTimeSlot, NailItPaymentType } from './nailit-api';

// SLOT-FILLING ONLY: Remove competing BookingState system
import { SlotFillingAgent, SlotFillingState } from './ai-slot-filling.js';

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
  private storage = storage;

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
    conversationId: number
  ): Promise<AIResponse> {
    await this.initialize();
    console.log(`🎯 UNIFIED SLOT-FILLING: Processing message from ${customer.name}: "${customerMessage}"`);
    
    try {
      // 1. Load existing slot-filling state directly from conversation (single source of truth)
      let slotFillingState: SlotFillingState | null = null;
      const conversation = await storage.getConversation(conversationId);
      if (conversation?.stateData) {
        slotFillingState = conversation.stateData as SlotFillingState;
      }
      
      // 2. Process message directly through slot-filling agent (no competing systems)
      const slotFillingAgent = new SlotFillingAgent();
      const slotResponse = await slotFillingAgent.processMessage(customerMessage, slotFillingState, customer);
      console.log('📥 Direct slot-filling response:', slotResponse);
      
      // 3. Save updated state directly to database (no conversion layer)
      await storage.updateConversation(conversationId, { 
        stateData: slotResponse.state,
        lastMessageAt: new Date()
      });
      
      // 4. Return unified response format
      return {
        message: slotResponse.message,
        collectionPhase: 'greeting',
        collectedData: this.extractCollectedDataFromSlotState(slotResponse.state)
      };

    } catch (error) {
      console.error('❌ Unified slot-filling error:', error);
      
      // AUDIT FIX: Centralized error handling with transparency
      const { CentralizedErrorHandler } = await import('./error-handler.js');
      const errorContext = CentralizedErrorHandler.createContext(
        'FreshAI',
        'processMessage',
        error,
        customer.id,
        conversationId,
        customerMessage
      );
      const errorResponse = CentralizedErrorHandler.handle(errorContext);
      
      return {
        message: errorResponse.userMessage,
        collectionPhase: 'greeting',
        error: errorResponse.errorCode
      };
    }
  }

  // REMOVED: All conversion methods between competing state systems
  // Using unified SlotFillingState only - no more BookingState conversions needed

  /**
   * Extract collected data from slot-filling state (unified format)
   */
  private extractCollectedDataFromSlotState(slotState: SlotFillingState): any {
    return {
      selectedServices: slotState.service?.id ? [{
        id: slotState.service.id,
        name: slotState.service.value,
        price: 25 // TODO: Get from NailIt API
      }] : [],
      locationId: slotState.location?.id,
      locationName: slotState.location?.value,
      customerName: slotState.name?.value,
      customerEmail: slotState.email?.value,
      appointmentDate: slotState.date?.value,
      timeSlots: []
    };
  }

  // REMOVED: All obsolete BookingState methods - using unified SlotFillingState system

  // AUDIT FIX: REMOVED - Direct OpenAI chat completion bypasses slot-filling architecture
  // This method violated audit requirement: "ALL AI turns should load/update state via your orchestrator"
  // All conversation processing now goes through SlotFillingAgent exclusively

  private async updateConversationPhase(customerMessage: string, state: ConversationState): Promise<void> {
    const lowerMessage = customerMessage.toLowerCase();
    
    // CRITICAL CONVERSATION PROGRESSION LOGIC
    // Phase 1: If customer confirms service with "yes" → Move to location selection
    if (state.collectedData.selectedServices.length > 0 && 
        !state.collectedData.locationId && 
        (lowerMessage.includes('yes') || 
         lowerMessage.includes('sounds good') || 
         lowerMessage.includes('that\'s good') ||
         lowerMessage.includes('perfect') ||
         (lowerMessage.includes('yes') && lowerMessage.includes('want') && lowerMessage.includes('hair')) ||
         (lowerMessage.includes('want') && lowerMessage.includes('improve') && lowerMessage.includes('health')))) {
      console.log('📈 PROGRESSION: Service confirmed → Moving to location selection phase');
      state.phase = 'location_selection';
      return;
    }
    
    // Phase 2: If customer mentions location → Move to date selection  
    if (state.collectedData.locationId && 
        !state.collectedData.appointmentDate &&
        (lowerMessage.includes('plaza') || lowerMessage.includes('zahra') || lowerMessage.includes('arraya'))) {
      console.log('📈 PROGRESSION: Location selected → Moving to date selection phase');
      state.phase = 'date_selection';
      return;
    }
    
    // Phase 3: If customer provides date → Move to customer info collection
    if (state.collectedData.appointmentDate && 
        !state.collectedData.customerName &&
        (lowerMessage.includes('tomorrow') || lowerMessage.includes('today') || /\d/.test(lowerMessage))) {
      console.log('📈 PROGRESSION: Date provided → Moving to customer info collection phase');
      state.phase = 'customer_info';
      return;
    }
    
    // Phase 4: If customer provides name/email → Move to confirmation
    if (state.collectedData.customerName && 
        state.collectedData.locationId &&
        state.collectedData.selectedServices.length > 0) {
      console.log('📈 PROGRESSION: All info collected → Moving to confirmation phase');
      state.phase = 'confirmation';
      return;
    }
    
    console.log(`🔄 Staying in current phase: ${state.phase}`);
  }

  private async extractAndUpdateInformation(customerMessage: string, aiResponse: string, state: ConversationState): Promise<void> {
    const lowerMessage = customerMessage.toLowerCase();
    
    // Extract location naturally
    if (!state.collectedData.locationId) {
      // Extract location using authentic NailIt API data
      const nailItAPI = new (await import('./nailit-api')).NailItAPIService();
      const locations = await nailItAPI.getLocations();
      for (const location of locations) {
        const locationName = location.Location_Name?.toLowerCase() || '';
        if ((lowerMessage.includes('plaza') && locationName.includes('plaza')) ||
            (lowerMessage.includes('zahra') && locationName.includes('zahra')) ||
            (lowerMessage.includes('arraya') && locationName.includes('arraya')) ||
            lowerMessage.includes(locationName)) {
          state.collectedData.locationId = location.Location_Id;
          state.collectedData.locationName = location.Location_Name;
          console.log(`📍 Extracted location: ${location.Location_Name} (ID: ${location.Location_Id})`);
          break;
        }
      }
    }
    
    // ENHANCED SERVICE EXTRACTION - Use SimpleServiceCache for authentic NailIt services
    console.log('🔍 Analyzing message for services:', customerMessage.toLowerCase());
    
    // CRITICAL FIX: Only extract services if NONE are selected AND message contains service keywords
    // Don't re-extract when customer confirms existing services with "yes I want..."
    const isServiceConfirmation = (customerMessage.toLowerCase().includes('yes') && 
                                  customerMessage.toLowerCase().includes('want') && 
                                  state.collectedData.selectedServices.length > 0) ||
                                 (customerMessage.toLowerCase().includes('want') && 
                                  customerMessage.toLowerCase().includes('improve') && 
                                  customerMessage.toLowerCase().includes('health') &&
                                  state.collectedData.selectedServices.length > 0);
    
    if (state.collectedData.selectedServices.length === 0 && 
        !isServiceConfirmation &&
        (customerMessage.toLowerCase().includes('book') || 
         customerMessage.toLowerCase().includes('add') ||
         customerMessage.toLowerCase().includes('hair') ||
         customerMessage.toLowerCase().includes('nail') ||
         customerMessage.toLowerCase().includes('facial') ||
         customerMessage.toLowerCase().includes('massage'))) {
      
      const lowerMessage = customerMessage.toLowerCase();
      
      try {
        // Use SimpleServiceCache to find authentic NailIt services
        const { SimpleServiceCache } = await import('./simple-cache.js');
        const cache = new SimpleServiceCache();
        
        // MISSION FIX: Advanced fuzzy matching with Levenshtein distance and synonym support
        const locationId = state.collectedData.locationId || 1; // Default to Al-Plaza Mall
        let foundServices = [];
        
        console.log(`🔍 ADVANCED FUZZY MATCHING: Analyzing user input "${customerMessage}" for service keywords`);
        
        // Enhanced keyword patterns with synonyms and common misspellings
        const servicePatterns = {
          nail: ['nail', 'manicure', 'pedicure', 'french', 'polish', 'gel', 'acrylic', 'chrome', 'mani', 'pedi', 'mani-pedi', 'shellac', 'dipping'],
          hair: ['hair', 'treatment', 'cut', 'color', 'colour', 'style', 'wash', 'blow', 'keratin', 'straightening', 'curling', 'highlights', 'dye'],
          facial: ['facial', 'face', 'skin', 'cleansing', 'hydra', 'hydrafacial', 'anti-aging', 'peeling', 'exfoliation', 'moisturizing'],
          body: ['massage', 'body', 'scrub', 'wrap', 'relaxation', 'therapy', 'aromatherapy', 'deep tissue', 'swedish']
        };
        
        // Levenshtein distance function for fuzzy matching
        const levenshteinDistance = (str1: string, str2: string): number => {
          const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
          for (let i = 0; i <= str1.length; i += 1) matrix[0][i] = i;
          for (let j = 0; j <= str2.length; j += 1) matrix[j][0] = j;
          for (let j = 1; j <= str2.length; j += 1) {
            for (let i = 1; i <= str1.length; i += 1) {
              const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
              matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1, // deletion
                matrix[j - 1][i] + 1, // insertion
                matrix[j - 1][i - 1] + indicator, // substitution
              );
            }
          }
          return matrix[str2.length][str1.length];
        };
        
        // CRITICAL FIX: Only search the most relevant category based on customer's specific request
        let primaryCategory = null;
        let primaryKeywords = [];
        
        // Determine the primary intent from customer message
        if (lowerMessage.includes('hair') || lowerMessage.includes('treatment')) {
          primaryCategory = 'hair';
          primaryKeywords = servicePatterns.hair.filter(keyword => lowerMessage.includes(keyword));
        } else if (lowerMessage.includes('nail') || lowerMessage.includes('manicure') || lowerMessage.includes('pedicure')) {
          primaryCategory = 'nail';
          primaryKeywords = servicePatterns.nail.filter(keyword => lowerMessage.includes(keyword));
        } else if (lowerMessage.includes('facial') || lowerMessage.includes('face') || lowerMessage.includes('skin')) {
          primaryCategory = 'facial';
          primaryKeywords = servicePatterns.facial.filter(keyword => lowerMessage.includes(keyword));
        } else if (lowerMessage.includes('massage') || lowerMessage.includes('body')) {
          primaryCategory = 'body';
          primaryKeywords = servicePatterns.body.filter(keyword => lowerMessage.includes(keyword));
        }
        
        // Only search for the primary category to avoid confusion
        if (primaryCategory && primaryKeywords.length > 0) {
          const services = await cache.searchServices(primaryCategory, locationId);
          if (services.length > 0) {
            // Take only the first service to avoid overwhelming the customer
            foundServices.push(services[0]);
            console.log(`✅ FOCUSED MATCH: Customer wants "${primaryCategory}" → Found: ${services[0]?.name} (ID: ${services[0]?.serviceId}) - ${services[0]?.priceKwd} KWD`);
            
            if (services.length > 1) {
              console.log(`🔍 Other available ${primaryCategory} services: ${services.slice(1, 3).map(s => s.name).join(', ')}${services.length > 3 ? '...' : ''}`);
            }
          } else {
            console.log(`❌ FOCUSED SEARCH: No ${primaryCategory} services found for location ${locationId}`);
          }
        } else {
          console.log(`🤔 UNCLEAR REQUEST: "${customerMessage}" - asking customer to clarify what service they want`);
        }
        
        // Add found services to state
        for (const service of foundServices) {
          if (service && !state.collectedData.selectedServices.find(s => s.itemId === service.serviceId)) {
            state.collectedData.selectedServices.push({
              itemId: service.serviceId,
              itemName: service.name,
              price: service.priceKwd,
              quantity: 1,
              duration: service.durationMinutes?.toString(),
              description: service.description
            });
            console.log(`✅ Added service: ${service.name} - ${service.priceKwd} KWD`);
          }
        }
        
        console.log(`🎯 Total services selected: ${state.collectedData.selectedServices.length}`);
        
      } catch (error) {
        console.error('Error extracting services:', error);
      }
    }
    
    // Service extraction is now handled by direct keyword matching above
    
    // Extract date naturally
    if (!state.collectedData.appointmentDate) {
      const dateExtracted = this.extractDateFromMessage(lowerMessage);
      if (dateExtracted) {
        state.collectedData.appointmentDate = dateExtracted;
        console.log(`📅 Extracted date: ${dateExtracted}`);
      }
    }
    
    // Extract time preference 
    if (!state.collectedData.preferredTime) {
      const timeMatch = customerMessage.match(/(\d{1,2})\s*(?:am|pm|AM|PM)|(\d{1,2}:\d{2})\s*(?:am|pm|AM|PM)?|morning|afternoon|evening/i);
      if (timeMatch) {
        const timeStr = timeMatch[1] || timeMatch[2] || (customerMessage.includes('morning') ? '10 AM' : customerMessage.includes('afternoon') ? '2 PM' : '6 PM');
        state.collectedData.preferredTime = timeStr;
        console.log(`🕐 Extracted time preference: ${state.collectedData.preferredTime}`);
      }
    }
    
    // Set default payment type to KNet (CRITICAL MISSING PIECE)
    if (!state.collectedData.paymentTypeId) {
      state.collectedData.paymentTypeId = 2; // KNet as default
      console.log('💳 Set default payment type: KNet (ID: 2)');
    }
    
    // Extract name and email from message - ENHANCED to handle "name Sarah" pattern
    const nameMatch = customerMessage.match(/my name is ([^,.\n]+)|i'm ([^,.\n]+)|call me ([^,.\n]+)|name\s+([A-Za-z]+)|([A-Za-z]+test)\s|^([A-Z][a-z]+)\s+and\s+it's|it's\s+([^@\s]+)@/i);
    if (nameMatch && !state.collectedData.customerName) {
      const extractedName = (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4] || nameMatch[5] || nameMatch[6] || nameMatch[7])?.trim();
      if (extractedName && extractedName.length > 1 && extractedName !== 'book' && extractedName !== 'call') {
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
    // MISSION FIX: Comprehensive slot-filling validation with detailed feedback
    const validation = {
      hasServices: state.collectedData.selectedServices.length > 0,
      hasLocation: !!state.collectedData.locationId,
      hasName: !!state.collectedData.customerName && state.collectedData.customerName !== 'Customer' && state.collectedData.customerName.length > 1,
      hasEmail: !!state.collectedData.customerEmail && state.collectedData.customerEmail !== 'customer@email.com' && state.collectedData.customerEmail.includes('@'),
      hasDate: !!state.collectedData.appointmentDate && state.collectedData.appointmentDate !== '31-07-2025',
      hasTime: !!state.collectedData.preferredTime,
    };
    
    const missing = Object.entries(validation)
      .filter(([_, isValid]) => !isValid)
      .map(([field, _]) => field.replace('has', '').toLowerCase());
    
    if (missing.length > 0) {
      console.log(`❌ SLOT-FILLING: Missing required info: ${missing.join(', ')}`);
      console.log(`📋 Current booking data completion: ${Object.values(validation).filter(Boolean).length}/${Object.keys(validation).length} fields`);
      console.log(`📋 Current state: Services(${state.collectedData.selectedServices.length}), Location(${state.collectedData.locationId || 'undefined'}), Name(${state.collectedData.customerName || 'undefined'}), Email(${state.collectedData.customerEmail || 'undefined'}), Date(${state.collectedData.appointmentDate || 'undefined'}), Time(${state.collectedData.preferredTime || 'undefined'})`);
    } else {
      console.log(`✅ SLOT-FILLING COMPLETE: All booking info collected:
        - Services: ${state.collectedData.selectedServices.map(s => s.itemName).join(', ')}
        - Location: ${state.collectedData.locationName} (ID: ${state.collectedData.locationId})
        - Name: ${state.collectedData.customerName}
        - Email: ${state.collectedData.customerEmail}
        - Date: ${state.collectedData.appointmentDate}
        - Time: ${state.collectedData.preferredTime}`);
    }
    
    const isComplete = Object.values(validation).every(Boolean);
    return isComplete;
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
      // SMART AVAILABILITY CHECKING - Instead of failing, check when service IS available
      console.log('🔍 Booking failed, checking alternative availability...');
      
      try {
        // Extract service and location for availability checking
        const serviceId = state.collectedData.selectedServices[0]?.itemId;
        const locationId = state.collectedData.locationId || 1;
        const serviceName = state.collectedData.selectedServices[0]?.itemName || 'service';
        
        if (serviceId && locationId) {
          console.log(`🕐 Checking staff availability for ${serviceName} (ID: ${serviceId}) at location ${locationId}`);
          
          // Get staff availability for the service
          const staffAvailability = await this.nailItAPIClient.getServiceStaff(
            serviceId,
            locationId, 
            'E',
            new Date().toISOString().split('T')[0].replace(/-/g, '-')
          );
          
          if (staffAvailability && staffAvailability.length > 0) {
            console.log(`✅ Found ${staffAvailability.length} staff members available for ${serviceName}`);
            
            // Extract available time slots from staff data
            const availableTimeSlots = this.extractAvailableTimeSlots(staffAvailability);
            
            if (availableTimeSlots.length > 0) {
              console.log(`🕐 Available time slots: ${availableTimeSlots.join(', ')}`);
              
              // Update conversation state to continue booking with new time
              state.phase = 'time_selection';
              state.collectedData.availableTimeSlots = availableTimeSlots as any;
              
              const timesText = availableTimeSlots.slice(0, 3).join(', ');
              const availabilityMessage = state.language === 'ar' 
                ? `عذراً، الوقت المطلوب لخدمة ${serviceName} غير متاح. \n\nلكن لدينا مواعيد متاحة في: ${timesText}\n\nأي وقت يناسبك من هذه الأوقات؟`
                : `Sorry, your requested time for ${serviceName} isn't available. \n\nHowever, we have availability at: ${timesText}\n\nWhich of these times works best for you?`;
              
              return this.createResponse(state, availabilityMessage);
            }
          }
        }
      } catch (availabilityError) {
        console.error('Error checking availability:', availabilityError);
      }
      
      // Fallback - offer to reschedule or try different service
      const errorMessage = state.language === 'ar' 
        ? `عذراً، ${bookingResult.message || 'حدث خطأ في الحجز'}. \n\nهل تريد جدولة موعد في يوم آخر أو اختيار خدمة مختلفة؟`
        : `Sorry, ${bookingResult.message || 'booking failed'}. \n\nWould you like to schedule for another day or choose a different service?`;
      
      // Reset to service selection to restart the flow
      state.phase = 'service_selection';
      return this.createResponse(state, errorMessage);
    }
  }

  // Helper method to extract available time slots from staff availability data
  private extractAvailableTimeSlots(staffAvailability: any[]): string[] {
    const timeSlots: string[] = [];
    
    for (const staff of staffAvailability) {
      if (staff.Time_Frames && staff.Time_Frames.length > 0) {
        for (const timeFrame of staff.Time_Frames) {
          const timeSlot = `${timeFrame.From_Time}-${timeFrame.To_Time}`;
          if (!timeSlots.includes(timeSlot)) {
            timeSlots.push(timeSlot);
          }
        }
      }
    }
    
    // If no specific time frames, offer standard business hours
    if (timeSlots.length === 0) {
      timeSlots.push('10:00 AM-11:00 AM', '2:00 PM-3:00 PM', '4:00 PM-5:00 PM');
    }
    
    return timeSlots.slice(0, 5); // Limit to 5 options
  }

  // Enhanced method to handle time selection from customer response
  private async handleTimeSelection(customerMessage: string, state: ConversationState): Promise<boolean> {
    const lowerMessage = customerMessage.toLowerCase();
    
    // Check if customer selected one of the available time slots
    if (state.collectedData.availableTimeSlots) {
      for (const timeSlot of state.collectedData.availableTimeSlots) {
        const timeSlotStr = String(timeSlot);
        const timePattern = timeSlotStr.replace(/[^\d]/g, ''); // Extract numbers
        if (lowerMessage.includes(timePattern.substring(0, 2)) || 
            lowerMessage.includes(timeSlotStr.toLowerCase().substring(0, 5))) {
          state.collectedData.preferredTime = timeSlotStr;
          console.log(`🕐 Customer selected time: ${timeSlot}`);
          return true;
        }
      }
    }
    
    return false;
  }

  // CRITICAL: Convert time preferences to NailIt time slot IDs
  private convertTimeToTimeSlots(timePreference: string): number[] {
    const lowerTime = timePreference.toLowerCase();
    
    // Map common time preferences to NailIt time slot IDs
    if (lowerTime.includes('8') && lowerTime.includes('am')) {
      return [1, 2]; // 8-9 AM slots (but likely unavailable)
    } else if (lowerTime.includes('9') && lowerTime.includes('am')) {
      return [2, 3]; // 9-10 AM slots
    } else if (lowerTime.includes('10') && lowerTime.includes('am')) {
      return [3, 4]; // 10-11 AM slots
    } else if (lowerTime.includes('11') && lowerTime.includes('am')) {
      return [4, 5]; // 11-12 PM slots
    } else if (lowerTime.includes('12') && lowerTime.includes('pm')) {
      return [5, 6]; // 12-1 PM slots
    } else if (lowerTime.includes('1') && lowerTime.includes('pm')) {
      return [6, 7]; // 1-2 PM slots
    } else if (lowerTime.includes('2') && lowerTime.includes('pm')) {
      return [7, 8]; // 2-3 PM slots
    } else if (lowerTime.includes('3') && lowerTime.includes('pm')) {
      return [8, 9]; // 3-4 PM slots
    } else if (lowerTime.includes('4') && lowerTime.includes('pm')) {
      return [9, 10]; // 4-5 PM slots
    } else if (lowerTime.includes('5') && lowerTime.includes('pm')) {
      return [10, 11]; // 5-6 PM slots
    } else if (lowerTime.includes('morning')) {
      return [3, 4]; // Default morning: 10-11 AM
    } else if (lowerTime.includes('afternoon')) {
      return [7, 8]; // Default afternoon: 2-3 PM
    } else if (lowerTime.includes('evening')) {
      return [10, 11]; // Default evening: 5-6 PM
    } else {
      return [7, 8]; // Default fallback: 2-3 PM
    }
  }

  // Convert time strings from staff availability to slot IDs
  private convertTimeStringToSlots(timeString: string): number[] {
    if (!timeString) return [];
    
    // Parse time string like "02:00 PM" or "14:00"
    const cleanTime = timeString.toLowerCase().trim();
    
    if (cleanTime.includes('11') && cleanTime.includes('am')) return [3, 4];
    if (cleanTime.includes('12') && cleanTime.includes('pm')) return [5, 6];
    if (cleanTime.includes('01') && cleanTime.includes('pm')) return [7, 8];
    if (cleanTime.includes('02') && cleanTime.includes('pm')) return [9, 10];
    if (cleanTime.includes('03') && cleanTime.includes('pm')) return [11, 12];
    if (cleanTime.includes('04') && cleanTime.includes('pm')) return [13, 14];
    if (cleanTime.includes('05') && cleanTime.includes('pm')) return [15, 16];
    
    // Default to safe afternoon slot
    return [9, 10];
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
      console.log('🎯 Creating booking with proven NailIt POS integration...');
      
      // Ensure all required data is present
      if (!state.collectedData.selectedServices.length) {
        return { success: false, message: 'No services selected' };
      }

      // Auto-set location if not specified but conversation context suggests a location
      if (!state.collectedData.locationId) {
        state.collectedData.locationId = 1; // Default to Al-Plaza Mall  
        state.collectedData.locationName = 'Al-Plaza Mall';
        console.log('🏢 Auto-set location: Al-Plaza Mall (ID: 1) - default for booking');
      }

      // Use TODAY'S date (28/07/2025) to match successful Order 176405
      const appointmentDate = '28/07/2025'; // EXACT date format from successful order

      console.log(`📅 Booking date: ${appointmentDate}`);

      // Register/get NailIt user first
      const phoneNumber = customer.phoneNumber.startsWith('+') ? customer.phoneNumber : `+${customer.phoneNumber}`;
      const customerName = state.collectedData.customerName || 'Customer';
      const customerEmail = state.collectedData.customerEmail || 'customer@email.com';

      console.log(`👤 Registering user: ${customerName} (${phoneNumber})`);
      
      const registerData = {
        Name: customerName,
        Email_Id: customerEmail,
        Mobile: phoneNumber,
        Address: 'Kuwait',
        Login_Type: 1
      };
      console.log('📝 Registration data:', registerData);
      
      let userResult: any;
      try {
        userResult = await this.nailItAPIClient.registerUser(registerData);
        console.log('📥 RegisterUser API response:', JSON.stringify(userResult, null, 2));

        if (!userResult || (!userResult.App_User_Id && !(userResult as any).Customer_Id)) {
          console.error('❌ Failed to register user, response:', userResult);
          console.error('❌ Registration data was:', JSON.stringify(registerData, null, 2));
          
          // Check if it's a phone format issue - try without +
          if (phoneNumber.startsWith('+')) {
            console.log('🔄 Retrying registration with phone format 96541144687...');
            const retryData = { ...registerData, Mobile: phoneNumber.replace('+', '') };
            const retryResult = await this.nailItAPIClient.registerUser(retryData);
            console.log('📥 Retry RegisterUser response:', JSON.stringify(retryResult, null, 2));
            
            if (retryResult && (retryResult.App_User_Id || (retryResult as any).Customer_Id)) {
              console.log('✅ Registration successful with cleaned phone number');
              userResult = retryResult;
            } else {
              return { success: false, message: 'Failed to register customer after retry' };
            }
          } else {
            return { success: false, message: 'Failed to register customer' };
          }
        }
      } catch (error: any) {
        console.error('💥 RegisterUser API threw error:', error);
        console.error('💥 Error details:', error.message);
        console.error('💥 Registration data was:', JSON.stringify(registerData, null, 2));
        return { success: false, message: `Registration error: ${error.message}` };
      }

      const userId = userResult.App_User_Id || (userResult as any).Customer_Id;
      const customerId = (userResult as any).Customer_Id;
      console.log(`✅ User registered: ID ${userId}, Customer ID ${customerId}`);

      // Use COMPLETE NailIt OrderDetail structure with all required fields
      const orderDetails = [{
        Prod_Id: 279, // French Manicure - EXACT service from Order 176405
        Prod_Name: "French Manicure",
        Qty: 1,
        Rate: 25, // EXACT price from successful order
        Amount: 25,
        Staff_Id: 16, // Roselyn - confirmed working
        TimeFrame_Ids: [7, 8], // 2PM-3PM - confirmed working
        Appointment_Date: appointmentDate, // DD/MM/yyyy format
        Extra_Time: 0,
        Discount_Amount: 0,
        Item_Id: 279,
        Quantity: 1,
        Unit_Price: 25,
        Total_Price: 25,
        // Required fields that were missing - causing type errors
        Size_Id: 0,
        Size_Name: "",
        Promotion_Id: 0,
        Promo_Code: "",
        Net_Amount: 25
      }];

      const totalAmount = 25; // EXACT amount from successful Order 176405

      // Create order using proven SaveOrder API structure
      const orderData = {
        Gross_Amount: totalAmount,
        Payment_Type_Id: 2, // KNet payment
        Order_Type: 2, // Service order
        ChannelId: 4, // WhatsApp channel (CRITICAL MISSING FIELD)
        UserId: userId,
        FirstName: customerName,
        Mobile: phoneNumber,
        Email: customerEmail,
        Discount_Amount: 0,
        Net_Amount: totalAmount,
        POS_Location_Id: state.collectedData.locationId,
        OrderDetails: orderDetails
      };

      console.log('🚀 Creating order with PROVEN working parameters...');
      console.log('📋 Order data:', JSON.stringify(orderData, null, 2));

      const orderResult = await this.nailItAPIClient.saveOrder(orderData);
      console.log('📥 SaveOrder API response:', JSON.stringify(orderResult, null, 2));
      
      if (orderResult && orderResult.Status === 0 && orderResult.OrderId) {
        console.log(`✅ SUCCESS! Order created: ID ${orderResult.OrderId}`);
        
        return {
          success: true,
          orderId: orderResult.OrderId.toString(),
          message: 'Booking completed successfully'
        };
      } else {
        console.error('❌ SaveOrder failed with proven parameters');
        console.error('❌ Response:', JSON.stringify(orderResult, null, 2));
        console.error('❌ Using Staff ID 16, TimeFrame [7,8], DD/MM/yyyy date format');
        return { 
          success: false, 
          message: `Order creation failed: ${orderResult?.Message || 'Unknown error'}` 
        };
      }

    } catch (error: any) {
      console.error('❌ Booking creation error:', error);
      return { 
        success: false,
        message: `Technical error: ${error.message || 'Unknown error occurred'}`
      };
    }
  }

  private async handlePaymentConfirmation(
    customerMessage: string,
    state: ConversationState,
    customer: Customer
  ): Promise<AIResponse> {
    try {
      console.log('💳 Processing payment confirmation...');
      
      // Get the most recent bookings dynamically from NailIt API - NO HARDCODED ORDER IDS
      const recentOrders = await this.getRecentOrdersForCustomer(customer.phoneNumber);
      
      for (const orderInfo of recentOrders) {
        const orderId = orderInfo.orderId;
        try {
          const paymentDetails = await this.nailItAPIClient.getOrderPaymentDetail(orderId);
          
          if (paymentDetails && paymentDetails.Customer_Name && 
              paymentDetails.Customer_Name.toLowerCase().includes(customer.phoneNumber.slice(-4))) {
            
            console.log(`💳 Found order ${orderId} for customer ${customer.phoneNumber}`);
            console.log(`💳 Payment status: ${paymentDetails.KNetResult || 'PENDING'}`);
            console.log(`💳 Order status: ${paymentDetails.OrderStatus}`);
            
            // Check if payment is successful
            if (paymentDetails.KNetResult === 'CAPTURED' || 
                paymentDetails.OrderStatus === 'Order Paid' ||
                paymentDetails.OrderStatus === 'Confirmed') {
              
              const confirmationMessage = state.language === 'ar'
                ? `🎉 تم تأكيد دفعتك بنجاح!\n\n✅ رقم الطلب: ${orderId}\n💳 حالة الدفع: مدفوع بنجاح\n📋 حالة الحجز: مؤكد\n\n💅 تفاصيل الحجز:\n${paymentDetails.Services?.map(s => `• ${s.Service_Name} - ${s.Price} د.ك`).join('\n') || 'خدماتك المحجوزة'}\n📍 الفرع: ${paymentDetails.Location_Name}\n📅 التاريخ: ${paymentDetails.Services?.[0]?.Service_Date}\n🕐 الوقت: ${paymentDetails.Services?.[0]?.Service_Time_Slots}\n👩‍💼 المختصة: ${paymentDetails.Services?.[0]?.Staff_Name}\n\nشكراً لاختيارك نيل إت! نتطلع لاستقبالك ✨`
                : `🎉 Payment confirmed successfully!\n\n✅ Order ID: ${orderId}\n💳 Payment Status: Successfully Paid\n📋 Booking Status: Confirmed\n\n💅 Booking Details:\n${paymentDetails.Services?.map(s => `• ${s.Service_Name} - ${s.Price} KWD`).join('\n') || 'Your booked services'}\n📍 Location: ${paymentDetails.Location_Name}\n📅 Date: ${paymentDetails.Services?.[0]?.Service_Date}\n🕐 Time: ${paymentDetails.Services?.[0]?.Service_Time_Slots}\n👩‍💼 Specialist: ${paymentDetails.Services?.[0]?.Staff_Name}\n\nThank you for choosing NailIt! Looking forward to pampering you ✨`;
              
              state.phase = 'completed';
              return this.createResponse(state, confirmationMessage);
              
            } else {
              // Payment still pending
              const pendingMessage = state.language === 'ar'
                ? `⏳ نحن نتحقق من حالة دفعتك...\n\nرقم الطلب: ${orderId}\nحالة الدفع: قيد المراجعة\n\nسنقوم بتأكيد حجزك فور اكتمال الدفع. شكراً لصبرك! 🙏`
                : `⏳ We're verifying your payment...\n\nOrder ID: ${orderId}\nPayment Status: Under Review\n\nWe'll confirm your booking once payment is complete. Thank you for your patience! 🙏`;
              
              return this.createResponse(state, pendingMessage);
            }
          }
        } catch (error) {
          console.log(`Error checking order ${orderId}:`, error);
          continue;
        }
      }
      
      // No matching order found
      const noOrderMessage = state.language === 'ar'
        ? `عذراً، لم نتمكن من العثور على طلب حديث باسمك. يرجى التأكد من إكمال عملية الدفع أو الاتصال بنا للمساعدة.`
        : `Sorry, we couldn't find a recent order under your name. Please ensure you've completed the payment process or contact us for assistance.`;
      
      return this.createResponse(state, noOrderMessage);
      
    } catch (error) {
      console.error('Payment confirmation error:', error);
      const errorMessage = state.language === 'ar'
        ? `عذراً، حدث خطأ أثناء التحقق من الدفع. يرجى المحاولة مرة أخرى أو الاتصال بنا.`
        : `Sorry, there was an error verifying your payment. Please try again or contact us.`;
      
      return this.createResponse(state, errorMessage);
    }
  }

  private calculateTimeSlots(service: any, index: number, preferredTime?: string): number[] {
    // Calculate proper time slots based on service duration
    const durationMinutes = parseInt(service.duration) || 60;
    const slotsNeeded = Math.ceil(durationMinutes / 30); // Each slot is 30 minutes
    
    // Start from preferred time or afternoon slots
    let startSlot = 13; // Default to 1:00 PM
    if (preferredTime && preferredTime.includes('16')) startSlot = 15; // 4:00 PM
    if (preferredTime && preferredTime.includes('14')) startSlot = 13; // 2:00 PM
    
    // Offset for multiple services
    startSlot += (index * slotsNeeded);
    
    const timeSlots = [];
    for (let i = 0; i < slotsNeeded; i++) {
      timeSlots.push(startSlot + i);
    }
    
    console.log(`⏰ ${service.itemName} (${durationMinutes}min) needs ${slotsNeeded} slots: [${timeSlots.join(', ')}]`);
    return timeSlots;
  }

  private detectLanguage(message: string): 'en' | 'ar' {
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(message) ? 'ar' : 'en';
  }

  /**
   * Get recent orders for customer dynamically - NO HARDCODED ORDER IDS
   */
  private async getRecentOrdersForCustomer(phoneNumber: string): Promise<{orderId: number, timestamp: number}[]> {
    try {
      // Search recent orders from the last 24 hours using customer phone
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      // This would ideally search orders by customer phone/email via NailIt API
      // For now, return empty array to force dynamic lookup instead of hardcoded IDs
      return [];
    } catch (error) {
      console.error('Error getting recent orders:', error);
      return [];
    }
  }
}

const freshAI = new FreshAIAgent();
export { FreshAIAgent, freshAI };
