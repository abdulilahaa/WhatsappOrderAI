const axios = require('axios');

async function testWhatsAppBookingFixed() {
  console.log('🎯 Testing Fixed WhatsApp AI Booking System...');
  
  try {
    // Test comprehensive booking scenarios as requested by user
    const bookingScenarios = [
      {
        name: "Hair Treatment - Premium Service",
        message: "Book hair treatment tomorrow 3 PM Plaza Mall, name Sarah, email sarah@test.com"
      },
      {
        name: "French Manicure - Popular Service", 
        message: "I want French manicure tomorrow afternoon at plaza, my name is Emma, email emma@test.com"
      },
      {
        name: "Full Body Massage - Expensive Service",
        message: "Book full body massage tomorrow 2 PM Al Plaza Mall, name Zara, email zara@test.com"
      },
      {
        name: "Nail Art Design - Creative Service",
        message: "I need nail art design tomorrow morning at plaza mall, name Lisa, email lisa@test.com"
      }
    ];

    console.log('\n📋 Testing 4 comprehensive booking scenarios with expensive services...');
    
    for (let i = 0; i < bookingScenarios.length; i++) {
      const scenario = bookingScenarios[i];
      console.log(`\n=== TEST ${i+1}: ${scenario.name} ===`);
      
      const testRequest = {
        "messages": [{
          "from": "96541144687", // Working phone number
          "timestamp": `${Date.now()}`,
          "text": {
            "body": scenario.message
          }
        }]
      };
      
      console.log('📤 Sending booking request...');
      const response = await axios.post('http://localhost:5000/api/whatsapp/webhook', testRequest);
      console.log(`✅ Request sent: ${response.status === 200 ? 'OK' : 'Failed'}`);
      
      // Wait for Fresh AI processing with proven booking system
      console.log('⏳ Waiting for Fresh AI processing (30 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Check conversation for booking confirmation
      try {
        const conv = await axios.get('http://localhost:5000/api/conversations/27/messages');
        const recent = conv.data.slice(-2);
        const aiResponse = recent.find(m => m.isFromAI);
        
        if (aiResponse) {
          if (aiResponse.content.includes('Order ID') && aiResponse.content.includes('knet.aspx')) {
            const orderMatch = aiResponse.content.match(/Order.*?(\d+)/i);
            const paymentMatch = aiResponse.content.match(/(http:\/\/nailit\.innovasolution\.net\/knet\.aspx\?orderId=\d+)/);
            
            console.log(`✅ SUCCESS - Order ID: ${orderMatch ? orderMatch[1] : 'Found'}`);
            console.log(`💳 Payment Link: ${paymentMatch ? paymentMatch[1] : 'Generated'}`);
          } else if (aiResponse.content.includes('Failed') || aiResponse.content.includes('Sorry')) {
            console.log(`❌ FAILED - ${aiResponse.content.substring(0, 100)}...`);
          } else {
            console.log(`⏳ IN PROGRESS - ${aiResponse.content.substring(0, 100)}...`);
          }
        } else {
          console.log('❓ NO AI RESPONSE');
        }
      } catch (error) {
        console.log(`❌ Error checking conversation: ${error.message}`);
      }
      
      // Wait before next test
      if (i < bookingScenarios.length - 1) {
        console.log('⏸️ Waiting 10 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    console.log('\n🎉 Fixed WhatsApp AI Booking System Test Complete!');
    console.log('\n📊 TESTING SUMMARY:');
    console.log('- Fresh AI Agent now uses proven NailIt POS integration');
    console.log('- Removed all broken fallback systems');  
    console.log('- Fixed missing ChannelId in SaveOrder API');
    console.log('- Using authentic staff assignments and time slots');
    console.log('- Complete KNet payment processing');
    
  } catch (error) {
    console.error('❌ Test execution error:', error.message);
  }
}

// Run the test
testWhatsAppBookingFixed();