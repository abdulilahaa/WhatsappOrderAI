// Ultra-simple script to populate RAG database with basic data
import { db } from './db';
import { sql } from 'drizzle-orm';

async function populateSimple() {
  console.log('🚀 Starting simple RAG database population...');
  
  try {
    // Insert locations directly
    console.log('📍 Adding locations...');
    const locations = [
      { id: 1, name: 'Al-Plaza Mall', address: 'Hawalli, Kuwait' },
      { id: 52, name: 'SoKu Mall', address: 'Al Farwaniyah, Kuwait' },
      { id: 53, name: 'Avenues Phase IV', address: 'Kuwait City, Kuwait' }
    ];
    
    for (const loc of locations) {
      await db.execute(sql`
        INSERT INTO nailit_locations (nailit_id, name, address, phone, is_active)
        VALUES (${loc.id}, ${loc.name}, ${loc.address}, '', true)
        ON CONFLICT (nailit_id) DO NOTHING
      `);
    }
    console.log(`✅ Added ${locations.length} locations`);

    // Insert some sample services
    console.log('🛠️ Adding services...');
    const services = [
      { id: 279, name: 'French Manicure', price: 15, duration: 30, locations: [1, 52, 53] },
      { id: 4, name: 'Classic Manicure', price: 10, duration: 20, locations: [1, 52, 53] },
      { id: 5, name: 'Gelish Manicure', price: 18, duration: 40, locations: [1, 52, 53] },
      { id: 60, name: 'Classic Pedicure', price: 12, duration: 30, locations: [1, 52, 53] },
      { id: 61, name: 'Spa Pedicure', price: 20, duration: 45, locations: [1, 52, 53] },
      { id: 72, name: 'Hair Cut', price: 25, duration: 30, locations: [1, 52, 53] },
      { id: 73, name: 'Hair Color', price: 45, duration: 90, locations: [1, 52, 53] },
      { id: 74, name: 'Hair Styling', price: 30, duration: 45, locations: [1, 52, 53] },
      { id: 88, name: 'Facial Treatment', price: 35, duration: 60, locations: [1, 52, 53] },
      { id: 89, name: 'Deep Cleansing Facial', price: 40, duration: 75, locations: [1, 52, 53] }
    ];
    
    let serviceCount = 0;
    for (const svc of services) {
      try {
        await db.execute(sql`
          INSERT INTO nailit_services (
            nailit_id, item_id, name, item_name, 
            description, item_desc, price, primary_price,
            duration_minutes, location_ids, is_enabled
          ) VALUES (
            ${svc.id}, ${svc.id}, ${svc.name}, ${svc.name},
            ${svc.name}, ${svc.name}, ${svc.price}, ${svc.price},
            ${svc.duration}, ${sql`'{${svc.locations.join(',')}}'::integer[]`}, true
          )
          ON CONFLICT (nailit_id) DO UPDATE SET
            name = EXCLUDED.name,
            item_name = EXCLUDED.item_name,
            price = EXCLUDED.price,
            primary_price = EXCLUDED.primary_price,
            duration_minutes = EXCLUDED.duration_minutes,
            location_ids = EXCLUDED.location_ids
        `);
        serviceCount++;
      } catch (err) {
        console.error(`Failed to insert service ${svc.id}: ${err.message}`);
      }
    }
    
    console.log(`✅ Added ${serviceCount} services`);
    
    // Verify the data
    const serviceResult = await db.execute(sql`SELECT COUNT(*) as count FROM nailit_services WHERE is_enabled = true`);
    const locationResult = await db.execute(sql`SELECT COUNT(*) as count FROM nailit_locations WHERE is_active = true`);
    
    console.log('📊 Database status:');
    console.log(`- Services: ${serviceResult[0]?.count || 0}`);
    console.log(`- Locations: ${locationResult[0]?.count || 0}`);
    
    return {
      success: true,
      servicesAdded: serviceCount,
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
export { populateSimple };