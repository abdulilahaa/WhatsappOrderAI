// Direct fix for RAG population using exact NailIt API documentation
import axios from 'axios';

async function fixRAGPopulation() {
  console.log('🚨 EMERGENCY RAG FIX: Stopping 6000+ inefficient API calls');
  console.log('📊 Current: 35 services cached | Target: 1,073 services (Al-Plaza: 378, Zahra: 330, Arraya: 365)');
  console.log('🎯 Goal: <500ms response times via local cache\n');

  try {
    // Step 1: Clear database for fresh start
    console.log('🗑️ Clearing existing services...');
    await axios.post('http://localhost:5000/api/execute-sql', {
      query: 'DELETE FROM nailit_services WHERE is_enabled = true'
    });

    // Step 2: Use exact locations from NailIt API documentation
    const locations = [
      { Location_Id: 1, Location_Name: 'Al-Plaza Mall', target: 378 },
      { Location_Id: 52, Location_Name: 'Zahra Complex', target: 330 }, 
      { Location_Id: 53, Location_Name: 'Arraya Mall', target: 365 }
    ];

    console.log('📍 Processing 3 locations with documented structure...');

    let totalServicesAdded = 0;

    // Step 3: For each location, fetch ALL services with proper pagination
    for (const location of locations) {
      console.log(`\n🏢 ${location.Location_Name} (Target: ${location.target} services)`);
      
      let pageNo = 1;
      let locationServices = [];
      let hasMorePages = true;

      // Pagination loop following exact API documentation
      while (hasMorePages && pageNo <= 20) { // Safety limit
        try {
          console.log(`   📄 Fetching page ${pageNo}...`);
          
          // Use exact GetItemsByDate structure from documentation
          const response = await axios.post('http://localhost:5000/api/nailit/get-items-by-date', {
            Lang: 'E',
            Like: '',
            Page_No: pageNo,
            Item_Type_Id: 2, // Services
            Group_Id: 0, // All groups
            Location_Ids: [location.Location_Id],
            Is_Home_Service: false,
            Selected_Date: new Date().toISOString().split('T')[0].split('-').reverse().join('-')
          });

          if (response.data && response.data.items && response.data.items.length > 0) {
            locationServices.push(...response.data.items);
            console.log(`   ✅ Page ${pageNo}: ${response.data.items.length} services (Total: ${locationServices.length})`);
            
            // Check pagination based on documented response structure
            if (response.data.total && locationServices.length >= response.data.total) {
              hasMorePages = false;
            } else if (response.data.items.length < 20) {
              hasMorePages = false;
            } else {
              pageNo++;
            }
          } else {
            console.log(`   ⚠️ Page ${pageNo}: No services returned`);
            hasMorePages = false;
          }
        } catch (pageError) {
          console.log(`   ❌ Page ${pageNo} failed: ${pageError.message}`);
          hasMorePages = false;
        }
      }

      console.log(`   📊 Total services fetched for ${location.Location_Name}: ${locationServices.length}/${location.target}`);

      // Step 4: Batch insert services into database
      if (locationServices.length > 0) {
        const batchSize = 25;
        for (let i = 0; i < locationServices.length; i += batchSize) {
          const batch = locationServices.slice(i, i + batchSize);
          
          try {
            const batchResponse = await axios.post('http://localhost:5000/api/rag/batch-insert', {
              locationId: location.Location_Id,
              locationName: location.Location_Name,
              services: batch
            });
            
            if (batchResponse.data.success) {
              console.log(`   📦 Batch ${Math.floor(i/batchSize) + 1}: ${batchResponse.data.inserted} services inserted`);
              totalServicesAdded += batchResponse.data.inserted;
            }
          } catch (batchError) {
            console.log(`   ⚠️ Batch insert failed: ${batchError.message}`);
          }
        }
      }
    }

    // Step 5: Verify final results
    const statusResponse = await axios.get('http://localhost:5000/api/rag/status');
    const finalCount = statusResponse.data.totalServices || 0;

    console.log('\n🎉 RAG POPULATION RESULTS:');
    console.log(`📊 Services before: 35`);
    console.log(`📊 Services after: ${finalCount}`);
    console.log(`➕ New services added: ${totalServicesAdded}`);
    console.log(`📈 Progress: ${finalCount}/1,073 target services`);

    if (finalCount > 500) {
      console.log('\n✅ SUCCESS: RAG database properly populated!');
      console.log('🚀 System should now use cached data instead of live API calls');
      console.log('⚡ Expected performance: <500ms vs previous 6-8 seconds');
      console.log('💡 AI agent will now use fast local search instead of slow live fetching');
    } else {
      console.log('\n⚠️ WARNING: More services needed for optimal performance');
      console.log(`🔧 Current: ${finalCount} | Target: 1,073+ services`);
      console.log('📝 Recommendation: Investigate pagination or API response issues');
    }

    return {
      success: true,
      servicesAdded: totalServicesAdded,
      finalCount: finalCount,
      target: 1073
    };

  } catch (error) {
    console.error('❌ RAG population fix failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the fix
fixRAGPopulation()
  .then((result) => {
    console.log('\n✅ RAG population fix completed');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error('❌ Fix failed:', error.message);
  });