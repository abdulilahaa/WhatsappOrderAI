// Complete WhatsApp booking flow test with order creation
const axios = require('axios');

async function runCompleteBookingTest() {
  console.log('🚀 Starting Complete WhatsApp Booking Test');
  console.log('==========================================');
  
  const baseURL = 'http://localhost:5000';
  const customerId = Date.now().toString(); // Unique customer ID
  const customerPhone = '+96599998877';
  const customerName = 'Sarah Ahmad';
  const customerEmail = 'sarah.ahmad@example.com';
  
  try {
    console.log('\n📱 Step 1: Initial service request');
    let response = await axios.post(`${baseURL}/api/fresh-ai/test`, {
      message: "Hi, I need to book a French manicure for tomorrow",
      customerId: customerId
    });
    console.log('AI Response:', response.data.response?.message?.substring(0, 150) + '...');
    
    console.log('\n📍 Step 2: Location selection');
    response = await axios.post(`${baseURL}/api/fresh-ai/test`, {
      message: "Al-Plaza Mall please",
      customerId: customerId
    });
    console.log('AI Response:', response.data.response?.message?.substring(0, 150) + '...');
    
    console.log('\n🕐 Step 3: Time preference');
    response = await axios.post(`${baseURL}/api/fresh-ai/test`, {
      message: "Tomorrow at 2 PM",
      customerId: customerId
    });
    console.log('AI Response:', response.data.response?.message?.substring(0, 150) + '...');
    
    console.log('\n👤 Step 4: Customer information');
    response = await axios.post(`${baseURL}/api/fresh-ai/test`, {
      message: `My name is ${customerName}, phone ${customerPhone}, email ${customerEmail}`,
      customerId: customerId
    });
    console.log('AI Response:', response.data.response?.message?.substring(0, 150) + '...');
    
    console.log('\n💰 Step 5: Payment method');
    response = await axios.post(`${baseURL}/api/fresh-ai/test`, {
      message: "I'll pay cash when I arrive",
      customerId: customerId
    });
    console.log('AI Response:', response.data.response?.message?.substring(0, 150) + '...');
    
    console.log('\n✅ Step 6: Confirmation');
    response = await axios.post(`${baseURL}/api/fresh-ai/test`, {
      message: "Yes, please confirm the booking",
      customerId: customerId
    });
    console.log('AI Response:', response.data.response?.message?.substring(0, 200) + '...');
    
    // Check conversation state
    console.log('\n📊 Final conversation state:');
    const stateResponse = await axios.get(`${baseURL}/api/fresh-ai/conversation-state/${customerId}`);
    console.log('Conversation State:', JSON.stringify(stateResponse.data, null, 2));
    
    // Try to get recent orders to see if one was created
    console.log('\n📋 Checking for created orders:');
    const ordersResponse = await axios.get(`${baseURL}/api/orders`);
    console.log('Recent Orders:', ordersResponse.data.length > 0 ? 
      ordersResponse.data.slice(-3).map(order => ({
        id: order.id,
        status: order.status,
        total: order.totalAmount,
        customerPhone: order.customerPhone,
        createdAt: order.createdAt
      })) : 'No orders found');
    
    return {
      success: true,
      message: 'Complete booking test completed',
      customerId: customerId,
      finalState: stateResponse.data,
      ordersCreated: ordersResponse.data.length
    };
    
  } catch (error) {
    console.error('❌ Booking test failed:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Run the test
runCompleteBookingTest().then(result => {
  console.log('\n🎯 Test Results:', result);
  console.log('\n==========================================');
  console.log('📞 Complete WhatsApp Booking Test Finished');
}).catch(console.error);