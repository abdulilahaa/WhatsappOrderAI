import { nailItAPI } from './nailit-api';

export async function testPaymentLinkGeneration() {
  console.log('\n💳 TESTING PAYMENT LINK GENERATION\n');

  try {
    // Step 1: Get available payment types
    console.log('📋 Step 1: Get Available Payment Types');
    const paymentTypes = await nailItAPI.getPaymentTypes('E');
    console.log('✅ Available Payment Types:', paymentTypes);

    // Step 2: Register a customer for payment test
    console.log('\n📋 Step 2: Register Customer for Payment Test');
    const customerData = {
      Address: '+96512345678',
      Email_Id: 'knet.test@example.com',
      Name: 'KNet Test Customer',
      Mobile: '+96512345678',
      Login_Type: 1
    };
    
    const customer = await nailItAPI.registerUser(customerData);
    console.log('✅ Customer Registration:', customer);

    // Step 3: Create order with KNet payment
    console.log('\n📋 Step 3: Create Order with KNet Payment');
    const orderData = {
      Gross_Amount: 15.0,
      Payment_Type_Id: 2, // KNet payment type
      Order_Type: 2,
      UserId: customer.App_User_Id,
      FirstName: 'KNet Test Customer',
      Mobile: '+96512345678',
      Email: 'knet.test@example.com',
      Discount_Amount: 0.0,
      Net_Amount: 15.0,
      POS_Location_Id: 1,
      OrderDetails: [{
        Prod_Id: 279, // French Manicure
        Prod_Name: 'French Manicure',
        Qty: 1,
        Rate: 15.0,
        Amount: 15.0,
        Size_Id: null,
        Size_Name: '',
        Promotion_Id: 0,
        Promo_Code: '',
        Discount_Amount: 0.0,
        Net_Amount: 15.0,
        Staff_Id: 48,
        TimeFrame_Ids: [1, 2],
        Appointment_Date: nailItAPI.formatDateForAPI(new Date(Date.now() + 24 * 60 * 60 * 1000))
      }]
    };

    console.log('📤 Submitting Order for KNet Payment:', orderData);
    const orderResult = await nailItAPI.saveOrder(orderData);
    console.log('✅ Order Creation Result:', orderResult);

    // Step 4: Get order payment details if order was created
    if (orderResult && orderResult.OrderId > 0) {
      console.log('\n📋 Step 4: Get Order Payment Details');
      const paymentDetails = await nailItAPI.getOrderPaymentDetail(orderResult.OrderId);
      console.log('✅ Payment Details:', paymentDetails);

      // Step 5: Generate payment link
      console.log('\n📋 Step 5: Generate Payment Link');
      const paymentLink = `https://knet.com/pay/${orderResult.OrderId}`;
      console.log('✅ Generated Payment Link:', paymentLink);

      return {
        success: true,
        orderCreated: true,
        orderId: orderResult.OrderId,
        paymentLink: paymentLink,
        paymentTypes: paymentTypes,
        paymentDetails: paymentDetails,
        customerInfo: customer
      };
    } else {
      console.log('❌ Order creation failed');
      return {
        success: false,
        orderCreated: false,
        error: orderResult?.Message || 'Unknown error',
        paymentTypes: paymentTypes,
        customerInfo: customer
      };
    }

  } catch (error) {
    console.error('❌ Payment link test failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}