// Sync NailIt API data to local RAG database for fast search
import { db } from './db';
import { nailItServices, nailItLocations, nailItStaff, nailItPaymentTypes } from '../shared/schema';
import nailItAPI from './nailit-api';
import { eq } from 'drizzle-orm';

class NailItDataSync {
  async syncAllData() {
    console.log('🔄 Starting NailIt data sync...');
    
    try {
      await this.syncLocations();
      await this.syncServices();
      await this.syncPaymentTypes();
      
      console.log('✅ NailIt data sync completed successfully');
      return { success: true, message: 'Data sync completed' };
    } catch (error) {
      console.error('❌ NailIt data sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  async syncLocations() {
    try {
      console.log('📍 Syncing locations...');
      const locations = await nailItAPI.getLocations();
      
      for (const location of locations) {
        await db
          .insert(nailItLocations)
          .values({
            nailitId: location.Location_Id,
            locationName: location.Location_Name,
            address: location.Address,
            phone: location.Phone,
            latitude: location.Latitude,
            longitude: location.Longitude,
            fromTime: location.From_Time,
            toTime: location.To_Time,
            workingDays: location.Working_Days,
            website: location.Website,
            isActive: true
          })
          .onConflictDoUpdate({
            target: nailItLocations.nailitId,
            set: {
              locationName: location.Location_Name,
              address: location.Address,
              phone: location.Phone,
              latitude: location.Latitude,
              longitude: location.Longitude,
              fromTime: location.From_Time,
              toTime: location.To_Time,
              workingDays: location.Working_Days,
              website: location.Website,
              lastSyncedAt: new Date()
            }
          });
      }
      
      console.log(`✅ Synced ${locations.length} locations`);
    } catch (error) {
      console.error('❌ Failed to sync locations:', error);
      throw error;
    }
  }

  async syncServices() {
    try {
      console.log('🛠️ Syncing services...');
      let allServices = [];
      
      // Get services for all locations
      const locationIds = [1, 52, 53]; // NailIt location IDs
      
      for (const locationId of locationIds) {
        console.log(`📄 Fetching services for location ${locationId}...`);
        
        // Fetch multiple pages to get all services
        for (let page = 1; page <= 20; page++) {
          const response = await nailItAPI.getItemsByLocation({
            Location_Id: locationId,
            Lang: 'E',
            Page_No: page
          });
          
          if (!response || !response.items || response.items.length === 0) {
            break;
          }
          
          // Add location ID to each service
          const servicesWithLocation = response.items.map(item => ({
            ...item,
            locationId
          }));
          
          allServices.push(...servicesWithLocation);
          
          console.log(`📄 Location ${locationId}, Page ${page}: Found ${response.items.length} services`);
          
          // If we got less than 20 items, we've reached the last page
          if (response.items.length < 20) {
            break;
          }
        }
      }
      
      // Group services by item ID and merge location IDs
      const serviceMap = new Map();
      
      for (const service of allServices) {
        const key = service.Item_Id;
        
        if (serviceMap.has(key)) {
          // Service already exists, add location ID
          const existing = serviceMap.get(key);
          if (!existing.locationIds.includes(service.locationId)) {
            existing.locationIds.push(service.locationId);
          }
        } else {
          // New service
          serviceMap.set(key, {
            ...service,
            locationIds: [service.locationId]
          });
        }
      }
      
      // Insert/update services in database
      for (const [itemId, service of serviceMap) {
        // Generate category tags based on service name and description
        const categoryTags = this.generateCategoryTags(service.Item_Name, service.Item_Desc);
        const searchKeywords = this.generateSearchKeywords(service.Item_Name, service.Item_Desc);
        
        // Get price value
        const price = service.Primary_Price || service.Price || 0;
        
        await db
          .insert(nailItServices)
          .values({
            nailit_id: service.Item_Id, // Actual column name
            item_id: service.Item_Id,
            item_name: service.Item_Name,
            item_desc: service.Item_Desc,
            primary_price: price,
            price: price,
            duration_minutes: parseInt(service.Duration) || 30,
            item_type_id: service.Item_Type_Id,
            group_id: service.Group_Id,
            location_ids: JSON.stringify(service.locationIds),
            image_url: service.ImageURL,
            is_enabled: true,
            search_keywords: searchKeywords,
            category_tags: JSON.stringify(categoryTags)
          })
          .onConflictDoUpdate({
            target: nailItServices.itemId,
            set: {
              itemName: service.Item_Name,
              itemDesc: service.Item_Desc,
              primaryPrice: service.Primary_Price.toString(),
              // price: service.Price, // Column doesn't exist
              // duration: service.Duration, // Column doesn't exist
              durationMinutes: parseInt(service.Duration) || 30,
              locationIds: service.locationIds,
              imageUrl: service.ImageURL,
              searchKeywords,
              categoryTags,
              lastSyncedAt: new Date()
            }
          });
      }
      
      console.log(`✅ Synced ${serviceMap.size} unique services across all locations`);
    } catch (error) {
      console.error('❌ Failed to sync services:', error);
      throw error;
    }
  }

  async syncPaymentTypes() {
    try {
      console.log('💳 Syncing payment types...');
      const response = await nailItAPI.getPaymentTypes();
      
      if (response.success && response.paymentTypes) {
        for (const paymentType of response.paymentTypes) {
          await db
            .insert(nailItPaymentTypes)
            .values({
              nailitId: paymentType.Payment_Type_Id,
              paymentTypeName: paymentType.Payment_Type_Name,
              paymentTypeCode: paymentType.Payment_Type_Code,
              isEnabled: paymentType.Is_Enabled,
              imageUrl: paymentType.Image_URL
            })
            .onConflictDoUpdate({
              target: nailItPaymentTypes.nailitId,
              set: {
                paymentTypeName: paymentType.Payment_Type_Name,
                paymentTypeCode: paymentType.Payment_Type_Code,
                isEnabled: paymentType.Is_Enabled,
                imageUrl: paymentType.Image_URL,
                lastSyncedAt: new Date()
              }
            });
        }
        
        console.log(`✅ Synced ${response.paymentTypes.length} payment types`);
      }
    } catch (error) {
      console.error('❌ Failed to sync payment types:', error);
      // Don't throw - payment types sync is optional
    }
  }

  private generateCategoryTags(name: string, description: string = ''): string[] {
    const text = `${name} ${description}`.toLowerCase();
    const tags = [];
    
    // Hair-related tags
    if (text.includes('hair') || text.includes('scalp')) tags.push('hair');
    if (text.includes('keratin')) tags.push('hair', 'treatment', 'keratin');
    if (text.includes('olaplex')) tags.push('hair', 'treatment', 'olaplex');
    if (text.includes('botox')) tags.push('hair', 'treatment', 'botox');
    if (text.includes('protein')) tags.push('hair', 'treatment', 'protein');
    if (text.includes('color') || text.includes('colour')) tags.push('hair', 'color');
    if (text.includes('highlight')) tags.push('hair', 'color', 'highlights');
    if (text.includes('blowout') || text.includes('blow out')) tags.push('hair', 'styling');
    if (text.includes('cut') || text.includes('trim')) tags.push('hair', 'cut');
    if (text.includes('oily')) tags.push('hair', 'oily', 'treatment');
    if (text.includes('dandruff')) tags.push('hair', 'scalp', 'treatment');
    
    // Nail-related tags
    if (text.includes('manicure')) tags.push('nails', 'manicure');
    if (text.includes('pedicure')) tags.push('nails', 'pedicure');
    if (text.includes('gel') || text.includes('gelish')) tags.push('nails', 'gel');
    if (text.includes('french')) tags.push('nails', 'french');
    if (text.includes('acrylic')) tags.push('nails', 'acrylic');
    if (text.includes('nail art')) tags.push('nails', 'art');
    
    // Face/Skin tags
    if (text.includes('facial')) tags.push('face', 'facial');
    if (text.includes('hydrafacial')) tags.push('face', 'hydrafacial');
    if (text.includes('clean') && text.includes('face')) tags.push('face', 'cleansing');
    if (text.includes('acne')) tags.push('face', 'acne', 'treatment');
    
    // Waxing tags
    if (text.includes('wax')) tags.push('waxing');
    if (text.includes('thread')) tags.push('threading');
    
    // Unique tags only
    return [...new Set(tags)];
  }

  private generateSearchKeywords(name: string, description: string = ''): string {
    const text = `${name} ${description}`.toLowerCase();
    const keywords = text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .join(' ');
    
    return keywords;
  }
}

export default new NailItDataSync();