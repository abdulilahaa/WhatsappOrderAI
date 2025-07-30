import { nailItAPI } from './nailit-api';
import { storage } from './storage';

/**
 * NailIt Booking Integration - Complete implementation following master system prompt
 */
export class NailItBookingIntegration {
  /**
   * Complete booking flow from WhatsApp to NailIt POS
   */
  async createBookingFromSlotState(slotState: any, customer: any) {
    console.log('🎯 Creating NailIt booking from slot state:', JSON.stringify(slotState, null, 2));
    
    try {
      // Step 1: Ensure customer is registered in NailIt
      let nailItUserId = customer.nailItUserId;
      if (!nailItUserId) {
        const registerResult = await this.registerCustomerInNailIt(customer);
        if (!registerResult.success) {
          throw new Error(`Failed to register customer: ${registerResult.message}`);
        }
        nailItUserId = registerResult.userId;
        // Save NailIt user ID to customer record - TODO: Add nailItUserId to customer schema
      }
      
      // Step 2: Convert slot state to NailIt SaveOrder format
      const orderData = await this.buildSaveOrderRequest(slotState, nailItUserId);
      
      // Step 3: Create order in NailIt POS
      console.log('📤 Sending SaveOrder request:', JSON.stringify(orderData, null, 2));
      const orderResult = await nailItAPI.saveOrder(orderData);
      
      if (orderResult && orderResult.Status === 0) {
        console.log('✅ Order created successfully:', orderResult);
        
        // Generate payment link for KNet
        const paymentLink = `http://nailit.innovasolution.net/knet.aspx?orderId=${orderResult.OrderId}`;
        
        return {
          success: true,
          orderId: orderResult.OrderId,
          customerId: orderResult.CustomerId,
          paymentLink,
          message: `Your booking is confirmed! Order ID: ${orderResult.OrderId}\n\nPayment link:\n${paymentLink}\n\nTest card details:\nCard: 0000000001\nExpiry: 09/25\nPIN: 1234`
        };
      } else {
        throw new Error(orderResult?.Message || 'Failed to create order');
      }
      
    } catch (error) {
      console.error('❌ Booking creation error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create booking'
      };
    }
  }
  
  /**
   * Register customer in NailIt system
   */
  private async registerCustomerInNailIt(customer: any) {
    try {
      const registerData = {
        Address: customer.address || 'Kuwait City',
        Email_Id: customer.email || `customer${Date.now()}@nailit.kw`,
        Name: customer.name || 'Guest Customer',
        Mobile: customer.phoneNumber,
        Login_Type: 1,
        Image_Name: ''
      };
      
      console.log('📝 Registering customer:', registerData);
      const result = await nailItAPI.registerUser(registerData);
      
      if (result && result.App_User_Id) {
        return {
          success: true,
          userId: result.App_User_Id,
          message: 'Customer registered successfully'
        };
      }
      
      return {
        success: false,
        message: result?.Message || 'Registration failed'
      };
      
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Failed to register customer'
      };
    }
  }
  
  /**
   * Build SaveOrder request from slot state
   */
  private async buildSaveOrderRequest(slotState: any, userId: number) {
    // Parse date and time
    const appointmentDate = this.formatDateForSaveOrder(slotState.date.value);
    const timeSlots = await this.getTimeSlots(slotState.time.value, slotState.service.id);
    
    // Get service details
    const servicePrice = await this.getServicePrice(slotState.service.id, slotState.location.id);
    
    // Build order details
    const orderDetails = [{
      Prod_Id: slotState.service.id,
      Prod_Name: slotState.service.value,
      Qty: 1,
      Rate: servicePrice,
      Amount: servicePrice,
      Size_Id: null,
      Size_Name: '',
      Promotion_Id: 0,
      Promo_Code: '',
      Discount_Amount: 0.0,
      Net_Amount: servicePrice,
      Staff_Id: slotState.staffId || 1, // Use selected staff or default
      TimeFrame_Ids: timeSlots,
      Appointment_Date: appointmentDate
    }];
    
    return {
      Gross_Amount: servicePrice,
      Payment_Type_Id: 2, // KNet payment
      Order_Type: 2, // Service order
      UserId: userId,
      FirstName: slotState.name.value,
      Mobile: slotState.phoneNumber || '',
      Email: slotState.email.value,
      Discount_Amount: 0.0,
      Net_Amount: servicePrice,
      POS_Location_Id: slotState.location.id,
      ChannelId: 4, // WhatsApp channel
      OrderDetails: orderDetails
    };
  }
  
  /**
   * Format date for SaveOrder API (dd/MM/yyyy)
   */
  private formatDateForSaveOrder(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // Convert from DD-MM-YYYY to dd/MM/yyyy
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
    
    // Try parsing as Date object
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  /**
   * Convert time string to NailIt time slot IDs
   */
  private async getTimeSlots(timeStr: string, serviceId: number): Promise<number[]> {
    // Time slot mapping based on NailIt documentation
    const timeSlotMap: { [key: string]: number[] } = {
      '10:30am': [1],
      '11:00am': [1, 2],
      '11:30am': [2, 3],
      '12:00pm': [3, 4],
      '12:30pm': [4, 5],
      '1:00pm': [5, 6],
      '1:30pm': [6, 7],
      '2:00pm': [7, 8],
      '2:30pm': [8, 9],
      '3:00pm': [9, 10],
      '3:30pm': [10, 11],
      '4:00pm': [11, 12],
      '4:30pm': [12, 13],
      '5:00pm': [13, 14],
      '5:30pm': [14, 15],
      '6:00pm': [15, 16],
      '6:30pm': [16, 17],
      '7:00pm': [17, 18],
      '7:30pm': [18, 19],
      '8:00pm': [19, 20],
      '8:30pm': [20]
    };
    
    // Normalize time string
    const normalizedTime = timeStr.toLowerCase().replace(/\s/g, '');
    
    // Get time slots based on service duration (assume 30 min for now)
    return timeSlotMap[normalizedTime] || [7, 8]; // Default to 2:00pm if not found
  }
  
  /**
   * Get service price from NailIt API
   */
  private async getServicePrice(serviceId: number, locationId: number): Promise<number> {
    try {
      const date = new Date();
      const dateStr = nailItAPI.formatDateForURL(date);
      
      const request = {
        Lang: 'E',
        Page_No: 1,
        Item_Type_Id: 2,
        Location_Ids: [locationId],
        Selected_Date: dateStr,
        Is_Home_Service: false
      };
      
      const result = await nailItAPI.getItemsByDateV2(request);
      
      if (result && result.items) {
        const service = result.items.find(item => item.Item_Id === serviceId);
        if (service) {
          return service.Special_Price || service.Primary_Price;
        }
      }
      
      // Default price if not found
      return 25.0;
    } catch (error) {
      console.error('Error getting service price:', error);
      return 25.0;
    }
  }
  
  /**
   * Search for services based on user input
   */
  async searchServices(query: string, locationId?: number): Promise<any[]> {
    try {
      const date = new Date();
      const dateStr = nailItAPI.formatDateForURL(date);
      
      const locations = locationId ? [locationId] : [1, 52, 53];
      const allServices: any[] = [];
      
      for (const locId of locations) {
        let pageNo = 1;
        let hasMore = true;
        
        while (hasMore && pageNo <= 5) { // Limit to 5 pages for performance
          const request = {
            Lang: 'E',
            Page_No: pageNo,
            Item_Type_Id: 2,
            Location_Ids: [locId],
            Selected_Date: dateStr,
            Is_Home_Service: false
          };
          
          const result = await nailItAPI.getItemsByDateV2(request);
          
          console.log(`📍 Location ${locId}, Page ${pageNo}: Found ${result?.items?.length || 0} items (Total: ${result?.totalItems || 0})`);
          
          if (result && result.items && Array.isArray(result.items)) {
            // Filter based on query with proper matching
            const queryLower = query.toLowerCase();
            const filtered = result.items.filter(service => {
            const name = service.Item_Name.toLowerCase();
            const desc = (service.Item_Desc || '').toLowerCase();
            
            // Special handling for French Manicure - find regular manicure services
            if (queryLower.includes('french') && queryLower.includes('manicure')) {
              return name.includes('manicure') || name.includes('nail polish') || name.includes('classic manicure');
            }
            
            // Check for specific keywords
            const keywords = queryLower.split(' ').filter(w => w.length > 2);
            return keywords.some(keyword => {
              // Direct match
              if (name.includes(keyword) || desc.includes(keyword)) return true;
              
              // Fuzzy matching for common terms
              if (keyword === 'nail' && (name.includes('manicure') || name.includes('pedicure') || name.includes('polish'))) return true;
              if (keyword === 'manicure' && (name.includes('manicure') || name.includes('mani'))) return true;
              if (keyword === 'pedicure' && (name.includes('pedicure') || name.includes('pedi'))) return true;
              if (keyword === 'gel' && (name.includes('gelish') || name.includes('gel'))) return true;
              if (keyword === 'french' && name.includes('manicure')) return true; // Any manicure can be done french style
              
              return false;
            });
          });
          
            allServices.push(...filtered);
            
            // Check if we need more pages
            if (result.items.length < 20 || allServices.length >= 20) {
              hasMore = false;
            } else {
              pageNo++;
            }
          } else {
            hasMore = false;
          }
        }
      }
      
      // Remove duplicates and return top 5
      const uniqueServices = Array.from(
        new Map(allServices.map(s => [s.Item_Id, s])).values()
      );
      
      return uniqueServices.slice(0, 5);
      
    } catch (error) {
      console.error('Service search error:', error);
      return [];
    }
  }
}

export const nailItBookingIntegration = new NailItBookingIntegration();