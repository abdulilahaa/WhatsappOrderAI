// Test the exact working API pattern from AI system logs
import axios from 'axios';

async function testWorkingAPIPattern() {
  console.log('🧪 TESTING EXACT WORKING API PATTERN FROM AI SYSTEM');
  console.log('📊 Using Location_Ids: [] (empty array) like successful AI calls\n');
  
  try {
    // Use the exact pattern from working AI system logs:
    // 📤 GetItemsByDate request: { "Lang": "E", "Like": "", "Page_No": 1, "Item_Type_Id": 2, "Group_Id": 0, "Location_Ids": [], "Is_Home_Service": false }
    // 📥 GetItemsByDate response status: 0 Message: Success Total: 398 Items length: 20
    
    const response = await axios.post('http://localhost:5000/api/nailit/get-items-by-date', {
      lang: 'E',
      like: '',
      pageNo: 1,
      itemTypeId: 2,
      groupId: 0,
      locationIds: [], // Empty array like working AI system
      isHomeService: false,
      selectedDate: '21-07-2025'
    });
    
    if (response.data && response.data.items) {
      console.log(`✅ SUCCESS: Found ${response.data.items.length} services`);
      console.log(`📊 Total available: ${response.data.totalItems || 'Unknown'}`);
      console.log(`🎯 Status: ${response.data.status}, Message: ${response.data.message}`);
      
      // Show first few services as examples
      console.log('\n📋 Sample services found:');
      response.data.items.slice(0, 5).forEach((service, index) => {
        console.log(`   ${index + 1}. ${service.Item_Name} (ID: ${service.Item_Id}) - ${service.Special_Price || service.Primary_Price} KWD`);
        console.log(`      Locations: [${service.Location_Ids?.join(', ') || 'Unknown'}]`);
      });
      
      // Now test inserting one service directly using working SQL method
      console.log('\n🔧 Testing direct SQL insertion...');
      const testService = response.data.items[0];
      const price = testService.Special_Price || testService.Primary_Price || 0;
      const duration = parseInt(testService.Duration) || 30;
      
      const insertResult = await axios.post('http://localhost:5000/api/execute-sql', {
        sql_query: `
          INSERT INTO nailit_services (
            nailit_id, item_id, name, description, price, duration_minutes, 
            location_ids, group_id, is_enabled
          ) VALUES (
            ${testService.Item_Id + 1000000}, ${testService.Item_Id + 1000000}, 
            '${testService.Item_Name.replace(/'/g, "''")}', 
            '${(testService.Item_Desc || testService.Item_Name).replace(/'/g, "''")}',
            ${price}, ${duration}, 
            ARRAY[${testService.Location_Ids?.join(',') || '1'}]::integer[], 
            ${testService.Parent_Group_Id || 0}, true
          )
          ON CONFLICT (nailit_id) DO UPDATE SET name = EXCLUDED.name
        `
      });
      
      if (insertResult.data.success) {
        console.log('✅ SQL insertion test: SUCCESS');
        
        // Verify the insertion
        const verifyResult = await axios.post('http://localhost:5000/api/execute-sql', {
          sql_query: `SELECT COUNT(*) as count FROM nailit_services WHERE nailit_id = ${testService.Item_Id + 1000000}`
        });
        
        console.log(`📊 Verification: ${verifyResult.data?.data?.[0]?.count || 0} test service found`);
      } else {
        console.log('❌ SQL insertion test: FAILED');
        console.log(`Error: ${insertResult.data.error}`);
      }
      
      return {
        success: true,
        servicesFound: response.data.items.length,
        totalAvailable: response.data.totalItems,
        sqlWorking: insertResult.data.success,
        message: 'Working API pattern confirmed'
      };
      
    } else {
      console.log('❌ No services returned');
      return { success: false, message: 'No services found' };
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
testWorkingAPIPattern()
  .then(result => {
    console.log('\n🎉 TEST RESULTS:');
    console.log(`✅ API Pattern: ${result.success ? 'WORKING' : 'FAILED'}`);
    console.log(`📊 Services Found: ${result.servicesFound || 0}`);
    console.log(`🔧 SQL System: ${result.sqlWorking ? 'WORKING' : 'NEEDS FIX'}`);
    
    if (result.success && result.sqlWorking) {
      console.log('\n🚀 READY FOR FULL POPULATION!');
      console.log('💡 Both API calls and SQL insertion confirmed working');
    } else {
      console.log('\n🔧 Issues to resolve:');
      if (!result.success) console.log('   - API call pattern needs adjustment');
      if (!result.sqlWorking) console.log('   - SQL insertion system needs fixing');
    }
  })
  .catch(error => console.error('Test execution failed:', error.message));