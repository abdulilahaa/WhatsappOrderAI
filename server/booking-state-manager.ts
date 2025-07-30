/**
 * BOOKING STATE MANAGER
 * Handles persistent booking state across messages/sessions
 * Responsible for loading, updating, and saving booking state
 */
import { storage } from './storage.js';

export interface BookingState {
  sessionId: string;
  customerId: number;
  conversationId: number;
  
  // Collected booking information
  service: { id: number | null; name: string | null; price: number | null; validated: boolean };
  location: { id: number | null; name: string | null; validated: boolean };
  date: { value: string | null; validated: boolean };
  time: { value: string | null; timeSlots: number[] | null; validated: boolean };
  name: { value: string | null; validated: boolean };
  email: { value: string | null; validated: boolean };
  
  // Progress tracking
  currentStep: 'service' | 'location' | 'date' | 'time' | 'contact' | 'confirmation' | 'complete';
  completedSteps: string[];
  completionPercentage: number;
  
  // Error handling
  errors: string[];
  retryCount: number;
  lastMessage: string;
  
  // Metadata
  language: 'en' | 'ar';
  startTime: Date;
  lastUpdated: Date;
}

export class BookingStateManager {
  private static stateCache = new Map<string, BookingState>();

  /**
   * Get booking state for a conversation/session
   */
  static async getBookingState(conversationId: number): Promise<BookingState | null> {
    const sessionId = `conv_${conversationId}`;
    
    // Check memory cache first
    if (this.stateCache.has(sessionId)) {
      return this.stateCache.get(sessionId)!;
    }

    // Load from database
    try {
      const conversation = await storage.getConversation(conversationId);
      if (conversation && conversation.stateData) {
        const state = conversation.stateData as any;
        this.stateCache.set(sessionId, state);
        return state;
      }
    } catch (error) {
      console.error('Error loading booking state:', error);
    }
    
    return null;
  }

  /**
   * Initialize new booking state
   */
  static createNewBookingState(conversationId: number, customerId: number): BookingState {
    const sessionId = `conv_${conversationId}`;
    const state: BookingState = {
      sessionId,
      customerId,
      conversationId,
      
      service: { id: null, name: null, price: null, validated: false },
      location: { id: null, name: null, validated: false },
      date: { value: null, validated: false },
      time: { value: null, timeSlots: null, validated: false },
      name: { value: null, validated: false },
      email: { value: null, validated: false },
      
      currentStep: 'service',
      completedSteps: [],
      completionPercentage: 0,
      
      errors: [],
      retryCount: 0,
      lastMessage: '',
      
      language: 'en',
      startTime: new Date(),
      lastUpdated: new Date()
    };

    this.stateCache.set(sessionId, state);
    return state;
  }

  /**
   * Update booking state with extracted information
   */
  static async updateBookingState(
    conversationId: number, 
    extractedData: any, 
    validationResults: any = {}
  ): Promise<BookingState> {
    let state = await this.getBookingState(conversationId);
    
    if (!state) {
      const conversation = await storage.getConversation(conversationId);
      state = this.createNewBookingState(conversationId, conversation?.customerId || 0);
    }

    // Update slots with extracted and validated data
    Object.keys(extractedData).forEach(key => {
      if (extractedData[key] && state) {
        const isValidated = validationResults[key]?.validated || false;
        (state as any)[key] = {
          ...(state as any)[key],
          ...extractedData[key],
          validated: isValidated
        };

        // Track completed steps
        if (isValidated && !state.completedSteps.includes(key)) {
          state.completedSteps.push(key);
        }
      }
    });

    // Update progress
    state.completionPercentage = this.calculateCompletionPercentage(state);
    state.lastUpdated = new Date();

    // Save to cache and database
    await this.saveBookingState(state);
    
    return state;
  }

  /**
   * Save booking state to database and cache
   */
  static async saveBookingState(state: BookingState): Promise<void> {
    const sessionId = `conv_${state.conversationId}`;
    this.stateCache.set(sessionId, state);

    try {
      await storage.updateConversation(state.conversationId, {
        stateData: state as any,
        currentPhase: state.currentStep
      });
      console.log('💾 State saved:', {
        step: state.currentStep,
        completed: state.completedSteps.length,
        percentage: state.completionPercentage
      });
    } catch (error) {
      console.error('Error saving booking state:', error);
    }
  }

  /**
   * Clear booking state (after successful booking or timeout)
   */
  static async clearBookingState(conversationId: number): Promise<void> {
    const sessionId = `conv_${conversationId}`;
    this.stateCache.delete(sessionId);

    try {
      await storage.updateConversation(conversationId, {
        stateData: {} as any,
        currentPhase: 'completed'
      });
    } catch (error) {
      console.error('Error clearing booking state:', error);
    }
  }

  /**
   * Calculate completion percentage
   */
  private static calculateCompletionPercentage(state: BookingState): number {
    const requiredFields = ['service', 'location', 'date', 'time', 'name', 'email'];
    const completedFields = requiredFields.filter(field => 
      (state as any)[field]?.validated
    );
    return Math.round((completedFields.length / requiredFields.length) * 100);
  }

  /**
   * Check if booking is ready (all required slots filled)
   */
  static isBookingReady(state: BookingState): boolean {
    return state.service.validated &&
           state.location.validated &&
           state.date.validated &&
           state.time.validated &&
           state.name.validated &&
           state.email.validated;
  }

  /**
   * Get booking summary for context
   */
  static getBookingSummary(state: BookingState): string {
    const parts: string[] = [];
    
    if (state.service.validated) parts.push(`Service: ${state.service.name}`);
    if (state.location.validated) parts.push(`Location: ${state.location.name}`);
    if (state.date.validated) parts.push(`Date: ${state.date.value}`);
    if (state.time.validated) parts.push(`Time: ${state.time.value}`);
    if (state.name.validated) parts.push(`Name: ${state.name.value}`);
    if (state.email.validated) parts.push(`Email: ${state.email.value}`);
    
    return parts.length > 0 
      ? `Current booking: ${parts.join(', ')}`
      : 'No booking information collected yet';
  }

  /**
   * Get all active booking states (for admin dashboard)
   */
  static getAllActiveStates(): BookingState[] {
    return Array.from(this.stateCache.values());
  }
}