// Direct test of successful order creation using working parameters
import axios from 'axios';

async function testDirectOrder() {
  console.log('🎯 DIRECT ORDER TEST - GET ORDER ID');
  console.log('===================================');
  
  try {
    // First, let's get the latest working parameters from the live order test
    console.log('\n🧪 Testing live order endpoint...');
    const liveResponse = await axios.post('http://localhost:5000/api/nailit/live-order-test', {});
    console.log('Live order test response:', liveResponse.data);
    
    // Now let's test the SaveOrder with a known working user
    console.log('\n📋 Testing SaveOrder with User ID 110739...');
    const orderData = {
      Gross_Amount: 15.0,
      Payment_Type_Id: 1,
      Order_Type: 2,
      UserId: 110739,  // Recently registered user that works
      FirstName: "Direct Order Test",
      Mobile: "65991234",
      Email: "directorder@example.com",
      Discount_Amount: 0.0,
      Net_Amount: 15.0,
      POS_Location_Id: 1,
      OrderDetails: [
        {
          Prod_Id: 279,  // Try French Manicure (known working service)
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
          Staff_Id: 48,
          TimeFrame_Ids: [1, 2],
          Appointment_Date: "07/18/2025"
        }
      ]
    };

    console.log('\n🚀 Creating order with parameters:');
    console.log(JSON.stringify(orderData, null, 2));
    
    const orderResponse = await axios.post('http://localhost:5000/api/nailit/save-order', orderData);
    console.log('\n✅ Order Response:', orderResponse.data);
    
    if (orderResponse.data.Status === 0) {
      console.log(`\n🎉 SUCCESS! Order ID: ${orderResponse.data.OrderId}`);
      console.log(`👤 Customer ID: ${orderResponse.data.CustomerId}`);
      
      // Get order details
      try {
        const detailResponse = await axios.get(`http://localhost:5000/api/nailit/get-order-payment-detail/${orderResponse.data.OrderId}`);
        console.log('\n📋 Order Details:', detailResponse.data);
      } catch (detailError) {
        console.log('Could not fetch order details:', detailError.message);
      }
      
      return {
        success: true,
        orderId: orderResponse.data.OrderId,
        customerId: orderResponse.data.CustomerId
      };
    } else {
      console.log(`\n❌ Order failed: Status ${orderResponse.data.Status} - ${orderResponse.data.Message}`);
      return {
        success: false,
        status: orderResponse.data.Status,
        message: orderResponse.data.Message
      };
    }
    
  } catch (error) {
    console.error('❌ Error during direct order test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute the direct order test
testDirectOrder()
  .then(result => {
    console.log('\n🏁 DIRECT ORDER TEST RESULT:');
    console.log('=============================');
    if (result.success) {
      console.log(`✅ ORDER CREATED SUCCESSFULLY!`);
      console.log(`📋 Order ID: ${result.orderId}`);
      console.log(`👤 Customer ID: ${result.customerId}`);
    } else {
      console.log(`❌ ORDER FAILED: ${result.message || result.error}`);
      console.log(`Status: ${result.status || 'Unknown'}`);
    }
  })
  .catch(error => {
    console.error('💥 Test failed:', error.message);
  });