/**
 * Centralized Error Handling System
 * Addresses Audit Finding: "Errors bubble up as 'Sorry, something went wrong' without transparency"
 */

export interface ErrorContext {
  userId?: number;
  conversationId?: number;
  operation: string;
  component: string;
  originalError: any;
  customerMessage?: string;
}

export interface ErrorResponse {
  userMessage: string;
  userMessageAR: string;
  loggedError: string;
  errorCode: string;
  shouldRetry: boolean;
}

export class CentralizedErrorHandler {
  /**
   * Handle errors with proper logging and user-friendly messages
   */
  static handle(context: ErrorContext): ErrorResponse {
    // Log detailed error for admins
    const loggedError = `[${context.component}] ${context.operation} failed: ${context.originalError?.message || context.originalError}`;
    console.error('🚨 CENTRALIZED ERROR:', loggedError, {
      userId: context.userId,
      conversationId: context.conversationId,
      stack: context.originalError?.stack,
      originalError: context.originalError
    });

    // Determine error type and appropriate response
    if (this.isNetworkError(context.originalError)) {
      return {
        userMessage: "I'm having trouble connecting to our booking system. Please try again in a moment.",
        userMessageAR: "أواجه مشكلة في الاتصال بنظام الحجز. يرجى المحاولة مرة أخرى خلال لحظات.",
        loggedError,
        errorCode: "NETWORK_ERROR",
        shouldRetry: true
      };
    }

    if (this.isValidationError(context.originalError)) {
      return {
        userMessage: "There seems to be an issue with the information provided. Could you please check and try again?",
        userMessageAR: "يبدو أن هناك مشكلة في المعلومات المقدمة. هل يمكنك التحقق والمحاولة مرة أخرى؟",
        loggedError,
        errorCode: "VALIDATION_ERROR",
        shouldRetry: false
      };
    }

    if (this.isNailItAPIError(context.originalError)) {
      return {
        userMessage: "Our booking system is temporarily unavailable. We'll help you complete your booking as soon as possible.",
        userMessageAR: "نظام الحجز غير متاح مؤقتاً. سنساعدك في إكمال حجزك في أقرب وقت ممكن.",
        loggedError,
        errorCode: "NAILIT_API_ERROR",
        shouldRetry: true
      };
    }

    if (this.isDatabaseError(context.originalError)) {
      return {
        userMessage: "We're experiencing a technical issue. Your message has been saved and we'll respond shortly.",
        userMessageAR: "نواجه مشكلة تقنية. تم حفظ رسالتك وسنرد عليك قريباً.",
        loggedError,
        errorCode: "DATABASE_ERROR",
        shouldRetry: false
      };
    }

    // Generic error with specific operation context
    return {
      userMessage: `I encountered an issue while ${this.getOperationDescription(context.operation)}. Let me try to help you in a different way.`,
      userMessageAR: `واجهت مشكلة أثناء ${this.getOperationDescriptionAR(context.operation)}. دعني أحاول مساعدتك بطريقة أخرى.`,
      loggedError,
      errorCode: "GENERAL_ERROR",
      shouldRetry: false
    };
  }

  private static isNetworkError(error: any): boolean {
    return error?.code === 'ENOTFOUND' || 
           error?.code === 'ECONNREFUSED' ||
           error?.message?.includes('network') ||
           error?.message?.includes('timeout');
  }

  private static isValidationError(error: any): boolean {
    return error?.name === 'ValidationError' ||
           error?.message?.includes('validation') ||
           error?.code === '22P02'; // PostgreSQL invalid input syntax
  }

  private static isNailItAPIError(error: any): boolean {
    return error?.message?.includes('NailIt') ||
           error?.response?.status >= 400 ||
           error?.message?.includes('API');
  }

  private static isDatabaseError(error: any): boolean {
    return error?.code?.startsWith('22') || // PostgreSQL data type errors
           error?.message?.includes('database') ||
           error?.message?.includes('postgres');
  }

  private static getOperationDescription(operation: string): string {
    const operationMap: { [key: string]: string } = {
      'processMessage': 'processing your message',
      'createBooking': 'creating your booking',
      'searchServices': 'searching for services',
      'checkAvailability': 'checking availability',
      'saveOrder': 'saving your order',
      'sendMessage': 'sending your message'
    };
    return operationMap[operation] || operation;
  }

  private static getOperationDescriptionAR(operation: string): string {
    const operationMapAR: { [key: string]: string } = {
      'processMessage': 'معالجة رسالتك',
      'createBooking': 'إنشاء حجزك',
      'searchServices': 'البحث عن الخدمات',
      'checkAvailability': 'التحقق من التوفر',
      'saveOrder': 'حفظ طلبك',
      'sendMessage': 'إرسال رسالتك'
    };
    return operationMapAR[operation] || operation;
  }

  /**
   * Create error context for logging
   */
  static createContext(
    component: string,
    operation: string,
    error: any,
    userId?: number,
    conversationId?: number,
    customerMessage?: string
  ): ErrorContext {
    return {
      component,
      operation,
      originalError: error,
      userId,
      conversationId,
      customerMessage
    };
  }
}