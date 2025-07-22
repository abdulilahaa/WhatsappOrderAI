import axios from 'axios';

async function getFirstRealService() {
  try {
    console.log('🔍 Getting FIRST REAL service from NailIt API...');
    
    const response = await axios.post('http://localhost:5000/api/nailit/get-items-by-date', {
      Lang: 'E',
      Like: '',
      Page_No: 1,
      Item_Type_Id: 2,
      Group_Id: 0,
      Location_Ids: [1],
      Is_Home_Service: false,
      Selected_Date: '22-07-2025'
    });
    
    if (response.data && response.data.Items && response.data.Items.length > 0) {
      const firstService = response.data.Items[0];
      console.log('✅ FIRST REAL SERVICE:');
      console.log(`   Service ID: ${firstService.Item_Id}`);
      console.log(`   Name: "${firstService.Item_Name}"`);
      console.log(`   Price: ${firstService.Item_Price} KWD`);
      console.log(`   Description: ${firstService.Item_Desc || 'N/A'}`);
      
      console.log('\n🎯 TESTING WITH THIS REAL SERVICE');
      return firstService;
    } else {
      console.log('❌ No services found in API response');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error getting real service:', error.response?.data || error.message);
  }
}

getFirstRealService();