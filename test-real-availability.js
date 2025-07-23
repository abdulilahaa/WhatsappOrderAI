import axios from 'axios';

async function testRealAvailability() {
  console.log('🔍 Testing Real Staff Availability Integration...');
  
  try {
    // Test GetServiceStaff API directly to see real data structure
    console.log('\n1. Testing GetServiceStaff API directly...');
    const staffResponse = await axios.post('http://localhost:5000/api/nailit/get-service-staff', {
      ItemId: 279, // French Manicure
      LocationId: 1, // Al-Plaza Mall
      Language: 'E',
      Date: '24-07-2025'
    });
    
    console.log('📊 Real GetServiceStaff Response Structure:');
    console.log(JSON.stringify(staffResponse.data, null, 2));
    
    if (staffResponse.data && Array.isArray(staffResponse.data)) {
      console.log(`\n👥 Found ${staffResponse.data.length} staff members:`);
      staffResponse.data.forEach((staff, index) => {
        console.log(`${index + 1}. ${staff.Staff_Name || staff.Name} (ID: ${staff.Staff_Id || staff.Id})`);
        console.log(`   Available slots: ${staff.Available_Time_Slots || 'None specified'}`);
        console.log(`   Extra time: ${staff.Extra_Time || 0} minutes`);
      });
    }
    
    // Test what happens when we request booking for French Manicure
    console.log('\n2. Testing booking flow with real staff availability...');
    
    const bookingRequest = {
      "messages": [{
        "from": "96541144687",
        "timestamp": "1753267000",
        "text": {
          "body": "Book French Manicure tomorrow at 11 AM Plaza Mall, name Fatima, email fatima@test.com"
        }
      }]
    };
    
    console.log('🔄 Sending booking request...');
    const response = await axios.post('http://localhost:5000/api/whatsapp/webhook', bookingRequest);
    
    console.log(`✅ Request processed: ${response.status === 200}`);
    console.log('Waiting for AI processing...');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRealAvailability();