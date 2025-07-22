import axios from 'axios';

async function getRealServices() {
  console.log('🔍 Getting REAL services from NailIt API...');
  
  try {
    // Get real services from location 1 (Al-Plaza Mall) using working endpoint
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
    
    console.log('📋 Real NailIt Services (First 10):');
    console.log('Raw response:', JSON.stringify(response.data, null, 2));
    const services = response.data.Items ? response.data.Items.slice(0, 10) : [];
    
    services.forEach((service, index) => {
      console.log(`${index + 1}. ID: ${service.Item_Id} | Name: "${service.Item_Name}" | Price: ${service.Item_Price} KWD`);
      if (service.Item_Desc && service.Item_Desc.trim()) {
        console.log(`   Description: ${service.Item_Desc.substring(0, 60)}...`);
      }
    });
    
    // Find nail-related services
    console.log('\n💅 NAIL-RELATED SERVICES:');
    const nailServices = response.data.items.filter(service => 
      service.Item_Name.toLowerCase().includes('nail') ||
      service.Item_Name.toLowerCase().includes('manicure') ||
      service.Item_Name.toLowerCase().includes('pedicure')
    ).slice(0, 5);
    
    nailServices.forEach(service => {
      console.log(`✨ ID: ${service.Item_Id} | Name: "${service.Item_Name}" | Price: ${service.Item_Price} KWD`);
    });
    
    // Show a popular service for testing
    const firstService = services[0];
    console.log(`\n🎯 USING FOR TESTING:`);
    console.log(`Service ID: ${firstService.Item_Id}`);
    console.log(`Service Name: "${firstService.Item_Name}"`);
    console.log(`Price: ${firstService.Item_Price} KWD`);
    
  } catch (error) {
    console.error('❌ Failed to get real services:', error.response?.data || error.message);
  }
}

getRealServices();