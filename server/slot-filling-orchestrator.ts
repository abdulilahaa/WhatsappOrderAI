/**
 * SLOT-FILLING ORCHESTRATOR
 * Determines what information is missing and what to ask next
 * Orchestrates the conversation flow based on current booking state
 */
import { BookingState, BookingStateManager } from './booking-state-manager.js';

export interface OrchestrationResult {
  nextQuestion: string;
  currentStep: string;
  missingInfo: string[];
  canProceed: boolean;
  isComplete: boolean;
  acknowledgment: string;
  context: string;
}

export class SlotFillingOrchestrator {
  
  /**
   * MAIN ORCHESTRATION: Determine next step based on current state
   */
  static async orchestrateBookingStep(
    state: BookingState, 
    userMessage: string
  ): Promise<OrchestrationResult> {
    console.log('🎭 ORCHESTRATOR: Analyzing state...', {
      step: state.currentStep,
      completed: state.completedSteps,
      percentage: state.completionPercentage
    });

    // Step 1: Acknowledge what user just provided
    const acknowledgment = this.generateAcknowledgment(state, userMessage);

    // Step 2: Determine what's missing
    const missingInfo = this.getMissingInformation(state);

    // Step 3: Check if booking is complete
    if (missingInfo.length === 0) {
      return {
        nextQuestion: this.generateConfirmationPrompt(state),
        currentStep: 'confirmation',
        missingInfo: [],
        canProceed: true,
        isComplete: BookingStateManager.isBookingReady(state),
        acknowledgment,
        context: BookingStateManager.getBookingSummary(state)
      };
    }

    // Step 4: Determine next step
    const nextStep = this.determineNextStep(state, missingInfo);

    // Step 5: Generate appropriate question
    const nextQuestion = await this.generateNextQuestion(nextStep, state);

    return {
      nextQuestion,
      currentStep: nextStep,
      missingInfo,
      canProceed: false,
      isComplete: false,
      acknowledgment,
      context: BookingStateManager.getBookingSummary(state)
    };
  }

  /**
   * Generate acknowledgment for user's input
   */
  private static generateAcknowledgment(state: BookingState, userMessage: string): string {
    const message = userMessage.toLowerCase();
    
    // Service acknowledgments
    if (message.includes('nail') || message.includes('mani') || message.includes('pedi')) {
      return "Perfect! I can help you with nail services.";
    }
    if (message.includes('hair')) {
      return "Great choice! Hair treatments are very popular.";
    }
    if (message.includes('facial')) {
      return "Excellent! Facial treatments are so relaxing.";
    }

    // Location acknowledgments  
    if (message.includes('plaza') || message.includes('al-plaza')) {
      return "Al-Plaza Mall is a wonderful location!";
    }
    if (message.includes('zahra')) {
      return "Zahra Complex - great choice!";
    }
    if (message.includes('arraya')) {
      return "Arraya Mall - perfect!";
    }

    // Date/time acknowledgments
    if (message.includes('tomorrow') || message.includes('today') || message.match(/\d/)) {
      return "I've noted your preferred timing.";
    }

    // Contact acknowledgments
    if (message.includes('@') || message.match(/^[a-zA-Z]/)) {
      return "Thank you for providing that information.";
    }

    // Generic acknowledgment
    return "Got it!";
  }

  /**
   * Determine what information is still missing
   */
  private static getMissingInformation(state: BookingState): string[] {
    const missing: string[] = [];
    
    if (!state.service.validated) missing.push('service');
    if (!state.location.validated) missing.push('location');
    if (!state.date.validated) missing.push('date');
    if (!state.time.validated) missing.push('time');
    if (!state.name.validated) missing.push('name');
    if (!state.email.validated) missing.push('email');
    
    return missing;
  }

  /**
   * Determine next step based on missing information
   */
  private static determineNextStep(state: BookingState, missingInfo: string[]): string {
    // Follow logical order for booking flow
    const stepOrder = ['service', 'location', 'date', 'time', 'name', 'email'];
    
    for (const step of stepOrder) {
      if (missingInfo.includes(step)) {
        return step;
      }
    }
    
    return 'confirmation';
  }

  /**
   * Generate next question based on step
   */
  private static async generateNextQuestion(step: string, state: BookingState): Promise<string> {
    switch (step) {
      case 'service':
        return this.generateServiceQuestion(state);
        
      case 'location':
        return this.generateLocationQuestion(state);
        
      case 'date':
        return this.generateDateQuestion(state);
        
      case 'time':
        return this.generateTimeQuestion(state);
        
      case 'name':
        return "What's your name for the booking?";
        
      case 'email':
        return "And could I have your email address?";
        
      default:
        return "How can I help you today?";
    }
  }

  /**
   * Generate service-specific questions
   */
  private static generateServiceQuestion(state: BookingState): string {
    const questions = [
      "What type of service would you like to book today?",
      "Are you looking for nail services, hair treatments, or facial care?",
      "What treatment are you interested in?"
    ];
    
    return questions[Math.floor(Math.random() * questions.length)];
  }

  /**
   * Generate location-specific questions
   */
  private static generateLocationQuestion(state: BookingState): string {
    return `Which location would you prefer?\n• Al-Plaza Mall\n• Zahra Complex\n• Arraya Mall`;
  }

  /**
   * Generate date-specific questions
   */
  private static generateDateQuestion(state: BookingState): string {
    const questions = [
      "What date would work best for you?",
      "When would you like to schedule your appointment?",
      "Which day are you available?"
    ];
    
    return questions[Math.floor(Math.random() * questions.length)];
  }

  /**
   * Generate time-specific questions with availability check
   */
  private static generateTimeQuestion(state: BookingState): string {
    const questions = [
      "What time would you prefer?",
      "Do you have a preferred time slot?",
      "What time works best for you?"
    ];
    
    let question = questions[Math.floor(Math.random() * questions.length)];
    
    // Add business hours context if location is known
    if (state.location.validated) {
      question += "\n(We're open 11:00 AM - 10:00 PM)";
    }
    
    return question;
  }

  /**
   * Generate confirmation prompt when all info is collected
   */
  private static generateConfirmationPrompt(state: BookingState): string {
    const summary = BookingStateManager.getBookingSummary(state);
    return `Perfect! Let me confirm your booking:\n\n${summary}\n\nShall I proceed with creating this appointment?`;
  }

  /**
   * Check if user is confirming the booking
   */
  static isUserConfirming(message: string): boolean {
    const confirmWords = ['yes', 'confirm', 'book', 'proceed', 'ok', 'correct', 'right'];
    const lowerMessage = message.toLowerCase();
    return confirmWords.some(word => lowerMessage.includes(word));
  }

  /**
   * Check if conversation has stalled (same step repeated)
   */
  static isConversationStalled(state: BookingState): boolean {
    return state.retryCount > 2;
  }

  /**
   * Generate escalation message for stalled conversations
   */
  static generateEscalationMessage(): string {
    return "I'm having trouble understanding. Would you like me to connect you with one of our team members who can assist you directly?";
  }

  /**
   * Prevent repetitive questions by checking last message
   */
  static shouldAvoidRepetition(state: BookingState, proposedQuestion: string): boolean {
    return state.lastMessage === proposedQuestion;
  }

  /**
   * Get progress indicators for admin dashboard
   */
  static getProgressIndicators(state: BookingState): any {
    return {
      sessionId: state.sessionId,
      currentStep: state.currentStep,
      completedSteps: state.completedSteps,
      completionPercentage: state.completionPercentage,
      timeElapsed: Date.now() - state.startTime.getTime(),
      retryCount: state.retryCount,
      hasErrors: state.errors.length > 0
    };
  }
}