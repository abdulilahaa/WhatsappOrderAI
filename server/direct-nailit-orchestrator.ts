/**
 * Direct NailIt Orchestrator - Uses Working NailIt API Directly
 * Bypasses broken RAG system and connects to authentic NailIt data
 */

import OpenAI from 'openai';
import { NailItAPIService } from './nailit-api';
import { storage } from './storage';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface BookingContext {
  phoneNumber: string;
  message: string;
  services?: Array<{
    itemId: number;
    itemName: string;
    price: number;
    duration: number;
  }>;
  locationId?: number;
  locationName?: string;
  appointmentDate?: string;
  customerName?: string;
  customerEmail?: string;
}

export class DirectNailItOrchestrator {
  private nailItAPI: NailItAPIService;

  constructor() {
    this.nailItAPI = new NailItAPIService();
  }

  /**
   * Main processing method using authentic NailIt data
   */
  async processBookingRequest(context: BookingContext): Promise<any> {
    console.log(`🤖 [DirectOrchestrator] Processing: "${context.message}"`);
    
    try {
      // Step 1: Extract location from message
      const locationInfo = await this.extractLocation(context.message);
      
      // Step 2: Search services using working NailIt API
      const services = await this.searchNailItServices(context.message, locationInfo?.locationId);
      
      // Step 3: Generate intelligent response
      const response = await this.generateResponse(context, locationInfo, services);
      
      return {
        success: true,
        response: response,
        extractedInfo: {
          location: locationInfo,
          suggestedServices: services.slice(0, 3),
          nextAction: this.determineNextAction(context, locationInfo, services)
        },
        actions: {
          shouldCreateOrder: false,
          shouldRequestMoreInfo: true,
          requiredInfo: this.getRequiredInfo(context)
        }
      };
    } catch (error: any) {
      console.error(`❌ [DirectOrchestrator] Error:`, error);
      return {
        success: false,
        error: error.message,
        response: "I'm sorry, I'm having trouble processing your request. Could you please try again?"
      };
    }
  }

  /**
   * Extract location from natural language using NailIt locations
   */
  private async extractLocation(message: string): Promise<any> {
    try {
      // Get real NailIt locations
      const locations = await this.nailItAPI.getLocations('E');
      
      const messageWords = message.toLowerCase();
      
      // Check for location mentions
      for (const location of locations) {
        const locationName = location.Location_Name.toLowerCase();
        if (messageWords.includes('plaza') && locationName.includes('plaza')) {
          return {
            locationId: location.Location_Id,
            locationName: location.Location_Name,
            address: location.Address
          };
        }
        if (messageWords.includes('zahra') && locationName.includes('zahra')) {
          return {
            locationId: location.Location_Id,
            locationName: location.Location_Name,
            address: location.Address
          };
        }
        if (messageWords.includes('arraya') && locationName.includes('arraya')) {
          return {
            locationId: location.Location_Id,
            locationName: location.Location_Name,
            address: location.Address
          };
        }
      }
      
      // Default to Al-Plaza Mall if no specific location mentioned
      return {
        locationId: 1,
        locationName: 'Al-Plaza Mall',
        address: 'Hawally Al-Othman St. Al-Plaza Mall'
      };
    } catch (error) {
      console.error('Location extraction error:', error);
      return null;
    }
  }

  /**
   * Search services using authentic NailIt API data
   */
  private async searchNailItServices(query: string, locationId: number = 1): Promise<any[]> {
    try {
      console.log(`🔍 [ServiceSearch] Searching "${query}" at location ${locationId}`);
      
      const currentDate = this.nailItAPI.formatDateForAPI(new Date());
      const response = await this.nailItAPI.getItemsByDate({
        itemTypeId: 2,
        groupId: 0,
        selectedDate: currentDate,
        pageNo: 1,
        locationIds: [locationId]
      });
      
      let services = response.items || [];
      
      // Filter by search terms
      if (query && query.trim()) {
        const searchTerms = query.toLowerCase().split(' ');
        services = services.filter(item => {
          const itemText = `${item.Item_Name} ${item.Item_Desc}`.toLowerCase();
          return searchTerms.some(term => itemText.includes(term));
        });
      }
      
      // Transform to standard format
      return services.slice(0, 10).map(item => ({
        itemId: item.Item_Id,
        itemName: item.Item_Name,
        price: item.Special_Price > 0 ? item.Special_Price : item.Primary_Price,
        description: item.Item_Desc?.replace(/<[^>]*>/g, '') || '',
        duration: item.Duration || 30,
        locationIds: item.Location_Ids || [],
        imageUrl: item.Image_Url ? `https://api.nailit.com/${item.Image_Url}` : null
      }));
    } catch (error) {
      console.error('Service search error:', error);
      return [];
    }
  }

  /**
   * Generate intelligent response using OpenAI
   */
  private async generateResponse(context: BookingContext, location: any, services: any[]): Promise<string> {
    try {
      const systemPrompt = `You are NailIt Spa Kuwait's booking assistant. You help customers book appointments naturally.

Available Location: ${location?.locationName || 'Al-Plaza Mall'}
Found Services: ${services.map(s => `${s.itemName} (${s.price} KWD)`).join(', ')}

Respond naturally and helpfully. If services were found, mention them. Guide the customer through booking.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context.message }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      return completion.choices[0]?.message?.content || "How can I help you today?";
    } catch (error) {
      console.error('Response generation error:', error);
      return "I'd be happy to help you book an appointment at NailIt Spa!";
    }
  }

  /**
   * Determine next action based on context
   */
  private determineNextAction(context: BookingContext, location: any, services: any[]): string {
    if (!location) return 'LOCATION_SELECTION';
    if (services.length === 0) return 'SERVICE_CLARIFICATION';
    if (!context.appointmentDate) return 'DATE_SELECTION';
    if (!context.customerName) return 'CUSTOMER_INFO';
    return 'READY_TO_BOOK';
  }

  /**
   * Get required information
   */
  private getRequiredInfo(context: BookingContext): string[] {
    const required = [];
    if (!context.services?.length) required.push('services');
    if (!context.appointmentDate) required.push('date');
    if (!context.customerName) required.push('customer_name');
    if (!context.customerEmail) required.push('email');
    return required;
  }

  /**
   * Create actual booking using NailIt SaveOrder API
   */
  async createBooking(context: BookingContext): Promise<any> {
    try {
      console.log(`📋 [CreateBooking] Creating order for ${context.customerName}`);
      
      // First register/get customer
      const customer = await this.nailItAPI.registerUser({
        name: context.customerName || 'Customer',
        email: context.customerEmail || 'customer@email.com',
        mobile: context.phoneNumber,
        address: 'Kuwait'
      });
      
      if (!customer.App_User_Id) {
        throw new Error('Failed to register customer');
      }
      
      // Create order
      const orderData = {
        appUserId: customer.App_User_Id,
        locationId: context.locationId || 1,
        orderType: 2,
        paymentTypeId: 2, // KNet
        channelId: 4, // WhatsApp
        appointmentDate: context.appointmentDate || this.nailItAPI.formatDateForSaveOrder(new Date()),
        timeFrameIds: [7, 8], // 1-2 PM slot
        orderDetails: context.services?.map(service => ({
          itemId: service.itemId,
          qty: 1,
          staffId: 1,
          price: service.price
        })) || [],
        totalAmount: context.services?.reduce((sum, s) => sum + s.price, 0) || 0
      };
      
      const order = await this.nailItAPI.saveOrder(orderData);
      
      if (order.Status === 0 && order.OrderId) {
        return {
          success: true,
          orderId: order.OrderId,
          customerId: customer.App_User_Id,
          paymentLink: `http://nailit.innovasolution.net/knet.aspx?orderId=${order.OrderId}`,
          totalAmount: orderData.totalAmount
        };
      }
      
      throw new Error(order.Message || 'Order creation failed');
    } catch (error: any) {
      console.error('Booking creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const directOrchestrator = new DirectNailItOrchestrator();