import { nailItAPI } from './nailit-api';

export async function testPaymentFlow() {
  console.log('\n💳 TESTING PAYMENT FLOW WITH VALID DATA\n');

  try {
    // Test 1: Register User for Payment
    console.log('📋 Step 1: Register User for Payment');
    const userResult = await nailItAPI.registerUser({
      Address: '+96512345678',
      Email_Id: 'payment.test@example.com',
      Name: 'Payment Test User',
      Mobile: '+96512345678',
      Login_Type: 1
    });
    console.log('✅ User Registration Result:', userResult);

    // Test 2: Create Order with Valid Service
    console.log('\n📋 Step 2: Create Test Order');
    const testOrderData = nailItAPI.createTestOrder();
    console.log('✅ Test Order Data:', testOrderData);

    // Test 3: Submit Order to NailIt POS
    console.log('\n📋 Step 3: Submit Order to NailIt POS');
    const orderResult = await nailItAPI.saveOrder(testOrderData);
    console.log('✅ Order Submission Result:', orderResult);

    // Test 4: Get Order Payment Details (if order was created)
    let paymentDetails = null;
    if (orderResult && orderResult.OrderId && orderResult.OrderId > 0) {
      console.log('\n📋 Step 4: Get Order Payment Details');
      paymentDetails = await nailItAPI.getOrderPaymentDetail(orderResult.OrderId);
      console.log('✅ Payment Details:', paymentDetails);
    } else {
      console.log('\n❌ Order not created, skipping payment details');
    }

    // Test 5: Get Payment Types
    console.log('\n📋 Step 5: Get Available Payment Types');
    const paymentTypes = await nailItAPI.getPaymentTypes('E');
    console.log('✅ Payment Types:', paymentTypes);

    return {
      success: true,
      results: {
        userRegistration: userResult,
        testOrderData: testOrderData,
        orderSubmission: orderResult,
        paymentDetails: paymentDetails,
        paymentTypes: paymentTypes
      },
      summary: {
        userRegistered: userResult?.Status === 0,
        orderCreated: orderResult?.OrderId > 0,
        paymentDetailsRetrieved: paymentDetails !== null,
        paymentTypesFound: paymentTypes?.length || 0
      }
    };

  } catch (error) {
    console.error('❌ Payment flow test failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}