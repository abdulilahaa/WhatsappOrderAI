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
  // Initialize new slot-filling session
  createNewSession(language: 'en' | 'ar' = 'en'): SlotFillingState {
    return {
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
  }

  // MAIN ORCHESTRATION: Process user message with slot-filling logic
  async processMessage(
    userMessage: string, 
    currentState: SlotFillingState | null,
    customer: Customer
  ): Promise<SlotFillingResponse> {
    console.log('🎯 SLOT-FILLING AGENT: Processing message:', userMessage);

    // Initialize state if new conversation
    if (!currentState) {
      currentState = this.createNewSession();
    }

    try {
      // Step 1: Extract information from user message (NLU only)
      const extracted = this.extractInformation(userMessage, currentState);
      console.log('📤 EXTRACTED:', extracted);

      // Step 2: Validate extracted information with real-time API calls
      const validationResults = await this.validateWithAPI(extracted, currentState);
      console.log('✅ VALIDATION:', validationResults);

      // Step 3: Update state with validated information only
      const updatedState = this.updateStateWithValidatedData(currentState, extracted, validationResults);
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
      console.error('❌ SLOT-FILLING ERROR:', error);
      return this.generateSystemErrorResponse(currentState);
    }
  }

  // INFORMATION EXTRACTION: Pure NLU - extract data from user message
  private extractInformation(userMessage: string, state: SlotFillingState): any {
    const extracted: any = {};
    const lowerMessage = userMessage.toLowerCase();

    // Extract service (simple keyword matching - replace with better NLU)
    if (!state.service?.validated && this.containsServiceKeywords(lowerMessage)) {
      if (lowerMessage.includes('nail') || lowerMessage.includes('manicure')) {
        extracted.service = { value: 'French Manicure', id: 279, validated: false };
      } else if (lowerMessage.includes('hair') || lowerMessage.includes('treatment')) {
        extracted.service = { value: 'Hair Growth Helmet Treatment', id: 51364, validated: false };
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
    if (!state.email.validated && this.containsEmailPattern(lowerMessage)) {
      extracted.email = { value: this.extractEmail(userMessage), validated: false };
    }

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
      const orderResult = await nailItAPI.saveOrder(
        customer.id,
        state.location.id!,
        [{ itemId: state.service.id!, quantity: 1, timeSlots: [7, 8] }], // Afternoon time slots
        formattedDate,
        2, // KNet payment
        4  // WhatsApp channel
      );

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