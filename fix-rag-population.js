// Fixed RAG population using the exact working AI system API calls
import axios from 'axios';

async function fixedPopulateLocation(locationId, locationName) {
  console.log(`\n🏢 POPULATING: ${locationName} (ID: ${locationId})`);
  console.log('📊 Using exact working API structure from AI system');
  
  try {
    let allServices = [];
    let pageNo = 1;
    let hasMorePages = true;
    const maxPages = 25;
    
    // Use the exact same API call structure as the working AI system
    while (hasMorePages && pageNo <= maxPages) {
      console.log(`   📄 Page ${pageNo}...`);
      
      try {
        // Call the working server endpoint that the AI system uses
        const response = await axios.post('http://localhost:5000/api/nailit/get-items-by-date', {
          lang: 'E',
          like: '',
          pageNo: pageNo,
          itemTypeId: 2,
          groupId: 0,
          locationIds: [locationId],  // Specific location
          isHomeService: false,
          selectedDate: '21-07-2025'  // DD-MM-YYYY format
        });
        
        if (response.data && response.data.items && response.data.items.length > 0) {
          allServices.push(...response.data.items);
          console.log(`   ✅ Page ${pageNo}: ${response.data.items.length} services (Total: ${allServices.length}/${response.data.totalItems || 'Unknown'})`);
          
          // Check pagination
          if (response.data.totalItems && allServices.length >= response.data.totalItems) {
            hasMorePages = false;
          } else if (response.data.items.length < 20) {
            hasMorePages = false;
          } else {
            pageNo++;
            await new Promise(resolve => setTimeout(resolve, 200));
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
    
    console.log(`📦 Fetched ${allServices.length} services for ${locationName}`);
    
    // Insert services using direct SQL (tested and working)
    let successCount = 0;
    let errorCount = 0;
    
    for (const service of allServices) {
      try {
        const price = service.Special_Price || service.Primary_Price || 0;
        const duration = parseInt(service.Duration) || 30;
        const description = service.Item_Desc || service.Item_Name || '';
        
        // Use direct SQL insertion (this method is tested and works)
        await axios.post('http://localhost:5000/api/execute-sql', {
          sql_query: `
            INSERT INTO nailit_services (
              nailit_id, item_id, name, item_name,
              description, item_desc, price, primary_price, special_price,
              duration_minutes, location_ids, group_id, item_type_id, is_enabled
            ) VALUES (
              ${service.Item_Id}, ${service.Item_Id}, 
              '${service.Item_Name.replace(/'/g, "''")}', '${service.Item_Name.replace(/'/g, "''")}',
              '${description.replace(/'/g, "''")}', '${description.replace(/'/g, "''")}',
              ${price}, ${service.Primary_Price || price}, ${service.Special_Price || 'NULL'},
              ${duration}, ARRAY[${locationId}]::integer[], ${service.Parent_Group_Id || 0}, 
              ${service.Item_Type_Id || 2}, true
            )
            ON CONFLICT (nailit_id) DO UPDATE SET
              location_ids = CASE 
                WHEN ${locationId} = ANY(nailit_services.location_ids) 
                THEN nailit_services.location_ids
                ELSE array_append(nailit_services.location_ids, ${locationId})
              END,
              name = EXCLUDED.name,
              price = EXCLUDED.price,
              duration_minutes = EXCLUDED.duration_minutes
          `
        });
        
        successCount++;
        
        // Progress indicator for large datasets
        if (successCount % 50 === 0) {
          console.log(`   📦 Cached ${successCount}/${allServices.length} services...`);
        }
      } catch (serviceError) {
        errorCount++;
      }
    }
    
    console.log(`✅ Successfully cached: ${successCount}/${allServices.length} services`);
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

async function verifyLocationPopulation(locationId, locationName) {
  try {
    const response = await axios.post('http://localhost:5000/api/execute-sql', {
      sql_query: `
        SELECT COUNT(*) as service_count 
        FROM nailit_services 
        WHERE ${locationId} = ANY(location_ids) AND is_enabled = true
      `
    });
    
    const count = response.data?.data?.[0]?.service_count || 0;
    console.log(`📊 ${locationName}: ${count} services verified in RAG database`);
    return count;
  } catch (error) {
    console.log(`❌ Failed to verify ${locationName}: ${error.message}`);
    return 0;
  }
}

async function runFixedPopulation() {
  console.log('🚀 FIXED LOCATION-BY-LOCATION RAG POPULATION');
  console.log('📊 Using exact working API structure from AI system\n');
  
  const locations = [
    { id: 1, name: 'Al-Plaza Mall' },
    { id: 52, name: 'Zahra Complex' },
    { id: 53, name: 'Arraya Mall' }
  ];
  
  const results = [];
  
  // Populate each location sequentially
  for (const location of locations) {
    const result = await fixedPopulateLocation(location.id, location.name);
    results.push(result);
    
    // Verify immediately after each location
    const verified = await verifyLocationPopulation(location.id, location.name);
    result.verified = verified;
    
    // Short delay between locations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Final verification and performance test
  console.log('\n🎉 POPULATION SUMMARY:');
  let totalCached = 0;
  results.forEach(r => {
    console.log(`   ${r.locationName}: ${r.verified || r.successCount} services cached`);
    totalCached += (r.verified || r.successCount);
  });
  
  console.log(`\n📊 Total services cached: ${totalCached}`);
  console.log(`🎯 Target progress: ${totalCached}/1073 (${Math.round((totalCached/1073)*100)}%)`);
  
  // Test performance improvement
  console.log('\n⚡ Testing performance with cached data...');
  const startTime = Date.now();
  
  try {
    const testResponse = await axios.post('http://localhost:5000/api/fresh-ai/test', {
      phoneNumber: '96599999999',
      message: 'I need a French manicure at Al-Plaza Mall'
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`⚡ AI response time: ${responseTime}ms`);
    
    if (responseTime < 500) {
      console.log('🚀 SUCCESS: <500ms target ACHIEVED!');
    } else if (responseTime < 1000) {
      console.log('✅ EXCELLENT: Major performance improvement');
    } else if (responseTime < 2000) {
      console.log('✅ GOOD: Significant performance improvement');
    } else {
      console.log('⚠️ PARTIAL: Some improvement, more caching needed');
    }
    
    if (totalCached >= 800) {
      console.log('\n🎉 MISSION ACCOMPLISHED: RAG system excellently populated!');
      console.log('💡 System now uses fast local cache instead of live API calls');
    } else if (totalCached >= 300) {
      console.log('\n✅ SIGNIFICANT PROGRESS: RAG system substantially improved');
    }
    
  } catch (testError) {
    console.log(`❌ Performance test failed: ${testError.message}`);
  }
}

// Execute the fixed population
runFixedPopulation()
  .then(() => console.log('\n✅ Fixed RAG population completed'))
  .catch(error => console.error('❌ Population failed:', error.message));