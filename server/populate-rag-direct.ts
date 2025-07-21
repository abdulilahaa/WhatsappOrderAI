// Direct script to populate RAG database quickly
import { db } from './db';
import { sql } from 'drizzle-orm';
import { nailItAPI } from './nailit-api';

async function populateRAGDirect() {
  console.log('🚀 Direct RAG population started...');
  
  try {
    // Clear existing services
    await db.execute(sql`DELETE FROM nailit_services WHERE is_enabled = true`);
    console.log('🗑️ Cleared existing services');

    // Get locations first
    const locations = await nailItAPI.getLocations();
    console.log(`📍 Found ${locations.length} locations`);

    let totalServicesAdded = 0;

    // For each location, get ALL services
    for (const location of locations) {
      console.log(`\n📍 Processing ${location.Location_Name} (ID: ${location.Location_Id})`);
      
      // Fetch ALL services for this location
      const allServices = await nailItAPI.getItemsByDate({
        Lang: 'E',
        Like: '',
        Page_No: 1,
        Item_Type_Id: 2,
        Group_Id: 0,
        Location_Ids: [location.Location_Id],
        Is_Home_Service: false,
        Selected_Date: new Date().toISOString().split('T')[0].split('-').reverse().join('-')
      });

      if (allServices && allServices.items) {
        console.log(`   Found ${allServices.items.length} services for ${location.Location_Name}`);
        
        // Insert each service
        for (const service of allServices.items) {
          try {
            const price = service.Special_Price || service.Primary_Price || 0;
            const duration = service.Duration_Min || service.Duration || 30;
            
            await db.execute(sql`
              INSERT INTO nailit_services (
                nailit_id, item_id, name, item_name, 
                description, item_desc, price, primary_price,
                duration_minutes, location_ids, is_enabled
              ) VALUES (
                ${service.Item_Id}, ${service.Item_Id}, 
                ${service.Item_Name || 'Unknown Service'}, ${service.Item_Name || 'Unknown Service'},
                ${service.Item_Desc || service.Item_Name || 'No description'}, ${service.Item_Desc || service.Item_Name || 'No description'},
                ${price}, ${price}, ${duration}, 
                ${sql`'{${location.Location_Id}}'::integer[]`}, true
              )
              ON CONFLICT (nailit_id) DO UPDATE SET
                location_ids = array_cat(nailit_services.location_ids, EXCLUDED.location_ids)
            `);
            totalServicesAdded++;
          } catch (err: any) {
            // Skip individual service errors, continue with others
            console.log(`   ⚠️ Skipped service ${service.Item_Id}: ${err.message}`);
          }
        }
      }
    }

    // Verify final count
    const finalCount = await db.execute(sql`SELECT COUNT(*) as count FROM nailit_services WHERE is_enabled = true`);
    
    console.log('\n✅ RAG Population Complete!');
    console.log(`📊 Total services stored: ${(finalCount as any)[0]?.count || 0}`);
    console.log(`📊 Services added: ${totalServicesAdded}`);
    
    return {
      success: true,
      servicesAdded: totalServicesAdded,
      totalStored: (finalCount as any)[0]?.count || 0
    };

  } catch (error: any) {
    console.error('❌ RAG population failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export { populateRAGDirect };