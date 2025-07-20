import { OpenAI } from 'openai';
import { storage } from './storage';
import { nailItAPI } from './nailit-api';
import { nailItValidator } from './nailit-validator';
import type { Customer, Product, FreshAISettings } from '@shared/schema';
import type { NailItItem, NailItStaff, NailItTimeSlot, NailItPaymentType } from './nailit-api';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ServiceBooking {
  itemId: number;
  itemName: string;
  price: number;
  quantity: number;
  duration: number; // in minutes
  description?: string;
  staffId?: number;
  staffName?: string;
}

export interface TimeSlotBooking {
  timeFrameId: number;
  timeFrameName: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  conflictsWith?: string[];
}

export interface StaffAvailability {
  staffId: number;
  staffName: string;
  isAvailable: boolean;
  nextAvailableTime?: string;
  nextAvailableDate?: string;
  qualifiedServices: number[];
  currentBookings: Array<{
    startTime: string;
    endTime: string;
    serviceNames: string[];
  }>;
}

export interface EnhancedConversationState {
  phase: 'greeting' | 'service_selection' | 'service_review' | 'location_selection' | 'date_selection' | 
         'time_selection' | 'staff_selection' | 'customer_info' | 'payment_method' | 'booking_validation' |
         'payment_processing' | 'confirmation' | 'completed';
  
  collectedData: {
    // Service Information
    selectedServices: ServiceBooking[];
    totalDuration: number; // Total time needed for all services
    totalAmount: number;
    
    // Location & Scheduling
    locationId?: number;
    locationName?: string;
    appointmentDate?: string; // DD-MM-YYYY
    
    // Advanced Time Management
    requestedTimeSlots: TimeSlotBooking[];
    availableTimeSlots: TimeSlotBooking[];
    conflictingAppointments: string[];
    
    // Staff Management
    preferredStaffId?: number;
    preferredStaffName?: string;
    assignedStaff: StaffAvailability[];
    staffConflicts: string[];
    
    // Customer Information
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    nailItCustomerId?: number;
    isExistingCustomer?: boolean;
    
    // Payment Processing
    paymentTypeId?: number;
    paymentTypeName?: string;
    paymentUrl?: string;
    paymentStatus?: 'pending' | 'processing' | 'completed' | 'failed';
    
    // Validation States
    allFieldsValidated?: boolean;
    bookingFeasible?: boolean;
    validationErrors: string[];
    
    // Order Tracking
    nailItOrderId?: number;
    localOrderId?: number;
    bookingConfirmed?: boolean;
    confirmationSent?: boolean;
  };
  
  language: 'en' | 'ar';
  lastUpdated: Date;
  conversationHistory: Array<{
    message: string;
    isFromAI: boolean;
    timestamp: Date;
    phase: string;
  }>;
}

export class EnhancedAIAgent {
  private conversationStates: Map<string, EnhancedConversationState> = new Map();
  private settings: FreshAISettings;

  constructor() {
    this.settings = {} as FreshAISettings;
    this.initialize();
  }

  private async initialize() {
    this.settings = await storage.getFreshAISettings();
  }

  /**
   * Phase 1 Methods: Enhanced Data Collection
   */
  
  async processMessage(
    customerMessage: string,
    customer: Customer,
    conversationHistory: Array<{ content: string; isFromAI: boolean }>
  ): Promise<any> {
    await this.initialize();

    const customerId = customer.id.toString();
    let state = this.getOrCreateState(customerId, customerMessage);
    
    // Add to conversation history
    state.conversationHistory.push({
      message: customerMessage,
      isFromAI: false,
      timestamp: new Date(),
      phase: state.phase
    });

    try {
      console.log(`🤖 Enhanced AI - Customer ${customerId}, Phase: ${state.phase}`);
      console.log(`📝 Message: "${customerMessage}"`);
      console.log(`📊 Current State: ${JSON.stringify(state.collectedData, null, 2)}`);

      // Route to appropriate phase handler
      let response;
      switch (state.phase) {
        case 'greeting':
          response = await this.handleGreeting(customerMessage, state);
          break;
        case 'service_selection':
          response = await this.handleServiceSelection(customerMessage, state);
          break;
        case 'service_review':
          response = await this.handleServiceReview(customerMessage, state);
          break;
        case 'location_selection':
          response = await this.handleLocationSelection(customerMessage, state);
          break;
        case 'date_selection':
          response = await this.handleDateSelection(customerMessage, state);
          break;
        case 'time_selection':
          response = await this.handleTimeSelection(customerMessage, state);
          break;
        case 'staff_selection':
          response = await this.handleStaffSelection(customerMessage, state);
          break;
        case 'customer_info':
          response = await this.handleCustomerInfo(customerMessage, state);
          break;
        case 'payment_method':
          response = await this.handlePaymentMethod(customerMessage, state);
          break;
        case 'booking_validation':
          response = await this.handleBookingValidation(customerMessage, state);
          break;
        case 'payment_processing':
          response = await this.handlePaymentProcessing(customerMessage, state);
          break;
        case 'confirmation':
          response = await this.handleConfirmation(customerMessage, state);
          break;
        default:
          response = await this.handleUnknownPhase(customerMessage, state);
      }

      // Add AI response to conversation history
      if (response.message) {
        state.conversationHistory.push({
          message: response.message,
          isFromAI: true,
          timestamp: new Date(),
          phase: state.phase
        });
      }

      // Update state
      this.conversationStates.set(customerId, state);
      
      return response;

    } catch (error) {
      console.error('Enhanced AI processing error:', error);
      return {
        message: state.language === 'ar' 
          ? 'عذراً، حدث خطأ تقني. سأعيد المحاولة.'
          : 'Sorry, I encountered a technical issue. Let me try again.',
        collectionPhase: state.phase,
        error: error.message
      };
    }
  }

  private getOrCreateState(customerId: string, message: string): EnhancedConversationState {
    let state = this.conversationStates.get(customerId);
    
    if (!state) {
      state = {
        phase: 'greeting',
        collectedData: {
          selectedServices: [],
          totalDuration: 0,
          totalAmount: 0,
          requestedTimeSlots: [],
          availableTimeSlots: [],
          conflictingAppointments: [],
          assignedStaff: [],
          staffConflicts: [],
          validationErrors: []
        },
        language: this.detectLanguage(message),
        lastUpdated: new Date(),
        conversationHistory: []
      };
    }

    state.lastUpdated = new Date();
    return state;
  }

  private detectLanguage(message: string): 'en' | 'ar' {
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(message) ? 'ar' : 'en';
  }

  /**
   * Phase Handlers - Enhanced with comprehensive validation
   */

  private async handleGreeting(message: string, state: EnhancedConversationState): Promise<any> {
    // Check if customer is just greeting or mentioning services
    const greetingPatterns = /^(hi|hello|hey|مرحبا|السلام عليكم|أهلا)$/i;
    const isJustGreeting = greetingPatterns.test(message.trim());
    
    if (isJustGreeting) {
      // Pure greeting, show welcome message only
      state.phase = 'service_selection';
      
      const welcomeMessage = state.language === 'ar'
        ? `مرحباً بك في نايل إت! 💅\n\nأنا مساعدك الذكي لحجز المواعيد. سأساعدك في:\n• اختيار الخدمات المناسبة\n• العثور على أفضل الأوقات المتاحة\n• حجز موعدك بسهولة\n\nما الخدمة التي تريدها اليوم؟`
        : `Welcome to NailIt! 💅\n\nI'm your smart booking assistant. I'll help you with:\n• Choosing the right services\n• Finding the best available times\n• Booking your appointment easily\n\nWhat service would you like today?`;

      return {
        message: welcomeMessage,
        collectionPhase: state.phase,
        collectedData: state.collectedData
      };
    }
    
    // Customer mentioned services in greeting, extract them
    await this.extractServicesFromMessage(message, state);
    
    if (state.collectedData.selectedServices.length > 0) {
      state.phase = 'service_review';
      return this.handleServiceReview(message, state);
    } else {
      // No clear service mentioned, move to service selection  
      state.phase = 'service_selection';
      return this.handleServiceSelection(message, state);
    }
  }

  private async handleServiceSelection(message: string, state: EnhancedConversationState): Promise<any> {
    // Enhanced service extraction with NailIt API integration
    await this.extractServicesFromMessage(message, state);
    
    if (state.collectedData.selectedServices.length === 0) {
      // No service found, suggest options
      console.log(`🔍 Getting service suggestions for: "${message}"`);
      const suggestions = await this.getServiceSuggestions(message);
      console.log(`📋 Got ${suggestions.length} suggestions`);
      
      let response = state.language === 'ar'
        ? `لم أستطع العثور على الخدمة المحددة. إليك بعض خدماتنا الشائعة:\n\n`
        : `I couldn't find that specific service. Here are some popular options:\n\n`;
      
      const displaySuggestions = suggestions.slice(0, 5);
      
      if (displaySuggestions.length > 0) {
        displaySuggestions.forEach((service, index) => {
          response += `${index + 1}. ${service.Item_Name} - ${service.Special_Price || service.Primary_Price} KWD\n`;
          if (service.Duration) response += `   Duration: ${service.Duration} min\n`;
          response += `\n`;
        });
      } else {
        // Fallback if no suggestions
        response += state.language === 'ar' 
          ? `نحن نقدم خدمات العناية بالأظافر المختلفة.\n\n`
          : `We offer various nail care services.\n\n`;
      }
      
      response += state.language === 'ar'
        ? `أي خدمة تريد من هذه؟ أو اكتب اسم خدمة أخرى.`
        : `Which service would you like? Or type another service name.`;
      
      return {
        message: response,
        collectionPhase: state.phase,
        suggestedServices: displaySuggestions,
        collectedData: state.collectedData
      };
    }

    // Service found, move to review
    state.phase = 'service_review';
    return this.handleServiceReview('', state);
  }

  private async handleServiceReview(message: string, state: EnhancedConversationState): Promise<any> {
    // Calculate total duration and amount
    state.collectedData.totalDuration = state.collectedData.selectedServices.reduce(
      (sum, service) => sum + (service.duration || 60), 0
    );
    state.collectedData.totalAmount = state.collectedData.selectedServices.reduce(
      (sum, service) => sum + (service.price * service.quantity), 0
    );

    const hours = Math.floor(state.collectedData.totalDuration / 60);
    const minutes = state.collectedData.totalDuration % 60;
    const durationText = hours > 0 
      ? `${hours}h ${minutes}min` 
      : `${minutes}min`;

    let reviewMessage = state.language === 'ar'
      ? `✅ تم اختيار خدماتك:\n\n`
      : `✅ Your selected services:\n\n`;

    state.collectedData.selectedServices.forEach((service, index) => {
      reviewMessage += `${index + 1}. ${service.itemName}\n`;
      reviewMessage += `   ${service.price} KWD × ${service.quantity}\n`;
      if (service.duration) reviewMessage += `   Duration: ${service.duration} min\n`;
      reviewMessage += `\n`;
    });

    reviewMessage += state.language === 'ar'
      ? `⏱️ إجمالي الوقت: ${durationText}\n💰 إجمالي السعر: ${state.collectedData.totalAmount} KWD\n\nهل تريد إضافة خدمات أخرى أم نكمل الحجز؟`
      : `⏱️ Total Duration: ${durationText}\n💰 Total Price: ${state.collectedData.totalAmount} KWD\n\nWould you like to add more services or continue with booking?`;

    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('continue') || lowerMessage.includes('book') || 
        lowerMessage.includes('نكمل') || lowerMessage.includes('احجز') ||
        lowerMessage.includes('next') || lowerMessage.includes('التالي')) {
      state.phase = 'location_selection';
      return this.handleLocationSelection('', state);
    }

    return {
      message: reviewMessage,
      collectionPhase: state.phase,
      collectedData: state.collectedData
    };
  }

  private async handleLocationSelection(message: string, state: EnhancedConversationState): Promise<any> {
    try {
      const locations = await nailItAPI.getLocations();
      const lowerMessage = message.toLowerCase();
      
      // Check if location was selected
      let selectedLocation = null;
      
      // Check for location number selection
      const numberMatch = message.match(/\d+/);
      if (numberMatch) {
        const locationIndex = parseInt(numberMatch[0]) - 1;
        if (locationIndex >= 0 && locationIndex < locations.length) {
          selectedLocation = locations[locationIndex];
        }
      }
      
      // Check for location name mention
      if (!selectedLocation) {
        for (const location of locations) {
          if (lowerMessage.includes(location.Location_Name.toLowerCase()) ||
              (lowerMessage.includes('plaza') && location.Location_Name.toLowerCase().includes('plaza'))) {
            selectedLocation = location;
            break;
          }
        }
      }
      
      if (selectedLocation) {
        state.collectedData.locationId = selectedLocation.Location_Id;
        state.collectedData.locationName = selectedLocation.Location_Name;
        
        // Validate if services are available at this location
        const servicesAvailable = await this.validateServicesAtLocation(
          state.collectedData.selectedServices,
          selectedLocation.Location_Id
        );
        
        if (!servicesAvailable.allAvailable) {
          const unavailableServices = servicesAvailable.unavailable.join(', ');
          const response = state.language === 'ar'
            ? `⚠️ عذراً، هذه الخدمات غير متوفرة في ${selectedLocation.Location_Name}:\n${unavailableServices}\n\nاختر فرعاً آخر أو خدمات مختلفة.`
            : `⚠️ Sorry, these services are not available at ${selectedLocation.Location_Name}:\n${unavailableServices}\n\nPlease choose another location or different services.`;
          
          return {
            message: response,
            collectionPhase: state.phase,
            collectedData: state.collectedData
          };
        }
        
        state.phase = 'date_selection';
        
        const response = state.language === 'ar'
          ? `✅ تم اختيار: ${selectedLocation.Location_Name}\n\n⏰ أوقات العمل: ${selectedLocation.From_Time} - ${selectedLocation.To_Time}\n\nمتى تريد موعدك؟ (مثال: اليوم، غداً، يوم الأحد)`
          : `✅ Selected: ${selectedLocation.Location_Name}\n\n⏰ Business Hours: ${selectedLocation.From_Time} - ${selectedLocation.To_Time}\n\nWhen would you like your appointment? (e.g., today, tomorrow, Sunday)`;
        
        return {
          message: response,
          collectionPhase: state.phase,
          collectedData: state.collectedData
        };
      }
      
      // Show location options
      let response = state.language === 'ar'
        ? "اختر الفرع المناسب:\n\n"
        : "Choose your preferred location:\n\n";

      locations.forEach((loc, index) => {
        response += `${index + 1}. ${loc.Location_Name}\n`;
        if (loc.Address) response += `   📍 ${loc.Address}\n`;
        if (loc.From_Time && loc.To_Time) {
          response += `   ⏰ ${loc.From_Time} - ${loc.To_Time}\n`;
        }
        response += "\n";
      });

      response += state.language === 'ar'
        ? "اكتب رقم الفرع المطلوب:"
        : "Type the location number:";

      return {
        message: response,
        collectionPhase: state.phase,
        collectedData: state.collectedData
      };

    } catch (error) {
      console.error('Location selection error:', error);
      return this.createErrorResponse(state, 'Failed to load locations');
    }
  }

  private async handleDateSelection(message: string, state: EnhancedConversationState): Promise<any> {
    const { schedulingEngine } = await import('./ai-scheduling');
    
    try {
      // Parse date from message
      const selectedDate = this.parseDateFromMessage(message);
      state.collectedData.appointmentDate = selectedDate;
      
      // Advanced validation with scheduling engine
      const validation = await schedulingEngine.validateComplexBooking(
        state.collectedData.selectedServices,
        state.collectedData.locationId!,
        selectedDate
      );
      
      if (!validation.isValid) {
        // Handle conflicts with intelligent suggestions
        state.collectedData.validationErrors = validation.conflicts.map(c => c.message);
        
        let response = state.language === 'ar'
          ? `❌ يوجد تعارض في التاريخ المحدد:\n\n`
          : `❌ There are conflicts with the selected date:\n\n`;
        
        validation.conflicts.forEach((conflict, index) => {
          response += `${index + 1}. ${conflict.message}\n`;
        });
        
        if (validation.recommendations.alternativeDates.length > 0) {
          response += state.language === 'ar'
            ? `\n📅 تواريخ بديلة متاحة:\n`
            : `\n📅 Alternative dates available:\n`;
          
          validation.recommendations.alternativeDates.slice(0, 3).forEach((altDate, index) => {
            response += `${index + 1}. ${altDate}\n`;
          });
        }
        
        return {
          message: response,
          collectionPhase: state.phase,
          collectedData: state.collectedData,
          validationErrors: state.collectedData.validationErrors
        };
      }
      
      // Date is valid, move to time selection
      state.phase = 'time_selection';
      state.collectedData.bookingFeasible = true;
      
      const durationText = `${Math.floor(validation.totalDurationMinutes / 60)}h ${validation.totalDurationMinutes % 60}min`;
      
      const response = state.language === 'ar'
        ? `✅ تاريخ متاح: ${selectedDate}\n⏱️ مدة الخدمات: ${durationText}\n🎯 مطلوب ${validation.requiredTimeSlots} فترات زمنية\n\nما الوقت المفضل؟ (مثال: 10:00 AM، 2:00 PM)`
        : `✅ Date available: ${selectedDate}\n⏱️ Service duration: ${durationText}\n🎯 ${validation.requiredTimeSlots} time slots needed\n\nWhat time would you prefer? (e.g., 10:00 AM, 2:00 PM)`;
      
      return {
        message: response,
        collectionPhase: state.phase,
        collectedData: state.collectedData
      };

    } catch (error) {
      console.error('Date selection error:', error);
      return this.createErrorResponse(state, 'Failed to validate selected date');
    }
  }

  private async handleTimeSelection(message: string, state: EnhancedConversationState): Promise<any> {
    const { schedulingEngine } = await import('./ai-scheduling');
    
    try {
      const requestedTime = this.parseTimeFromMessage(message);
      
      // Advanced time validation with staff and resource checking
      const validation = await schedulingEngine.validateComplexBooking(
        state.collectedData.selectedServices,
        state.collectedData.locationId!,
        state.collectedData.appointmentDate!,
        requestedTime
      );
      
      if (!validation.isValid) {
        let response = state.language === 'ar'
          ? `❌ الوقت المطلوب غير متاح:\n\n`
          : `❌ Requested time is not available:\n\n`;
        
        validation.conflicts.forEach(conflict => {
          response += `• ${conflict.message}\n`;
          if (conflict.suggestedAlternative) {
            const alt = conflict.suggestedAlternative;
            if (alt.time) response += `  💡 Suggestion: ${alt.time}\n`;
            if (alt.staffName) response += `  👤 Alternative staff: ${alt.staffName}\n`;
          }
        });
        
        if (validation.recommendations.alternativeTimes.length > 0) {
          response += state.language === 'ar'
            ? `\n🕐 أوقات بديلة متاحة:\n`
            : `\n🕐 Available alternative times:\n`;
          
          validation.recommendations.alternativeTimes.forEach((time, index) => {
            response += `${index + 1}. ${time}\n`;
          });
        }
        
        return {
          message: response,
          collectionPhase: state.phase,
          collectedData: state.collectedData
        };
      }
      
      // Time is valid, assign staff and move to customer info
      await this.assignOptimalStaff(state);
      state.phase = 'customer_info';
      
      const staffInfo = state.collectedData.assignedStaff.length > 0
        ? state.collectedData.assignedStaff.map(s => s.staffName).join(', ')
        : 'Available specialists';
      
      const response = state.language === 'ar'
        ? `✅ تم تأكيد الوقت: ${requestedTime}\n👥 المختصون: ${staffInfo}\n\nالآن أحتاج بياناتك:\nما اسمك الكامل؟`
        : `✅ Time confirmed: ${requestedTime}\n👥 Specialists: ${staffInfo}\n\nNow I need your details:\nWhat's your full name?`;
      
      return {
        message: response,
        collectionPhase: state.phase,
        collectedData: state.collectedData
      };

    } catch (error) {
      console.error('Time selection error:', error);
      return this.createErrorResponse(state, 'Failed to validate selected time');
    }
  }

  private async handleStaffSelection(message: string, state: EnhancedConversationState): Promise<any> {
    // This phase handles staff reassignment requests
    try {
      const requestedStaffName = message.trim();
      
      // Check if specific staff was requested
      if (requestedStaffName.length > 2) {
        const availableStaff = await this.getAvailableStaffForServices(
          state.collectedData.selectedServices,
          state.collectedData.locationId!,
          state.collectedData.appointmentDate!
        );
        
        const matchingStaff = availableStaff.find(staff => 
          staff.staffName.toLowerCase().includes(requestedStaffName.toLowerCase())
        );
        
        if (matchingStaff && matchingStaff.isAvailable) {
          state.collectedData.assignedStaff = [matchingStaff];
          state.phase = 'customer_info';
          
          const response = state.language === 'ar'
            ? `✅ تم تعيين المختص: ${matchingStaff.staffName}\n\nما اسمك الكامل؟`
            : `✅ Staff assigned: ${matchingStaff.staffName}\n\nWhat's your full name?`;
          
          return {
            message: response,
            collectionPhase: state.phase,
            collectedData: state.collectedData
          };
        } else if (matchingStaff && !matchingStaff.isAvailable) {
          const response = state.language === 'ar'
            ? `❌ ${matchingStaff.staffName} غير متاح في الوقت المحدد.\n\nوقت متاح التالي: ${matchingStaff.nextAvailableTime}\nأو اختر مختص آخر من القائمة.`
            : `❌ ${matchingStaff.staffName} is not available at the selected time.\n\nNext available: ${matchingStaff.nextAvailableTime}\nOr choose another specialist from the list.`;
          
          return {
            message: response,
            collectionPhase: state.phase,
            collectedData: state.collectedData
          };
        }
      }
      
      // Show available staff options
      const availableStaff = await this.getAvailableStaffForServices(
        state.collectedData.selectedServices,
        state.collectedData.locationId!,
        state.collectedData.appointmentDate!
      );
      
      let response = state.language === 'ar'
        ? "المختصون المتاحون:\n\n"
        : "Available specialists:\n\n";
      
      availableStaff.slice(0, 5).forEach((staff, index) => {
        response += `${index + 1}. ${staff.staffName}\n`;
        response += `   Qualified for: ${staff.qualifiedServices.length} services\n`;
        if (staff.isAvailable) {
          response += `   ✅ Available\n`;
        } else {
          response += `   ❌ Next available: ${staff.nextAvailableTime}\n`;
        }
        response += `\n`;
      });
      
      response += state.language === 'ar'
        ? "اختر المختص أو اكتب 'أي مختص' للمتابعة:"
        : "Choose a specialist or type 'any specialist' to continue:";
      
      return {
        message: response,
        collectionPhase: state.phase,
        collectedData: state.collectedData
      };

    } catch (error) {
      console.error('Staff selection error:', error);
      return this.createErrorResponse(state, 'Failed to process staff selection');
    }
  }

  private async handleCustomerInfo(message: string, state: EnhancedConversationState): Promise<any> {
    const extractedName = this.extractName(message);
    const extractedEmail = this.extractEmail(message);
    
    if (extractedName) {
      state.collectedData.customerName = extractedName;
    }
    
    if (extractedEmail) {
      state.collectedData.customerEmail = extractedEmail;
    }
    
    // Check if we have both name and email
    if (state.collectedData.customerName && state.collectedData.customerEmail) {
      // Verify or create customer in NailIt system
      const customerValidation = await this.validateCustomerInfo(state);
      
      if (customerValidation.isValid) {
        state.phase = 'payment_method';
        return this.handlePaymentMethod('', state);
      } else {
        const response = state.language === 'ar'
          ? `❌ ${customerValidation.error}\nيرجى التصحيح.`
          : `❌ ${customerValidation.error}\nPlease correct this.`;
        
        return {
          message: response,
          collectionPhase: state.phase,
          collectedData: state.collectedData
        };
      }
    }
    
    // Ask for missing information
    if (!state.collectedData.customerName) {
      const response = state.language === 'ar'
        ? "ما اسمك الكامل؟"
        : "What's your full name?";
      
      return {
        message: response,
        collectionPhase: state.phase,
        collectedData: state.collectedData
      };
    }
    
    if (!state.collectedData.customerEmail) {
      const response = state.language === 'ar'
        ? `شكراً ${state.collectedData.customerName}!\n\nما عنوان بريدك الإلكتروني؟`
        : `Thank you ${state.collectedData.customerName}!\n\nWhat's your email address?`;
      
      return {
        message: response,
        collectionPhase: state.phase,
        collectedData: state.collectedData
      };
    }
  }

  private async handlePaymentMethod(message: string, state: EnhancedConversationState): Promise<any> {
    try {
      const paymentTypes = await nailItAPI.getPaymentTypes();
      
      if (message.trim() === '') {
        // First time showing payment options
        let response = state.language === 'ar'
          ? "اختر طريقة الدفع:\n\n"
          : "Choose payment method:\n\n";
        
        paymentTypes.forEach((payment, index) => {
          if (payment.Is_Enabled) {
            response += `${index + 1}. ${payment.Type_Name}\n`;
          }
        });
        
        response += state.language === 'ar'
          ? "\nننصح بـ KNet للدفع الآمن الفوري:"
          : "\nWe recommend KNet for secure instant payment:";
        
        return {
          message: response,
          collectionPhase: state.phase,
          collectedData: state.collectedData
        };
      }
      
      // Process payment method selection
      const selectedPayment = this.parsePaymentSelection(message, paymentTypes);
      
      if (selectedPayment) {
        state.collectedData.paymentTypeId = selectedPayment.Type_Id;
        state.collectedData.paymentTypeName = selectedPayment.Type_Name;
        
        // Move to final booking validation
        state.phase = 'booking_validation';
        return this.handleBookingValidation('', state);
      } else {
        const response = state.language === 'ar'
          ? "اختيار غير صالح. اكتب رقم طريقة الدفع:"
          : "Invalid selection. Please type the payment method number:";
        
        return {
          message: response,
          collectionPhase: state.phase,
          collectedData: state.collectedData
        };
      }

    } catch (error) {
      console.error('Payment method error:', error);
      return this.createErrorResponse(state, 'Failed to load payment methods');
    }
  }

  private async handleBookingValidation(message: string, state: EnhancedConversationState): Promise<any> {
    try {
      console.log('🔍 Starting comprehensive booking validation...');
      
      // Perform final validation of all collected data
      const validationResult = await this.performFinalValidation(state);
      
      if (!validationResult.isValid) {
        state.collectedData.validationErrors = validationResult.errors;
        
        let response = state.language === 'ar'
          ? "❌ يرجى تصحيح المعلومات التالية:\n\n"
          : "❌ Please correct the following information:\n\n";
        
        validationResult.errors.forEach((error, index) => {
          response += `${index + 1}. ${error}\n`;
        });
        
        // Return to appropriate phase based on error type
        const targetPhase = this.getPhaseForValidationError(validationResult.errors[0]);
        state.phase = targetPhase;
        
        return {
          message: response,
          collectionPhase: state.phase,
          collectedData: state.collectedData,
          validationErrors: validationResult.errors
        };
      }
      
      // All validation passed, show final summary
      state.collectedData.allFieldsValidated = true;
      
      const bookingSummary = this.generateBookingSummary(state);
      const response = state.language === 'ar'
        ? `✅ جميع المعلومات صحيحة!\n\n📋 ملخص الحجز:\n${bookingSummary}\n\nهل تؤكد الحجز؟ (نعم/لا)`
        : `✅ All information validated!\n\n📋 Booking Summary:\n${bookingSummary}\n\nConfirm booking? (yes/no)`;
      
      state.phase = 'confirmation';
      
      return {
        message: response,
        collectionPhase: state.phase,
        collectedData: state.collectedData
      };

    } catch (error) {
      console.error('Booking validation error:', error);
      return this.createErrorResponse(state, 'Failed to validate booking information');
    }
  }

  private async handlePaymentProcessing(message: string, state: EnhancedConversationState): Promise<any> {
    try {
      console.log('💳 Processing payment...');
      
      // Create order in NailIt system
      const orderResult = await this.createNailItOrder(state);
      
      if (!orderResult.success) {
        const response = state.language === 'ar'
          ? `❌ فشل في إنشاء الطلب: ${orderResult.error}`
          : `❌ Failed to create order: ${orderResult.error}`;
        
        return {
          message: response,
          collectionPhase: state.phase,
          collectedData: state.collectedData
        };
      }
      
      state.collectedData.nailItOrderId = orderResult.orderId;
      
      // Generate payment link for KNet
      if (state.collectedData.paymentTypeId === 2) { // KNet
        const paymentUrl = `http://nailit.innovasolution.net/knet.aspx?orderId=${orderResult.orderId}`;
        state.collectedData.paymentUrl = paymentUrl;
        state.collectedData.paymentStatus = 'pending';
        
        const response = state.language === 'ar'
          ? `✅ تم إنشاء الطلب برقم: ${orderResult.orderId}\n\n💳 رابط الدفع KNet:\n${paymentUrl}\n\nبيانات الاختبار:\n• الكارت: 0000000001\n• انتهاء الصلاحية: 09/25\n• الرقم السري: 1234\n\nادفع الآن ثم اكتب "تم الدفع" للتأكيد.`
          : `✅ Order created: ${orderResult.orderId}\n\n💳 KNet Payment Link:\n${paymentUrl}\n\nTest credentials:\n• Card: 0000000001\n• Expiry: 09/25\n• PIN: 1234\n\nPay now then type "payment done" to confirm.`;
        
        return {
          message: response,
          collectionPhase: state.phase,
          collectedData: state.collectedData,
          paymentUrl: paymentUrl
        };
      }
      
      // For other payment methods, move directly to confirmation
      state.phase = 'confirmation';
      return this.handleConfirmation('payment completed', state);

    } catch (error) {
      console.error('Payment processing error:', error);
      return this.createErrorResponse(state, 'Failed to process payment');
    }
  }

  private async handleConfirmation(message: string, state: EnhancedConversationState): Promise<any> {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('yes') || lowerMessage.includes('confirm') || 
        lowerMessage.includes('نعم') || lowerMessage.includes('تأكيد') ||
        state.collectedData.allFieldsValidated) {
      
      // Process the booking
      state.phase = 'payment_processing';
      return this.handlePaymentProcessing('', state);
    }
    
    if (lowerMessage.includes('payment done') || lowerMessage.includes('تم الدفع')) {
      // Verify payment status
      const paymentVerification = await this.verifyPaymentStatus(state);
      
      if (paymentVerification.isSuccessful) {
        state.collectedData.paymentStatus = 'completed';
        state.collectedData.bookingConfirmed = true;
        state.phase = 'completed';
        
        const finalConfirmation = this.generateFinalConfirmation(state, paymentVerification);
        
        return {
          message: finalConfirmation,
          collectionPhase: state.phase,
          collectedData: state.collectedData,
          bookingComplete: true
        };
      } else {
        const response = state.language === 'ar'
          ? `❌ لم يتم تأكيد الدفع بعد. الحالة: ${paymentVerification.status}\n\nيرجى المحاولة مرة أخرى أو الاتصال بنا.`
          : `❌ Payment not confirmed yet. Status: ${paymentVerification.status}\n\nPlease try again or contact us.`;
        
        return {
          message: response,
          collectionPhase: state.phase,
          collectedData: state.collectedData
        };
      }
    }
    
    if (lowerMessage.includes('no') || lowerMessage.includes('cancel') || 
        lowerMessage.includes('لا') || lowerMessage.includes('إلغاء')) {
      
      const response = state.language === 'ar'
        ? "تم إلغاء الحجز. هل تريد بدء حجز جديد؟"
        : "Booking cancelled. Would you like to start a new booking?";
      
      // Reset state
      state.phase = 'greeting';
      state.collectedData = {
        selectedServices: [],
        totalDuration: 0,
        totalAmount: 0,
        requestedTimeSlots: [],
        availableTimeSlots: [],
        conflictingAppointments: [],
        assignedStaff: [],
        staffConflicts: [],
        validationErrors: []
      };
      
      return {
        message: response,
        collectionPhase: state.phase,
        collectedData: state.collectedData
      };
    }
    
    // Invalid response, ask again
    const response = state.language === 'ar'
      ? "يرجى الإجابة بـ 'نعم' أو 'لا'"
      : "Please answer 'yes' or 'no'";
    
    return {
      message: response,
      collectionPhase: state.phase,
      collectedData: state.collectedData
    };
  }

  private async handleUnknownPhase(message: string, state: EnhancedConversationState): Promise<any> {
    console.log(`⚠️ Unknown phase: ${state.phase}`);
    
    // Reset to greeting and try to understand intent
    state.phase = 'greeting';
    return this.handleGreeting(message, state);
  }

  /**
   * Helper Methods
   */

  private async extractServicesFromMessage(message: string, state: EnhancedConversationState): Promise<void> {
    try {
      console.log(`🔍 Enhanced service extraction: "${message}"`);
      
      // Get comprehensive service list from NailIt API
      const allServices = await this.getAllAvailableServices();
      
      if (!allServices || allServices.length === 0) {
        console.log('❌ No services available from NailIt API');
        return;
      }

      const extractedServices = this.matchServicesFromMessage(message, allServices);
      
      if (extractedServices.length > 0) {
        // Convert to ServiceBooking format
        state.collectedData.selectedServices = extractedServices.map(service => ({
          itemId: service.Item_Id,
          itemName: service.Item_Name,
          price: service.Special_Price || service.Primary_Price,
          quantity: 1,
          duration: parseInt(service.Duration) || 60,
          description: service.Item_Desc?.replace(/<[^>]*>/g, '') || ''
        }));
        
        console.log(`✅ Extracted ${extractedServices.length} services`);
      }
    } catch (error) {
      console.error('Service extraction error:', error);
    }
  }

  private async getAllAvailableServices(): Promise<NailItItem[]> {
    try {
      const dateStr = new Date().toISOString().split('T')[0].split('-').reverse().join('-');
      let allServices = [];
      
      // Get NAIL SERVICES specifically - using Group_Id 42 for nail services
      for (let page = 1; page <= 5; page++) {
        const pageResults = await nailItAPI.getItemsByDate({
          Lang: 'E',
          Like: '',
          Page_No: page,
          Item_Type_Id: 2,
          Group_Id: 42, // Nail services group ID
          Location_Ids: [1, 52, 53],
          Is_Home_Service: false,
          Selected_Date: dateStr
        });
        
        if (pageResults && pageResults.items && pageResults.items.length > 0) {
          allServices.push(...pageResults.items);
        } else {
          break; // No more pages
        }
      }
      
      // If no nail services found, try getting all services and filter for nail-related terms
      if (allServices.length === 0) {
        console.log('🔍 No services found with Group_Id 42, trying broader search...');
        for (let page = 1; page <= 5; page++) {
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
          
          if (pageResults && pageResults.items && pageResults.items.length > 0) {
            // Filter for nail-related services
            const nailServices = pageResults.items.filter(item => {
              const serviceName = item.Item_Name.toLowerCase();
              return serviceName.includes('nail') || 
                     serviceName.includes('manicure') || 
                     serviceName.includes('pedicure') ||
                     serviceName.includes('gel') ||
                     serviceName.includes('french') ||
                     serviceName.includes('acrylic') ||
                     serviceName.includes('polish');
            });
            allServices.push(...nailServices);
          } else {
            break;
          }
        }
      }
      
      console.log(`💅 Loaded ${allServices.length} NAIL services from NailIt API`);
      return allServices;
    } catch (error) {
      console.error('Error loading services:', error);
      return [];
    }
  }

  private matchServicesFromMessage(message: string, services: NailItItem[]): NailItItem[] {
    const lowerMessage = message.toLowerCase().trim();
    const matches = [];
    
    console.log(`🔍 Matching "${lowerMessage}" against ${services.length} services`);
    
    for (const service of services) {
      const serviceName = service.Item_Name.toLowerCase();
      let score = 0;
      
      // Exact match (highest priority)
      if (serviceName === lowerMessage) {
        score = 100;
        console.log(`✅ Exact match: "${serviceName}" = "${lowerMessage}" (score: ${score})`);
      }
      // Service name contains search term
      else if (serviceName.includes(lowerMessage)) {
        score = 90;
        console.log(`✅ Contains match: "${serviceName}" contains "${lowerMessage}" (score: ${score})`);
      }
      // Search term contains service name
      else if (lowerMessage.includes(serviceName) && serviceName.length > 2) {
        score = 80;
        console.log(`✅ Reverse match: "${lowerMessage}" contains "${serviceName}" (score: ${score})`);
      }
      // Enhanced keyword matching for nail services
      else {
        const nailKeywords = ['french', 'manicure', 'pedicure', 'gel', 'acrylic', 'nail', 'polish', 'spa', 'classic', 'deluxe'];
        for (const keyword of nailKeywords) {
          if (lowerMessage.includes(keyword) && serviceName.includes(keyword)) {
            score = 70;
            console.log(`✅ Keyword match: "${serviceName}" and "${lowerMessage}" both contain "${keyword}" (score: ${score})`);
            break;
          }
        }
        
        // Boost score for exact nail service matches
        if (lowerMessage.includes('french') && serviceName.includes('french')) {
          score = 95;
          console.log(`✅ French boost: "${serviceName}" (score: ${score})`);
        }
        else if (lowerMessage.includes('manicure') && serviceName.includes('manicure')) {
          score = 90;
          console.log(`✅ Manicure boost: "${serviceName}" (score: ${score})`);
        }
        else if (lowerMessage.includes('pedicure') && serviceName.includes('pedicure')) {
          score = 90;
          console.log(`✅ Pedicure boost: "${serviceName}" (score: ${score})`);
        }
      }
      
      if (score >= 70) {
        matches.push({ service, score });
      }
    }
    
    console.log(`🎯 Found ${matches.length} matches with score >= 70`);
    
    // Sort by score and return top matches
    const sortedMatches = matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(match => match.service);
      
    console.log(`📋 Returning ${sortedMatches.length} top matches`);
    return sortedMatches;
  }

  private async getServiceSuggestions(query: string): Promise<NailItItem[]> {
    const allServices = await this.getAllAvailableServices();
    
    if (!allServices || allServices.length === 0) {
      console.log('❌ No services available for suggestions');
      return [];
    }
    
    if (query.length < 3) {
      // Return popular nail services
      console.log(`📋 Returning ${Math.min(10, allServices.length)} popular nail services`);
      return allServices.slice(0, 10);
    }
    
    const matches = this.matchServicesFromMessage(query, allServices);
    
    if (matches.length === 0) {
      // No matches found, return popular services instead of empty array
      console.log(`🔍 No matches for "${query}", returning popular nail services`);
      return allServices.slice(0, 5);
    }
    
    console.log(`✅ Found ${matches.length} service matches for "${query}"`);
    return matches;
  }

  // Complete helper methods implementation
  
  private async validateServicesAtLocation(
    services: ServiceBooking[],
    locationId: number
  ): Promise<{ allAvailable: boolean; unavailable: string[] }> {
    try {
      const dateStr = new Date().toISOString().split('T')[0].split('-').reverse().join('-');
      const locationServices = await nailItAPI.getItemsByDate({
        Lang: 'E',
        Like: '',
        Page_No: 1,
        Item_Type_Id: 2,
        Group_Id: 0,
        Location_Ids: [locationId],
        Is_Home_Service: false,
        Selected_Date: dateStr
      });

      const unavailable = [];
      const availableIds = locationServices.items?.map(item => item.Item_Id) || [];

      for (const service of services) {
        if (!availableIds.includes(service.itemId)) {
          unavailable.push(service.itemName);
        }
      }

      return {
        allAvailable: unavailable.length === 0,
        unavailable
      };
    } catch (error) {
      console.error('Service validation error:', error);
      return { allAvailable: false, unavailable: services.map(s => s.itemName) };
    }
  }

  private parseDateFromMessage(message: string): string {
    const lowerMessage = message.toLowerCase();
    let selectedDate = new Date();
    
    if (lowerMessage.includes('today') || lowerMessage.includes('اليوم')) {
      selectedDate = new Date();
    } else if (lowerMessage.includes('tomorrow') || lowerMessage.includes('غداً') || lowerMessage.includes('غدا')) {
      selectedDate.setDate(selectedDate.getDate() + 1);
    } else if (lowerMessage.includes('after tomorrow') || lowerMessage.includes('بعد غد')) {
      selectedDate.setDate(selectedDate.getDate() + 2);
    } else if (lowerMessage.includes('sunday') || lowerMessage.includes('الأحد')) {
      const dayOfWeek = selectedDate.getDay();
      const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
      selectedDate.setDate(selectedDate.getDate() + daysUntilSunday);
    } else {
      selectedDate.setDate(selectedDate.getDate() + 1); // Default to tomorrow
    }
    
    return selectedDate.toLocaleDateString('en-GB').replace(/\//g, '-');
  }

  private parseTimeFromMessage(message: string): string {
    const timeMatch = message.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
    if (timeMatch) {
      const hour = timeMatch[1];
      const minute = timeMatch[2] || '00';
      const period = timeMatch[3]?.toUpperCase();
      return `${hour}:${minute} ${period}`;
    }
    return '10:00 AM'; // Default time
  }

  private async assignOptimalStaff(state: EnhancedConversationState): Promise<void> {
    try {
      const assignedStaff = [];
      
      for (const service of state.collectedData.selectedServices) {
        const availableStaff = await nailItAPI.getServiceStaff(
          service.itemId,
          state.collectedData.locationId!,
          'E',
          state.collectedData.appointmentDate!
        );

        if (availableStaff && availableStaff.length > 0) {
          const staff = availableStaff[0]; // Assign first available staff
          assignedStaff.push({
            staffId: staff.Id,
            staffName: staff.Name,
            isAvailable: true,
            qualifiedServices: [service.itemId],
            currentBookings: [],
            nextAvailableTime: undefined,
            nextAvailableDate: undefined
          });
        }
      }

      state.collectedData.assignedStaff = assignedStaff;
    } catch (error) {
      console.error('Staff assignment error:', error);
      // Fallback assignment
      state.collectedData.assignedStaff = [{
        staffId: 1,
        staffName: 'Available Specialist',
        isAvailable: true,
        qualifiedServices: state.collectedData.selectedServices.map(s => s.itemId),
        currentBookings: [],
        nextAvailableTime: undefined,
        nextAvailableDate: undefined
      }];
    }
  }

  private async getAvailableStaffForServices(
    services: ServiceBooking[],
    locationId: number,
    date: string
  ): Promise<StaffAvailability[]> {
    try {
      const allStaff = [];
      
      for (const service of services) {
        const serviceStaff = await nailItAPI.getServiceStaff(service.itemId, locationId, 'E', date);
        if (serviceStaff) {
          allStaff.push(...serviceStaff.map(staff => ({
            staffId: staff.Id,
            staffName: staff.Name,
            isAvailable: true,
            qualifiedServices: [service.itemId],
            currentBookings: [],
            nextAvailableTime: '11:00 AM',
            nextAvailableDate: date
          })));
        }
      }

      // Remove duplicates
      const uniqueStaff = allStaff.filter((staff, index, self) => 
        index === self.findIndex(s => s.staffId === staff.staffId)
      );

      return uniqueStaff;
    } catch (error) {
      console.error('Staff availability error:', error);
      return [];
    }
  }

  private extractName(message: string): string | null {
    // Remove email pattern from message first
    const messageWithoutEmail = message.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '');
    
    const nameMatch = messageWithoutEmail.match(/(?:my name is|i'm|i am|call me)\s+([a-zA-Z\s]+)/i);
    if (nameMatch) {
      return nameMatch[1].trim();
    }
    
    // If message is short and contains only letters and spaces, treat as name
    if (messageWithoutEmail.length < 50 && /^[a-zA-Z\s]+$/.test(messageWithoutEmail.trim())) {
      return messageWithoutEmail.trim();
    }
    
    return null;
  }

  private extractEmail(message: string): string | null {
    const emailMatch = message.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
    return emailMatch ? emailMatch[0] : null;
  }

  private async validateCustomerInfo(state: EnhancedConversationState): Promise<{ isValid: boolean; error?: string }> {
    try {
      if (!state.collectedData.customerName || state.collectedData.customerName.length < 2) {
        return { isValid: false, error: 'Name is too short' };
      }

      if (!state.collectedData.customerEmail || !this.isValidEmail(state.collectedData.customerEmail)) {
        return { isValid: false, error: 'Invalid email address' };
      }

      // Try to register/get user in NailIt system
      const userData = {
        Address: "Kuwait City, Kuwait",
        Email_Id: state.collectedData.customerEmail,
        Name: state.collectedData.customerName,
        Mobile: state.collectedData.customerPhone || '96512345678',
        Login_Type: 1,
        Image_Name: ""
      };

      const userId = await nailItAPI.getOrCreateUser(userData);
      if (userId) {
        state.collectedData.nailItCustomerId = userId;
        state.collectedData.isExistingCustomer = true;
        return { isValid: true };
      }

      return { isValid: false, error: 'Failed to create customer account' };
    } catch (error) {
      console.error('Customer validation error:', error);
      return { isValid: false, error: 'Customer validation failed' };
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private parsePaymentSelection(message: string, paymentTypes: any[]): any | null {
    const numberMatch = message.match(/\d+/);
    if (numberMatch) {
      const index = parseInt(numberMatch[0]) - 1;
      const enabledPayments = paymentTypes.filter(p => p.Is_Enabled);
      if (index >= 0 && index < enabledPayments.length) {
        return enabledPayments[index];
      }
    }

    // Check for payment method name
    const lowerMessage = message.toLowerCase();
    for (const payment of paymentTypes) {
      if (payment.Is_Enabled && payment.Type_Name.toLowerCase().includes(lowerMessage)) {
        return payment;
      }
    }

    return null;
  }

  private async performFinalValidation(state: EnhancedConversationState): Promise<{ isValid: boolean; errors: string[] }> {
    const errors = [];

    // Check all required fields
    if (!state.collectedData.selectedServices || state.collectedData.selectedServices.length === 0) {
      errors.push('No services selected');
    }

    if (!state.collectedData.locationId) {
      errors.push('Location not selected');
    }

    if (!state.collectedData.appointmentDate) {
      errors.push('Appointment date not selected');
    }

    if (!state.collectedData.customerName) {
      errors.push('Customer name required');
    }

    if (!state.collectedData.customerEmail) {
      errors.push('Customer email required');
    }

    if (!state.collectedData.paymentTypeId) {
      errors.push('Payment method not selected');
    }

    if (!state.collectedData.assignedStaff || state.collectedData.assignedStaff.length === 0) {
      errors.push('No staff assigned');
    }

    // Additional business logic validation
    if (state.collectedData.totalDuration > 480) { // 8 hours max
      errors.push('Total service duration exceeds daily limit');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private getPhaseForValidationError(error: string): EnhancedConversationState['phase'] {
    if (error.includes('services')) return 'service_selection';
    if (error.includes('location')) return 'location_selection';
    if (error.includes('date')) return 'date_selection';
    if (error.includes('name') || error.includes('email')) return 'customer_info';
    if (error.includes('payment')) return 'payment_method';
    if (error.includes('staff')) return 'staff_selection';
    return 'booking_validation';
  }

  private generateBookingSummary(state: EnhancedConversationState): string {
    const services = state.collectedData.selectedServices.map(s => 
      `• ${s.itemName} - ${s.price} KWD`
    ).join('\n');

    const staff = state.collectedData.assignedStaff.map(s => s.staffName).join(', ');
    const duration = `${Math.floor(state.collectedData.totalDuration / 60)}h ${state.collectedData.totalDuration % 60}min`;

    return state.language === 'ar'
      ? `🏢 الفرع: ${state.collectedData.locationName}\n📅 التاريخ: ${state.collectedData.appointmentDate}\n⏱️ المدة: ${duration}\n👥 المختصون: ${staff}\n\n💳 طريقة الدفع: ${state.collectedData.paymentTypeName}\n💰 الإجمالي: ${state.collectedData.totalAmount} KWD\n\n📋 الخدمات:\n${services}`
      : `🏢 Location: ${state.collectedData.locationName}\n📅 Date: ${state.collectedData.appointmentDate}\n⏱️ Duration: ${duration}\n👥 Specialists: ${staff}\n\n💳 Payment: ${state.collectedData.paymentTypeName}\n💰 Total: ${state.collectedData.totalAmount} KWD\n\n📋 Services:\n${services}`;
  }

  private async createNailItOrder(state: EnhancedConversationState): Promise<{ success: boolean; orderId?: number; error?: string }> {
    try {
      console.log('🔄 Creating NailIt order...');

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
        Staff_Id: state.collectedData.assignedStaff[0]?.staffId || 1,
        TimeFrame_Ids: [1, 2], // Default time slots
        Appointment_Date: state.collectedData.appointmentDate!
      }));

      const orderData = {
        Gross_Amount: state.collectedData.totalAmount,
        Payment_Type_Id: state.collectedData.paymentTypeId!,
        Order_Type: 2, // Service booking
        UserId: state.collectedData.nailItCustomerId!,
        FirstName: state.collectedData.customerName!,
        Mobile: state.collectedData.customerPhone || '96512345678',
        Email: state.collectedData.customerEmail!,
        Discount_Amount: 0,
        Net_Amount: state.collectedData.totalAmount,
        POS_Location_Id: state.collectedData.locationId!,
        OrderDetails: orderDetails
      };

      const result = await nailItAPI.saveOrder(orderData);

      if (result && result.Status === 1) {
        console.log(`✅ NailIt order created: ${result.OrderId}`);
        return { success: true, orderId: result.OrderId };
      } else {
        console.error(`❌ Order creation failed: ${result?.Message}`);
        return { success: false, error: result?.Message || 'Unknown error' };
      }
    } catch (error) {
      console.error('Order creation error:', error);
      return { success: false, error: error.message };
    }
  }

  private async verifyPaymentStatus(state: EnhancedConversationState): Promise<{ isSuccessful: boolean; status: string; details?: any }> {
    if (!state.collectedData.nailItOrderId) {
      return { isSuccessful: false, status: 'No order ID available' };
    }

    try {
      const paymentVerification = await nailItAPI.verifyPaymentStatus(state.collectedData.nailItOrderId);
      return {
        isSuccessful: paymentVerification.isPaymentSuccessful,
        status: paymentVerification.orderStatus,
        details: paymentVerification.paymentDetails
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return { isSuccessful: false, status: 'Verification failed' };
    }
  }

  private generateFinalConfirmation(state: EnhancedConversationState, paymentVerification: any): string {
    const summary = this.generateBookingSummary(state);
    
    return state.language === 'ar'
      ? `🎉 تم تأكيد حجزك بنجاح!\n\n📋 رقم الطلب: ${state.collectedData.nailItOrderId}\n💳 حالة الدفع: ${paymentVerification.status}\n\n${summary}\n\n✨ شكراً لك! نتطلع لرؤيتك قريباً في نايل إت.`
      : `🎉 Booking confirmed successfully!\n\n📋 Order ID: ${state.collectedData.nailItOrderId}\n💳 Payment Status: ${paymentVerification.status}\n\n${summary}\n\n✨ Thank you! We look forward to seeing you soon at NailIt.`;
  }

  private createErrorResponse(state: EnhancedConversationState, error: string): any {
    const message = state.language === 'ar'
      ? `عذراً، حدث خطأ: ${error}`
      : `Sorry, an error occurred: ${error}`;

    return {
      message,
      collectionPhase: state.phase,
      collectedData: state.collectedData,
      error
    };
  }

  /**
   * Critical Missing Methods for Routes Integration
   */
   
  validateBookingData(collectedData: any): { 
    isComplete: boolean; 
    completionPercentage: number; 
    missingFields: string[];
    details: any;
  } {
    const requiredFields = [
      'selectedServices',
      'locationId', 
      'appointmentDate',
      'customerName',
      'customerEmail',
      'paymentTypeId',
      'assignedStaff'
    ];
    
    const missingFields = [];
    let filledFields = 0;
    
    if (!collectedData.selectedServices || collectedData.selectedServices.length === 0) {
      missingFields.push('Services');
    } else {
      filledFields++;
    }
    
    if (!collectedData.locationId) {
      missingFields.push('Location');
    } else {
      filledFields++;
    }
    
    if (!collectedData.appointmentDate) {
      missingFields.push('Appointment Date');
    } else {
      filledFields++;
    }
    
    if (!collectedData.customerName) {
      missingFields.push('Customer Name');
    } else {
      filledFields++;
    }
    
    if (!collectedData.customerEmail) {
      missingFields.push('Customer Email');
    } else {
      filledFields++;
    }
    
    if (!collectedData.paymentTypeId) {
      missingFields.push('Payment Method');
    } else {
      filledFields++;
    }
    
    if (!collectedData.assignedStaff || collectedData.assignedStaff.length === 0) {
      missingFields.push('Staff Assignment');
    } else {
      filledFields++;
    }
    
    const completionPercentage = Math.round((filledFields / requiredFields.length) * 100);
    
    return {
      isComplete: missingFields.length === 0,
      completionPercentage,
      missingFields,
      details: {
        totalFields: requiredFields.length,
        filledFields,
        collectedData
      }
    };
  }

  // Clear conversation state after completion
  clearConversationState(customerId: string): void {
    this.conversationStates.delete(customerId);
    console.log(`🗑️ Cleared conversation state for customer ${customerId}`);
  }

  // Get conversation state for debugging
  getConversationState(customerId: string): EnhancedConversationState | undefined {
    return this.conversationStates.get(customerId);
  }
}

export const enhancedAI = new EnhancedAIAgent();
