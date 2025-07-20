// RAG-Enhanced AI Agent - Ultra-fast AI with local data caching
// Provides <500ms service discovery and intelligent booking management

import OpenAI from 'openai';
import { db } from './db';
import { enhancedConversationStates, customers } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { ragSearchService } from './rag-search';
import { NailItAPIService } from './nailit-api';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface EnhancedConversationData {
  selectedServices: Array<{
    itemId: number;
    itemName: string;
    price: number;
    quantity: number;
    duration: number;
    description?: string;
  }>;
  totalAmount: number;
  totalDuration: number;
  locationId?: number;
  locationName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  timeSlots?: number[];
  assignedStaff?: Array<{ staffId: number; staffName: string; }>;
  customerName?: string;
  customerEmail?: string;
  paymentMethod?: string;
}

interface RAGAIResponse {
  message: string;
  collectionPhase: string;
  collectedData: EnhancedConversationData;
  suggestedServices?: Array<{
    itemId: number;
    itemName: string;
    price: number;
    duration: number;
    description: string;
  }>;
}

class RAGAIAgent {
  private nailItAPI: NailItAPIService;

  constructor() {
    this.nailItAPI = new NailItAPIService();
  }

  /**
   * Process customer message with RAG-enhanced speed
   */
  async processMessage(phoneNumber: string, message: string): Promise<RAGAIResponse> {
    try {
      // Step 1: Get or create conversation state (FAST - local DB)
      const conversationState = await this.getOrCreateConversationState(phoneNumber);
      
      // Step 2: Fast service discovery using local data
      const suggestedServices = await this.smartServiceDiscovery(message, conversationState);
      
      // Step 3: Update conversation state
      const updatedState = await this.updateConversationState(phoneNumber, message, suggestedServices, conversationState);
      
      // Step 4: Generate intelligent response
      const response = await this.generateIntelligentResponse(updatedState, message, suggestedServices);
      
      return response;

    } catch (error) {
      console.error('RAG AI processing error:', error);
      return {
        message: "I'm having a technical issue. Please try again in a moment.",
        collectionPhase: "error",
        collectedData: {
          selectedServices: [],
          totalAmount: 0,
          totalDuration: 0,
        }
      };
    }
  }

  /**
   * Ultra-fast service discovery using local RAG data
   */
  private async smartServiceDiscovery(message: string, conversationState: any) {
    try {
      // Check if message contains service intent
      const serviceKeywords = ['hair', 'treatment', 'olaplex', 'macadamia', 'color', 'style', 'blowout', 'keratin', 'manicure', 'pedicure'];
      const hasServiceIntent = serviceKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
      );

      if (!hasServiceIntent && conversationState.currentPhase === 'greeting') {
        // Show popular services for browsing
        return await ragSearchService.getPopularServices({
          locationId: conversationState.locationId || undefined
        }, 6);
      }

      if (hasServiceIntent) {
        // Fast local search using RAG
        const searchResults = await ragSearchService.searchServices(
          message,
          {
            locationId: conversationState.locationId || undefined,
            maxPrice: 100, // Reasonable price filter
          },
          8
        );

        return searchResults.map(service => ({
          itemId: service.itemId,
          itemName: service.itemName,
          price: parseFloat(service.primaryPrice),
          duration: service.durationMinutes || 60,
          description: service.itemDesc || '',
        }));
      }

      return [];

    } catch (error) {
      console.error('Service discovery error:', error);
      return [];
    }
  }

  /**
   * Get or create conversation state from local database
   */
  private async getOrCreateConversationState(phoneNumber: string) {
    try {
      // Try to get existing state
      const existingState = await db
        .select()
        .from(enhancedConversationStates)
        .where(eq(enhancedConversationStates.phoneNumber, phoneNumber))
        .limit(1);

      if (existingState.length > 0) {
        return existingState[0];
      }

      // Create new conversation state
      const customer = await this.getOrCreateCustomer(phoneNumber);
      
      const newState = await db
        .insert(enhancedConversationStates)
        .values({
          customerId: customer.id,
          phoneNumber,
          currentPhase: 'greeting',
          language: 'en',
          selectedServices: [],
          totalAmount: '0',
          totalDuration: 0,
          dataCompletionPercentage: 0,
          canProceedToBooking: false,
        })
        .returning();

      return newState[0];

    } catch (error) {
      console.error('Conversation state error:', error);
      throw error;
    }
  }

  /**
   * Update conversation state with new data
   */
  private async updateConversationState(
    phoneNumber: string, 
    message: string, 
    suggestedServices: any[], 
    currentState: any
  ) {
    try {
      const updates: any = {
        lastInteractionAt: new Date(),
      };

      // Analyze message to update state
      const messageAnalysis = await this.analyzeMessage(message, currentState);
      
      // Update phase if needed
      if (messageAnalysis.newPhase) {
        updates.currentPhase = messageAnalysis.newPhase;
      }

      // Update selected services
      if (messageAnalysis.selectedServices) {
        updates.selectedServices = messageAnalysis.selectedServices;
        updates.totalAmount = messageAnalysis.totalAmount?.toString();
        updates.totalDuration = messageAnalysis.totalDuration;
      }

      // Update location
      if (messageAnalysis.locationId) {
        updates.locationId = messageAnalysis.locationId;
        updates.locationName = messageAnalysis.locationName;
      }

      // Update appointment details
      if (messageAnalysis.appointmentDate) {
        updates.appointmentDate = messageAnalysis.appointmentDate;
      }

      // Calculate completion percentage
      updates.dataCompletionPercentage = this.calculateCompletionPercentage(currentState, updates);

      // Update in database
      const updatedState = await db
        .update(enhancedConversationStates)
        .set(updates)
        .where(eq(enhancedConversationStates.phoneNumber, phoneNumber))
        .returning();

      return updatedState[0];

    } catch (error) {
      console.error('State update error:', error);
      return currentState;
    }
  }

  /**
   * Analyze customer message for intent and data extraction
   */
  private async analyzeMessage(message: string, currentState: any) {
    const analysis: any = {};
    const lowerMessage = message.toLowerCase();

    // Service selection analysis
    if (currentState.currentPhase === 'greeting' || currentState.currentPhase === 'service_selection') {
      const serviceKeywords = ['olaplex', 'macadamia', 'hair treatment', 'color', 'blowout'];
      if (serviceKeywords.some(keyword => lowerMessage.includes(keyword))) {
        analysis.newPhase = 'service_selection';
      }
    }

    // Location selection analysis
    if (lowerMessage.includes('continue') || lowerMessage.match(/^[123]$/)) {
      if (currentState.currentPhase === 'service_selection') {
        analysis.newPhase = 'location_selection';
      }
      
      // Location number selection
      if (lowerMessage === '1') {
        analysis.locationId = 1;
        analysis.locationName = 'Al-Plaza Mall';
        analysis.newPhase = 'date_selection';
      } else if (lowerMessage === '2') {
        analysis.locationId = 52;
        analysis.locationName = 'Zahra Complex';
        analysis.newPhase = 'date_selection';
      } else if (lowerMessage === '3') {
        analysis.locationId = 53;
        analysis.locationName = 'Arraya Mall';
        analysis.newPhase = 'date_selection';
      }
    }

    // Date analysis
    if (lowerMessage.includes('tomorrow') || lowerMessage.includes('today') || lowerMessage.match(/\d{1,2}[\/-]\d{1,2}/)) {
      analysis.newPhase = 'time_selection';
      
      if (lowerMessage.includes('tomorrow')) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        analysis.appointmentDate = tomorrow.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    }

    return analysis;
  }

  /**
   * Generate intelligent response using GPT-4 with RAG context
   */
  private async generateIntelligentResponse(
    conversationState: any, 
    message: string, 
    suggestedServices: any[]
  ): Promise<RAGAIResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(conversationState, suggestedServices);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.3,
        max_tokens: 400,
      });

      const aiResponse = completion.choices[0]?.message?.content || "I'm here to help with your booking.";

      // Build complete response
      return {
        message: this.enhanceResponse(aiResponse, conversationState, suggestedServices),
        collectionPhase: conversationState.currentPhase,
        collectedData: this.buildCollectedData(conversationState),
        suggestedServices: suggestedServices.slice(0, 4), // Limit suggestions
      };

    } catch (error) {
      console.error('Response generation error:', error);
      return this.buildFallbackResponse(conversationState, suggestedServices);
    }
  }

  /**
   * Build system prompt for GPT-4 with RAG context
   */
  private buildSystemPrompt(conversationState: any, suggestedServices: any[]): string {
    const serviceContext = suggestedServices.length > 0 
      ? `\nAvailable services: ${suggestedServices.map(s => `${s.itemName} (${s.price} KWD, ${s.duration}min)`).join(', ')}`
      : '';

    return `You are NailIt's AI booking assistant for hair & beauty services in Kuwait.

CURRENT CONTEXT:
- Conversation Phase: ${conversationState.currentPhase}
- Location: ${conversationState.locationName || 'Not selected'}
- Selected Services: ${(conversationState.selectedServices || []).length} services
- Total: ${conversationState.totalAmount || 0} KWD
${serviceContext}

BEHAVIOR RULES:
1. Be natural, helpful, and professional
2. Keep responses under 200 characters
3. Never show service IDs or technical details
4. Guide customers through: Service → Location → Date → Time → Booking
5. Use authentic service names and prices from the system
6. Speak in simple, customer-friendly language

LOCATIONS:
1. Al-Plaza Mall (Hawally, 11:00 AM - 08:30 PM)
2. Zahra Complex (Salmiya, 11:00 AM - 08:30 PM)  
3. Arraya Mall (Kuwait City, 11:00 AM - 08:30 PM)

Respond naturally and guide the customer to the next step.`;
  }

  /**
   * Enhance response with formatted service information
   */
  private enhanceResponse(aiResponse: string, conversationState: any, suggestedServices: any[]): string {
    // Add service formatting for service selection phase
    if (conversationState.currentPhase === 'service_selection' && suggestedServices.length > 0) {
      const serviceList = suggestedServices.slice(0, 3).map((service, index) => 
        `${index + 1}. ${service.itemName}\n   ${service.price} KWD × 1\n   Duration: ${service.duration} min`
      ).join('\n\n');
      
      return `✅ Your selected services:\n\n${serviceList}\n\n${aiResponse}`;
    }

    // Add location formatting for location selection phase
    if (conversationState.currentPhase === 'location_selection') {
      return `Choose your preferred location:

1. Al-Plaza Mall
   📍 Hawally Al-Othman St. Al-Plaza Mall
   ⏰ 11:00 AM - 08:30 PM

2. Zahra Complex
   📍 Zahra Complex,Salem Al Mubarak St, Salmiya
   ⏰ 11:00 AM - 08:30 PM

3. Arraya Mall
   📍 Block 7, Al-Shuhada St., Arraya Center
   ⏰ 11:00 AM - 08:30 PM

Type 1, 2, or 3 to select your location.`;
    }

    return aiResponse;
  }

  /**
   * Build collected data object
   */
  private buildCollectedData(conversationState: any): EnhancedConversationData {
    return {
      selectedServices: Array.isArray(conversationState.selectedServices) 
        ? conversationState.selectedServices 
        : [],
      totalAmount: parseFloat(conversationState.totalAmount || '0'),
      totalDuration: conversationState.totalDuration || 0,
      locationId: conversationState.locationId,
      locationName: conversationState.locationName,
      appointmentDate: conversationState.appointmentDate,
      appointmentTime: conversationState.appointmentTime,
      timeSlots: conversationState.timeSlots,
      assignedStaff: conversationState.assignedStaff,
      customerName: conversationState.customerName,
      customerEmail: conversationState.customerEmail,
      paymentMethod: conversationState.paymentMethod,
    };
  }

  /**
   * Calculate completion percentage
   */
  private calculateCompletionPercentage(currentState: any, updates: any): number {
    const state = { ...currentState, ...updates };
    let completion = 0;

    if (state.selectedServices && Array.isArray(state.selectedServices) && state.selectedServices.length > 0) {
      completion += 25;
    }
    if (state.locationId) completion += 25;
    if (state.appointmentDate) completion += 25;
    if (state.customerName && state.customerEmail) completion += 25;

    return completion;
  }

  /**
   * Get or create customer
   */
  private async getOrCreateCustomer(phoneNumber: string) {
    try {
      const existing = await db
        .select()
        .from(customers)
        .where(eq(customers.phoneNumber, phoneNumber))
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }

      const newCustomer = await db
        .insert(customers)
        .values({ phoneNumber })
        .returning();

      return newCustomer[0];

    } catch (error) {
      console.error('Customer error:', error);
      throw error;
    }
  }

  /**
   * Build fallback response
   */
  private buildFallbackResponse(conversationState: any, suggestedServices: any[]): RAGAIResponse {
    return {
      message: "Welcome to NailIt! I'm here to help you book your hair & beauty appointment. What service would you like today?",
      collectionPhase: conversationState.currentPhase || 'greeting',
      collectedData: this.buildCollectedData(conversationState),
      suggestedServices: suggestedServices.slice(0, 4),
    };
  }

  /**
   * Check staff availability in real-time (only when needed)
   */
  async checkStaffAvailability(locationId: number, serviceIds: number[], appointmentDate: string) {
    try {
      // This is the ONLY real-time API call in the RAG system
      console.log(`🔍 Real-time staff check for location ${locationId}, date ${appointmentDate}`);
      
      const staffData = await this.nailItAPI.getServiceStaff(
        serviceIds[0], // Check for first service
        locationId,
        'E',
        appointmentDate
      );

      return staffData;

    } catch (error) {
      console.error('Staff availability error:', error);
      return { success: false, staff: [] };
    }
  }
}

export const ragAIAgent = new RAGAIAgent();