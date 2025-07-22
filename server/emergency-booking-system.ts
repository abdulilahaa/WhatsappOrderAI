/**
 * Emergency WhatsApp Booking System
 * Bypasses all cache systems with PostgreSQL array issues
 * Uses direct NailIt API integration for immediate booking capability
 */

import { NailItAPIService } from './nailit-api.js';
import { OpenAI } from 'openai';

interface BookingRequest {
  phoneNumber: string;
  message: string;
  locationId?: number;
}

interface BookingResponse {
  response: string;
  orderCreated: boolean;
  orderId?: number;
  paymentLink?: string;
}

export class EmergencyBookingSystem {
  private nailItAPI: NailItAPIService;
  private openai: OpenAI;
  
  // Hardcoded essential services for immediate booking (bypassing cache issues)
  private essentialServices = [
    { id: 279, name: "French Manicure", price: 25.0, duration: 60 },
    { id: 280, name: "Classic Pedicure", price: 30.0, duration: 60 },
    { id: 203, name: "Hair Treatment", price: 45.0, duration: 90 },
    { id: 189, name: "Facial Treatment", price: 40.0, duration: 75 }
  ];

  constructor() {
    this.nailItAPI = new NailItAPIService();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Process emergency booking request with minimal dependencies
   */
  async processEmergencyBooking(request: BookingRequest): Promise<BookingResponse> {
    try {
      console.log(`🚨 EMERGENCY BOOKING: Processing "${request.message}" for ${request.phoneNumber}`);
      
      // Detect service from message
      const detectedService = this.detectService(request.message);
      if (!detectedService) {
        return {
          response: "Hi! I can help you book French Manicure (25 KWD), Classic Pedicure (30 KWD), Hair Treatment (45 KWD), or Facial Treatment (40 KWD). Which service would you like?",
          orderCreated: false
        };
      }

      // Extract customer details
      const customerName = this.extractName(request.message) || "WhatsApp Customer";
      const locationId = this.detectLocation(request.message);

      console.log(`📋 Booking Details: ${detectedService.name} at Location ${locationId} for ${customerName}`);

      // Register user with NailIt (required for orders)
      const userRegistration = await this.nailItAPI.registerUser({
        Name: customerName,
        Mobile: request.phoneNumber,
        Email_Id: `${request.phoneNumber}@whatsapp.com`,
        Address: "Kuwait",
        Login_Type: 1,
        Image_Name: ""
      });

      if (!userRegistration || userRegistration.Status !== 0) {
        console.error('User registration failed:', userRegistration);
        return {
          response: "I'm having trouble processing your booking right now. Please try again in a few minutes.",
          orderCreated: false
        };
      }

      // Create order in NailIt POS
      const orderData = {
        Gross_Amount: detectedService.price,
        Payment_Type_Id: 2, // KNet payment
        Order_Type: 2,
        UserId: userRegistration.App_User_Id,
        FirstName: customerName,
        Mobile: request.phoneNumber,
        Email: `${request.phoneNumber}@whatsapp.com`,
        Discount_Amount: 0.0,
        Net_Amount: detectedService.price,
        POS_Location_Id: locationId,
        ChannelId: 4,
        OrderDetails: [{
          Prod_Id: detectedService.id,
          Prod_Name: detectedService.name,
          Qty: 1,
          Rate: detectedService.price,
          Amount: detectedService.price,
          Size_Id: null,
          Size_Name: "",
          Promotion_Id: 0,
          Promo_Code: "",
          Discount_Amount: 0.0,
          Net_Amount: detectedService.price,
          Staff_Id: 16, // Default staff for emergency booking
          TimeFrame_Ids: [2, 3], // 11AM-12PM slot
          Appointment_Date: this.getTomorrowDate()
        }]
      };

      const orderResult = await this.nailItAPI.saveOrder(orderData);
      
      if (orderResult && orderResult.Status === 0 && orderResult.OrderId > 0) {
        const paymentLink = `http://nailit.innovasolution.net/knet.aspx?orderId=${orderResult.OrderId}`;
        
        return {
          response: `Perfect! I've booked your ${detectedService.name} for tomorrow at 11:00 AM at Al-Plaza Mall.\n\n💰 Total: ${detectedService.price} KWD\n📍 Location: Al-Plaza Mall\n⏰ Time: 11:00 AM - 12:00 PM\n🎯 Order ID: ${orderResult.OrderId}\n\nComplete your payment here: ${paymentLink}\n\nUse test card: 0000000001, Expiry: 09/25, PIN: 1234`,
          orderCreated: true,
          orderId: orderResult.OrderId,
          paymentLink: paymentLink
        };
      } else {
        console.error('Order creation failed:', orderResult);
        return {
          response: `I'm sorry, there was an issue creating your booking. Error: ${orderResult?.Message || 'Unknown error'}. Please try again or contact us directly.`,
          orderCreated: false
        };
      }

    } catch (error) {
      console.error('Emergency booking error:', error);
      return {
        response: "I'm experiencing technical difficulties. Please try again in a few minutes or contact us directly.",
        orderCreated: false
      };
    }
  }

  private detectService(message: string): any | null {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('french') || lowerMessage.includes('manicure')) {
      return this.essentialServices[0]; // French Manicure
    }
    if (lowerMessage.includes('pedicure')) {
      return this.essentialServices[1]; // Classic Pedicure
    }
    if (lowerMessage.includes('hair')) {
      return this.essentialServices[2]; // Hair Treatment
    }
    if (lowerMessage.includes('facial') || lowerMessage.includes('face')) {
      return this.essentialServices[3]; // Facial Treatment
    }
    
    return null;
  }

  private extractName(message: string): string | null {
    const namePatterns = [
      /my name is (\w+)/i,
      /i'm (\w+)/i,
      /i am (\w+)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  private detectLocation(message: string): number {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('plaza')) return 1;
    if (lowerMessage.includes('zahra')) return 52;
    if (lowerMessage.includes('arraya')) return 53;
    
    return 1; // Default to Al-Plaza Mall
  }

  private getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  }
}