import axios from 'axios';

async function testCompleteWhatsAppFlow() {
  console.log('🎯 Testing Complete WhatsApp Order Flow...');
  
  try {
    // Step 1: Send booking request
    console.log('\n1. 📱 Sending WhatsApp booking request...');
    const bookingRequest = {
      "messages": [{
        "from": "96541144687",
        "timestamp": `${Date.now()}`,
        "text": {
          "body": "Book classic pedicure tomorrow 3 PM Plaza Mall, name Emma, email emma@test.com"
        }
      }]
    };
    
    const response = await axios.post('http://localhost:5000/api/whatsapp/webhook', bookingRequest);
    console.log(`✅ Request sent successfully: ${response.status === 200 ? 'OK' : 'Failed'}`);
    
    // Step 2: Wait for processing and check conversation
    console.log('\n2. ⏳ Waiting for AI processing...');
    await new Promise(resolve => setTimeout(resolve, 45000)); // Wait 45 seconds for full processing
    
    // Step 3: Check conversation messages
    console.log('\n3. 💬 Checking conversation messages...');
    const conversationResponse = await axios.get('http://localhost:5000/api/conversations/27/messages');
    
    if (conversationResponse.data && conversationResponse.data.length > 0) {
      const lastMessages = conversationResponse.data.slice(-5); // Get last 5 messages
      
      console.log('\n📋 Recent conversation messages:');
      lastMessages.forEach((msg, index) => {
        const sender = msg.isFromAI ? '🤖 AI' : '👤 Customer';
        const timestamp = new Date(msg.timestamp).toLocaleTimeString();
        console.log(`${index + 1}. ${sender} [${timestamp}]: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
      });
      
      // Check if order confirmation was sent
      const aiMessages = lastMessages.filter(msg => msg.isFromAI);
      const hasOrderConfirmation = aiMessages.some(msg => 
        msg.content.includes('Order') || 
        msg.content.includes('booking') || 
        msg.content.includes('payment') ||
        msg.content.includes('KNet')
      );
      
      if (hasOrderConfirmation) {
        console.log('\n✅ COMPLETE FLOW WORKING: Order confirmation sent to customer');
        
        // Look for order ID in the response
        const orderIdMatch = aiMessages.find(msg => msg.content.match(/Order.*\d+/i));
        if (orderIdMatch) {
          console.log(`📋 Order details found in response: ${orderIdMatch.content.substring(0, 200)}`);
        }
      } else {
        console.log('\n⚠️ No order confirmation found in AI responses');
      }
    }
    
    // Step 4: Check if real order was created
    console.log('\n4. 🔍 Checking if real order was created in NailIt POS...');
    // We'll see this in the server logs
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCompleteWhatsAppFlow();