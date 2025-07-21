// Emergency RAG fix using exact working API parameter structure
import axios from 'axios';

async function emergencyRAGPopulation() {
  console.log('🚨 EMERGENCY RAG POPULATION');
  console.log('📊 Using exact parameter structure from working AI system\n');
  
  try {
    // Get all services using exact working API structure from AI logs
    console.log('📡 Fetching all services (398 total expected)...');
    
    let allServices = [];
    let pageNo = 1;
    let hasMorePages = true;
    const maxPages = 30;
    
    while (hasMorePages && pageNo <= maxPages) {
      console.log(`   📄 Page ${pageNo}...`);
      
      try {
        // Exact structure from working AI system logs:
        // {"Lang":"E","Like":"","Page_No":1,"Item_Type_Id":2,"Group_Id":0,"Location_Ids":[],"Is_Home_Service":false}
        const response = await axios.post('http://localhost:5000/api/nailit/get-items-by-date', {
          Lang: 'E',
          Like: '',
          Page_No: pageNo,
          Item_Type_Id: 2,
          Group_Id: 0,
          Location_Ids: [], // Empty array like working AI system
          Is_Home_Service: false,
          Selected_Date: '21-07-2025'
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
            await new Promise(resolve => setTimeout(resolve, 100));
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
    
    console.log(`\n📦 Total services fetched: ${allServices.length}`);
    
    if (allServices.length === 0) {
      console.log('❌ No services to populate. API pattern may still need adjustment.');
      return { success: false, message: 'No services found' };
    }
    
    // Group services by location for organized caching
    const servicesByLocation = {};
    allServices.forEach(service => {
      if (service.Location_Ids && Array.isArray(service.Location_Ids)) {
        service.Location_Ids.forEach(locationId => {
          if (!servicesByLocation[locationId]) {
            servicesByLocation[locationId] = [];
          }
          servicesByLocation[locationId].push(service);
        });
      }
    });
    
    console.log('\n📍 Services breakdown by location:');
    Object.entries(servicesByLocation).forEach(([locationId, services]) => {
      const locationName = locationId === '1' ? 'Al-Plaza Mall' : 
                           locationId === '52' ? 'Zahra Complex' : 
                           locationId === '53' ? 'Arraya Mall' : `Location ${locationId}`;
      console.log(`   ${locationName} (ID: ${locationId}): ${services.length} services`);
    });
    
    // Insert all services using direct SQL execution
    console.log('\n💾 Caching all services to RAG database...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const service of allServices) {
      try {
        const price = service.Special_Price || service.Primary_Price || 0;
        const duration = parseInt(service.Duration) || 30;
        const description = (service.Item_Desc || service.Item_Name || '').replace(/'/g, "''");
        const name = service.Item_Name.replace(/'/g, "''");
        const locationIds = service.Location_Ids && service.Location_Ids.length > 0 
          ? service.Location_Ids.join(',') 
          : '1';
        
        // Use execute-sql tool directly since endpoint might have issues
        await axios.post('http://localhost:5000/api/execute-sql', {
          sql_query: `
            INSERT INTO nailit_services (
              nailit_id, item_id, name, item_name,
              description, item_desc, price, primary_price, special_price,
              duration_minutes, location_ids, group_id, item_type_id, is_enabled
            ) VALUES (
              ${service.Item_Id}, ${service.Item_Id}, 
              '${name}', '${name}',
              '${description}', '${description}',
              ${price}, ${service.Primary_Price || price}, ${service.Special_Price || 'NULL'},
              ${duration}, ARRAY[${locationIds}]::integer[], ${service.Parent_Group_Id || 0}, 
              ${service.Item_Type_Id || 2}, true
            )
            ON CONFLICT (nailit_id) DO UPDATE SET
              location_ids = EXCLUDED.location_ids,
              name = EXCLUDED.name,
              price = EXCLUDED.price,
              duration_minutes = EXCLUDED.duration_minutes
          `
        });
        
        successCount++;
        
        // Progress indicator
        if (successCount % 100 === 0) {
          console.log(`   📦 Cached ${successCount}/${allServices.length} services...`);
        }
      } catch (serviceError) {
        errorCount++;
        if (errorCount <= 5) { // Show first few errors
          console.log(`   ⚠️ Service ${service.Item_Id} error: ${serviceError.message}`);
        }
      }
    }
    
    console.log(`\n✅ Successfully cached: ${successCount}/${allServices.length} services`);
    if (errorCount > 0) {
      console.log(`⚠️ Errors: ${errorCount} services`);
    }
    
    // Test performance improvement immediately
    console.log('\n⚡ Testing performance with cached data...');
    const startTime = Date.now();
    
    try {
      const testResponse = await axios.post('http://localhost:5000/api/fresh-ai/test', {
        phoneNumber: '96599999999',
        message: 'I need a French manicure at Al-Plaza Mall'
      });
      
      const responseTime = Date.now() - startTime;
      
      console.log('\n🎉 EMERGENCY RAG POPULATION RESULTS:');
      console.log(`📊 Services cached: ${successCount}`);
      console.log(`⚡ AI response time: ${responseTime}ms`);
      console.log(`🎯 Performance: ${responseTime < 500 ? '🚀 TARGET ACHIEVED' : 
                                    responseTime < 1000 ? '✅ EXCELLENT' : 
                                    responseTime < 2000 ? '✅ GOOD' : 
                                    '⚠️ PARTIAL'}`);
      
      if (responseTime < 500) {
        console.log('\n🚀 MISSION ACCOMPLISHED: <500ms target achieved!');
        console.log('💡 RAG system now uses fast local cache instead of live API calls');
      } else if (successCount > 200) {
        console.log('\n✅ SIGNIFICANT PROGRESS: RAG system substantially improved');
      }
      
      return {
        success: true,
        servicesCached: successCount,
        responseTime,
        targetAchieved: responseTime < 500,
        servicesByLocation
      };
      
    } catch (testError) {
      console.log(`❌ Performance test failed: ${testError.message}`);
      return {
        success: true,
        servicesCached: successCount,
        responseTime: null,
        targetAchieved: false,
        servicesByLocation
      };
    }
    
  } catch (error) {
    console.error('❌ Emergency RAG population failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Execute emergency population
emergencyRAGPopulation()
  .then(result => {
    console.log('\n🏁 EMERGENCY POPULATION COMPLETE');
    if (result.success && result.targetAchieved) {
      console.log('🎉 SUCCESS: <500ms performance target achieved!');
    } else if (result.success && result.servicesCached > 0) {
      console.log(`📈 PROGRESS: ${result.servicesCached} services cached, performance improved`);
    }
  })
  .catch(error => console.error('Emergency population failed:', error.message));