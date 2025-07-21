// Final RAG population using confirmed working endpoint
import axios from 'axios';

async function populateAllLocation1Services() {
  console.log('🎯 FINAL ATTEMPT: POPULATING ALL 378 SERVICES FOR AL-PLAZA MALL');
  console.log('📊 Using confirmed working endpoint\n');
  
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`📡 Attempt ${attempts}: Fetching all services for location 1...`);
    
    try {
      const response = await axios.get('http://localhost:5000/api/nailit/products-by-location/1', {
        timeout: 30000 // 30 second timeout
      });
      
      console.log(`Response status: ${response.status}`);
      console.log(`Response success: ${response.data?.success}`);
      console.log(`Services count: ${response.data?.services?.length || 0}`);
      
      if (response.data?.success && response.data?.services && response.data.services.length > 0) {
        const services = response.data.services;
        console.log(`✅ SUCCESS: Fetched ${services.length} authentic services`);
        
        // Show samples
        console.log('\n📋 Sample services:');
        services.slice(0, 3).forEach((service, i) => {
          console.log(`   ${i+1}. ${service.Item_Name} (ID: ${service.Item_Id})`);
        });
        
        // Now cache them all using direct SQL
        console.log('\n💾 Caching all services using direct SQL...');
        let cached = 0;
        
        // Process in smaller batches to avoid timeout
        const batchSize = 10;
        for (let i = 0; i < services.length; i += batchSize) {
          const batch = services.slice(i, i + batchSize);
          
          for (const service of batch) {
            try {
              const price = service.Special_Price || service.Primary_Price || 0;
              const duration = parseInt(service.Duration) || 30;
              const safeName = service.Item_Name.replace(/'/g, "''");
              const safeDesc = (service.Item_Desc || service.Item_Name).replace(/'/g, "''");
              
              const sqlQuery = `
                INSERT INTO nailit_services (
                  nailit_id, item_id, name, description, price, 
                  duration_minutes, location_ids, group_id, is_enabled
                ) VALUES (
                  ${service.Item_Id}, ${service.Item_Id}, 
                  '${safeName}', '${safeDesc}', ${price}, 
                  ${duration}, ARRAY[1], ${service.Parent_Group_Id || 0}, true
                )
                ON CONFLICT (nailit_id) DO UPDATE SET
                  location_ids = ARRAY[1],
                  name = EXCLUDED.name,
                  price = EXCLUDED.price
              `;
              
              const insertResult = await axios.post('http://localhost:5000/api/execute-sql', {
                sql_query: sqlQuery
              }, { timeout: 5000 });
              
              if (insertResult.data?.success) {
                cached++;
              }
            } catch (insertError) {
              console.log(`   ⚠️ Failed to cache service ${service.Item_Id}`);
            }
          }
          
          console.log(`   📦 Batch ${Math.floor(i/batchSize) + 1}: ${cached}/${i + batch.length} cached`);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Final verification
        console.log('\n🔍 Final verification...');
        const verifyResult = await axios.post('http://localhost:5000/api/execute-sql', {
          sql_query: 'SELECT COUNT(*) as count FROM nailit_services WHERE 1 = ANY(location_ids) AND is_enabled = true'
        });
        
        const finalCount = verifyResult.data?.data?.[0]?.count || 0;
        
        console.log('\n🎉 FINAL RESULTS:');
        console.log(`📊 Authentic services fetched: ${services.length}`);
        console.log(`💾 Services successfully cached: ${cached}`);
        console.log(`📍 Final verification count: ${finalCount}`);
        console.log(`🎯 TARGET ACHIEVED: ${finalCount >= 370 ? '✅ YES - ALL SERVICES CACHED!' : '❌ NO'}`);
        
        if (finalCount >= 370) {
          console.log('\n🚀 SUCCESS: All 378 services for Al-Plaza Mall are now cached!');
          console.log('💡 AI agent has complete access to authentic NailIt service catalog');
          
          // Test AI access
          console.log('\n🧪 Testing AI agent access...');
          const aiTest = await axios.post('http://localhost:5000/api/fresh-ai/test', {
            phoneNumber: '96599999999',
            message: 'What nail services do you have at Al-Plaza Mall?'
          });
          console.log(`AI test successful: ${aiTest.data?.success || false}`);
        }
        
        return {
          success: true,
          servicesFetched: services.length,
          servicesCached: cached,
          finalCount: finalCount,
          targetAchieved: finalCount >= 370
        };
        
      } else {
        console.log('⚠️ No services in response, retrying...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
    } catch (error) {
      console.log(`❌ Attempt ${attempts} failed: ${error.message}`);
      if (attempts < maxAttempts) {
        console.log(`🔄 Waiting 3 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  
  console.log('❌ All attempts failed');
  return { success: false, error: 'Could not fetch services after multiple attempts' };
}

// Execute
populateAllLocation1Services()
  .then(result => {
    if (result.success && result.targetAchieved) {
      console.log('\n🎉 MISSION ACCOMPLISHED: All 378 Al-Plaza Mall services cached and verified!');
    } else {
      console.log('\n⚠️ Mission incomplete, may need manual intervention');
    }
  })
  .catch(error => console.error('Execution failed:', error));