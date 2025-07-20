// Unified Multi-Service Booking System with Back-to-Back Scheduling
import { NailItAPI } from './nailit-api.js';

export interface ServiceSelection {
  serviceId: number;
  serviceName: string;
  price: number;
  duration: number;
  locationId: number;
}

export interface OptimizedBooking {
  serviceId: number;
  serviceName: string;
  staffId: number;
  staffName: string;
  timeSlots: number[];
  appointmentDate: string;
  price: number;
  duration: number;
  startTime: string;
  endTime: string;
}

export interface UnifiedBookingResult {
  orderId: number;
  customerId: number;
  totalAmount: number;
  paymentLink: string;
  services: OptimizedBooking[];
  bookingSchedule: {
    totalDuration: number;
    startTime: string;
    endTime: string;
    continuousBlock: boolean;
  };
}

export class UnifiedBookingService {
  private nailItAPI: NailItAPI;

  constructor(nailItAPI: NailItAPI) {
    this.nailItAPI = nailItAPI;
  }

  // Optimize services for back-to-back scheduling
  async optimizeScheduling(
    services: ServiceSelection[],
    locationId: number,
    appointmentDate: string,
    preferredStartTime: number = 10 // 10:00 AM default
  ): Promise<OptimizedBooking[]> {
    console.log('🎯 Optimizing multi-service scheduling for back-to-back appointments...');
    
    const optimizedBookings: OptimizedBooking[] = [];
    let currentTimeSlot = preferredStartTime;
    
    for (const service of services) {
      console.log(`\n📋 Processing service: ${service.serviceName} (${service.duration} minutes)`);
      
      // Get available staff for this service
      const availableStaff = await this.nailItAPI.getServiceStaff(
        service.serviceId,
        locationId,
        'E',
        appointmentDate
      );
      
      if (!availableStaff || availableStaff.length === 0) {
        console.error(`❌ No staff available for ${service.serviceName}`);
        continue;
      }
      
      // Select staff (prefer staff already assigned to minimize transitions)
      const existingStaffIds = optimizedBookings.map(b => b.staffId);
      let selectedStaff = availableStaff.find(staff => existingStaffIds.includes(staff.Staff_Id));
      
      if (!selectedStaff) {
        selectedStaff = availableStaff[0]; // Use first available staff
      }
      
      // Calculate time slots needed (30-minute increments)
      const slotsNeeded = Math.ceil(service.duration / 30);
      const timeSlots: number[] = [];
      
      for (let i = 0; i < slotsNeeded; i++) {
        timeSlots.push(currentTimeSlot + i);
      }
      
      // Convert time slots to readable times
      const startTime = this.timeSlotToTime(currentTimeSlot);
      const endTime = this.timeSlotToTime(currentTimeSlot + slotsNeeded);
      
      const optimizedBooking: OptimizedBooking = {
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        staffId: selectedStaff.Staff_Id,
        staffName: selectedStaff.Staff_Name,
        timeSlots: timeSlots,
        appointmentDate: appointmentDate,
        price: service.price,
        duration: service.duration,
        startTime: startTime,
        endTime: endTime
      };
      
      optimizedBookings.push(optimizedBooking);
      
      console.log(`✅ Scheduled ${service.serviceName}: ${startTime}-${endTime} with ${selectedStaff.Staff_Name}`);
      
      // Move to next time slot (no gaps for continuous booking)
      currentTimeSlot += slotsNeeded;
    }
    
    return optimizedBookings;
  }

  // Create unified order with multiple services
  async createUnifiedOrder(
    customer: {
      appUserId: number;
      name: string;
      phone: string;
      email: string;
    },
    optimizedBookings: OptimizedBooking[],
    locationId: number,
    paymentTypeId: number = 2 // KNet default
  ): Promise<UnifiedBookingResult | null> {
    try {
      console.log('\n🚀 Creating unified order for multi-service booking...');
      
      // Calculate total amount
      const totalAmount = optimizedBookings.reduce((sum, booking) => sum + booking.price, 0);
      
      // Prepare unified order data
      const unifiedOrderData = {
        customer: customer,
        services: optimizedBookings.map(booking => ({
          serviceId: booking.serviceId,
          serviceName: booking.serviceName,
          staffId: booking.staffId,
          timeSlots: booking.timeSlots,
          appointmentDate: this.formatDateForNailIt(booking.appointmentDate),
          price: booking.price,
          duration: booking.duration
        })),
        locationId: locationId,
        paymentTypeId: paymentTypeId,
        totalAmount: totalAmount
      };
      
      console.log(`💰 Total order amount: ${totalAmount} KWD for ${optimizedBookings.length} services`);
      
      // Create unified order using NailIt API
      const orderResponse = await this.nailItAPI.saveUnifiedOrder(unifiedOrderData);
      
      if (!orderResponse || orderResponse.Status !== 0) {
        console.error('❌ Failed to create unified order:', orderResponse);
        return null;
      }
      
      // Calculate booking schedule summary
      const firstBooking = optimizedBookings[0];
      const lastBooking = optimizedBookings[optimizedBookings.length - 1];
      const totalDuration = optimizedBookings.reduce((sum, booking) => sum + booking.duration, 0);
      
      const bookingSchedule = {
        totalDuration: totalDuration,
        startTime: firstBooking.startTime,
        endTime: lastBooking.endTime,
        continuousBlock: true // Our optimization ensures continuous scheduling
      };
      
      // Generate consolidated payment link
      const paymentLink = `http://nailit.innovasolution.net/knet.aspx?orderId=${orderResponse.OrderId}`;
      
      const result: UnifiedBookingResult = {
        orderId: orderResponse.OrderId,
        customerId: orderResponse.CustomerId,
        totalAmount: totalAmount,
        paymentLink: paymentLink,
        services: optimizedBookings,
        bookingSchedule: bookingSchedule
      };
      
      console.log('✅ Unified order created successfully!');
      console.log(`📋 Order ID: ${result.orderId}`);
      console.log(`💳 Payment Link: ${result.paymentLink}`);
      console.log(`⏰ Schedule: ${bookingSchedule.startTime} - ${bookingSchedule.endTime} (${totalDuration} min)`);
      
      return result;
      
    } catch (error: any) {
      console.error('❌ Error creating unified order:', error);
      return null;
    }
  }

  // Helper: Convert time slot number to readable time
  private timeSlotToTime(slot: number): string {
    const baseHour = 10; // 10:00 AM is slot 1
    const totalMinutes = (slot - 1) * 30;
    const hours = Math.floor(totalMinutes / 60) + baseHour;
    const minutes = totalMinutes % 60;
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours;
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  // Helper: Format date for NailIt API (dd/MM/yyyy)
  private formatDateForNailIt(dateString: string): string {
    // Convert DD-MM-YYYY to dd/MM/yyyy format for SaveOrder API
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
    return dateString;
  }

  // Main method: Complete unified booking flow
  async processUnifiedBooking(
    customer: {
      appUserId: number;
      name: string;
      phone: string;
      email: string;
    },
    services: ServiceSelection[],
    locationId: number,
    appointmentDate: string,
    preferredStartTime: number = 10,
    paymentTypeId: number = 2
  ): Promise<UnifiedBookingResult | null> {
    try {
      console.log('\n🎯 Starting unified multi-service booking process...');
      console.log(`👤 Customer: ${customer.name}`);
      console.log(`📅 Date: ${appointmentDate}`);
      console.log(`📍 Location: ${locationId}`);
      console.log(`🛍️ Services: ${services.length} selected`);
      
      // Step 1: Optimize scheduling for back-to-back services
      const optimizedBookings = await this.optimizeScheduling(
        services,
        locationId,
        appointmentDate,
        preferredStartTime
      );
      
      if (optimizedBookings.length === 0) {
        console.error('❌ No services could be scheduled');
        return null;
      }
      
      // Step 2: Create unified order
      const unifiedResult = await this.createUnifiedOrder(
        customer,
        optimizedBookings,
        locationId,
        paymentTypeId
      );
      
      if (!unifiedResult) {
        console.error('❌ Failed to create unified order');
        return null;
      }
      
      console.log('\n🎉 Unified booking completed successfully!');
      return unifiedResult;
      
    } catch (error: any) {
      console.error('❌ Unified booking process failed:', error);
      return null;
    }
  }
}