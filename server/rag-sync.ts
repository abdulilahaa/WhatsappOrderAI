// RAG Data Synchronization Service
// Handles daily sync of NailIt data to local database for fast AI access

import { db } from './db';
import { servicesRag, nailItLocations, nailItStaff, nailItPaymentTypes } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { NailItAPIService } from './nailit-api';

interface SyncResult {
  success: boolean;
  synced: number;
  errors: string[];
  duration: number;
}

interface SyncStats {
  services: SyncResult;
  locations: SyncResult;
  staff: SyncResult;
  paymentTypes: SyncResult;
  totalDuration: number;
}

class RAGSyncService {
  private nailItAPI: NailItAPIService;
  
  constructor() {
    this.nailItAPI = new NailItAPIService();
  }

  /**
   * Main sync function - syncs all NailIt data to local database
   */
  async syncAllData(): Promise<SyncStats> {
    console.log('🔄 Starting RAG data synchronization...');
    const overallStart = Date.now();
    
    const results: SyncStats = {
      services: { success: false, synced: 0, errors: [], duration: 0 },
      locations: { success: false, synced: 0, errors: [], duration: 0 },
      staff: { success: false, synced: 0, errors: [], duration: 0 },
      paymentTypes: { success: false, synced: 0, errors: [], duration: 0 },
      totalDuration: 0
    };

    // Sync all data types in parallel for better performance
    const [servicesResult, locationsResult, staffResult, paymentTypesResult] = await Promise.allSettled([
      this.syncServices(),
      this.syncLocations(), 
      this.syncStaff(),
      this.syncPaymentTypes()
    ]);

    // Process results
    if (servicesResult.status === 'fulfilled') {
      results.services = servicesResult.value;
    } else {
      results.services.errors.push(servicesResult.reason?.message || 'Services sync failed');
    }

    if (locationsResult.status === 'fulfilled') {
      results.locations = locationsResult.value;
    } else {
      results.locations.errors.push(locationsResult.reason?.message || 'Locations sync failed');
    }

    if (staffResult.status === 'fulfilled') {
      results.staff = staffResult.value;
    } else {
      results.staff.errors.push(staffResult.reason?.message || 'Staff sync failed');
    }

    if (paymentTypesResult.status === 'fulfilled') {
      results.paymentTypes = paymentTypesResult.value;
    } else {
      results.paymentTypes.errors.push(paymentTypesResult.reason?.message || 'Payment types sync failed');
    }

    results.totalDuration = Date.now() - overallStart;
    
    console.log('✅ RAG sync completed:', {
      services: results.services.synced,
      locations: results.locations.synced,
      staff: results.staff.synced,
      paymentTypes: results.paymentTypes.synced,
      totalTime: `${results.totalDuration}ms`
    });

    return results;
  }

  /**
   * Sync services from NailIt API to local database
   */
  private async syncServices(): Promise<SyncResult> {
    const start = Date.now();
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      console.log('📋 Syncing services from NailIt API...');
      
      // Get all services using existing working method
      const testLocationIds = [1, 52, 53];
      const testDate = this.nailItAPI.formatDateForAPI(new Date());
      
      const servicesResult = await this.nailItAPI.getItemsByDate({
        groupId: null,
        locationIds: testLocationIds,
        selectedDate: testDate,
        itemTypeId: null
      });
      
      const allServices = servicesResult.items || [];
      
      if (!allServices || allServices.length === 0) {
        throw new Error('No services received from NailIt API');
      }

      // Process services in batches for better performance
      const batchSize = 50;
      for (let i = 0; i < allServices.length; i += batchSize) {
        const batch = allServices.slice(i, i + batchSize);
        
        for (const service of batch) {
          try {
            // Process and enhance service data
            const processedService = this.processServiceForRAG(service);
            
            // Upsert service (insert or update if exists)
            await db
              .insert(nailItServices)
              .values(processedService)
              .onConflictDoUpdate({
                target: nailItServices.itemId,
                set: {
                  itemName: processedService.itemName,
                  itemDesc: processedService.itemDesc,
                  primaryPrice: processedService.primaryPrice,
                  specialPrice: processedService.specialPrice,
                  duration: processedService.duration,
                  durationMinutes: processedService.durationMinutes,
                  locationIds: processedService.locationIds,
                  imageUrl: processedService.imageUrl,
                  searchKeywords: processedService.searchKeywords,
                  categoryTags: processedService.categoryTags,
                  lastSyncedAt: sql`NOW()`,
                }
              });
            
            syncedCount++;
          } catch (error) {
            errors.push(`Service ${service.Item_Id}: ${error.message}`);
          }
        }
      }

      console.log(`✅ Synced ${syncedCount} services successfully`);
      
      return {
        success: true,
        synced: syncedCount,
        errors,
        duration: Date.now() - start
      };

    } catch (error) {
      console.error('❌ Services sync failed:', error);
      return {
        success: false,
        synced: syncedCount,
        errors: [error.message],
        duration: Date.now() - start
      };
    }
  }

  /**
   * Sync locations from NailIt API to local database
   */
  private async syncLocations(): Promise<SyncResult> {
    const start = Date.now();
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      console.log('📍 Syncing locations from NailIt API...');
      
      const locations = await this.nailItAPI.getLocations();
      
      if (!locations || locations.length === 0) {
        throw new Error('No locations received from NailIt API');
      }

      for (const location of locations) {
        try {
          await db
            .insert(nailItLocations)
            .values({
              locationId: location.Location_Id,
              locationName: location.Location_Name,
              address: location.Address,
              phone: location.Phone,
              latitude: location.Latitude,
              longitude: location.Longitude,
              fromTime: location.From_Time,
              toTime: location.To_Time,
              workingDays: location.Working_Days,
              website: location.Website,
              isActive: true,
            })
            .onConflictDoUpdate({
              target: nailItLocations.locationId,
              set: {
                locationName: location.Location_Name,
                address: location.Address,
                phone: location.Phone,
                fromTime: location.From_Time,
                toTime: location.To_Time,
                workingDays: location.Working_Days,
                lastSyncedAt: sql`NOW()`,
              }
            });
          
          syncedCount++;
        } catch (error) {
          errors.push(`Location ${location.Location_Id}: ${error.message}`);
        }
      }

      console.log(`✅ Synced ${syncedCount} locations successfully`);
      
      return {
        success: true,
        synced: syncedCount,
        errors,
        duration: Date.now() - start
      };

    } catch (error) {
      console.error('❌ Locations sync failed:', error);
      return {
        success: false,
        synced: syncedCount,
        errors: [error.message],
        duration: Date.now() - start
      };
    }
  }

  /**
   * Sync staff data from NailIt API (basic info, real-time availability handled separately)
   */
  private async syncStaff(): Promise<SyncResult> {
    const start = Date.now();
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      console.log('👥 Syncing staff from NailIt API...');
      
      // Get staff for each location
      const locations = await db.select().from(nailItLocations);
      
      for (const location of locations) {
        try {
          // Get sample services to test staff availability
          const sampleServices = await db.select().from(nailItServices).limit(10);
          
          if (sampleServices.length > 0) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric'
            });

            // Get staff for first service to get location staff list
            const staffData = await this.nailItAPI.getServiceStaff(
              sampleServices[0].itemId,
              location.locationId,
              'E',
              tomorrowStr
            );

            if (staffData.success && staffData.staff.length > 0) {
              for (const staff of staffData.staff) {
                try {
                  await db
                    .insert(nailItStaff)
                    .values({
                      staffId: staff.Id,
                      staffName: staff.Name,
                      locationId: location.locationId,
                      extraTime: staff.Extra_Time || 0,
                      imageUrl: staff.Image_URL,
                      staffGroups: staff.Staff_Groups,
                      isActive: true,
                    })
                    .onConflictDoUpdate({
                      target: [nailItStaff.staffId, nailItStaff.locationId],
                      set: {
                        staffName: staff.Name,
                        extraTime: staff.Extra_Time || 0,
                        imageUrl: staff.Image_URL,
                        staffGroups: staff.Staff_Groups,
                        lastSyncedAt: sql`NOW()`,
                      }
                    });
                  
                  syncedCount++;
                } catch (error) {
                  errors.push(`Staff ${staff.Id}: ${error.message}`);
                }
              }
            }
          }
        } catch (error) {
          errors.push(`Location ${location.locationId} staff: ${error.message}`);
        }
      }

      console.log(`✅ Synced ${syncedCount} staff members successfully`);
      
      return {
        success: true,
        synced: syncedCount,
        errors,
        duration: Date.now() - start
      };

    } catch (error) {
      console.error('❌ Staff sync failed:', error);
      return {
        success: false,
        synced: syncedCount,
        errors: [error.message],
        duration: Date.now() - start
      };
    }
  }

  /**
   * Sync payment types from NailIt API
   */
  private async syncPaymentTypes(): Promise<SyncResult> {
    const start = Date.now();
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      console.log('💳 Syncing payment types from NailIt API...');
      
      const paymentData = await this.nailItAPI.getPaymentTypes();
      
      if (!paymentData.success || !paymentData.paymentTypes || paymentData.paymentTypes.length === 0) {
        // Use fallback payment types if API fails
        const fallbackPaymentTypes = [
          { Payment_Type_Id: 1, Payment_Type_Name: 'Cash on Arrival', Payment_Type_Code: 'CASH', Is_Enabled: true, Image_URL: '' },
          { Payment_Type_Id: 2, Payment_Type_Name: 'Knet', Payment_Type_Code: 'KNET', Is_Enabled: true, Image_URL: '' },
          { Payment_Type_Id: 7, Payment_Type_Name: 'Apple Pay', Payment_Type_Code: 'APPLE_PAY', Is_Enabled: true, Image_URL: '' }
        ];
        
        for (const paymentType of fallbackPaymentTypes) {
          try {
            await db
              .insert(nailItPaymentTypes)
              .values({
                paymentTypeId: paymentType.Payment_Type_Id,
                paymentTypeName: paymentType.Payment_Type_Name,
                paymentTypeCode: paymentType.Payment_Type_Code,
                isEnabled: paymentType.Is_Enabled,
                imageUrl: paymentType.Image_URL,
              })
              .onConflictDoUpdate({
                target: nailItPaymentTypes.paymentTypeId,
                set: {
                  paymentTypeName: paymentType.Payment_Type_Name,
                  paymentTypeCode: paymentType.Payment_Type_Code,
                  isEnabled: paymentType.Is_Enabled,
                  lastSyncedAt: sql`NOW()`,
                }
              });
            
            syncedCount++;
          } catch (error) {
            errors.push(`Payment type ${paymentType.Payment_Type_Id}: ${error.message}`);
          }
        }
      } else {
        for (const paymentType of paymentData.paymentTypes) {
          try {
            await db
              .insert(nailItPaymentTypes)
              .values({
                paymentTypeId: paymentType.Payment_Type_Id,
                paymentTypeName: paymentType.Payment_Type_Name,
                paymentTypeCode: paymentType.Payment_Type_Code,
                isEnabled: paymentType.Is_Enabled,
                imageUrl: paymentType.Image_URL,
              })
              .onConflictDoUpdate({
                target: nailItPaymentTypes.paymentTypeId,
                set: {
                  paymentTypeName: paymentType.Payment_Type_Name,
                  paymentTypeCode: paymentType.Payment_Type_Code,
                  isEnabled: paymentType.Is_Enabled,
                  lastSyncedAt: sql`NOW()`,
                }
              });
            
            syncedCount++;
          } catch (error) {
            errors.push(`Payment type ${paymentType.Payment_Type_Id}: ${error.message}`);
          }
        }
      }

      console.log(`✅ Synced ${syncedCount} payment types successfully`);
      
      return {
        success: true,
        synced: syncedCount,
        errors,
        duration: Date.now() - start
      };

    } catch (error) {
      console.error('❌ Payment types sync failed:', error);
      return {
        success: false,
        synced: syncedCount,
        errors: [error.message],
        duration: Date.now() - start
      };
    }
  }

  /**
   * Process service data for RAG optimization
   */
  private processServiceForRAG(service: any) {
    // Extract duration in minutes
    const durationMinutes = parseInt(service.Duration) || 60;
    
    // Generate search keywords
    const keywords = this.generateSearchKeywords(service.Item_Name, service.Item_Desc);
    
    // Generate category tags
    const categoryTags = this.generateCategoryTags(service.Item_Name, service.Item_Desc);
    
    return {
      itemId: service.Item_Id,
      itemName: service.Item_Name,
      itemDesc: service.Item_Desc,
      primaryPrice: service.Primary_Price.toString(),
      specialPrice: service.Special_Price ? service.Special_Price.toString() : null,
      duration: service.Duration,
      durationMinutes,
      itemTypeId: service.Item_Type_Id,
      parentGroupId: service.Parent_Group_Id,
      subGroupId: service.Sub_Group_Id,
      locationIds: service.Location_Ids,
      imageUrl: service.Image_Url,
      searchKeywords: keywords,
      categoryTags,
      isActive: true,
    };
  }

  /**
   * Generate search keywords for fast service matching
   */
  private generateSearchKeywords(name: string, description: string): string {
    const text = `${name} ${description}`.toLowerCase();
    
    // Extract keywords, remove common words
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
    const words = text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.includes(word));
    
    return [...new Set(words)].join(' ');
  }

  /**
   * Generate category tags for intelligent recommendations
   */
  private generateCategoryTags(name: string, description: string): string[] {
    const text = `${name} ${description}`.toLowerCase();
    const tags: string[] = [];
    
    // Hair-related tags
    if (text.match(/(hair|olaplex|macadamia|treatment|blowout|keratin|color)/)) {
      tags.push('hair');
    }
    
    // Treatment-specific tags
    if (text.match(/(treatment|therapy|repair|growth)/)) {
      tags.push('treatment');
    }
    
    // Styling tags
    if (text.match(/(style|styling|blowout|straightening)/)) {
      tags.push('styling');
    }
    
    // Color tags
    if (text.match(/(color|colour|highlight|dye)/)) {
      tags.push('color');
    }
    
    return tags;
  }

  /**
   * Check if sync is needed (called before each sync)
   */
  async shouldSync(): Promise<boolean> {
    try {
      // Check when last sync occurred
      const lastSync = await db
        .select()
        .from(nailItServices)
        .orderBy(sql`last_synced_at DESC`)
        .limit(1);
      
      if (lastSync.length === 0) {
        return true; // Never synced
      }
      
      const lastSyncTime = new Date(lastSync[0].lastSyncedAt).getTime();
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      return (now - lastSyncTime) > twentyFourHours;
    } catch (error) {
      console.error('Error checking sync status:', error);
      return true; // Sync on error to be safe
    }
  }
}

export const ragSyncService = new RAGSyncService();