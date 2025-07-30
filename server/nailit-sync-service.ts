/**
 * CRITICAL: Database-First NailIt API Sync Service
 * Implementation per Final Sprint Document Requirements
 * 
 * Goals:
 * - DB MUST be the primary source for products/services, locations, staff, time slots
 * - Nightly (or on-demand) API sync updates DB with all location/services/staff/slots
 * - AI agent uses DB ONLY, not live API, except for final booking
 * - Direct API calls ONLY for placing booking, cancellation, or urgent slot checking
 */

import { nailItAPI } from './nailit-api';
import { db } from './db';
import { nailItLocations, nailItServices, nailItStaff, nailItSlots } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export class NailItSyncService {
  constructor() {
    // Use the existing nailItAPI instance
  }

  /**
   * CRITICAL SYNC METHOD: Sync ALL NailIt data into local DB
   * Called nightly or on-demand via endpoint
   */
  async syncAllNailItData(): Promise<{ success: boolean; errors: string[]; synced: any }> {
    const errors: string[] = [];
    const synced = {
      locations: 0,
      services: 0,
      staff: 0,
      slots: 0
    };

    try {
      console.log('🔄 STARTING COMPREHENSIVE NAILIT DATA SYNC...');

      // 1. Sync Locations (/GetLocations → locations table)
      try {
        const locationsResult = await this.syncLocations();
        synced.locations = locationsResult.count;
        console.log(`✅ Synced ${locationsResult.count} locations`);
      } catch (error) {
        const errorMsg = `❌ Location sync failed: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }

      // 2. Sync Services per location (/GetLocationServices → nailit_services)
      try {
        const servicesResult = await this.syncAllLocationServices();
        synced.services = servicesResult.totalServices;
        console.log(`✅ Synced ${servicesResult.totalServices} services across all locations`);
      } catch (error) {
        const errorMsg = `❌ Services sync failed: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }

      // 3. Sync Staff per location (/GetLocationStaff → nailit_staff)
      try {
        const staffResult = await this.syncAllLocationStaff();
        synced.staff = staffResult.totalStaff;
        console.log(`✅ Synced ${staffResult.totalStaff} staff across all locations`);
      } catch (error) {
        const errorMsg = `❌ Staff sync failed: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }

      // 4. Sync Time Slots for next 7 days (/GetItemsByDate → nailit_slots)
      try {
        const slotsResult = await this.syncTimeSlots();
        synced.slots = slotsResult.totalSlots;
        console.log(`✅ Synced ${slotsResult.totalSlots} time slots for next 7 days`);
      } catch (error) {
        const errorMsg = `❌ Time slots sync failed: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }

      const success = errors.length === 0;
      console.log(success ? 
        '🎉 COMPREHENSIVE NAILIT SYNC COMPLETED SUCCESSFULLY' : 
        `⚠️  SYNC COMPLETED WITH ${errors.length} ERRORS`
      );

      return { success, errors, synced };

    } catch (error) {
      const errorMsg = `💥 CRITICAL SYNC FAILURE: ${error}`;
      console.error(errorMsg);
      return { 
        success: false, 
        errors: [errorMsg], 
        synced: { locations: 0, services: 0, staff: 0, slots: 0 }
      };
    }
  }

  /**
   * Sync all NailIt locations to local database
   */
  private async syncLocations(): Promise<{ count: number; locations: any[] }> {
    console.log('📍 Syncing NailIt locations...');
    
    const locations = await nailItAPI.getLocations();
    const syncedLocations = [];

    for (const location of locations) {
      try {
        // Check if location exists
        const existing = await db.select()
          .from(nailItLocations)
          .where(eq(nailItLocations.locationId, location.Location_Id))
          .limit(1);

        const locationData = {
          locationId: location.Location_Id,
          locationName: location.Location_Name,
          address: location.Address,
          phoneNumber: location.Phone,
          workingHours: {
            fromTime: location.From_Time,
            toTime: location.To_Time,
            workingDays: location.Working_Days
          },
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Valid for 24 hours
          isActive: true
        };

        if (existing.length > 0) {
          // Update existing location
          await db.update(nailItLocations)
            .set({ 
              ...locationData,
              lastSynced: new Date()
            })
            .where(eq(nailItLocations.locationId, location.Location_Id));
        } else {
          // Insert new location
          await db.insert(nailItLocations).values(locationData);
        }

        syncedLocations.push(location);
        console.log(`✅ Location synced: ${location.Location_Name} (ID: ${location.Location_Id})`);

      } catch (error) {
        console.error(`❌ Failed to sync location ${location.Location_Id}:`, error);
      }
    }

    return { count: syncedLocations.length, locations: syncedLocations };
  }

  /**
   * Sync services for all locations
   */
  private async syncAllLocationServices(): Promise<{ totalServices: number; locationBreakdown: any[] }> {
    console.log('🛠️  Syncing services for all locations...');
    
    // Get all locations from database
    const locations = await db.select().from(nailItLocations);
    let totalServices = 0;
    const locationBreakdown = [];

    for (const location of locations) {
      try {
        console.log(`📋 Syncing services for ${location.locationName} (ID: ${location.locationId})`);
        
        // Get services for this location from NailIt API
        const services = await this.nailItAPI.getLocationServices(location.locationId);
        let locationServices = 0;

        for (const service of services) {
          try {
            // Check if service exists for this location
            const existing = await db.select()
              .from(nailItServices)
              .where(and(
                eq(nailItServices.serviceId, service.Item_Id),
                eq(nailItServices.locationId, location.locationId)
              ))
              .limit(1);

            const serviceData = {
              serviceId: service.Item_Id,
              locationId: location.locationId,
              serviceName: service.Item_Name,
              description: service.Item_Desc || '',
              price: service.Item_Price?.toString() || '0',
              duration: service.Duration_Minutes || 60,
              category: this.categorizeService(service.Item_Name),
              itemTypeId: service.Item_Type_Id,
              groupId: service.Group_Id,
              validUntil: new Date(Date.now() + 12 * 60 * 60 * 1000), // Valid for 12 hours
              isActive: true
            };

            if (existing.length > 0) {
              // Update existing service
              await db.update(nailItServices)
                .set({ 
                  ...serviceData,
                  lastSynced: new Date()
                })
                .where(and(
                  eq(nailItServices.serviceId, service.Item_Id),
                  eq(nailItServices.locationId, location.locationId)
                ));
            } else {
              // Insert new service
              await db.insert(nailItServices).values(serviceData);
            }

            locationServices++;
            totalServices++;

          } catch (error) {
            console.error(`❌ Failed to sync service ${service.Item_Id} for location ${location.locationId}:`, error);
          }
        }

        locationBreakdown.push({
          locationId: location.locationId,
          locationName: location.locationName,
          servicesCount: locationServices
        });

        console.log(`✅ ${locationServices} services synced for ${location.locationName}`);

      } catch (error) {
        console.error(`❌ Failed to sync services for location ${location.locationId}:`, error);
      }
    }

    return { totalServices, locationBreakdown };
  }

  /**
   * Sync staff for all locations
   */
  private async syncAllLocationStaff(): Promise<{ totalStaff: number; locationBreakdown: any[] }> {
    console.log('👥 Syncing staff for all locations...');
    
    const locations = await db.select().from(nailItLocations);
    let totalStaff = 0;
    const locationBreakdown = [];

    for (const location of locations) {
      try {
        console.log(`👤 Syncing staff for ${location.locationName} (ID: ${location.locationId})`);
        
        // Get staff for this location from NailIt API
        const staff = await this.nailItAPI.getLocationStaff(location.locationId);
        let locationStaff = 0;

        for (const staffMember of staff) {
          try {
            // Check if staff exists for this location
            const existing = await db.select()
              .from(nailItStaff)
              .where(and(
                eq(nailItStaff.staffId, staffMember.Staff_Id),
                eq(nailItStaff.locationId, location.locationId)
              ))
              .limit(1);

            const staffData = {
              staffId: staffMember.Staff_Id,
              locationId: location.locationId,
              staffName: staffMember.Staff_Name,
              specializations: staffMember.Staff_Groups || [],
              workingHours: staffMember.Working_Hours || {},
              validUntil: new Date(Date.now() + 6 * 60 * 60 * 1000), // Valid for 6 hours
              isActive: true
            };

            if (existing.length > 0) {
              // Update existing staff
              await db.update(nailItStaff)
                .set({ 
                  ...staffData,
                  lastSynced: new Date()
                })
                .where(and(
                  eq(nailItStaff.staffId, staffMember.Staff_Id),
                  eq(nailItStaff.locationId, location.locationId)
                ));
            } else {
              // Insert new staff
              await db.insert(nailItStaff).values(staffData);
            }

            locationStaff++;
            totalStaff++;

          } catch (error) {
            console.error(`❌ Failed to sync staff ${staffMember.Staff_Id} for location ${location.locationId}:`, error);
          }
        }

        locationBreakdown.push({
          locationId: location.locationId,
          locationName: location.locationName,
          staffCount: locationStaff
        });

        console.log(`✅ ${locationStaff} staff synced for ${location.locationName}`);

      } catch (error) {
        console.error(`❌ Failed to sync staff for location ${location.locationId}:`, error);
      }
    }

    return { totalStaff, locationBreakdown };
  }

  /**
   * Sync time slots for next 7 days for all location/service/staff combinations
   */
  private async syncTimeSlots(): Promise<{ totalSlots: number; dateBreakdown: any[] }> {
    console.log('⏰ Syncing time slots for next 7 days...');
    
    const locations = await db.select().from(nailItLocations);
    const services = await db.select().from(nailItServices);
    const staff = await db.select().from(nailItStaff);
    
    let totalSlots = 0;
    const dateBreakdown = [];

    // Get next 7 days
    const dates = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
    }

    for (const dateStr of dates) {
      let dailySlots = 0;
      
      for (const location of locations) {
        for (const service of services.filter(s => s.locationId === location.locationId)) {
          try {
            console.log(`📅 Syncing slots for ${dateStr} - ${location.locationName} - ${service.serviceName}`);
            
            // Get available slots from NailIt API
            const slots = await this.nailItAPI.getAvailableSlots(
              location.locationId,
              service.serviceId,
              dateStr
            );

            for (const slot of slots) {
              try {
                // Check if slot exists
                const existing = await db.select()
                  .from(nailItSlots)
                  .where(and(
                    eq(nailItSlots.locationId, location.locationId),
                    eq(nailItSlots.serviceId, service.serviceId),
                    eq(nailItSlots.slotDate, dateStr),
                    eq(nailItSlots.timeSlotId, slot.timeSlotId)
                  ))
                  .limit(1);

                const slotData = {
                  locationId: location.locationId,
                  serviceId: service.serviceId,
                  staffId: slot.staffId || 1, // Default staff if not specified
                  slotDate: dateStr,
                  timeSlotId: slot.timeSlotId,
                  timeSlotLabel: slot.timeSlotLabel,
                  isAvailable: slot.isAvailable,
                  validUntil: new Date(Date.now() + 2 * 60 * 60 * 1000), // Valid for 2 hours
                };

                if (existing.length > 0) {
                  // Update existing slot
                  await db.update(nailItSlots)
                    .set({ 
                      ...slotData,
                      lastSynced: new Date()
                    })
                    .where(and(
                      eq(nailItSlots.locationId, location.locationId),
                      eq(nailItSlots.serviceId, service.serviceId),
                      eq(nailItSlots.slotDate, dateStr),
                      eq(nailItSlots.timeSlotId, slot.timeSlotId)
                    ));
                } else {
                  // Insert new slot
                  await db.insert(nailItSlots).values(slotData);
                }

                dailySlots++;
                totalSlots++;

              } catch (error) {
                console.error(`❌ Failed to sync slot for ${dateStr}:`, error);
              }
            }

          } catch (error) {
            console.error(`❌ Failed to get slots for ${dateStr} - ${location.locationName} - ${service.serviceName}:`, error);
          }
        }
      }

      dateBreakdown.push({
        date: dateStr,
        slotsCount: dailySlots
      });

      console.log(`✅ ${dailySlots} slots synced for ${dateStr}`);
    }

    return { totalSlots, dateBreakdown };
  }

  /**
   * Categorize service based on name (for better organization)
   */
  private categorizeService(serviceName: string): string {
    const name = serviceName.toLowerCase();
    
    if (name.includes('nail') || name.includes('manicure') || name.includes('pedicure') || 
        name.includes('polish') || name.includes('french') || name.includes('gel')) {
      return 'Nail Services';
    }
    
    if (name.includes('hair') || name.includes('cut') || name.includes('color') || 
        name.includes('style') || name.includes('treatment') || name.includes('keratin')) {
      return 'Hair Services';
    }
    
    if (name.includes('facial') || name.includes('face') || name.includes('skin') || 
        name.includes('cleansing') || name.includes('hydra')) {
      return 'Facial Services';
    }
    
    if (name.includes('massage') || name.includes('body') || name.includes('spa') || 
        name.includes('wrap') || name.includes('scrub')) {
      return 'Body Services';
    }
    
    return 'Other Services';
  }

  /**
   * Get sync status for monitoring
   */
  async getSyncStatus(): Promise<any> {
    const [locations, services, staff, slots] = await Promise.all([
      db.select().from(nailItLocations),
      db.select().from(nailItServices),
      db.select().from(nailItStaff),
      db.select().from(nailItSlots)
    ]);

    return {
      lastSync: new Date().toISOString(),
      totals: {
        locations: locations.length,
        services: services.length,
        staff: staff.length,
        slots: slots.length
      },
      locations: locations.map(l => ({
        id: l.locationId,
        name: l.locationName,
        lastSynced: l.lastSynced,
        validUntil: l.validUntil
      }))
    };
  }

  /**
   * Force refresh specific data type
   */
  async forceRefresh(dataType: 'locations' | 'services' | 'staff' | 'slots'): Promise<any> {
    console.log(`🔄 Force refreshing ${dataType}...`);
    
    switch (dataType) {
      case 'locations':
        return await this.syncLocations();
      case 'services':
        return await this.syncAllLocationServices();
      case 'staff':
        return await this.syncAllLocationStaff();
      case 'slots':
        return await this.syncTimeSlots();
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
  }
}