import { nailItAPI } from './nailit-api';
import type { NailItStaff, NailItTimeSlot } from './nailit-api';
import type { ServiceBooking, StaffAvailability, TimeSlotBooking, EnhancedConversationState } from './ai-enhanced';

export interface AppointmentConflict {
  type: 'time_overlap' | 'staff_unavailable' | 'location_closed' | 'service_duration_exceeded';
  message: string;
  suggestedAlternative?: {
    date?: string;
    time?: string;
    staffId?: number;
    staffName?: string;
  };
}

export interface SchedulingValidation {
  isValid: boolean;
  conflicts: AppointmentConflict[];
  recommendations: {
    alternativeTimes: string[];
    alternativeStaff: string[];
    alternativeDates: string[];
  };
  totalDurationMinutes: number;
  requiredTimeSlots: number;
}

export class AdvancedSchedulingEngine {
  
  /**
   * Phase 2: Advanced Scheduling Logic
   * Handles multiple services, staff conflicts, and time slot optimization
   */
  
  async validateComplexBooking(
    services: ServiceBooking[],
    locationId: number,
    preferredDate: string,
    preferredTime?: string,
    preferredStaffId?: number
  ): Promise<SchedulingValidation> {
    
    try {
      console.log(`🔍 Validating complex booking for ${services.length} services`);
      
      const totalDuration = services.reduce((sum, service) => sum + service.duration, 0);
      const requiredSlots = Math.ceil(totalDuration / 30); // Assuming 30-min slots
      
      console.log(`⏱️ Total duration: ${totalDuration} minutes (${requiredSlots} slots needed)`);
      
      const validation: SchedulingValidation = {
        isValid: true,
        conflicts: [],
        recommendations: {
          alternativeTimes: [],
          alternativeStaff: [],
          alternativeDates: []
        },
        totalDurationMinutes: totalDuration,
        requiredTimeSlots: requiredSlots
      };

      // 1. Check business hours and location availability
      const businessHoursCheck = await this.validateBusinessHours(locationId, preferredDate, preferredTime, totalDuration);
      if (!businessHoursCheck.isValid) {
        validation.isValid = false;
        validation.conflicts.push(...businessHoursCheck.conflicts);
      }

      // 2. Check staff availability for all services
      const staffCheck = await this.validateStaffAvailability(services, locationId, preferredDate, preferredTime, preferredStaffId);
      if (!staffCheck.isValid) {
        validation.isValid = false;
        validation.conflicts.push(...staffCheck.conflicts);
        validation.recommendations.alternativeStaff = staffCheck.alternativeStaff;
      }

      // 3. Check time slot availability
      const timeSlotCheck = await this.validateTimeSlotAvailability(services, locationId, preferredDate, preferredTime, requiredSlots);
      if (!timeSlotCheck.isValid) {
        validation.isValid = false;
        validation.conflicts.push(...timeSlotCheck.conflicts);
        validation.recommendations.alternativeTimes = timeSlotCheck.alternativeTimes;
      }

      // 4. Generate alternative recommendations if booking is invalid
      if (!validation.isValid) {
        const alternatives = await this.generateAlternativeBookings(services, locationId, preferredDate);
        validation.recommendations = { ...validation.recommendations, ...alternatives };
      }

      console.log(`✅ Booking validation completed. Valid: ${validation.isValid}`);
      return validation;

    } catch (error) {
      console.error('Scheduling validation error:', error);
      return {
        isValid: false,
        conflicts: [{
          type: 'time_overlap',
          message: 'Unable to validate booking due to system error'
        }],
        recommendations: {
          alternativeTimes: [],
          alternativeStaff: [],
          alternativeDates: []
        },
        totalDurationMinutes: 0,
        requiredTimeSlots: 0
      };
    }
  }

  private async validateBusinessHours(
    locationId: number, 
    date: string, 
    preferredTime: string = '10:00 AM', 
    totalDuration: number
  ): Promise<{ isValid: boolean; conflicts: AppointmentConflict[] }> {
    
    try {
      const locations = await nailItAPI.getLocations();
      const location = locations.find(loc => loc.Location_Id === locationId);
      
      if (!location) {
        return {
          isValid: false,
          conflicts: [{
            type: 'location_closed',
            message: 'Location not found'
          }]
        };
      }

      const conflicts: AppointmentConflict[] = [];

      // Parse business hours
      const openTime = this.parseTime(location.From_Time || '09:00');
      const closeTime = this.parseTime(location.To_Time || '21:00');
      const requestedTime = this.parseTime(preferredTime);
      const endTime = requestedTime + totalDuration;

      // Check if appointment starts before opening
      if (requestedTime < openTime) {
        conflicts.push({
          type: 'location_closed',
          message: `Location opens at ${location.From_Time}. Requested time ${preferredTime} is too early.`,
          suggestedAlternative: {
            time: location.From_Time
          }
        });
      }

      // Check if appointment ends after closing
      if (endTime > closeTime) {
        const latestStartTime = closeTime - totalDuration;
        const latestTimeString = this.minutesToTimeString(latestStartTime);
        
        conflicts.push({
          type: 'service_duration_exceeded',
          message: `Services would end after closing time (${location.To_Time}). Latest start time: ${latestTimeString}`,
          suggestedAlternative: {
            time: latestTimeString
          }
        });
      }

      return {
        isValid: conflicts.length === 0,
        conflicts
      };

    } catch (error) {
      console.error('Business hours validation error:', error);
      return {
        isValid: false,
        conflicts: [{
          type: 'location_closed',
          message: 'Unable to validate business hours'
        }]
      };
    }
  }

  private async validateStaffAvailability(
    services: ServiceBooking[],
    locationId: number,
    date: string,
    preferredTime: string = '10:00 AM',
    preferredStaffId?: number
  ): Promise<{ isValid: boolean; conflicts: AppointmentConflict[]; alternativeStaff: string[] }> {
    
    try {
      const conflicts: AppointmentConflict[] = [];
      const alternativeStaff: string[] = [];

      for (const service of services) {
        console.log(`👥 Checking staff availability for service: ${service.itemName}`);
        
        const availableStaff = await nailItAPI.getServiceStaff(
          service.itemId,
          locationId,
          'E',
          date
        );

        if (!availableStaff || availableStaff.length === 0) {
          conflicts.push({
            type: 'staff_unavailable',
            message: `No staff available for ${service.itemName} on ${date}`,
            suggestedAlternative: {
              date: this.getNextAvailableDate(date)
            }
          });
          continue;
        }

        // If specific staff is preferred, check their availability
        if (preferredStaffId) {
          const preferredStaff = availableStaff.find(staff => staff.Id === preferredStaffId);
          
          if (!preferredStaff) {
            // Preferred staff not available for this service
            conflicts.push({
              type: 'staff_unavailable',
              message: `Preferred staff member is not available for ${service.itemName}`,
              suggestedAlternative: {
                staffId: availableStaff[0].Id,
                staffName: availableStaff[0].Name
              }
            });
          } else {
            // Check if preferred staff has time conflicts
            const hasConflict = await this.checkStaffTimeConflict(
              preferredStaff.Id,
              date,
              preferredTime,
              service.duration
            );

            if (hasConflict) {
              const nextAvailableTime = await this.getNextAvailableTimeForStaff(
                preferredStaff.Id,
                date,
                service.duration
              );

              conflicts.push({
                type: 'time_overlap',
                message: `${preferredStaff.Name} is not available at ${preferredTime}`,
                suggestedAlternative: {
                  time: nextAvailableTime,
                  staffId: preferredStaff.Id,
                  staffName: preferredStaff.Name
                }
              });
            }
          }
        }

        // Add alternative staff suggestions
        availableStaff.slice(0, 3).forEach(staff => {
          alternativeStaff.push(`${staff.Name} (Available)`);
        });
      }

      return {
        isValid: conflicts.length === 0,
        conflicts,
        alternativeStaff: [...new Set(alternativeStaff)] // Remove duplicates
      };

    } catch (error) {
      console.error('Staff availability validation error:', error);
      return {
        isValid: false,
        conflicts: [{
          type: 'staff_unavailable',
          message: 'Unable to validate staff availability'
        }],
        alternativeStaff: []
      };
    }
  }

  private async validateTimeSlotAvailability(
    services: ServiceBooking[],
    locationId: number,
    date: string,
    preferredTime: string = '10:00 AM',
    requiredSlots: number
  ): Promise<{ isValid: boolean; conflicts: AppointmentConflict[]; alternativeTimes: string[] }> {
    
    try {
      console.log(`🕐 Checking time slot availability for ${requiredSlots} slots`);
      
      // Get available time slots for the first service (as a reference)
      const timeSlots = await nailItAPI.getAvailableSlots(
        locationId,
        services[0].itemId,
        date,
        'E'
      );

      if (!timeSlots || timeSlots.length === 0) {
        return {
          isValid: false,
          conflicts: [{
            type: 'time_overlap',
            message: `No time slots available on ${date}`,
            suggestedAlternative: {
              date: this.getNextAvailableDate(date)
            }
          }],
          alternativeTimes: []
        };
      }

      const conflicts: AppointmentConflict[] = [];
      const alternativeTimes: string[] = [];

      // Find requested time slot
      const requestedSlot = timeSlots.find(slot => 
        slot.TimeFrame_Name.toLowerCase().includes(preferredTime.toLowerCase())
      );

      if (!requestedSlot) {
        conflicts.push({
          type: 'time_overlap',
          message: `Requested time ${preferredTime} is not available`,
          suggestedAlternative: {
            time: timeSlots[0].TimeFrame_Name
          }
        });
      } else {
        // Check if enough consecutive slots are available
        const slotIndex = timeSlots.findIndex(slot => slot.TimeFrame_Id === requestedSlot.TimeFrame_Id);
        const consecutiveSlotsAvailable = this.checkConsecutiveSlots(timeSlots, slotIndex, requiredSlots);

        if (!consecutiveSlotsAvailable) {
          conflicts.push({
            type: 'service_duration_exceeded',
            message: `Not enough consecutive time slots available for ${services.length} services (${requiredSlots} slots needed)`,
            suggestedAlternative: {
              time: this.findBestAlternativeTime(timeSlots, requiredSlots)
            }
          });
        }
      }

      // Generate alternative time suggestions
      const bestAlternatives = this.generateTimeAlternatives(timeSlots, requiredSlots);
      alternativeTimes.push(...bestAlternatives);

      return {
        isValid: conflicts.length === 0,
        conflicts,
        alternativeTimes
      };

    } catch (error) {
      console.error('Time slot validation error:', error);
      return {
        isValid: false,
        conflicts: [{
          type: 'time_overlap',
          message: 'Unable to validate time slot availability'
        }],
        alternativeTimes: []
      };
    }
  }

  private async generateAlternativeBookings(
    services: ServiceBooking[],
    locationId: number,
    originalDate: string
  ): Promise<{ alternativeTimes: string[]; alternativeStaff: string[]; alternativeDates: string[] }> {
    
    const alternatives = {
      alternativeTimes: [],
      alternativeStaff: [],
      alternativeDates: []
    };

    try {
      // Generate alternative dates (next 7 days)
      for (let i = 1; i <= 7; i++) {
        const alternativeDate = this.addDaysToDate(originalDate, i);
        const dayName = this.getDayName(alternativeDate);
        alternatives.alternativeDates.push(`${dayName} (${alternativeDate})`);
      }

      // Generate alternative times (check multiple time slots)
      const timeSlots = await nailItAPI.getAvailableSlots(locationId, services[0].itemId, originalDate, 'E');
      if (timeSlots && timeSlots.length > 0) {
        timeSlots.slice(0, 5).forEach(slot => {
          alternatives.alternativeTimes.push(slot.TimeFrame_Name);
        });
      }

    } catch (error) {
      console.error('Error generating alternatives:', error);
    }

    return alternatives;
  }

  /**
   * Helper Methods
   */

  private parseTime(timeString: string): number {
    // Convert time string (e.g., "10:30 AM") to minutes since midnight
    const match = timeString.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
    if (!match) return 600; // Default to 10:00 AM
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2] || '0');
    const period = match[3]?.toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  }

  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  }

  private getNextAvailableDate(currentDate: string): string {
    const date = new Date(currentDate.split('-').reverse().join('-'));
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString('en-GB').replace(/\//g, '-');
  }

  private addDaysToDate(dateString: string, days: number): string {
    const date = new Date(dateString.split('-').reverse().join('-'));
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('en-GB').replace(/\//g, '-');
  }

  private getDayName(dateString: string): string {
    const date = new Date(dateString.split('-').reverse().join('-'));
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  private checkConsecutiveSlots(slots: NailItTimeSlot[], startIndex: number, requiredSlots: number): boolean {
    if (startIndex + requiredSlots > slots.length) return false;
    
    for (let i = 0; i < requiredSlots; i++) {
      if (!slots[startIndex + i]) return false;
      // Add additional availability checks here if needed
    }
    
    return true;
  }

  private findBestAlternativeTime(slots: NailItTimeSlot[], requiredSlots: number): string {
    for (let i = 0; i <= slots.length - requiredSlots; i++) {
      if (this.checkConsecutiveSlots(slots, i, requiredSlots)) {
        return slots[i].TimeFrame_Name;
      }
    }
    return slots[0]?.TimeFrame_Name || '10:00 AM';
  }

  private generateTimeAlternatives(slots: NailItTimeSlot[], requiredSlots: number): string[] {
    const alternatives = [];
    
    for (let i = 0; i <= slots.length - requiredSlots; i++) {
      if (this.checkConsecutiveSlots(slots, i, requiredSlots)) {
        alternatives.push(slots[i].TimeFrame_Name);
      }
    }
    
    return alternatives.slice(0, 3); // Return top 3 alternatives
  }

  private async checkStaffTimeConflict(
    staffId: number,
    date: string,
    time: string,
    duration: number
  ): Promise<boolean> {
    // This would check against existing bookings in the NailIt system
    // For now, return false (no conflict) as we don't have access to existing bookings API
    return false;
  }

  private async getNextAvailableTimeForStaff(
    staffId: number,
    date: string,
    serviceDuration: number
  ): Promise<string> {
    // This would find the next available time slot for the specific staff member
    // For now, return a default next available time
    return '11:00 AM';
  }
}

export const schedulingEngine = new AdvancedSchedulingEngine();