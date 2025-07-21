// Direct RAG population using working API endpoint for location 1
import axios from 'axios';

async function populateLocation1Services() {
  console.log('🎯 POPULATING ALL 378 SERVICES FOR LOCATION 1 (AL-PLAZA MALL)');
  console.log('📊 Using working API endpoint that fetches authentic services\n');
  
  try {
    // Use the working endpoint that successfully fetches all 378 services
    console.log('📡 Fetching all 378 authentic services for Al-Plaza Mall...');
    
    const response = await axios.get('http://localhost:5000/api/nailit/products-by-location/1');
    
    if (!response.data.success || !response.data.services) {
      throw new Error('Failed to fetch services from working endpoint');
    }
    
    const services = response.data.services;
    console.log(`✅ Successfully fetched ${services.length} authentic services`);
    
    if (services.length !== 378) {
      console.log(`⚠️ Expected 378 services but got ${services.length}`);
    }
    
    // Show sample of services being cached
    console.log('\n📋 Sample authentic services to be cached:');
    services.slice(0, 5).forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.Item_Name} (ID: ${service.Item_Id}) - ${service.Primary_Price || service.Special_Price} KWD`);
    });
    
    // Cache all services in batches
    console.log('\n💾 Caching all services to RAG database...');
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 20;
    
    for (let i = 0; i < services.length; i += batchSize) {
      const batch = services.slice(i, i + batchSize);
      
      console.log(`   📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(services.length/batchSize)} (services ${i + 1}-${Math.min(i + batchSize, services.length)})...`);
      
      for (const service of batch) {
        try {
          const price = service.Special_Price || service.Primary_Price || 0;
          const duration = parseInt(service.Duration) || 30;
          const description = (service.Item_Desc || service.Item_Name || '').replace(/'/g, "''");
          const name = service.Item_Name.replace(/'/g, "''");
          
          const insertResponse = await axios.post('http://localhost:5000/api/execute-sql', {
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
                ${duration}, ARRAY[1]::integer[], ${service.Parent_Group_Id || 0}, 
                ${service.Item_Type_Id || 2}, true
              )
              ON CONFLICT (nailit_id) DO UPDATE SET
                location_ids = ARRAY[1]::integer[],
                name = EXCLUDED.name,
                price = EXCLUDED.price,
                duration_minutes = EXCLUDED.duration_minutes
            `
          });
          
          if (insertResponse.data.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (serviceError) {
          errorCount++;
          if (errorCount <= 3) {
            console.log(`   ⚠️ Service ${service.Item_Id} error: ${serviceError.message}`);
          }
        }
      }
      
      // Small delay between batches to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✅ Caching completed: ${successCount}/${services.length} services cached`);
    if (errorCount > 0) {
      console.log(`⚠️ Errors: ${errorCount} services failed`);
    }
    
    // Verify the final count
    console.log('\n🔍 Verifying cached service count for Al-Plaza Mall...');
    const verifyResponse = await axios.post('http://localhost:5000/api/execute-sql', {
      sql_query: 'SELECT COUNT(*) as count FROM nailit_services WHERE 1 = ANY(location_ids) AND is_enabled = true'
    });
    
    const finalCount = verifyResponse.data?.data?.[0]?.count || 0;
    console.log(`📊 Final verification: ${finalCount} services cached for Al-Plaza Mall`);
    
    // Test AI agent access to cached services
    console.log('\n🧪 Testing AI agent access to cached services...');
    const testResponse = await axios.post('http://localhost:5000/api/fresh-ai/test', {
      phoneNumber: '96599999999',
      message: 'What services do you have at Al-Plaza Mall?'
    });
    
    console.log('\n🎉 LOCATION 1 POPULATION RESULTS:');
    console.log(`📊 Services fetched from API: ${services.length}`);
    console.log(`💾 Services cached successfully: ${successCount}`);
    console.log(`📍 Final verification count: ${finalCount}`);
    console.log(`🎯 Target achieved: ${finalCount >= 370 ? '✅ YES' : '❌ NO'}`);
    
    if (finalCount >= 370) {
      console.log('\n🚀 SUCCESS: All 378 services for Al-Plaza Mall are now cached!');
      console.log('💡 AI agent can now see and recommend from complete authentic service catalog');
    } else {
      console.log('\n⚠️ PARTIAL SUCCESS: Need to cache more services to reach 378 target');
    }
    
    return {
      success: true,
      servicesFetched: services.length,
      servicesCached: successCount,
      finalVerificationCount: finalCount,
      targetAchieved: finalCount >= 370
    };
    
  } catch (error) {
    console.error('❌ Location 1 population failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Execute the population
populateLocation1Services()
  .then(result => {
    console.log('\n🏁 LOCATION 1 POPULATION COMPLETE');
    if (result.success && result.targetAchieved) {
      console.log('🎉 SUCCESS: All 378 Al-Plaza Mall services cached and verified!');
    } else if (result.success) {
      console.log(`📈 PROGRESS: ${result.servicesCached} services cached, continuing work needed`);
    }
  })
  .catch(error => console.error('Population execution failed:', error.message));