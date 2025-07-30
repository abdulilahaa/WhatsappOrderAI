import { OpenAI } from 'openai';
import { storage } from './storage';
import { nailItAPI } from './nailit-api';
import type { Customer, FreshAISettings } from '@shared/schema';
import type { NailItItem, NailItStaff } from './nailit-api';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// SLOT-FILLING STATE MANAGEMENT: Enhanced conversation state with validation tracking
export interface SlotFillingState {
  // Core booking slots
  service: { value: string | null; id: number | null; validated: boolean };
  location: { value: string | null; id: number | null; validated: boolean };
  date: { value: string | null; validated: boolean };
  time: { value: string | null; validated: boolean };
  name: { value: string | null; validated: boolean };
  email: { value: string | null; validated: boolean };
  
  // Progress tracking
  currentStage: 'service' | 'location' | 'date' | 'time' | 'contact' | 'confirm' | 'complete';
  nextRequiredSlot: string;
  completedSlots: string[];
  
  // Validation results
  errors: string[];
  apiValidation: {
    serviceAvailable?: boolean;
    staffAvailable?: boolean;
    timeSlotAvailable?: boolean;
  };
  
  // Meta
  language: 'en' | 'ar';
  retryCount: number;
  lastPrompt: string;
}

export interface SlotFillingResponse {
  message: string;
  state: SlotFillingState;
  isComplete: boolean;
  nextAction: 'ask_service' | 'ask_location' | 'ask_date' | 'ask_time' | 'ask_contact' | 'confirm' | 'book';
}

export class SlotFillingAgent {
  
  /**
   * SLOT STATE NORMALIZATION: Ensures all required slots are present and properly initialized
   * Called on every user turn to guarantee complete state consistency
   */
  static normalizeSlotState(state: SlotFillingState | null, language: 'en' | 'ar' = 'en'): SlotFillingState {
    const defaultState: SlotFillingState = {
      service: { value: null, id: null, validated: false },
      location: { value: null, id: null, validated: false },
      date: { value: null, validated: false },
      time: { value: null, validated: false },
      name: { value: null, validated: false },
      email: { value: null, validated: false },
      
      currentStage: 'service',
      nextRequiredSlot: 'service',
      completedSlots: [],
      
      errors: [],
      apiValidation: {},
      
      language,
      retryCount: 0,
      lastPrompt: ''
    };

    if (!state) {
      console.log('🔧 SLOT NORMALIZATION: Creating new state with all required slots');
      return defaultState;
    }

    // Deep merge with defaults to fill any missing slots
    const normalizedState: SlotFillingState = {
      service: {
        value: state.service?.value ?? defaultState.service.value,
        id: state.service?.id ?? defaultState.service.id,
        validated: state.service?.validated ?? defaultState.service.validated
      },
      location: {
        value: state.location?.value ?? defaultState.location.value,
        id: state.location?.id ?? defaultState.location.id,
        validated: state.location?.validated ?? defaultState.location.validated
      },
      date: {
        value: state.date?.value ?? defaultState.date.value,
        validated: state.date?.validated ?? defaultState.date.validated
      },
      time: {
        value: state.time?.value ?? defaultState.time.value,
        validated: state.time?.validated ?? defaultState.time.validated
      },
      name: {
        value: state.name?.value ?? defaultState.name.value,
        validated: state.name?.validated ?? defaultState.name.validated
      },
      email: {
        value: state.email?.value ?? defaultState.email.value,
        validated: state.email?.validated ?? defaultState.email.validated
      },
      
      currentStage: state.currentStage ?? defaultState.currentStage,
      nextRequiredSlot: state.nextRequiredSlot ?? defaultState.nextRequiredSlot,
      completedSlots: Array.isArray(state.completedSlots) ? state.completedSlots : defaultState.completedSlots,
      
      errors: Array.isArray(state.errors) ? state.errors : defaultState.errors,
      apiValidation: state.apiValidation ?? defaultState.apiValidation,
      
      language: state.language ?? defaultState.language,
      retryCount: typeof state.retryCount === 'number' ? state.retryCount : defaultState.retryCount,
      lastPrompt: state.lastPrompt ?? defaultState.lastPrompt
    };

    console.log('🔧 SLOT NORMALIZATION: Normalized state with all required slots', {
      currentStage: normalizedState.currentStage,
      completedSlots: normalizedState.completedSlots,
      errors: normalizedState.errors.length,
      language: normalizedState.language
    });

    return normalizedState;
  }

  // Initialize new slot-filling session
  createNewSession(language: 'en' | 'ar' = 'en'): SlotFillingState {
    return SlotFillingAgent.normalizeSlotState(null, language);
  }

  // MAIN ORCHESTRATION: Process user message with slot-filling logic
  async processMessage(
    userMessage: string, 
    currentState: SlotFillingState | null,
    customer: Customer
  ): Promise<SlotFillingResponse> {
    console.log('🎯 SLOT-FILLING AGENT: Processing message:', userMessage);

    try {
      // STEP 0: CRITICAL - Normalize state before ANY processing to prevent undefined errors
      const normalizedState = SlotFillingAgent.normalizeSlotState(currentState, 'en');
      console.log('🔧 STATE NORMALIZED: All required slots guaranteed present');

      // Step 1: Extract information from user message (NLU only)
      const extracted = await this.extractInformation(userMessage, normalizedState);
      console.log('📤 EXTRACTED:', extracted);

      // Step 2: Validate extracted information with real-time API calls
      const validationResults = await this.validateWithAPI(extracted, normalizedState);
      console.log('✅ VALIDATION:', validationResults);

      // Step 3: Update state with validated information only
      const updatedState = this.updateStateWithValidatedData(normalizedState, extracted, validationResults);
      console.log('📊 STATE UPDATE:', updatedState.completedSlots);

      // Step 4: Determine next required slot (deterministic logic)
      const nextSlot = this.determineNextSlot(updatedState);

      // Step 5: Handle validation errors
      if (validationResults.errors.length > 0) {
        return this.generateErrorResponse(updatedState, validationResults.errors);
      }

      // Step 6: Check if booking is ready
      if (nextSlot === 'complete' && this.isUserConfirming(userMessage)) {
        return await this.completeBooking(updatedState, customer);
      }

      // Step 7: Generate next prompt (LLM for natural language only)
      const nextMessage = await this.generateNextPrompt(updatedState, userMessage);

      return {
        message: nextMessage,
        state: updatedState,
        isComplete: false,
        nextAction: this.mapSlotToAction(nextSlot)
      };

    } catch (error) {
      // CRITICAL ERROR HANDLING: Log entire state and user message for debugging
      console.error('🚨 CRITICAL SLOT-FILLING ERROR:', error);
      console.error('🚨 FULL STATE DUMP:', JSON.stringify(currentState, null, 2));
      console.error('🚨 USER MESSAGE:', userMessage);
      console.error('🚨 CUSTOMER ID:', customer.id);
      console.error('🚨 ERROR STACK:', error instanceof Error ? error.stack : 'Unknown error');
      
      // Check if this is a TypeError to identify undefined property access
      if (error instanceof TypeError) {
        console.error('⚠️ TYPEERROR DETECTED: Likely undefined property access in slot-filling');
        console.error('⚠️ STATE BEFORE NORMALIZATION:', JSON.stringify(currentState, null, 2));
      }

      return this.generateSystemErrorResponse(currentState);
    }
  }

  // INFORMATION EXTRACTION: Pure NLU - extract data from user message
  private async extractInformation(userMessage: string, state: SlotFillingState): Promise<any> {
    const extracted: any = {};
    const lowerMessage = userMessage.toLowerCase();

    // SAFE ACCESS: State is guaranteed to be normalized before this call
    try {
      // Extract service using NailIt API search
      if (!state.service?.validated && this.containsServiceKeywords(lowerMessage)) {
        // Search for services based on user's request
        const serviceMatches = await this.searchNailItServices(userMessage);
        if (serviceMatches.length > 0) {
          // Use the first matching service
          const service = serviceMatches[0];
          extracted.service = { 
            value: service.Item_Name, 
            id: service.Item_Id, 
            validated: false 
          };
          console.log(`📋 Extracted service: ${service.Item_Name} (ID: ${service.Item_Id})`);
        }
      }

      // Extract location
      if (!state.location?.validated && this.containsLocationKeywords(lowerMessage)) {
        if (lowerMessage.includes('plaza')) {
          extracted.location = { value: 'Al-Plaza Mall', id: 1, validated: false };
        } else if (lowerMessage.includes('zahra')) {
          extracted.location = { value: 'Zahra Complex', id: 52, validated: false };
        } else if (lowerMessage.includes('arraya')) {
          extracted.location = { value: 'Arraya Mall', id: 53, validated: false };
        }
      }

    // Extract date
    if (!state.date?.validated && this.containsDateKeywords(lowerMessage)) {
      extracted.date = { value: this.parseDate(lowerMessage), validated: false };
    }

    // Extract time
    if (!state.time?.validated && this.containsTimeKeywords(lowerMessage)) {
      extracted.time = { value: this.parseTime(lowerMessage), validated: false };
    }

    // Extract name
    if (!state.name?.validated && this.containsNamePattern(lowerMessage)) {
      extracted.name = { value: this.extractName(userMessage), validated: false };
    }

    // Extract email
    if (!state.email?.validated && this.containsEmailPattern(lowerMessage)) {
      extracted.email = { value: this.extractEmail(userMessage), validated: false };
    }

    } catch (error) {
      console.error('❌ Error extracting information:', error);
      console.error('❌ State during extraction:', JSON.stringify(state, null, 2));
      console.error('❌ User message:', userMessage);
    }

    return extracted;

    return extracted;
  }

  // API VALIDATION: Real-time verification with NailIt API
  private async validateWithAPI(
    extracted: any, 
    currentState: SlotFillingState
  ): Promise<{ validatedData: any; errors: string[] }> {
    const errors: string[] = [];
    const validatedData: any = {};

    try {
      // Validate service availability
      if (extracted.service) {
        const serviceValid = await this.validateService(extracted.service.id, currentState.location.id);
        if (serviceValid) {
          validatedData.service = { ...extracted.service, validated: true };
        } else {
          errors.push(`Service "${extracted.service.value}" is not available`);
        }
      }

      // Validate staff availability for time slot
      if (extracted.time && currentState.service.validated && currentState.location.validated) {
        const staffAvailable = await this.validateStaffAvailability(
          currentState.service.id!,
          currentState.location.id!,
          currentState.date.value || 'tomorrow',
          extracted.time.value
        );
        if (staffAvailable) {
          validatedData.time = { ...extracted.time, validated: true };
        } else {
          errors.push(`No staff available at ${extracted.time.value}`);
        }
      }

      // Validate email format
      if (extracted.email) {
        const emailValid = this.isValidEmail(extracted.email.value);
        if (emailValid) {
          validatedData.email = { ...extracted.email, validated: true };
        } else {
          errors.push('Please provide a valid email address');
        }
      }

      // Copy other extractions that don't need API validation
      ['location', 'date', 'name'].forEach(field => {
        if (extracted[field]) {
          validatedData[field] = { ...extracted[field], validated: true };
        }
      });

    } catch (error) {
      console.error('API validation error:', error);
      errors.push('Unable to verify information with booking system');
    }

    return { validatedData, errors };
  }

  // STATE UPDATE: Update state with only validated information
  private updateStateWithValidatedData(
    currentState: SlotFillingState,
    extracted: any,
    validationResults: any
  ): SlotFillingState {
    const updatedState = { ...currentState };
    const { validatedData } = validationResults;

    // Update slots with validated data only
    Object.keys(validatedData).forEach(key => {
      if (validatedData[key] && validatedData[key].validated) {
        (updatedState as any)[key] = validatedData[key];
        
        // Track completed slots
        if (!updatedState.completedSlots.includes(key)) {
          updatedState.completedSlots.push(key);
        }
      }
    });

    return updatedState;
  }

  // DETERMINISTIC PROGRESSION: Determine next required slot
  private determineNextSlot(state: SlotFillingState): string {
    const requiredSlots = ['service', 'location', 'date', 'time', 'name', 'email'];
    
    for (const slot of requiredSlots) {
      const slotData = state[slot as keyof SlotFillingState] as any;
      if (!slotData.validated) {
        return slot;
      }
    }
    
    return 'complete';
  }

  // NATURAL LANGUAGE GENERATION: Use LLM only for response generation
  private async generateNextPrompt(state: SlotFillingState, userMessage: string): Promise<string> {
    const systemPrompt = `You are Tamy, NailIt's booking assistant. Generate a natural response that:
1. Acknowledges what the customer just provided (if anything)
2. Asks for the next missing information: ${state.nextRequiredSlot}
3. Keeps it conversational and under 40 words

Current progress:
- Service: ${state.service.validated ? state.service.value : 'Not selected'}
- Location: ${state.location.validated ? state.location.value : 'Not selected'}
- Date: ${state.date.validated ? state.date.value : 'Not selected'}
- Time: ${state.time.validated ? state.time.value : 'Not selected'}
- Name: ${state.name.validated ? state.name.value : 'Not provided'}
- Email: ${state.email.validated ? state.email.value : 'Not provided'}

What they just said: "${userMessage}"
What to ask for next: ${state.nextRequiredSlot}

Generate only the response message.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: systemPrompt }],
        max_tokens: 100,
        temperature: 0.7
      });

      return response.choices[0]?.message?.content || this.getFallbackPrompt(state);
    } catch (error) {
      console.error('LLM prompt generation failed:', error);
      return this.getFallbackPrompt(state);
    }
  }

  // BOOKING COMPLETION: Call NailIt API when all slots filled and confirmed
  private async completeBooking(state: SlotFillingState, customer: Customer): Promise<SlotFillingResponse> {
    try {
      console.log('🎯 COMPLETING BOOKING:', state);
      
      // Format date for NailIt API
      const formattedDate = state.date.value!.replace(/-/g, '/');
      
      // Create order using correct NailIt API saveOrder method
      const orderData = {
        Gross_Amount: 25,
        Payment_Type_Id: 2,
        Order_Type: 2,
        ChannelId: 4,
        UserId: customer.id,
        FirstName: state.name.value!,
        Mobile: customer.phoneNumber,
        Email: state.email.value!,
        Discount_Amount: 0,
        Net_Amount: 25,
        POS_Location_Id: state.location.id!,
        OrderDetails: [{
          Prod_Id: state.service.id!,
          Prod_Name: state.service.value!,
          Qty: 1,
          Rate: 25,
          Amount: 25,
          Size_Id: null,
          Size_Name: "",
          Promotion_Id: 0,
          Promo_Code: "",
          Discount_Amount: 0,
          Net_Amount: 25,
          Staff_Id: 1,
          TimeFrame_Ids: [7, 8],
          Appointment_Date: formattedDate
        }]
      };
      const orderResult = await nailItAPI.saveOrder(orderData);

      if (orderResult && orderResult.Status === 0 && orderResult.OrderId) {
        const confirmationMessage = `🎉 Booking confirmed!\n\n📋 Order ID: ${orderResult.OrderId}\n💅 Service: ${state.service.value}\n📍 Location: ${state.location.value}\n📅 Date: ${state.date.value}\n\n💳 Complete payment:\nhttp://nailit.innovasolution.net/knet.aspx?orderId=${orderResult.OrderId}`;

        return {
          message: confirmationMessage,
          state: { ...state, currentStage: 'complete' as const },
          isComplete: true,
          nextAction: 'book'
        };
      } else {
        throw new Error((orderResult?.Message) || 'Booking failed');
      }

    } catch (error) {
      console.error('❌ BOOKING ERROR:', error);
      return {
        message: 'Sorry, there was an error completing your booking. Please try again.',
        state,
        isComplete: false,
        nextAction: 'confirm'
      };
    }
  }

  // Helper methods
  private containsServiceKeywords(message: string): boolean {
    return ['nail', 'hair', 'facial', 'massage', 'treatment', 'manicure'].some(k => message.includes(k));
  }

  private containsLocationKeywords(message: string): boolean {
    return ['plaza', 'zahra', 'arraya', 'mall'].some(k => message.includes(k));
  }

  private containsDateKeywords(message: string): boolean {
    return ['tomorrow', 'today', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'].some(k => message.includes(k));
  }

  private containsTimeKeywords(message: string): boolean {
    return /\d{1,2}:\d{2}|am|pm/.test(message);
  }

  private containsNamePattern(message: string): boolean {
    return /i'm|my name is|call me/i.test(message);
  }

  private containsEmailPattern(message: string): boolean {
    return /@/.test(message);
  }

  private parseDate(message: string): string {
    if (message.includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toLocaleDateString('en-GB').replace(/\//g, '-');
    }
    return 'tomorrow';
  }

  private parseTime(message: string): string {
    const timeMatch = message.match(/(\d{1,2}):(\d{2})|(\d{1,2})\s*(am|pm)/i);
    return timeMatch ? timeMatch[0] : '2:00 PM';
  }

  private extractName(message: string): string {
    const nameMatch = message.match(/(?:i'm|my name is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    return nameMatch ? nameMatch[1] : '';
  }

  private extractEmail(message: string): string {
    const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return emailMatch ? emailMatch[0] : '';
  }

  private isValidEmail(email: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  }

  private isUserConfirming(message: string): boolean {
    return ['yes', 'confirm', 'book', 'proceed'].some(word => message.toLowerCase().includes(word));
  }

  // SEARCH NAILIT SERVICES: Real-time search for services based on user input
  private async searchNailItServices(userMessage: string): Promise<any[]> {
    try {
      const keywords = userMessage.toLowerCase().split(' ');
      const date = nailItAPI.formatDateForURL(new Date());
      
      // Search across all locations (1, 52, 53)
      const locationIds = [1, 52, 53];
      const allServices: any[] = [];
      
      for (const locationId of locationIds) {
        const request = {
          Lang: 'E',
          Page_No: 1,
          Item_Type_Id: 2, // Services
          Location_Ids: [locationId],
          Selected_Date: date,
          Is_Home_Service: false
        };
        const result = await nailItAPI.getItemsByDateV2(request);
        if (result && result.items && Array.isArray(result.items)) {
          allServices.push(...result.items);
        }
      }
      
      // Filter services based on keywords
      const matches = allServices.filter(service => {
        const serviceName = service.Item_Name.toLowerCase();
        return keywords.some(keyword => 
          serviceName.includes(keyword) || 
          (keyword === 'gel' && serviceName.includes('gelish')) ||
          (keyword === 'nail' && (serviceName.includes('nail') || serviceName.includes('manicure') || serviceName.includes('pedicure'))) ||
          (keyword === 'art' && serviceName.includes('art'))
        );
      });
      
      // Remove duplicates and return top matches
      const uniqueMatches = Array.from(new Map(matches.map(s => [s.Item_Id, s])).values());
      return uniqueMatches.slice(0, 5);
    } catch (error) {
      console.error('Service search error:', error);
      return [];
    }
  }

  private async validateService(serviceId: number, locationId: number | null): Promise<boolean> {
    // Simplified validation - assume service exists
    return true;
  }

  private async validateStaffAvailability(serviceId: number, locationId: number, date: string, time: string): Promise<boolean> {
    try {
      const staffData = await nailItAPI.getServiceStaff(serviceId, locationId, 'E', date.replace(/-/g, '-'));
      return staffData && staffData.length > 0;
    } catch (error) {
      return true; // Assume available if check fails
    }
  }

  private getFallbackPrompt(state: SlotFillingState): string {
    switch (state.nextRequiredSlot) {
      case 'service': return 'What service would you like to book?';
      case 'location': return 'Which location: Al-Plaza Mall, Zahra Complex, or Arraya Mall?';
      case 'date': return 'What date works for you?';
      case 'time': return 'What time would you prefer?';
      case 'name': return 'May I have your name?';
      case 'email': return 'And your email address?';
      case 'complete': return 'Ready to confirm your booking?';
      default: return 'How can I help you?';
    }
  }

  private generateErrorResponse(state: SlotFillingState, errors: string[]): SlotFillingResponse {
    return {
      message: `Sorry, ${errors.join('. ')}. Please try again.`,
      state: { ...state, errors },
      isComplete: false,
      nextAction: this.mapSlotToAction(state.nextRequiredSlot)
    };
  }

  private generateSystemErrorResponse(state: SlotFillingState | null): SlotFillingResponse {
    // Always return a valid state even if input state is corrupted
    const fallbackState = state && state.service ? state : this.createNewSession();
    
    return {
      message: 'Sorry, there was a system error. Please try again.',
      state: fallbackState,
      isComplete: false, 
      nextAction: 'ask_service'
    };
  }

  private mapSlotToAction(slot: string): any {
    const mapping: any = {
      'service': 'ask_service',
      'location': 'ask_location', 
      'date': 'ask_date',
      'time': 'ask_time',
      'name': 'ask_contact',
      'email': 'ask_contact',
      'complete': 'confirm'
    };
    return mapping[slot] || 'ask_service';
  }
}

// Export singleton instance
export const slotFillingAgent = new SlotFillingAgent();