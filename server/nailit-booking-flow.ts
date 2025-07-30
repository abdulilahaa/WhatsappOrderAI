/**
 * NAIL IT WHATSAPP AI BOOKING AGENT: Complete Booking Flow Implementation
 * Based on Master System Prompt Implementation Guide
 * 
 * This module implements the complete booking flow according to the Nail It API V2.2
 * documentation and master system prompt requirements.
 */

import { nailItAPI } from './nailit-api';
import type { 
  NailItLocation, 
  NailItGroup, 
  NailItItem, 
  NailItStaff, 
  NailItTimeSlot,
  NailItPaymentType,
  NailItSaveOrderResponse
} from './nailit-api';

export interface BookingSession {
  // User identification
  appUserId?: number;
  customerInfo?: {
    name: string;
    phone: string;
    email: string;
  };
  
  // Selected booking details
  selectedServices: ServiceSelection[];
  selectedLocation?: LocationSelection;
  selectedDate?: string;
  paymentType?: PaymentTypeSelection;
  
  // Session metadata
  conversationId: number;
  language: 'en' | 'ar';
  stage: BookingStage;
  errors: string[];
}

export interface ServiceSelection {
  serviceId: number;
  serviceName: string;
  price: number;
  duration: number;
  staffId?: number;
  staffName?: string;
  timeSlots?: number[];
  startTime?: string;
}

export interface LocationSelection {
  locationId: number;
  locationName: string;
  address: string;
  workingHours: string;
}

export interface PaymentTypeSelection {
  typeId: number;
  typeName: string;
  typeCode: string;
}

export type BookingStage = 
  | 'greeting'
  | 'service_selection'
  | 'location_selection'
  | 'date_selection'
  | 'staff_time_selection'
  | 'customer_details'
  | 'payment_selection'
  | 'review'
  | 'booking'
  | 'complete';

export class NailItBookingFlow {
  
  /**
   * Step 1: Register or identify customer
   */
  static async identifyCustomer(phone: string, name?: string, email?: string): Promise<number | null> {
    try {
      console.log('🔍 Step 1: Identifying customer with phone:', phone);
      
      // Format phone for Nail It API (remove + prefix if present)
      const formattedPhone = phone.startsWith('+') ? phone.substring(1) : phone;
      
      // Register customer with Nail It
      const userData = {
        Address: 'Kuwait',
        Email_Id: email || `${formattedPhone}@whatsapp.user`,
        Name: name || 'WhatsApp User',
        Mobile: formattedPhone,
        Login_Type: 1,
        Image_Name: ''
      };
      
      const appUserId = await nailItAPI.getOrCreateUser(userData);
      
      if (appUserId) {
        console.log('✅ Customer identified/created with App_User_Id:', appUserId);
        return appUserId;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to identify customer:', error);
      return null;
    }
  }
  
  /**
   * Step 2: Get all locations
   */
  static async getAllLocations(language: string = 'E'): Promise<NailItLocation[]> {
    try {
      console.log('📍 Step 2: Getting all Nail It locations');
      const locations = await nailItAPI.getLocations(language);
      console.log(`✅ Found ${locations.length} locations`);
      return locations;
    } catch (error) {
      console.error('❌ Failed to get locations:', error);
      return [];
    }
  }
  
  /**
   * Step 3: Get service groups (categories)
   */
  static async getServiceGroups(): Promise<NailItGroup[]> {
    try {
      console.log('📋 Step 3: Getting service groups');
      const groups = await nailItAPI.getGroups(2); // 2 for services
      console.log(`✅ Found ${groups.length} service groups`);
      return groups;
    } catch (error) {
      console.error('❌ Failed to get service groups:', error);
      return [];
    }
  }
  
  /**
   * Step 4: Get subgroups under a group
   */
  static async getSubGroups(groupId: number, language: string = 'E'): Promise<NailItGroup[]> {
    try {
      console.log(`📋 Step 4: Getting subgroups for group ${groupId}`);
      const subGroups = await nailItAPI.getSubGroups(language, groupId);
      console.log(`✅ Found ${subGroups.length} subgroups`);
      return subGroups;
    } catch (error) {
      console.error('❌ Failed to get subgroups:', error);
      return [];
    }
  }
  
  /**
   * Step 5: Get available services by date and location
   */
  static async getAvailableServices(
    locationId: number, 
    date: string, 
    groupId?: number
  ): Promise<NailItItem[]> {
    try {
      console.log(`🛍️ Step 5: Getting available services for location ${locationId} on ${date}`);
      
      const request = {
        Lang: 'E',
        Like: '',
        Page_No: 1,
        Item_Type_Id: 2, // Services
        Group_Id: groupId || 0,
        Location_Ids: [locationId],
        Is_Home_Service: false,
        Selected_Date: date
      };
      
      const result = await nailItAPI.getItemsByDateV2(request);
      console.log(`✅ Found ${result.totalItems} services, showing ${result.items.length}`);
      
      // Get all pages if needed
      if (result.totalItems > result.items.length) {
        console.log('📄 Fetching additional pages...');
        let allItems = [...result.items];
        let pageNo = 2;
        
        while (allItems.length < result.totalItems && pageNo <= 10) {
          const nextPage = await nailItAPI.getItemsByDateV2({ ...request, Page_No: pageNo });
          if (nextPage.items.length === 0) break;
          allItems = [...allItems, ...nextPage.items];
          pageNo++;
        }
        
        console.log(`✅ Retrieved total ${allItems.length} services across ${pageNo - 1} pages`);
        return allItems;
      }
      
      return result.items;
    } catch (error) {
      console.error('❌ Failed to get available services:', error);
      return [];
    }
  }
  
  /**
   * Step 6: Get staff for selected service
   */
  static async getServiceStaff(
    serviceId: number, 
    locationId: number, 
    date: string
  ): Promise<NailItStaff[]> {
    try {
      console.log(`👥 Step 6: Getting staff for service ${serviceId} at location ${locationId}`);
      
      const request = {
        Service_Item_Id: serviceId,
        Location_Id: locationId,
        Date: date
      };
      
      const staff = await nailItAPI.getServiceStaffV2(request);
      console.log(`✅ Found ${staff.length} available staff members`);
      return staff;
    } catch (error) {
      console.error('❌ Failed to get service staff:', error);
      return [];
    }
  }
  
  /**
   * Step 7: Get available time slots for staff
   */
  static async getAvailableSlots(
    staffId: number, 
    serviceId: number, 
    date: string
  ): Promise<NailItTimeSlot[]> {
    try {
      console.log(`⏰ Step 7: Getting available slots for staff ${staffId}`);
      
      const request = {
        Staff_Id: staffId,
        Service_Item_Id: serviceId,
        Date: date
      };
      
      const slots = await nailItAPI.getAvailableSlotsV2(request);
      console.log(`✅ Found ${slots.length} available time slots`);
      return slots;
    } catch (error) {
      console.error('❌ Failed to get available slots:', error);
      return [];
    }
  }
  
  /**
   * Step 8: Get payment types
   */
  static async getPaymentTypes(locationId: number): Promise<NailItPaymentType[]> {
    try {
      console.log('💳 Step 8: Getting payment types');
      
      const request = {
        Device_Id: 'X',
        Location_Id: locationId
      };
      
      const paymentTypes = await nailItAPI.getPaymentTypesByDevice(request);
      console.log(`✅ Found ${paymentTypes.length} payment types`);
      return paymentTypes;
    } catch (error) {
      console.error('❌ Failed to get payment types:', error);
      return [];
    }
  }
  
  /**
   * Step 9: Create final booking
   */
  static async createBooking(session: BookingSession): Promise<NailItSaveOrderResponse | null> {
    try {
      console.log('📝 Step 9: Creating final booking');
      
      if (!session.appUserId || !session.customerInfo) {
        console.error('❌ Missing customer information');
        return null;
      }
      
      if (!session.selectedLocation) {
        console.error('❌ Missing location selection');
        return null;
      }
      
      if (!session.selectedDate) {
        console.error('❌ Missing date selection');
        return null;
      }
      
      if (session.selectedServices.length === 0) {
        console.error('❌ No services selected');
        return null;
      }
      
      // Calculate total amount
      const totalAmount = session.selectedServices.reduce((sum, service) => sum + service.price, 0);
      
      // Build order items array
      const orderItems = session.selectedServices.map(service => ({
        Service_Item_Id: service.serviceId,
        Staff_Id: service.staffId || 1,
        Date: session.selectedDate!,
        Start_Time: service.startTime || '14:00',
        Duration: service.duration
      }));
      
      // Create order using V2 format
      const orderRequest = {
        App_User_Id: session.appUserId.toString(),
        Location_Id: session.selectedLocation.locationId,
        Order_Items: orderItems,
        Payment_Type_Id: session.paymentType?.typeId || 2, // Default to KNET
        Notes: `WhatsApp booking for ${session.customerInfo.name}`
      };
      
      const result = await nailItAPI.saveOrderV2(orderRequest);
      
      if (result) {
        console.log('✅ Booking created successfully! Order ID:', result.OrderId);
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to create booking:', error);
      return null;
    }
  }
  
  /**
   * Helper: Format services for display
   */
  static formatServicesForDisplay(services: NailItItem[], maxCount: number = 5): string {
    const displayServices = services.slice(0, maxCount);
    
    return displayServices.map(service => 
      `• ${service.Item_Name} - ${service.Special_Price} KWD (${service.Duration} min)`
    ).join('\n');
  }
  
  /**
   * Helper: Format staff for display
   */
  static formatStaffForDisplay(staff: NailItStaff[]): string {
    return staff.map((s, index) => 
      `${index + 1}. ${s.Name}`
    ).join('\n');
  }
  
  /**
   * Helper: Format time slots for display
   */
  static formatTimeSlotsForDisplay(slots: NailItTimeSlot[], maxCount: number = 6): string {
    const displaySlots = slots.slice(0, maxCount);
    
    return displaySlots.map(slot => 
      `• ${slot.TimeFrame_Name}`
    ).join(', ');
  }
  
  /**
   * Helper: Generate booking summary
   */
  static generateBookingSummary(session: BookingSession): string {
    const services = session.selectedServices.map(s => 
      `- ${s.serviceName} with ${s.staffName || 'available staff'} at ${s.startTime || 'selected time'}`
    ).join('\n');
    
    return `
📋 Booking Summary:
${services}
📍 Location: ${session.selectedLocation?.locationName}
📅 Date: ${session.selectedDate}
💰 Total: ${session.selectedServices.reduce((sum, s) => sum + s.price, 0)} KWD
💳 Payment: ${session.paymentType?.typeName || 'KNET'}
    `.trim();
  }
  
  /**
   * Helper: Generate payment link
   */
  static generatePaymentLink(orderId: number): string {
    return `http://nailit.innovasolution.net/knet.aspx?orderId=${orderId}`;
  }
}