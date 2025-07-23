import axios from 'axios';

async function debugNailItRejection() {
  console.log('🔍 Debugging NailIt API Rejection Issues...');
  
  try {
    // Test GetServiceStaff API to see real availability
    console.log('1. Testing GetServiceStaff API for real availability...');
    const staffResponse = await axios.post('http://localhost:5000/api/nailit/get-service-staff', {
      ItemId: 163, // Nail It henna brown
      LocationId: 1, // Al-Plaza Mall
      Language: 'E',
      Date: '24-07-2025'
    });
    
    console.log('📊 Real Staff Availability Response:');
    console.log(JSON.stringify(staffResponse.data, null, 2));
    
    if (staffResponse.data.Staff && staffResponse.data.Staff.length > 0) {
      console.log('\n👥 Available Staff Members:');
      staffResponse.data.Staff.forEach(staff => {
        console.log(`- ${staff.Staff_Name} (ID: ${staff.Staff_Id}) - Available: ${staff.Available_Time_Slots || 'Unknown'}`);
      });
    }
    
    // Test service details to understand duration requirements
    console.log('\n2. Testing service details for duration calculation...');
    const servicesResponse = await axios.get('http://localhost:5000/api/nailit/services?locationId=1&page=1');
    
    const nailService = servicesResponse.data.items?.find(item => item.Item_Id === 163);
    if (nailService) {
      console.log('📋 Service Details for Nail It henna brown:');
      console.log(`- Duration: ${nailService.Duration || 'Not specified'} minutes`);
      console.log(`- Price: ${nailService.Price} KWD`);
      console.log(`- Item Type: ${nailService.Item_Type_Id}`);
      console.log(`- Group: ${nailService.Group_Id}`);
    }
    
    // Test what parameters NailIt SaveOrder actually expects
    console.log('\n3. Last successful order parameters vs rejected order...');
    console.log('We need to compare:');
    console.log('- Time slot selection (are we using correct slots?)');
    console.log('- Staff assignment (are we assigning available staff?)');
    console.log('- Service duration calculation (booking enough time?)');
    console.log('- Date format (DD/MM/yyyy vs MM/dd/yyyy?)');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugNailItRejection();