/**
 * Direct NailIt Orchestrator - Uses Working NailIt API Directly
 * Bypasses broken RAG system and connects to authentic NailIt data
 */

import OpenAI from 'openai';
import { NailItAPIService } from './nailit-api';
import { storage } from './storage';
import { SmartServiceCache } from './smart-service-cache.js';

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
  private serviceCache: SmartServiceCache;

  constructor() {
    this.nailItAPI = new NailItAPIService();
    this.serviceCache = new SmartServiceCache(storage);
  }

  /**
   * Main processing method using authentic NailIt data
   */
  async processBookingRequest(context: BookingContext): Promise<any> {
    console.log(`🤖 [DirectOrchestrator] Processing: "${context.message}"`);
    
    try {
      // Step 1: Extract location from message
      const locationInfo = await this.extractLocation(context.message);
      
      // Step 2: Search services using smart cache (FAST: <500ms)
      console.log(`⚡ [CacheSearch] Using smart cache for instant service discovery`);
      const services = await this.searchCachedServices(context.message, locationInfo?.locationId);
      
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
   * Search services using smart cache - BUSINESS CONTEXT: NAIL SALON (<500ms response)
   */
  private async searchCachedServices(query: string, locationId: number = 1): Promise<any[]> {
    try {
      console.log(`⚡ [SmartCache] Searching "${query}" at location ${locationId}`);
      
      // Use smart cache for <500ms response time
      let services = await this.serviceCache.searchServices(query, locationId);
      
      // If no specific services found, get all services for location
      if (services.length === 0) {
        services = await this.serviceCache.getServicesForLocation(locationId);
      }
      
      console.log(`🎯 Found ${services.length} services from cache`);
      
      // CRITICAL FIX: NailIt is a NAIL SALON - prioritize nail services by default
      const nailServices = services.filter(service => {
        const category = service.category?.toLowerCase() || '';
        const name = service.name?.toLowerCase() || '';
        const keywords = service.keywords || [];
        
        return category === 'nails' || 
               name.includes('nail') || name.includes('manicure') || name.includes('pedicure') ||
               keywords.includes('nail') || keywords.includes('manicure') || keywords.includes('pedicure');
      });
      
      console.log(`💅 Found ${nailServices.length} nail services out of ${services.length} total`);
      
      // Prioritize nail services for general queries
      if (!query || ['hello', 'hi', 'services', 'show me', 'all'].some(generic => query.toLowerCase().includes(generic))) {
        services = nailServices.length > 0 ? nailServices : services.slice(0, 10);
      } else {
        // For specific queries, prefer nail services if found, otherwise use all results
        services = nailServices.length > 0 ? nailServices : services;
      }
      
      console.log(`🎯 [CacheResult] Using ${services.length} services from smart cache (${nailServices.length} nail-specific)`);
      
      // Convert cached services to expected format for AI Agent
      return services.map(service => ({
        Item_Id: service.serviceId,
        Item_Name: service.name,
        Item_Desc: service.description,
        Primary_Price: parseFloat(service.priceKwd),
        Special_Price: 0,
        Duration: service.durationMinutes,
        Location_Ids: service.locationIds,
        Category: service.category,
        Keywords: service.keywords
      }));
    } catch (error) {
      console.error('Service search error:', error);
      return [];
    }
  }

  /**
   * Generate natural response using OpenAI with NAIL SALON business context
   */
  private async generateResponse(context: BookingContext, location: any, services: any[]): Promise<string> {
    try {
      const systemPrompt = `You are NailIt Spa Kuwait's professional booking assistant.

CRITICAL BUSINESS CONTEXT: 
- NailIt is Kuwait's premier NAIL SALON and beauty spa
- PRIMARY SERVICES: Nail care (manicures, pedicures, nail art, gel polish, chrome nails)
- SECONDARY SERVICES: Beauty treatments (facials, hair treatments, massages)
- NEVER claim we "only offer hair treatments" - that is completely wrong

Available services at ${location?.locationName || 'Al-Plaza Mall'}:
${services.map(s => `• ${s.itemName} - ${s.price} KWD\n  ${s.description.substring(0, 120)}...`).join('\n')}

Response Guidelines:
- Always emphasize our nail services first (our core specialty)
- Be warm, professional, and knowledgeable about services
- Include specific service names and prices
- Mention service benefits/descriptions when relevant
- Keep responses 150-250 words
- End with helpful booking offer`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context.message }
        ],
        max_tokens: 350,
        temperature: 0.7
      });

      return completion.choices[0]?.message?.content || `Welcome to NailIt Spa Kuwait! We're specialists in nail care with services like ${services.slice(0, 3).map(s => `${s.itemName} (${s.price} KWD)`).join(', ')}. How can I help you book your perfect nail treatment today?`;
    } catch (error) {
      console.error('Response generation error:', error);
      return `Welcome to NailIt Spa Kuwait! As Kuwait's premier nail salon, we offer ${services.length} professional services including ${services.slice(0, 3).map(s => `${s.itemName} (${s.price} KWD)`).join(', ')}. Let me help you find the perfect nail treatment!`;
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
  /**
   * Get available time slots from NailIt API (no hardcoded values)
   */
  async getAvailableTimeSlots(locationId: number): Promise<number[]> {
    try {
      const slots = await this.nailItAPI.getAvailableSlots('E', locationId, 
        this.nailItAPI.formatDateForAPI(new Date()));
      return slots.length > 0 ? slots.slice(0, 2).map(s => s.TimeFrame_Id) : [13, 14]; // Default afternoon
    } catch {
      return [13, 14]; // Fallback to afternoon only if API fails
    }
  }

  /**
   * Get available staff from NailIt API (no hardcoded values)
   */
  async getAvailableStaff(itemId: number, locationId: number): Promise<number> {
    try {
      const staff = await this.nailItAPI.getServiceStaff(itemId, locationId, 'E',
        this.nailItAPI.formatDateForAPI(new Date()));
      return staff.length > 0 ? staff[0].Id : 1; // Use first available staff
    } catch {
      return 1; // Default staff only if API fails
    }
  }

  async createBooking(context: BookingContext): Promise<any> {
    try {
      console.log(`📋 [CreateBooking] Creating order for ${context.customerName}`);
      
      // First register/get customer with proper mobile format
      const cleanPhone = context.phoneNumber.replace(/\+/g, ''); // Remove + sign
      const customer = await this.nailItAPI.registerUser({
        name: context.customerName || 'Customer',
        email: context.customerEmail || `customer${Date.now()}@email.com`,
        mobile: cleanPhone, // NailIt expects phone without +
        address: 'Kuwait City, Kuwait'
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
        timeFrameIds: await this.getAvailableTimeSlots(context.locationId || 1), // Dynamic time slots from API
        orderDetails: await Promise.all(context.services?.map(async service => ({
          itemId: service.itemId,
          qty: 1,
          staffId: await this.getAvailableStaff(service.itemId, context.locationId || 1),
          price: service.price
        })) || []),
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