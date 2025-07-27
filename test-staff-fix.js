import axios from 'axios';

async function testStaffFix() {
  console.log('🔧 Testing Staff Availability Fix...');
  
  try {
    console.log('\n=== Testing French Manicure with Staff Fix ===');
    const testData = {
      "messages": [{
        "from": "96541144687",
        "timestamp": `${Date.now()}`,
        "text": {
          "body": "I want French Manicure tomorrow 3 PM Plaza Mall, Sarah test@gmail.com"
        }
      }]
    };
    
    console.log('📤 Sending booking request...');
    const response = await axios.post('http://localhost:5000/api/whatsapp/webhook', testData);
    console.log(`✅ Status: ${response.status}`);
    
    // Wait for processing
    console.log('⏳ Waiting 50 seconds for AI processing...');
    await new Promise(resolve => setTimeout(resolve, 50000));
    
    // Check results
    const conv = await axios.get('http://localhost:5000/api/conversations/27/messages');
    const recent = conv.data.slice(-2);
    
    console.log('\n📨 Latest messages:');
    recent.forEach((msg, i) => {
      const sender = msg.isFromAI ? '🤖 AI' : '👤 Customer';
      console.log(`${i+1}. ${sender}: ${msg.content}`);
    });
    
    // Check for success vs failure
    const aiResponse = recent.find(m => m.isFromAI);
    if (aiResponse) {
      if (aiResponse.content.includes('Order ID')) {
        console.log('\n✅ SUCCESS: Order created successfully!');
        const orderMatch = aiResponse.content.match(/Order.*?(\d+)/i);
        const paymentMatch = aiResponse.content.match(/(http:\/\/nailit\.innovasolution\.net\/knet\.aspx\?orderId=\d+)/);
        
        console.log(`🎯 Order ID: ${orderMatch ? orderMatch[1] : 'Not found'}`);
        console.log(`💳 Payment Link: ${paymentMatch ? paymentMatch[1] : 'Not found'}`);
      } else if (aiResponse.content.includes('Failed to create booking')) {
        console.log('\n❌ FAILED: Still getting booking failure');
      } else if (aiResponse.content.includes('availability')) {
        console.log('\n⏰ ALTERNATIVE TIMES: AI offering alternative times');
      } else {
        console.log('\n❓ UNKNOWN: Different response type');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testStaffFix();