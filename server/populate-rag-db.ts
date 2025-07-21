// Simple script to populate RAG database with NailIt services
import { db } from './db';
import { sql } from 'drizzle-orm';
import { nailItAPI } from './nailit-api';

async function populateRAGDatabase() {
  console.log('🚀 Starting RAG database population...');
  
  try {
    // Step 1: Populate locations
    console.log('📍 Populating locations...');
    const locations = await nailItAPI.getLocations();
    
    for (const loc of locations) {
      await db.execute(sql`
        INSERT INTO nailit_locations (nailit_id, name, address, phone, is_active)
        VALUES (${loc.Location_Id}, ${loc.Location_Name}, ${loc.Address || ''}, ${loc.Phone || ''}, true)
        ON CONFLICT (nailit_id) DO UPDATE SET
          name = EXCLUDED.name,
          address = EXCLUDED.address,
          phone = EXCLUDED.phone
      `);
    }
    console.log(`✅ Added ${locations.length} locations`);

    // Step 2: Populate services
    console.log('🛠️ Populating services...');
    let totalServices = 0;
    
    // Get today's date
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    
    // Get services for each location
    for (const locationId of [1, 52, 53]) {
      console.log(`📦 Fetching services for location ${locationId}...`);
      
      const response = await nailItAPI.getItemsByDate({
        Lang: 'E',
        Like: '',
        Page_No: 1,
        Item_Type_Id: 2,
        Group_Id: 0,
        Location_Ids: [locationId],
        Is_Home_Service: false,
        Selected_Date: dateStr
      });
      
      if (response?.items) {
        for (const item of response.items) {
          try {
            // Extract price
            const price = item.Primary_Price || item.Price || 0;
            const duration = parseInt(item.Duration) || 30;
            
            await db.execute(sql`
              INSERT INTO nailit_services (
                nailit_id, 
                item_id,
                name, 
                item_name,
                item_desc,
                description,
                price,
                primary_price,
                duration_minutes,
                location_ids,
                is_enabled
              ) VALUES (
                ${item.Item_Id},
                ${item.Item_Id},
                ${item.Item_Name},
                ${item.Item_Name},
                ${item.Item_Desc || ''},
                ${item.Item_Desc || ''},
                ${price},
                ${price},
                ${duration},
                ${sql`ARRAY[${locationId}]::integer[]`},
                true
              )
              ON CONFLICT (nailit_id) DO UPDATE SET
                name = EXCLUDED.name,
                item_name = EXCLUDED.item_name,
                item_desc = EXCLUDED.item_desc,
                description = EXCLUDED.description,
                price = EXCLUDED.price,
                primary_price = EXCLUDED.primary_price,
                duration_minutes = EXCLUDED.duration_minutes,
                location_ids = array_cat(nailit_services.location_ids, EXCLUDED.location_ids::integer[])
            `);
            totalServices++;
          } catch (err) {
            console.error(`Failed to insert service ${item.Item_Id}:`, err.message);
          }
        }
      }
    }
    
    console.log(`✅ Added ${totalServices} services to RAG database`);
    
    // Verify the data
    const serviceCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM nailit_services WHERE is_enabled = true`);
    const locationCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM nailit_locations WHERE is_active = true`);
    
    const serviceCount = serviceCountResult[0]?.count || 0;
    const locationCount = locationCountResult[0]?.count || 0;
    
    console.log('📊 Database status:');
    console.log(`- Services: ${serviceCount}`);
    console.log(`- Locations: ${locationCount}`);
    
    return {
      success: true,
      servicesAdded: totalServices,
      locationsAdded: locations.length
    };
    
  } catch (error) {
    console.error('❌ Population failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use in routes
export { populateRAGDatabase };