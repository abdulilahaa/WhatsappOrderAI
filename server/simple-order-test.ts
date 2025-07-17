import { NailItAPI } from './nailit-api.js';

/**
 * Simple order test with known working customer data
 */
export async function createSimpleOrderTest() {
  const nailItAPI = new NailItAPI();
  
  console.log('\n🔥 CREATING SIMPLE ORDER TEST');
  console.log('==============================');
  
  try {
    // Use existing customer data format that works
    const orderData = {
      Gross_Amount: 15.0,
      Payment_Type_Id: 1,  // Cash on Arrival
      Order_Type: 2,       // Service
      UserId: 17,          // Known working user ID from previous successful tests
      FirstName: "Test Customer",
      Mobile: "+96500000000",  // Use format from existing customer in system
      Email: "test@example.com",
      Discount_Amount: 0.0,
      Net_Amount: 15.0,
      POS_Location_Id: 1,  // Al-Plaza Mall
      OrderDetails: [
        {
          Prod_Id: 279,                    // French Manicure (confirmed working)
          Prod_Name: "French Manicure",
          Qty: 1,
          Rate: 15.0,
          Amount: 15.0,
          Size_Id: null,
          Size_Name: "",
          Promotion_Id: 0,
          Promo_Code: "",
          Discount_Amount: 0.0,
          Net_Amount: 15.0,
          Staff_Id: 48,                    // Known working staff ID
          TimeFrame_Ids: [1, 2],           // Simple time frame IDs
          Appointment_Date: "07/18/2025"   // MM/dd/yyyy format
        }
      ]
    };

    console.log('\n📋 ORDER DATA TO SEND:');
    console.log(JSON.stringify(orderData, null, 2));

    const response = await nailItAPI.saveOrder(orderData);
    
    console.log('\n✅ NAILIT SAVE ORDER RESPONSE:');
    console.log(JSON.stringify(response, null, 2));

    if (response.Status === 0) {
      console.log(`\n🎉 SUCCESS! Order created with ID: ${response.OrderId}`);
      console.log(`Customer ID: ${response.CustomerId}`);
      
      // Get order details if available
      if (response.OrderId) {
        console.log('\n📋 Fetching order payment details...');
        const orderDetails = await nailItAPI.getOrderPaymentDetail(response.OrderId);
        console.log('Order Details:', JSON.stringify(orderDetails, null, 2));
      }
      
      return {
        success: true,
        message: "Order created successfully in NailIt POS",
        orderId: response.OrderId,
        customerId: response.CustomerId,
        orderData,
        response
      };
    } else {
      console.log(`\n❌ Order failed with Status: ${response.Status}`);
      console.log(`Error Message: ${response.Message}`);
      
      return {
        success: false,
        error: response.Message,
        status: response.Status,
        orderData,
        response
      };
    }
  } catch (error: any) {
    console.error('❌ Simple order test failed:', error.message);
    return {
      success: false,
      error: error.message,
      details: error
    };
  }
}