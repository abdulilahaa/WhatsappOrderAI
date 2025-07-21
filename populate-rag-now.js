// Location-by-location RAG population - systematic and stable approach
import axios from 'axios';

async function populateByLocation(locationId, locationName) {
  console.log(`\n🏢 POPULATING LOCATION: ${locationName} (ID: ${locationId})`);
  console.log('📊 Goal: Cache all authentic services for fast local search');
  
  try {
    let allServices = [];
    let pageNo = 1;
    let hasMorePages = true;
    const maxPages = 30; // Safety limit
    
    // Get current date in DD-MM-YYYY format (NailIt API requirement)
    const today = new Date();
    const dateStr = today.getDate().toString().padStart(2, '0') + '-' + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                   today.getFullYear();
    
    console.log(`📅 Using date format: ${dateStr} (DD-MM-YYYY)`);
    
    // Fetch all pages for this location
    while (hasMorePages && pageNo <= maxPages) {
      console.log(`   📄 Fetching page ${pageNo}...`);
      
      try {
        const response = await axios.post('http://localhost:5000/api/nailit/get-items-by-date', {
          Lang: 'E',
          Like: '',
          Page_No: pageNo,
          Item_Type_Id: 2, // Services
          Group_Id: 0,     // All groups
          Location_Ids: [locationId],
          Is_Home_Service: false,
          Selected_Date: dateStr
        });
        
        if (response.data && response.data.items && response.data.items.length > 0) {
          allServices.push(...response.data.items);
          console.log(`   ✅ Page ${pageNo}: ${response.data.items.length} services (Total: ${allServices.length}/${response.data.totalItems || 'Unknown'})`);
          
          // Check if we have all services
          if (response.data.totalItems && allServices.length >= response.data.totalItems) {
            hasMorePages = false;
          } else if (response.data.items.length < 20) { // Standard page size
            hasMorePages = false;
          } else {
            pageNo++;
            await new Promise(resolve => setTimeout(resolve, 300)); // Small delay
          }
        } else {
          console.log(`   ⚠️ Page ${pageNo}: No services returned`);
          hasMorePages = false;
        }
      } catch (pageError) {
        console.log(`   ❌ Page ${pageNo} error: ${pageError.message}`);
        hasMorePages = false;
      }
    }
    
    console.log(`📦 Total services fetched for ${locationName}: ${allServices.length}`);
    
    // Insert services into RAG database
    let successCount = 0;
    let errorCount = 0;
    
    for (const service of allServices) {
      try {
        const price = service.Special_Price || service.Primary_Price || 0;
        const duration = parseInt(service.Duration) || 30;
        const description = service.Item_Desc || service.Item_Name || '';
        
        // Insert using direct SQL
        const insertResponse = await axios.post('http://localhost:5000/api/execute-sql', {
          sql_query: `
            INSERT INTO nailit_services (
              nailit_id, item_id, name, item_name,
              description, item_desc, price, primary_price, special_price,
              duration_minutes, location_ids, group_id, item_type_id, is_enabled
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
              ARRAY[$11]::integer[], $12, $13, true
            )
            ON CONFLICT (nailit_id) DO UPDATE SET
              location_ids = CASE 
                WHEN $14 = ANY(nailit_services.location_ids) 
                THEN nailit_services.location_ids
                ELSE array_append(nailit_services.location_ids, $14)
              END,
              name = EXCLUDED.name,
              price = EXCLUDED.price,
              duration_minutes = EXCLUDED.duration_minutes
          `,
          params: [
            service.Item_Id, service.Item_Id, service.Item_Name, service.Item_Name,
            description, description, price, service.Primary_Price || price,
            service.Special_Price || null, duration, locationId,
            service.Parent_Group_Id || 0, service.Item_Type_Id || 2, locationId
          ]
        });
        
        successCount++;
      } catch (serviceError) {
        errorCount++;
      }
    }
    
    console.log(`✅ Successfully cached: ${successCount} services`);
    if (errorCount > 0) {
      console.log(`⚠️ Errors: ${errorCount} services`);
    }
    
    return {
      locationId,
      locationName,
      totalFetched: allServices.length,
      successCount,
      errorCount
    };
    
  } catch (error) {
    console.log(`❌ Failed to populate ${locationName}: ${error.message}`);
    return {
      locationId,
      locationName,
      totalFetched: 0,
      successCount: 0,
      errorCount: 1,
      error: error.message
    };
  }
}

async function verifyLocationServices(locationId, locationName) {
  try {
    const response = await axios.post('http://localhost:5000/api/execute-sql', {
      sql_query: `
        SELECT COUNT(*) as service_count 
        FROM nailit_services 
        WHERE $1 = ANY(location_ids) AND is_enabled = true
      `,
      params: [locationId]
    });
    
    const count = response.data.service_count || 0;
    console.log(`📊 ${locationName}: ${count} services verified in RAG database`);
    return count;
  } catch (error) {
    console.log(`❌ Failed to verify ${locationName}: ${error.message}`);
    return 0;
  }
}

async function populateAllLocations() {
  console.log('🚀 LOCATION-BY-LOCATION RAG POPULATION');
  console.log('📊 Target: Cache authentic NailIt services per location for <500ms responses\n');
  
  const locations = [
    { id: 1, name: 'Al-Plaza Mall' },
    { id: 52, name: 'Zahra Complex' },
    { id: 53, name: 'Arraya Mall' }
  ];
  
  const results = [];
  
  // Step 1: Populate each location
  for (const location of locations) {
    const result = await populateByLocation(location.id, location.name);
    results.push(result);
    
    // Small delay between locations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 POPULATION COMPLETE - VERIFICATION PHASE');
  
  // Step 2: Verify each location
  let totalVerified = 0;
  for (const location of locations) {
    const verified = await verifyLocationServices(location.id, location.name);
    totalVerified += verified;
  }
  
  // Step 3: Test performance
  console.log('\n⚡ Testing performance with cached data...');
  const startTime = Date.now();
  
  try {
    const testResponse = await axios.post('http://localhost:5000/api/fresh-ai/test', {
      phoneNumber: '96599999999',
      message: 'I need a French manicure at Al-Plaza Mall'
    });
    
    const responseTime = Date.now() - startTime;
    
    console.log('\n🎉 FINAL RESULTS:');
    console.log(`📊 Total services cached: ${totalVerified}`);
    console.log(`⚡ AI response time: ${responseTime}ms`);
    console.log(`🎯 Target achieved: ${responseTime < 500 ? '✅ SUCCESS' : responseTime < 1000 ? '✅ IMPROVED' : '⚠️ PARTIAL'}`);
    
    results.forEach(r => {
      console.log(`   ${r.locationName}: ${r.successCount} services cached`);
    });
    
    if (responseTime < 500) {
      console.log('\n🚀 MISSION ACCOMPLISHED: <500ms target achieved!');
      console.log('💡 RAG system now uses fast local cache instead of live API calls');
    }
    
  } catch (testError) {
    console.log(`❌ Performance test failed: ${testError.message}`);
  }
}

// Execute the location-by-location population
populateAllLocations()
  .then(() => console.log('✅ Location-by-location population completed'))
  .catch(error => console.error('❌ Population failed:', error.message));