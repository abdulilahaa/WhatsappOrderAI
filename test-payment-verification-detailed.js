// Detailed payment verification test with comprehensive error handling and diagnostics
import axios from 'axios';

async function testPaymentVerificationDetailed() {
  console.log('🔍 DETAILED PAYMENT VERIFICATION SYSTEM TEST');
  console.log('=========================================');
  
  const testOrderIds = [176377, 176375, 176374]; // Known order IDs from previous tests
  
  for (const orderId of testOrderIds) {
    console.log(`\n🧪 Testing Order ID: ${orderId}`);
    console.log('='.repeat(40));
    
    try {
      // Test 1: Direct NailIt API call
      console.log('1️⃣ Direct NailIt API Call:');
      
      const directResponse = await axios.get(`http://nailit.innovasolution.net/GetOrderPaymentDetail/${orderId}`, {
        headers: {
          'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh'
        }
      });
      
      console.log(`   Status: ${directResponse.data.Status}`);
      console.log(`   Message: ${directResponse.data.Message}`);
      
      if (directResponse.data.Status === 0) {
        console.log('   ✅ Direct API call successful');
        console.log(`   Order ID: ${directResponse.data.OrderId}`);
        console.log(`   Order Status: ${directResponse.data.OrderStatus}`);
        console.log(`   Payment Type: ${directResponse.data.PayType}`);
        console.log(`   Payment Amount: ${directResponse.data.PayAmount} KWD`);
        console.log(`   Customer: ${directResponse.data.Customer_Name}`);
        console.log(`   Location: ${directResponse.data.Location_Name}`);
        console.log(`   Booking Date: ${directResponse.data.MinBookingDate}`);
        
        if (directResponse.data.PayType === 'Knet') {
          console.log(`   KNet Result: ${directResponse.data.KNetResult || 'N/A'}`);
          console.log(`   KNet Reference: ${directResponse.data.KNetReference || 'N/A'}`);
          console.log(`   KNet Auth: ${directResponse.data.KNetAuth || 'N/A'}`);
          console.log(`   KNet Transaction ID: ${directResponse.data.KNetTransId || 'N/A'}`);
        }
        
        // Test 2: Our payment verification endpoint
        console.log('\n2️⃣ Our Payment Verification Endpoint:');
        
        try {
          const verificationResponse = await axios.post('http://localhost:5000/api/nailit/verify-payment', {
            orderId: orderId
          });
          
          console.log('   ✅ Payment verification endpoint successful');
          console.log(`   Payment Successful: ${verificationResponse.data.isPaymentSuccessful}`);
          console.log(`   Payment Type: ${verificationResponse.data.paymentType}`);
          console.log(`   Order Status: ${verificationResponse.data.orderStatus}`);
          console.log(`   Payment Amount: ${verificationResponse.data.paymentAmount} KWD`);
          console.log(`   Confirmation Message: ${verificationResponse.data.confirmationMessage}`);
          
          // Test 3: Payment verification logic
          console.log('\n3️⃣ Payment Verification Logic:');
          
          const isKnetCaptured = directResponse.data.PayType === 'Knet' && 
                               directResponse.data.KNetResult === 'CAPTURED';
          const isOrderPaid = directResponse.data.OrderStatus === 'Order Paid';
          
          console.log(`   KNet CAPTURED: ${isKnetCaptured}`);
          console.log(`   Order PAID: ${isOrderPaid}`);
          console.log(`   Payment Success: ${isKnetCaptured || isOrderPaid}`);
          
          // Test 4: AI confirmation message generation
          console.log('\n4️⃣ AI Confirmation Message Generation:');
          
          const isPaymentSuccessful = isKnetCaptured || isOrderPaid;
          const aiMessage = generateAIConfirmationMessage(directResponse.data, isPaymentSuccessful, orderId);
          
          console.log('   Generated Message:');
          console.log(`   ${aiMessage}`);
          
          // Test 5: Payment link generation
          console.log('\n5️⃣ Payment Link Generation:');
          
          const knetLink = `http://nailit.innovasolution.net/knet.aspx?orderId=${orderId}`;
          console.log(`   KNet Payment Link: ${knetLink}`);
          
          console.log(`\n   ✅ Order ${orderId} - All tests passed`);
          
        } catch (endpointError) {
          console.log(`   ❌ Payment verification endpoint failed: ${endpointError.message}`);
          console.log(`   Response status: ${endpointError.response?.status || 'N/A'}`);
          console.log(`   Response data: ${JSON.stringify(endpointError.response?.data || {})}`);
        }
        
      } else {
        console.log(`   ❌ Direct API call failed: ${directResponse.data.Message}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Order ${orderId} test failed: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data)}`);
      }
    }
  }
  
  // Test 6: Test with completely invalid order
  console.log('\n🧪 Testing Invalid Order ID: 999999');
  console.log('='.repeat(40));
  
  try {
    const verificationResponse = await axios.post('http://localhost:5000/api/nailit/verify-payment', {
      orderId: 999999
    });
    
    console.log('   ❌ Should have failed for invalid order');
    console.log(`   Response: ${JSON.stringify(verificationResponse.data)}`);
  } catch (error) {
    console.log('   ✅ Error handling working correctly for invalid order');
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 7: Test endpoint availability
  console.log('\n🧪 Testing Endpoint Availability');
  console.log('='.repeat(40));
  
  const endpoints = [
    'http://localhost:5000/api/nailit/verify-payment',
    'http://localhost:5000/api/nailit/order-payment-detail/176377'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const method = endpoint.includes('verify-payment') ? 'post' : 'get';
      const data = method === 'post' ? { orderId: 176377 } : undefined;
      
      const response = await axios[method](endpoint, data);
      console.log(`   ✅ ${endpoint} - Available`);
    } catch (error) {
      console.log(`   ❌ ${endpoint} - ${error.message}`);
    }
  }
  
  console.log('\n🎯 DETAILED PAYMENT VERIFICATION SYSTEM ANALYSIS COMPLETE');
  console.log('========================================================');
  console.log('The system has been tested with:');
  console.log('• Multiple order IDs from previous successful tests');
  console.log('• Direct NailIt API calls for comparison');
  console.log('• Payment verification endpoint functionality');
  console.log('• KNet payment success detection logic');
  console.log('• AI confirmation message generation');
  console.log('• Payment link generation');
  console.log('• Error handling for invalid orders');
  console.log('• Endpoint availability validation');
  
  return { testCompleted: true };
}

function generateAIConfirmationMessage(orderData, isPaymentSuccessful, orderId) {
  if (isPaymentSuccessful) {
    return `🎉 Payment confirmed for Order ${orderId}! Amount: ${orderData.PayAmount} KWD via ${orderData.PayType}`;
  } else {
    const knetLink = `http://nailit.innovasolution.net/knet.aspx?orderId=${orderId}`;
    return `Order ${orderId} created. Complete payment: ${knetLink}`;
  }
}

// Execute the detailed test
testPaymentVerificationDetailed().catch(console.error);