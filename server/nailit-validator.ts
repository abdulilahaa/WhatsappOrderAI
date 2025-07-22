import { nailItAPI } from './nailit-api';
import type { NailItLocation, NailItTimeSlot } from './nailit-api';

export interface ValidationResult {
  isValid: boolean;
  message: string;
  suggestions?: string[];
}

export interface BusinessHours {
  from: string;
  to: string;
  isOpen: boolean;
  openingTime: number; // in minutes from midnight
  closingTime: number; // in minutes from midnight
}

export class NailItValidator {
  
  /**
   * Parse business hours from NailIt location data
   */
  private parseBusinessHours(location: NailItLocation): BusinessHours {
    // Use only authentic NailIt API data - no hardcoded fallbacks
    const fromTime = location.From_Time;
    const toTime = location.To_Time;
    
    const openingTime = this.timeToMinutes(fromTime);
    const closingTime = this.timeToMinutes(toTime);
    
    return {
      from: fromTime,
      to: toTime,
      isOpen: true,
      openingTime,
      closingTime
    };
  }
  
  /**
   * Convert time string to minutes from midnight
   */
  private timeToMinutes(timeStr: string): number {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  }
  
  /**
   * Validate if requested time is within business hours
   */
  async validateTimeSlot(
    locationId: number, 
    requestedTime: string, 
    date: string
  ): Promise<ValidationResult> {
    try {
      // Get location details
      const locations = await nailItAPI.getLocations();
      const location = locations.find(loc => loc.Location_Id === locationId);
      
      if (!location) {
        return {
          isValid: false,
          message: 'Location not found'
        };
      }
      
      const businessHours = this.parseBusinessHours(location);
      const requestedMinutes = this.timeToMinutes(requestedTime);
      
      // Check if requested time is within business hours
      if (requestedMinutes < businessHours.openingTime || requestedMinutes > businessHours.closingTime) {
        const suggestions = [
          `Business hours: ${businessHours.from} - ${businessHours.to}`,
          `Suggested times: ${businessHours.from}, ${this.addHours(businessHours.from, 2)}, ${this.addHours(businessHours.from, 4)}`
        ];
        
        return {
          isValid: false,
          message: `Sorry, we're closed at ${requestedTime}. Our business hours are ${businessHours.from} - ${businessHours.to}`,
          suggestions
        };
      }
      
      // Check actual time slot availability through NailIt API
      const availableSlots = await nailItAPI.getAvailableSlots(locationId.toString(), date, 'E');
      
      if (!availableSlots || availableSlots.length === 0) {
        return {
          isValid: false,
          message: `No time slots available on ${date}. Please choose another date.`
        };
      }
      
      // Check if requested time matches any available slot
      const matchingSlot = availableSlots.find(slot => 
        slot.TimeFrame_Name.toLowerCase().includes(requestedTime.toLowerCase()) ||
        this.normalizeTime(slot.TimeFrame_Name) === this.normalizeTime(requestedTime)
      );
      
      if (!matchingSlot) {
        const availableTimes = availableSlots.slice(0, 5).map(slot => slot.TimeFrame_Name);
        
        return {
          isValid: false,
          message: `${requestedTime} is not available. Available times: ${availableTimes.join(', ')}`,
          suggestions: availableTimes
        };
      }
      
      return {
        isValid: true,
        message: `Time slot ${requestedTime} is available`
      };
      
    } catch (error) {
      console.error('Time validation error:', error);
      return {
        isValid: false,
        message: 'Unable to validate time slot. Please try again.'
      };
    }
  }
  
  /**
   * Validate complete booking data before creating order
   */
  async validateBookingData(bookingData: any): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // Check required fields
    if (!bookingData.selectedServices || bookingData.selectedServices.length === 0) {
      errors.push('No services selected');
    }
    
    if (!bookingData.locationId) {
      errors.push('No location selected');
    }
    
    if (!bookingData.appointmentDate) {
      errors.push('No appointment date selected');
    }
    
    if (!bookingData.customerName) {
      errors.push('Customer name is required');
    }
    
    if (!bookingData.customerEmail) {
      errors.push('Customer email is required');
    }
    
    // Validate appointment date is not in the past
    if (bookingData.appointmentDate) {
      const appointmentDate = new Date(bookingData.appointmentDate.split('-').reverse().join('-'));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        errors.push('Appointment date cannot be in the past');
      }
    }
    
    // Validate location exists
    if (bookingData.locationId) {
      const locations = await nailItAPI.getLocations();
      const location = locations.find(loc => loc.Location_Id === bookingData.locationId);
      
      if (!location) {
        errors.push('Selected location is not valid');
      }
    }
    
    // Validate services exist
    if (bookingData.selectedServices && bookingData.selectedServices.length > 0) {
      for (const service of bookingData.selectedServices) {
        if (!service.itemId || !service.itemName || !service.price) {
          errors.push('Invalid service data');
          break;
        }
      }
    }
    
    if (errors.length > 0) {
      return {
        isValid: false,
        message: `Booking validation failed: ${errors.join(', ')}`
      };
    }
    
    return {
      isValid: true,
      message: 'Booking data is valid'
    };
  }
  
  /**
   * Add hours to a time string
   */
  private addHours(timeStr: string, hours: number): string {
    const minutes = this.timeToMinutes(timeStr);
    const newMinutes = minutes + (hours * 60);
    return this.minutesToTime(newMinutes);
  }
  
  /**
   * Convert minutes to time string
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  }
  
  /**
   * Normalize time format for comparison
   */
  private normalizeTime(timeStr: string): string {
    return timeStr.replace(/\s+/g, '').toLowerCase();
  }
}

export const nailItValidator = new NailItValidator();