// Direct SQL sync for NailIt data
import { db } from './db';
import { sql } from 'drizzle-orm';
import { nailItAPI } from './nailit-api';

class DirectNailItSync {
  async syncAllData() {
    console.log('🔄 Starting direct NailIt data sync...');
    
    try {
      await this.syncLocations();
      await this.syncServices();
      await this.syncPaymentTypes();
      
      console.log('✅ Direct NailIt data sync completed successfully');
      return { success: true, message: 'Data sync completed' };
    } catch (error) {
      console.error('❌ Direct NailIt data sync failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async syncLocations() {
    try {
      console.log('📍 Syncing locations...');
      const locations = await nailItAPI.getLocations();
      let synced = 0;
      
      for (const location of locations) {
        try {
          await db.execute(sql`
            INSERT INTO nailit_locations (
              nailit_id, name, address, phone, 
              latitude, longitude, from_time, to_time, 
              working_days, website, is_active
            ) VALUES (
              ${location.Location_Id}, ${location.Location_Name}, 
              ${location.Address}, ${location.Phone},
              ${location.Latitude}, ${location.Longitude}, 
              ${location.From_Time}, ${location.To_Time},
              ${location.Working_Days}, ${location.Website}, true
            )
            ON CONFLICT (nailit_id) 
            DO UPDATE SET
              name = EXCLUDED.name,
              address = EXCLUDED.address,
              phone = EXCLUDED.phone,
              latitude = EXCLUDED.latitude,
              longitude = EXCLUDED.longitude,
              from_time = EXCLUDED.from_time,
              to_time = EXCLUDED.to_time,
              working_days = EXCLUDED.working_days,
              website = EXCLUDED.website,
              last_synced_at = NOW()
          `);
          synced++;
        } catch (err) {
          console.error(`Failed to sync location ${location.Location_Id}:`, err instanceof Error ? err.message : String(err));
        }
      }
      
      console.log(`✅ Synced ${synced}/${locations.length} locations`);
      return synced;
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
      const locationIds = [1, 52, 53];
      
      for (const locationId of locationIds) {
        console.log(`📄 Fetching services for location ${locationId}...`);
        
        for (let page = 1; page <= 20; page++) {
          const today = new Date();
          const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
          
          const response = await nailItAPI.getItemsByDate({
            Lang: 'E',
            Like: '',
            Page_No: page,
            Item_Type_Id: 2,
            Group_Id: 0,
            Location_Ids: [locationId],
            Is_Home_Service: false,
            Selected_Date: dateStr
          });
          
          if (!response || !response.items || response.items.length === 0) {
            break;
          }
          
          const servicesWithLocation = response.items.map(item => ({
            ...item,
            locationId
          }));
          
          allServices.push(...servicesWithLocation);
          
          console.log(`📄 Location ${locationId}, Page ${page}: Found ${response.items.length} services`);
          
          if (response.items.length < 20) {
            break;
          }
        }
      }
      
      // Group services by item ID
      const serviceMap = new Map();
      
      for (const service of allServices) {
        const key = service.Item_Id;
        
        if (serviceMap.has(key)) {
          const existing = serviceMap.get(key);
          if (!existing.locationIds.includes(service.locationId)) {
            existing.locationIds.push(service.locationId);
          }
        } else {
          serviceMap.set(key, {
            ...service,
            locationIds: [service.locationId]
          });
        }
      }
      
      // Insert services
      let synced = 0;
      for (const [itemId, service] of serviceMap) {
        try {
          const categoryTags = this.generateCategoryTags(service.Item_Name, service.Item_Desc);
          const searchKeywords = this.generateSearchKeywords(service.Item_Name, service.Item_Desc);
          const price = service.Primary_Price || service.Price || 0;
          
          await db.execute(sql`
            INSERT INTO nailit_services (
              nailit_id, item_id, item_name, item_desc,
              primary_price, price, duration_minutes,
              item_type_id, group_id, location_ids,
              image_url, is_enabled, search_keywords,
              category_tags
            ) VALUES (
              ${service.Item_Id}, ${service.Item_Id}, 
              ${service.Item_Name}, ${service.Item_Desc},
              ${price}, ${price}, 
              ${parseInt(service.Duration) || 30},
              ${service.Item_Type_Id}, ${service.Group_Id}, 
              ${JSON.stringify(service.locationIds)},
              ${service.ImageURL}, true, 
              ${searchKeywords},
              ${JSON.stringify(categoryTags)}
            )
            ON CONFLICT (nailit_id) 
            DO UPDATE SET
              item_name = EXCLUDED.item_name,
              item_desc = EXCLUDED.item_desc,
              primary_price = EXCLUDED.primary_price,
              price = EXCLUDED.price,
              duration_minutes = EXCLUDED.duration_minutes,
              location_ids = EXCLUDED.location_ids,
              image_url = EXCLUDED.image_url,
              search_keywords = EXCLUDED.search_keywords,
              category_tags = EXCLUDED.category_tags,
              last_synced_at = NOW()
          `);
          synced++;
        } catch (err) {
          console.error(`Failed to sync service ${service.Item_Id}:`, err instanceof Error ? err.message : String(err));
        }
      }
      
      console.log(`✅ Synced ${synced}/${serviceMap.size} unique services`);
      return synced;
    } catch (error) {
      console.error('❌ Failed to sync services:', error);
      throw error;
    }
  }

  async syncPaymentTypes() {
    try {
      console.log('💳 Syncing payment types...');
      const response = await nailItAPI.getPaymentTypes();
      let synced = 0;
      
      if (response.success && response.paymentTypes) {
        for (const paymentType of response.paymentTypes) {
          try {
            await db.execute(sql`
              INSERT INTO nailit_payment_types (
                nailit_id, payment_type_name, payment_type_code,
                is_enabled, image_url
              ) VALUES (
                ${paymentType.Payment_Type_Id}, 
                ${paymentType.Payment_Type_Name},
                ${paymentType.Payment_Type_Code},
                ${paymentType.Is_Enabled}, 
                ${paymentType.Image_URL}
              )
              ON CONFLICT (nailit_id) 
              DO UPDATE SET
                payment_type_name = EXCLUDED.payment_type_name,
                payment_type_code = EXCLUDED.payment_type_code,
                is_enabled = EXCLUDED.is_enabled,
                image_url = EXCLUDED.image_url,
                last_synced_at = NOW()
            `);
            synced++;
          } catch (err) {
            console.error(`Failed to sync payment type ${paymentType.Payment_Type_Id}:`, err instanceof Error ? err.message : String(err));
          }
        }
        
        console.log(`✅ Synced ${synced}/${response.paymentTypes.length} payment types`);
      }
      return synced;
    } catch (error) {
      console.error('❌ Failed to sync payment types:', error);
      // Don't throw - payment types sync is optional
      return 0;
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
    
    return Array.from(new Set(tags));
  }

  private generateSearchKeywords(name: string, description: string = ''): string {
    const text = `${name} ${description}`.toLowerCase();
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .join(' ');
  }
}

export default new DirectNailItSync();