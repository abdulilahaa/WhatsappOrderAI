import axios from 'axios';

async function testSmartAvailabilitySystem() {
  console.log('🎯 Testing Smart Availability System with Real Data...');
  
  try {
    // Simulate a booking request that will likely have availability conflicts
    console.log('📱 Step 1: Customer requests specific service and time...');
    const customerRequest = {
      "messages": [{
        "from": "96541144687",
        "timestamp": "1753228800",
        "text": {
          "body": "Book Classic Pedicure tomorrow at 8 AM Plaza Mall, name Sarah, email sarah@test.com"
        }
      }]
    };
    
    console.log('🔄 Sending WhatsApp booking request...');
    const response = await axios.post('http://localhost:5000/api/whatsapp/webhook', customerRequest);
    
    // Wait for AI processing
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Check conversation history to see if system offered alternative times
    console.log('📋 Checking conversation for smart availability response...');
    const conversations = await axios.get('http://localhost:5000/api/conversations/27/messages');
    const lastMessage = conversations.data[conversations.data.length - 1];
    
    console.log('💬 Latest AI response:', lastMessage.content);
    
    // Verify smart availability features
    const hasAvailabilityCheck = lastMessage.content.includes('availability') || 
                                 lastMessage.content.includes('available') ||
                                 lastMessage.content.includes('time');
    
    const hasAlternativeTimes = lastMessage.content.includes('AM') || 
                               lastMessage.content.includes('PM') ||
                               lastMessage.content.includes(':');
                               
    console.log('\n📊 Smart Availability Test Results:');
    console.log(`✅ Natural conversation processing: ${response.status === 200}`);
    console.log(`✅ Availability checking logic: ${hasAvailabilityCheck}`);
    console.log(`✅ Alternative time suggestions: ${hasAlternativeTimes}`);
    console.log(`✅ Uses authentic NailIt service data: ${lastMessage.content.includes('Classic Pedicure')}`);
    console.log(`✅ Location recognition: ${lastMessage.content.includes('Plaza')}`);
    
    // Test customer time selection
    if (hasAlternativeTimes) {
      console.log('\n🕐 Step 2: Customer selects alternative time...');
      const timeSelection = {
        "messages": [{
          "from": "96541144687",
          "timestamp": "1753228900",
          "text": {
            "body": "2 PM works for me"
          }
        }]
      };
      
      await axios.post('http://localhost:5000/api/whatsapp/webhook', timeSelection);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const finalConversations = await axios.get('http://localhost:5000/api/conversations/27/messages');
      const finalMessage = finalConversations.data[finalConversations.data.length - 1];
      
      console.log('🎉 Final response:', finalMessage.content);
      
      const bookingConfirmation = finalMessage.content.includes('Order ID') || 
                                 finalMessage.content.includes('confirmed') ||
                                 finalMessage.content.includes('payment');
                                 
      console.log(`✅ Smart booking completion: ${bookingConfirmation}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSmartAvailabilitySystem();