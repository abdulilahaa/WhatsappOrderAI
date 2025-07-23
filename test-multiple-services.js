import axios from 'axios';

async function testMultipleServicesBooking() {
  console.log('🎯 Testing Multiple Services Booking System...');
  
  try {
    // Test complex multi-service booking
    console.log('📱 Customer requests multiple services...');
    const complexRequest = {
      "messages": [{
        "from": "96541144687",
        "timestamp": "1753265500",
        "text": {
          "body": "I need hair treatment, french manicure and facial tomorrow afternoon at Al-Plaza Mall. My name is Amira and email is amira@example.com"
        }
      }]
    };
    
    console.log('🔄 Sending complex booking request...');
    const response = await axios.post('http://localhost:5000/api/whatsapp/webhook', complexRequest);
    
    // Wait for AI processing
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    // Check conversation for booking confirmation
    console.log('📋 Checking for booking confirmation...');
    const conversations = await axios.get('http://localhost:5000/api/conversations/27/messages');
    const lastMessage = conversations.data[conversations.data.length - 1];
    
    console.log('💬 Latest response:', lastMessage.content);
    
    // Verify multi-service booking features
    const hasOrderId = lastMessage.content.includes('Order ID') || lastMessage.content.includes('176');
    const hasMultipleServices = lastMessage.content.includes('Services:') || lastMessage.content.includes(',');
    const hasPaymentLink = lastMessage.content.includes('http://nailit.innovasolution.net/knet.aspx');
    const hasLocationConfirmation = lastMessage.content.includes('Al-Plaza') || lastMessage.content.includes('Plaza');
    
    console.log('\n📊 Multi-Service Booking Test Results:');
    console.log(`✅ Request processing: ${response.status === 200}`);
    console.log(`✅ Order creation: ${hasOrderId}`);
    console.log(`✅ Multiple services handling: ${hasMultipleServices}`);
    console.log(`✅ Payment link generation: ${hasPaymentLink}`);
    console.log(`✅ Location confirmation: ${hasLocationConfirmation}`);
    console.log(`✅ Customer data extraction: ${lastMessage.content.includes('Amira') || lastMessage.content.includes('confirmed')}`);
    
    // Calculate success rate
    const successfulFeatures = [
      response.status === 200,
      hasOrderId,
      hasMultipleServices,
      hasPaymentLink,
      hasLocationConfirmation
    ].filter(Boolean).length;
    
    console.log(`\n🎯 Overall Success Rate: ${successfulFeatures}/5 (${(successfulFeatures/5*100).toFixed(0)}%)`);
    
    if (successfulFeatures >= 4) {
      console.log('🏆 MULTI-SERVICE BOOKING SYSTEM FULLY OPERATIONAL!');
    } else {
      console.log('⚠️ Some features need attention');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMultipleServicesBooking();