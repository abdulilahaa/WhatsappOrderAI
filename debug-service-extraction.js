import axios from 'axios';

async function debugServiceExtraction() {
  console.log('🔍 Debugging Service Extraction Issues...');
  
  try {
    // Test if we can find specific services
    console.log('\n1. Testing service search for common requests...');
    
    const searchTests = [
      { query: 'french manicure', expectedId: 279 },
      { query: 'hair treatment', expectedId: 203 },
      { query: 'classic pedicure', expectedId: 1058 },
      { query: 'facial', locationId: 1 },
      { query: 'nail art', locationId: 1 }
    ];
    
    for (const test of searchTests) {
      console.log(`\n🔍 Searching for: "${test.query}"`);
      
      // Search in Al-Plaza Mall services
      const response = await axios.get(`http://localhost:5000/api/nailit/products-by-location/1`);
      
      if (response.data && response.data.services) {
        const found = response.data.services.filter(service => 
          service.Item_Name.toLowerCase().includes(test.query.toLowerCase()) ||
          service.Item_Desc?.toLowerCase().includes(test.query.toLowerCase())
        );
        
        console.log(`✅ Found ${found.length} matching services:`);
        found.slice(0, 3).forEach(service => {
          console.log(`   - ${service.Item_Name} (ID: ${service.Item_Id}) - ${service.Price} KWD`);
        });
      }
    }
    
    // Test actual booking with simple request
    console.log('\n2. Testing simple booking request...');
    const simpleBooking = {
      "messages": [{
        "from": "96541144687",
        "timestamp": `${Date.now()}`,
        "text": {
          "body": "Book french manicure tomorrow 2 PM Plaza Mall, name Test User, email test@example.com"
        }
      }]
    };
    
    console.log('📤 Sending simple booking request...');
    const webhookResponse = await axios.post('http://localhost:5000/api/whatsapp/webhook', simpleBooking);
    console.log(`✅ Webhook status: ${webhookResponse.status}`);
    
    // Wait and check response
    console.log('⏳ Waiting 30 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Check what happened
    const conversationResponse = await axios.get('http://localhost:5000/api/conversations/27/messages');
    const recentMessages = conversationResponse.data.slice(-3);
    
    console.log('\n📨 Recent conversation messages:');
    recentMessages.forEach((msg, index) => {
      const sender = msg.isFromAI ? '🤖 AI' : '👤 Customer';
      console.log(`${index + 1}. ${sender}: ${msg.content.substring(0, 200)}`);
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugServiceExtraction();