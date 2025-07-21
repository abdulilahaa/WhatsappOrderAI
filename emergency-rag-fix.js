// EMERGENCY: Stop inefficient live API calls and populate RAG properly
import axios from 'axios';

async function emergencyRAGFix() {
  console.log('🚨 EMERGENCY RAG FIX: Stopping 6000+ inefficient API calls');
  console.log('📊 Problem: System making thousands of live API calls instead of using cache');
  console.log('🎯 Solution: Populate RAG with authentic NailIt services for <500ms response\n');

  try {
    // Get current database state
    const statusResponse = await axios.get('http://localhost:5000/api/rag/status');
    console.log(`📊 Current services in database: ${statusResponse.data.totalServices}`);
    
    // Test with known working locations (from logs we see these IDs work)
    const knownLocations = [
      { Location_Id: 1, Location_Name: 'Al-Plaza Mall' },
      { Location_Id: 52, Location_Name: 'SoKu Mall' }, 
      { Location_Id: 53, Location_Name: 'Avenues Phase IV' }
    ];
    
    console.log(`🏢 Processing ${knownLocations.length} locations with authentic NailIt data`);

    let totalServicesAdded = 0;

    // For each location, get real services from NailIt API
    for (const location of knownLocations) {
      console.log(`\n📍 Processing ${location.Location_Name} (ID: ${location.Location_Id})`);
      
      try {
        // Use the same API call that's working in the background
        const response = await axios.post('http://localhost:5000/api/nailit/get-items-by-date', {
          Lang: 'E',
          Like: '',
          Page_No: 1,
          Item_Type_Id: 2,
          Group_Id: 0,
          Location_Ids: [location.Location_Id],
          Is_Home_Service: false,
          Selected_Date: new Date().toISOString().split('T')[0].split('-').reverse().join('-')
        });

        if (response.data && response.data.items && response.data.items.length > 0) {
          const services = response.data.items;
          console.log(`   ✅ Found ${services.length} authentic services from NailIt API`);

          // Insert services in batches
          const batchSize = 10;
          for (let i = 0; i < services.length; i += batchSize) {
            const batch = services.slice(i, i + batchSize);
            
            try {
              const batchResponse = await axios.post('http://localhost:5000/api/rag/batch-insert', {
                locationId: location.Location_Id,
                locationName: location.Location_Name,
                services: batch
              });
              
              if (batchResponse.data.success) {
                console.log(`   📦 Batch ${Math.floor(i/batchSize) + 1}: ${batchResponse.data.inserted} services stored`);
                totalServicesAdded += batchResponse.data.inserted;
              }
            } catch (batchError) {
              console.log(`   ⚠️ Batch failed: ${batchError.message}`);
            }
            
            // Small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } else {
          console.log(`   ⚠️ No services found for ${location.Location_Name}`);
        }
      } catch (locationError) {
        console.log(`   ❌ Failed to fetch services for ${location.Location_Name}: ${locationError.message}`);
      }
    }

    // Verify final state
    const finalStatus = await axios.get('http://localhost:5000/api/rag/status');
    
    console.log('\n🎉 EMERGENCY RAG FIX RESULTS:');
    console.log(`📊 Services before: ${statusResponse.data.totalServices}`);
    console.log(`📊 Services after: ${finalStatus.data.totalServices}`);
    console.log(`➕ New services added: ${totalServicesAdded}`);
    console.log(`📈 Total improvement: ${finalStatus.data.totalServices - statusResponse.data.totalServices} services`);
    
    if (finalStatus.data.totalServices > 100) {
      console.log('\n✅ SUCCESS: RAG database properly populated!');
      console.log('🚀 System should now use cached data instead of live API calls');
      console.log('⚡ Expected performance: <500ms vs previous 6-8 seconds');
      console.log('💡 Next: AI agent will use fast local search instead of slow live fetching');
    } else {
      console.log('\n⚠️ WARNING: More services needed for optimal performance');
      console.log('🔧 Recommendation: Run additional population cycles');
    }

  } catch (error) {
    console.error('❌ Emergency RAG fix failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the emergency fix
emergencyRAGFix()
  .then(() => console.log('\n✅ Emergency RAG fix completed'))
  .catch(error => console.error('❌ Emergency fix failed:', error.message));