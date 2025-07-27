import axios from 'axios';

async function runDiagnostic() {
  console.log('🔍 Running Deep Diagnostic Test...');
  
  try {
    // Simple diagnostic request
    const testData = {
      "messages": [{
        "from": "96541144687",
        "timestamp": `${Date.now()}`,
        "text": {
          "body": "Book nail service tomorrow Plaza Mall, name Test User, email test@example.com"
        }
      }]
    };
    
    console.log('📤 Sending diagnostic request...');
    console.log('📋 Request:', JSON.stringify(testData, null, 2));
    
    const startTime = Date.now();
    const response = await axios.post('http://localhost:5000/api/whatsapp/webhook', testData);
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ Webhook Status: ${response.status} (${responseTime}ms)`);
    
    // Wait shorter time and check immediately
    console.log('⏳ Waiting 30 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Get conversation messages
    const messagesResponse = await axios.get('http://localhost:5000/api/conversations/27/messages');
    const allMessages = messagesResponse.data;
    
    console.log(`📨 Total messages in conversation: ${allMessages.length}`);
    
    // Get the last few messages
    const recentMessages = allMessages.slice(-4);
    
    console.log('\n📋 Recent Message History:');
    recentMessages.forEach((msg, index) => {
      const sender = msg.isFromAI ? '🤖 AI' : '👤 Customer';
      const timestamp = new Date(msg.timestamp).toLocaleTimeString();
      console.log(`${index + 1}. ${sender} (${timestamp}): ${msg.content}`);
    });
    
    // Analyze the AI response
    const latestAI = recentMessages.filter(m => m.isFromAI).pop();
    
    if (latestAI) {
      console.log('\n🔍 AI Response Analysis:');
      
      if (latestAI.content.includes('Order ID')) {
        console.log('✅ SUCCESS: Order created!');
        const orderMatch = latestAI.content.match(/Order.*?(\d+)/i);
        const paymentMatch = latestAI.content.match(/(http:\/\/nailit\.innovasolution\.net\/knet\.aspx\?orderId=\d+)/);
        console.log(`🎯 Order ID: ${orderMatch ? orderMatch[1] : 'Not found'}`);
        console.log(`💳 Payment Link: ${paymentMatch ? paymentMatch[1] : 'Not found'}`);
      } else if (latestAI.content.includes('Failed to create booking')) {
        console.log('❌ BOOKING FAILED');
        console.log('   - Still encountering booking creation errors');
        console.log('   - Need to check server logs for specific error details');
      } else if (latestAI.content.includes('availability')) {
        console.log('⏰ ALTERNATIVE TIMES OFFERED');
        console.log('   - Staff availability checking working');
        console.log('   - System offering alternative time slots');
      } else {
        console.log('❓ UNKNOWN RESPONSE TYPE');
        console.log(`   - Response: ${latestAI.content.substring(0, 150)}...`);
      }
    } else {
      console.log('❌ NO AI RESPONSE FOUND');
    }
    
    // Check for any pattern in failures
    const failureCount = allMessages.filter(m => m.isFromAI && m.content.includes('Failed')).length;
    const successCount = allMessages.filter(m => m.isFromAI && m.content.includes('Order ID')).length;
    
    console.log('\n📊 Historical Performance:');
    console.log(`   ✅ Total Successful Orders: ${successCount}`);
    console.log(`   ❌ Total Failed Attempts: ${failureCount}`);
    console.log(`   📈 Success Rate: ${successCount}/${successCount + failureCount} (${Math.round(successCount/(successCount + failureCount)*100) || 0}%)`);
    
  } catch (error) {
    console.error('❌ Diagnostic test failed:', error.message);
    if (error.response) {
      console.error('   HTTP Status:', error.response.status);
      console.error('   Response:', error.response.data);
    }
  }
}

runDiagnostic();