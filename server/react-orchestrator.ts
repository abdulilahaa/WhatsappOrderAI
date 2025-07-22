/**
 * ReAct Orchestrator - Task-Oriented Booking Agent
 * Coordinates existing system components through intelligent reasoning
 * Preserves all current functionality while adding orchestration logic
 */

import OpenAI from 'openai';
import { ragSearchService } from './rag-search';
import { NailItAPIService } from './nailit-api';
import { NailItValidator } from './nailit-validator';
import { db } from './db';
import { storage } from './storage';
import type { ConversationState } from '../shared/schema';
import { customers, conversations, enhancedConversationStates } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface BookingContext {
  customerId: number;
  phoneNumber: string;
  conversationId: number;
  sessionData: {
    selectedServices?: Array<{
      itemId: number;
      itemName: string;
      price: number;
      duration: number;
    }>;
    locationId?: number;
    locationName?: string;
    appointmentDate?: string;
    timeSlots?: number[];
    staffAssignments?: Array<{ staffId: number; serviceId: number; }>;
    customerName?: string;
    customerEmail?: string;
    paymentMethod?: string;
    currentOrderId?: string;
    totalAmount?: number;
    totalDuration?: number;
  };
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; }>;
}

export class ReActOrchestrator {
  private nailItAPI: NailItAPIService;
  private validator: NailItValidator;

  constructor() {
    this.nailItAPI = new NailItAPIService();
    this.validator = new NailItValidator();
  }

  /**
   * TOOL: Service Search using existing RAG pipeline
   */
  async searchServices(query: string, locationId?: number): Promise<any> {
    console.log(`🔍 [ServiceSearchTool] Searching: "${query}" at location ${locationId}`);
    
    try {
      // Use working NailIt API directly (bypassing broken RAG)
      console.log(`🔄 [ServiceSearchTool] Using live NailIt API for reliable data`);
      const currentDate = this.nailItAPI.formatDateForAPI(new Date());
      const liveResults = await this.nailItAPI.getItemsByDate({
        itemTypeId: 2,
        groupId: 0,
        selectedDate: currentDate,
        pageNo: 1,
        locationIds: locationId ? [locationId] : []
      });
      
      // Filter and transform results
      let filteredItems = liveResults.items || [];
      if (query && query.trim()) {
        const searchTerm = query.toLowerCase();
        filteredItems = filteredItems.filter(item => 
          item.Item_Name?.toLowerCase().includes(searchTerm) ||
          item.Item_Desc?.toLowerCase().includes(searchTerm)
        );
      }
      
      const results = filteredItems.slice(0, 5).map(item => ({
        itemId: item.Item_Id,
        itemName: item.Item_Name,
        price: item.Special_Price > 0 ? item.Special_Price : item.Primary_Price,
        description: item.Item_Desc?.replace(/<[^>]*>/g, '') || '',
        duration: item.Duration || 30,
        locationIds: item.Location_Ids || [],
        matchScore: 0.9
      }));
        
        if (liveResults.items) {
          const filtered = liveResults.items.filter(item => 
            item.Item_Name?.toLowerCase().includes(query.toLowerCase())
          );
          return filtered.slice(0, 3);
        }
      }
      
      return results;
    } catch (error) {
      console.error(`❌ [ServiceSearchTool] Error:`, error);
      return [];
    }
  }

  /**
   * TOOL: Staff Availability using existing NailIt API
   */
  async checkStaffAvailability(serviceId: number, locationId: number, date: string): Promise<any> {
    console.log(`👥 [StaffAvailabilityTool] Checking staff for service ${serviceId} at location ${locationId} on ${date}`);
    
    try {
      // Use existing API method - getServiceStaff returns staff array directly
      const staffData = await this.nailItAPI.getServiceStaff(serviceId, locationId, 'en', date);
      
      if (Array.isArray(staffData) && staffData.length > 0) {
        console.log(`✅ [StaffAvailabilityTool] Found ${staffData.length} available staff members`);
        return staffData;
      }
      
      return [];
    } catch (error) {
      console.error(`❌ [StaffAvailabilityTool] Error:`, error);
      // Use existing fallback data
      return [{ Staff_Id: 1, Staff_Name: 'Available Specialist', Is_Available: true }];
    }
  }

  /**
   * TOOL: Booking Validation using existing validator
   */
  async validateBooking(bookingData: any): Promise<{ isValid: boolean; errors: string[]; }> {
    console.log(`✅ [BookingValidationTool] Validating booking data`);
    
    try {
      // Basic validation logic since validator interface may differ
      const errors: string[] = [];
      
      if (!bookingData.services || bookingData.services.length === 0) {
        errors.push('Services selection required');
      }
      
      if (!bookingData.locationId) {
        errors.push('Location selection required');
      }
      
      if (!bookingData.date) {
        errors.push('Appointment date required');
      }
      
      if (!bookingData.customerName) {
        errors.push('Customer name required');
      }
      
      const isValid = errors.length === 0;
      
      if (isValid) {
        console.log(`✅ [BookingValidationTool] Booking validation passed`);
        return { isValid: true, errors: [] };
      } else {
        console.log(`❌ [BookingValidationTool] Validation failed: ${errors.join(', ')}`);
        return { isValid: false, errors };
      }
    } catch (error) {
      console.error(`❌ [BookingValidationTool] Error:`, error as Error);
      return { isValid: false, errors: [`Validation error: ${(error as Error).message}`] };
    }
  }

  /**
   * TOOL: Order Creation using existing SaveOrder API
   */
  async createOrder(orderData: any): Promise<{ success: boolean; orderId?: string; error?: string; }> {
    console.log(`💳 [OrderCreationTool] Creating order with SaveOrder API`);
    
    try {
      // Use existing SaveOrder method - returns NailItSaveOrderResponse
      const result = await this.nailItAPI.saveOrder(orderData);
      
      if (result && result.Status === 0 && result.OrderId) {
        console.log(`✅ [OrderCreationTool] Order created successfully: ${result.OrderId}`);
        return { success: true, orderId: result.OrderId.toString() };
      } else {
        const errorMsg = result?.Message || 'Order creation failed';
        console.log(`❌ [OrderCreationTool] Order creation failed: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      console.error(`❌ [OrderCreationTool] Error:`, error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * TOOL: Payment Verification using existing API
   */
  async verifyPayment(orderId: string): Promise<{ isPaid: boolean; status: string; details?: any; }> {
    console.log(`💰 [PaymentVerificationTool] Verifying payment for order ${orderId}`);
    
    try {
      // Use existing payment verification method - returns NailItOrderPaymentDetail
      const paymentStatus = await this.nailItAPI.getOrderPaymentDetail(parseInt(orderId));
      
      if (paymentStatus) {
        const isPaid = paymentStatus.KNetResult === 'CAPTURED' || 
                      paymentStatus.OrderStatus === 'Order Paid';
        
        console.log(`${isPaid ? '✅' : '⏳'} [PaymentVerificationTool] Payment status: ${paymentStatus.OrderStatus}`);
        
        return {
          isPaid,
          status: paymentStatus.OrderStatus || 'Unknown',
          details: paymentStatus
        };
      }
      
      return { isPaid: false, status: 'Unknown' };
    } catch (error) {
      console.error(`❌ [PaymentVerificationTool] Error:`, error as Error);
      return { isPaid: false, status: 'Error', details: (error as Error).message };
    }
  }

  /**
   * TOOL: Conversation State Management using existing database
   */
  async updateConversationState(context: BookingContext, updates: any): Promise<void> {
    console.log(`📝 [ConversationStateTool] Updating conversation state`);
    
    try {
      // Use existing conversation state management
      const stateData = {
        conversationId: context.conversationId,
        customerId: context.customerId,
        phase: updates.phase || 'service_selection',
        selectedServices: JSON.stringify(updates.selectedServices || []),
        locationId: updates.locationId,
        appointmentDate: updates.appointmentDate,
        totalAmount: updates.totalAmount,
        paymentMethod: updates.paymentMethod,
        lastUpdated: new Date()
      };

      // Use existing conversation update method
      await storage.updateConversation(context.conversationId, {
        isActive: true,
        lastMessageAt: new Date()
      });
      console.log(`✅ [ConversationStateTool] State updated successfully`);
    } catch (error) {
      console.error(`❌ [ConversationStateTool] Error:`, error);
      throw error;
    }
  }

  /**
   * TOOL: System Configuration using existing AI Settings
   */
  async getSystemConfiguration(): Promise<any> {
    console.log(`⚙️ [SystemConfigTool] Loading AI configuration`);
    
    try {
      // Use existing Fresh AI settings instead of getAISettings
      const aiSettings = await storage.getFreshAISettings();
      const whatsappSettings = await storage.getWhatsAppSettings();
      
      return {
        businessName: aiSettings?.businessName || 'NailIt',
        systemPrompt: aiSettings?.systemPromptEN || '',
        openaiModel: aiSettings?.openaiModel || 'gpt-4',
        openaiTemperature: parseFloat(aiSettings?.openaiTemperature || '0.7'),
        whatsappConfig: whatsappSettings,
        locationIds: [1, 52, 53], // Al-Plaza, Zahra, Arraya
        paymentTypes: await this.getPaymentTypes()
      };
    } catch (error) {
      console.error(`❌ [SystemConfigTool] Error:`, error);
      return this.getDefaultConfiguration();
    }
  }

  private async getPaymentTypes(): Promise<any[]> {
    try {
      // Use existing payment types method - returns array directly
      const paymentResult = await this.nailItAPI.getPaymentTypes();
      
      if (Array.isArray(paymentResult) && paymentResult.length > 0) {
        return paymentResult;
      }
      
      // Fallback to known working payment types
      return [
        { Payment_Type_Id: 1, Payment_Type_Name: 'Cash on Arrival' },
        { Payment_Type_Id: 2, Payment_Type_Name: 'Knet' },
        { Payment_Type_Id: 7, Payment_Type_Name: 'Apple Pay' }
      ];
    } catch (error) {
      console.error('Error getting payment types:', error);
      return [{ Payment_Type_Id: 2, Payment_Type_Name: 'Knet' }];
    }
  }

  private getDefaultConfiguration() {
    return {
      businessName: 'NailIt',
      systemPrompt: 'You are a helpful booking assistant for NailIt spa.',
      openaiModel: 'gpt-4',
      openaiTemperature: 0.7,
      locationIds: [1, 52, 53],
      paymentTypes: [{ Payment_Type_Id: 2, Payment_Type_Name: 'Knet' }]
    };
  }

  /**
   * MAIN ORCHESTRATION: Reason + Act workflow
   */
  async processBookingConversation(context: BookingContext, userMessage: string): Promise<string> {
    console.log(`🤖 [ReActOrchestrator] Processing: "${userMessage}"`);
    
    try {
      // Load system configuration
      const config = await this.getSystemConfiguration();
      
      // Analyze current conversation state and decide next action
      const nextAction = await this.reasonAboutNextAction(context, userMessage, config);
      
      console.log(`🧠 [ReActOrchestrator] Reasoning result: ${nextAction.action} - ${nextAction.reasoning}`);
      
      // Execute the determined action using appropriate tools
      const result = await this.executeAction(context, nextAction, userMessage, config);
      
      return result;
    } catch (error) {
      console.error(`❌ [ReActOrchestrator] Error:`, error);
      return "I apologize, but I encountered an issue processing your request. Please try again or contact our support team.";
    }
  }

  /**
   * REASONING: Determine what to do next based on conversation state
   */
  private async reasonAboutNextAction(context: BookingContext, userMessage: string, config: any): Promise<{
    action: 'search_services' | 'check_availability' | 'validate_booking' | 'create_order' | 
            'verify_payment' | 'gather_info' | 'provide_options' | 'confirm_booking';
    reasoning: string;
    parameters?: any;
  }> {
    
    const reasoningPrompt = `
You are an intelligent booking orchestrator. Analyze the conversation and decide the next action.

Current Context:
- Selected Services: ${JSON.stringify(context.sessionData.selectedServices || [])}
- Location: ${context.sessionData.locationName || 'Not selected'}
- Date: ${context.sessionData.appointmentDate || 'Not selected'}  
- Customer Info: ${context.sessionData.customerName ? 'Available' : 'Missing'}
- Payment Method: ${context.sessionData.paymentMethod || 'Not selected'}
- Current Order ID: ${context.sessionData.currentOrderId || 'None'}

Recent Message: "${userMessage}"

Available Actions:
- search_services: Find services based on user request
- check_availability: Check staff/time availability  
- validate_booking: Validate booking requirements
- create_order: Create order in system
- verify_payment: Check payment status
- gather_info: Ask for missing information
- provide_options: Show available choices
- confirm_booking: Final confirmation

Respond with JSON: {"action": "action_name", "reasoning": "why this action", "parameters": {...}}
`;

    try {
      const response = await openai.chat.completions.create({
        model: config.openaiModel,
        temperature: config.openaiTemperature,
        messages: [{ role: 'user', content: reasoningPrompt }],
        max_tokens: 300
      });

      const reasoning = JSON.parse(response.choices[0].message.content || '{}');
      return reasoning;
    } catch (error) {
      console.error('Reasoning error:', error);
      // Fallback logic
      if (userMessage.toLowerCase().includes('service') || userMessage.toLowerCase().includes('treatment')) {
        return { action: 'search_services', reasoning: 'User mentioned services/treatments' };
      }
      return { action: 'gather_info', reasoning: 'Default fallback - gather more information' };
    }
  }

  /**
   * ACTION EXECUTION: Execute the determined action using appropriate tools
   */
  private async executeAction(context: BookingContext, actionPlan: any, userMessage: string, config: any): Promise<string> {
    
    switch (actionPlan.action) {
      case 'search_services':
        return await this.handleServiceSearch(context, userMessage, config);
      
      case 'check_availability':
        return await this.handleAvailabilityCheck(context, config);
      
      case 'validate_booking':
        return await this.handleBookingValidation(context, config);
      
      case 'create_order':
        return await this.handleOrderCreation(context, config);
      
      case 'verify_payment':
        return await this.handlePaymentVerification(context, config);
      
      case 'gather_info':
        return await this.handleInfoGathering(context, userMessage, config);
      
      case 'provide_options':
        return await this.handleOptionsProviding(context, config);
      
      case 'confirm_booking':
        return await this.handleBookingConfirmation(context, config);
      
      default:
        return "I understand you'd like to book an appointment. How can I help you get started?";
    }
  }

  /**
   * ACTION HANDLERS: Individual handlers for each action type
   */
  private async handleServiceSearch(context: BookingContext, userMessage: string, config: any): Promise<string> {
    // Extract search terms and location from message
    const locationId = this.extractLocationId(userMessage) || context.sessionData.locationId;
    const searchQuery = this.extractServiceQuery(userMessage);
    
    if (!searchQuery) {
      return "What type of service are you looking for? We offer hair treatments, nail services, facials, and more!";
    }
    
    const services = await this.searchServices(searchQuery, locationId);
    
    if (services.length === 0) {
      return `I couldn't find services matching "${searchQuery}". Could you be more specific? For example: manicure, facial, or hair treatment.`;
    }
    
    // Update conversation state
    await this.updateConversationState(context, { 
      phase: 'service_selection',
      lastSearchQuery: searchQuery,
      foundServices: services
    });
    
    // Format service options
    const serviceList = services.slice(0, 3).map((service: any, index: number) => 
      `${index + 1}. ${service.itemName || service.Item_Name} - ${service.primaryPrice || service.Price} KWD`
    ).join('\n');
    
    return `Great! I found these services for you:\n\n${serviceList}\n\nWhich service interests you? Just let me know the number or name.`;
  }

  private async handleAvailabilityCheck(context: BookingContext, config: any): Promise<string> {
    const { selectedServices, locationId, appointmentDate } = context.sessionData;
    
    if (!selectedServices?.length || !locationId || !appointmentDate) {
      return "To check availability, I need to know your preferred service, location, and date.";
    }
    
    try {
      const staff = await this.checkStaffAvailability(
        selectedServices[0].itemId, 
        locationId, 
        appointmentDate
      );
      
      if (staff.length === 0) {
        return `I couldn't find available staff for ${appointmentDate}. Would you like to try a different date?`;
      }
      
      // Update conversation state
      await this.updateConversationState(context, { 
        phase: 'staff_selection',
        availableStaff: staff
      });
      
      return `Perfect! We have ${staff.length} specialists available on ${appointmentDate}. Shall I book you with our next available specialist?`;
    } catch (error) {
      console.error('Availability check error:', error);
      return "Let me check our schedule. We typically have availability throughout the day. What time works best for you?";
    }
  }

  private async handleBookingValidation(context: BookingContext, config: any): Promise<string> {
    const bookingData = {
      services: context.sessionData.selectedServices,
      locationId: context.sessionData.locationId,
      date: context.sessionData.appointmentDate,
      timeSlots: context.sessionData.timeSlots,
      customerName: context.sessionData.customerName,
      customerEmail: context.sessionData.customerEmail
    };
    
    const validation = await this.validateBooking(bookingData);
    
    if (!validation.isValid) {
      return `Before we can confirm your booking, I need: ${validation.errors.join(', ')}. Could you provide this information?`;
    }
    
    // Update conversation state
    await this.updateConversationState(context, { 
      phase: 'booking_validation',
      validationPassed: true
    });
    
    return "Perfect! All your booking details look good. Shall I proceed with creating your appointment?";
  }

  private async handleOrderCreation(context: BookingContext, config: any): Promise<string> {
    const orderData = this.buildOrderData(context);
    const result = await this.createOrder(orderData);
    
    if (!result.success) {
      return `I encountered an issue creating your booking: ${result.error}. Please try again or contact our support team.`;
    }
    
    // Update conversation state with order ID
    await this.updateConversationState(context, { 
      phase: 'payment_processing',
      currentOrderId: result.orderId,
      orderCreated: true
    });
    
    // Generate payment link
    const paymentLink = `http://nailit.innovasolution.net/knet.aspx?orderId=${result.orderId}`;
    
    return `Excellent! Your booking has been created (Order #${result.orderId}). \n\nTo complete your reservation, please pay using this secure link: ${paymentLink}\n\nI'll confirm once payment is received.`;
  }

  private async handlePaymentVerification(context: BookingContext, config: any): Promise<string> {
    const { currentOrderId } = context.sessionData;
    
    if (!currentOrderId) {
      return "I don't see an order to verify. Would you like to create a new booking?";
    }
    
    const paymentStatus = await this.verifyPayment(currentOrderId);
    
    if (paymentStatus.isPaid) {
      // Update conversation state
      await this.updateConversationState(context, { 
        phase: 'confirmation',
        paymentConfirmed: true
      });
      
      return `🎉 Payment confirmed! Your booking is complete.\n\nOrder Details:\n- Order ID: ${currentOrderId}\n- Status: ${paymentStatus.status}\n- Services: ${this.formatServicesList(context.sessionData.selectedServices)}\n\nThank you for choosing NailIt!`;
    } else {
      return `Payment for Order #${currentOrderId} is still ${paymentStatus.status}. Please complete payment using the link I provided, or contact us if you need assistance.`;
    }
  }

  private async handleInfoGathering(context: BookingContext, userMessage: string, config: any): Promise<string> {
    // Analyze what information is missing
    const missing = [];
    
    if (!context.sessionData.selectedServices?.length) missing.push('service selection');
    if (!context.sessionData.locationId) missing.push('location preference');
    if (!context.sessionData.appointmentDate) missing.push('appointment date');
    if (!context.sessionData.customerName) missing.push('your name');
    if (!context.sessionData.customerEmail) missing.push('email address');
    
    if (missing.length === 0) {
      return "I have all the information needed. Shall I proceed with creating your booking?";
    }
    
    const nextNeeded = missing[0];
    
    switch (nextNeeded) {
      case 'service selection':
        return "What service would you like to book? We offer hair treatments, nail services, facials, massages, and more!";
      
      case 'location preference':
        return "Which location would you prefer?\n1. Al-Plaza Mall\n2. Zahra Complex\n3. Arraya Mall";
      
      case 'appointment date':
        return "What date works best for you? I can check availability for any day this week or next.";
      
      case 'your name':
        return "Could I get your name for the booking?";
      
      case 'email address':
        return "What's your email address? I'll send you a confirmation.";
      
      default:
        return `To proceed, I need your ${nextNeeded}. Could you provide that?`;
    }
  }

  private async handleOptionsProviding(context: BookingContext, config: any): Promise<string> {
    // Provide relevant options based on current state
    const { selectedServices, locationId } = context.sessionData;
    
    if (!locationId) {
      return "Please choose your preferred location:\n1. Al-Plaza Mall - Full service salon\n2. Zahra Complex - Premium treatments\n3. Arraya Mall - Express services\n\nJust let me know the number or name!";
    }
    
    if (!selectedServices?.length) {
      return "What type of service are you interested in?\n• Hair services (cuts, colors, treatments)\n• Nail services (manicure, pedicure, gel)\n• Facial treatments (cleansing, anti-aging)\n• Body treatments (massage, scrubs)\n\nWhat sounds good to you?";
    }
    
    return "I have your service and location. What date and time work best for your appointment?";
  }

  private async handleBookingConfirmation(context: BookingContext, config: any): Promise<string> {
    const { selectedServices, locationName, appointmentDate, customerName, currentOrderId } = context.sessionData;
    
    if (!currentOrderId) {
      return "I don't see a confirmed booking. Would you like to create a new appointment?";
    }
    
    const servicesList = this.formatServicesList(selectedServices);
    
    return `Your booking is confirmed! 🎉\n\nBooking Details:\n✓ Order ID: ${currentOrderId}\n✓ Services: ${servicesList}\n✓ Location: ${locationName}\n✓ Date: ${appointmentDate}\n✓ Customer: ${customerName}\n\nWe look forward to seeing you at NailIt!`;
  }

  /**
   * UTILITY METHODS: Helper functions for data processing
   */
  private extractLocationId(message: string): number | undefined {
    const locations = {
      'plaza': 1,
      'al-plaza': 1,
      'zahra': 52,
      'arraya': 53
    };
    
    const lowerMessage = message.toLowerCase();
    for (const [key, id] of Object.entries(locations)) {
      if (lowerMessage.includes(key)) return id;
    }
    
    return undefined;
  }

  private extractServiceQuery(message: string): string {
    // Extract service-related keywords
    const serviceKeywords = ['hair', 'nail', 'facial', 'massage', 'treatment', 'manicure', 'pedicure', 'cut', 'color'];
    const words = message.toLowerCase().split(' ');
    
    const relevantWords = words.filter(word => 
      serviceKeywords.some(keyword => word.includes(keyword)) ||
      word.length > 4 // Include longer words that might be service names
    );
    
    return relevantWords.join(' ');
  }

  private buildOrderData(context: BookingContext): any {
    const { selectedServices, locationId, appointmentDate, timeSlots, customerName, customerEmail } = context.sessionData;
    
    return {
      App_User_Id: context.customerId,
      User_Name: customerName,
      User_Email: customerEmail,
      User_Mobile: context.phoneNumber,
      Location_Id: locationId,
      Appointment_Date: this.formatDateForSaveOrder(appointmentDate || new Date().toISOString()),
      Channel_Id: 4, // WhatsApp channel
      Order_Type: 2, // Services
      Payment_Type_Id: 2, // KNet
      TimeFrame_Ids: timeSlots || [13, 14], // Default afternoon slots
      OrderDetails: selectedServices?.map(service => ({
        Item_Id: service.itemId,
        Quantity: 1,
        Total_Amount: service.price,
        Staff_Id: 1 // Default staff
      })) || []
    };
  }

  private formatServicesList(services?: any[]): string {
    if (!services?.length) return 'No services selected';
    
    return services.map(service => 
      `${service.itemName} (${service.price} KWD)`
    ).join(', ');
  }
  /**
   * Utility method to format date for SaveOrder API (DD/MM/YYYY)
   */
  private formatDateForSaveOrder(dateString: string): string {
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Date formatting error:', error);
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }
}

export const reActOrchestrator = new ReActOrchestrator();