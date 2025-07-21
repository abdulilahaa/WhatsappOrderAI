// Comprehensive script to populate RAG database with ALL real NailIt services
import { db } from './db';
import { sql } from 'drizzle-orm';
import { nailItAPI } from './nailit-api';

async function populateFullRAG() {
  console.log('🚀 Starting FULL RAG database population with real NailIt services...');
  
  try {
    // Step 1: Get all locations from NailIt API
    console.log('📍 Fetching real locations from NailIt API...');
    const locations = await nailItAPI.getLocations();
    console.log(`Found ${locations.length} locations from NailIt API`);

    // Insert locations
    let locationCount = 0;
    for (const location of locations) {
      try {
        await db.execute(sql`
          INSERT INTO nailit_locations (
            nailit_id, name, address, phone, from_time, to_time, is_active
          ) VALUES (
            ${location.Location_Id}, 
            ${location.Location_Name}, 
            ${location.Address || ''}, 
            ${location.Phone || ''}, 
            ${location.From_Time || ''},
            ${location.To_Time || ''},
            true
          )
          ON CONFLICT (nailit_id) DO UPDATE SET
            name = EXCLUDED.name,
            address = EXCLUDED.address,
            phone = EXCLUDED.phone,
            from_time = EXCLUDED.from_time,
            to_time = EXCLUDED.to_time
        `);
        locationCount++;
      } catch (err: any) {
        console.error(`Failed to insert location ${location.Location_Id}: ${err.message}`);
      }
    }
    console.log(`✅ Added/updated ${locationCount} locations`);

    // Step 2: Get ALL services from ALL locations
    console.log('🛠️ Fetching ALL services from ALL locations...');
    let totalServices = 0;
    
    for (const location of locations) {
      console.log(`\n📍 Processing location: ${location.Location_Name} (ID: ${location.Location_Id})`);
      
      // Fetch all services for this location with pagination
      let page = 1;
      let hasMorePages = true;
      let locationServices = [];
      
      while (hasMorePages) {
        try {
          const response = await nailItAPI.getItemsByDate({
            Lang: 'E',
            Like: '',
            Page_No: page,
            Item_Type_Id: 2,
            Group_Id: 0,
            Location_Ids: [location.Location_Id],
            Is_Home_Service: false,
            Selected_Date: new Date().toISOString().split('T')[0].split('-').reverse().join('-')
          });
          
          if (response && response.items && response.items.length > 0) {
            locationServices.push(...response.items);
            console.log(`   Page ${page}: ${response.items.length} services (Total so far: ${locationServices.length})`);
            
            // Check if we have more pages
            if (response.items.length < 20 || locationServices.length >= response.total) {
              hasMorePages = false;
            } else {
              page++;
            }
          } else {
            hasMorePages = false;
          }
        } catch (error) {
          console.error(`   Error fetching page ${page} for location ${location.Location_Id}:`, error.message);
          hasMorePages = false;
        }
      }
      
      console.log(`   ✅ Total services for ${location.Location_Name}: ${locationServices.length}`);
      
      // Insert services for this location
      let serviceCount = 0;
      for (const service of locationServices) {
        try {
          // Determine price
          const price = service.Special_Price || service.Primary_Price || 0;
          const duration = service.Duration_Min || service.Duration || 30;
          
          await db.execute(sql`
            INSERT INTO nailit_services (
              nailit_id, item_id, name, item_name, 
              description, item_desc, price, primary_price, special_price,
              duration_minutes, location_ids, group_id, item_type_id, is_enabled
            ) VALUES (
              ${service.Item_Id}, ${service.Item_Id}, 
              ${service.Item_Name}, ${service.Item_Name},
              ${service.Item_Desc || service.Item_Name}, ${service.Item_Desc || service.Item_Name},
              ${price}, ${service.Primary_Price || price}, ${service.Special_Price || null},
              ${duration}, ${sql`'{${location.Location_Id}}'::integer[]`}, 
              ${service.Group_Id || 0}, ${service.Item_Type_Id || 2}, true
            )
            ON CONFLICT (nailit_id) DO UPDATE SET
              name = EXCLUDED.name,
              item_name = EXCLUDED.item_name,
              description = EXCLUDED.description,
              item_desc = EXCLUDED.item_desc,
              price = EXCLUDED.price,
              primary_price = EXCLUDED.primary_price,
              special_price = EXCLUDED.special_price,
              duration_minutes = EXCLUDED.duration_minutes,
              location_ids = CASE 
                WHEN EXCLUDED.location_ids <> ALL(nailit_services.location_ids) THEN 
                  array_cat(nailit_services.location_ids, EXCLUDED.location_ids)
                ELSE nailit_services.location_ids
              END,
              group_id = EXCLUDED.group_id,
              item_type_id = EXCLUDED.item_type_id
          `);
          serviceCount++;
        } catch (err: any) {
          console.error(`   Failed to insert service ${service.Item_Id} (${service.Item_Name}): ${err.message}`);
        }
      }
      
      console.log(`   ✅ Inserted ${serviceCount} services for ${location.Location_Name}`);
      totalServices += serviceCount;
    }
    
    // Step 3: Verify the data
    const serviceResult = await db.execute(sql`SELECT COUNT(*) as count FROM nailit_services WHERE is_enabled = true`);
    const locationResult = await db.execute(sql`SELECT COUNT(*) as count FROM nailit_locations WHERE is_active = true`);
    
    console.log('\n📊 Final RAG Database Status:');
    console.log(`- Total Services: ${(serviceResult as any)[0]?.count || 0}`);
    console.log(`- Total Locations: ${(locationResult as any)[0]?.count || 0}`);
    
    return {
      success: true,
      totalServicesAdded: totalServices,
      locationsAdded: locationCount,
      databaseServices: (serviceResult as any)[0]?.count || 0,
      databaseLocations: (locationResult as any)[0]?.count || 0
    };
    
  } catch (error: any) {
    console.error('❌ Full RAG population failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export { populateFullRAG };