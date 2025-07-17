// Create live order in NailIt POS and get Order ID
import axios from 'axios';

async function createLiveOrder() {
  console.log('🔥 CREATING LIVE ORDER IN NAILIT POS');
  console.log('===================================');
  
  try {
    // Create order with the exact parameters that work
    const orderData = {
      Gross_Amount: 15.0,
      Payment_Type_Id: 1,  // On Arrival (from working payment types)
      Order_Type: 2,       // Service appointment
      UserId: 110737,      // Recently registered user ID
      FirstName: "Live Order Customer",
      Mobile: "99123456",  // Kuwait format without +965
      Email: "liveorder@example.com",
      Discount_Amount: 0.0,
      Net_Amount: 15.0,
      POS_Location_Id: 1,  // Al-Plaza Mall
      OrderDetails: [
        {
          Prod_Id: 203,                    // Working service ID
          Prod_Name: "Dry Manicure Without Polish",
          Qty: 1,
          Rate: 15.0,
          Amount: 15.0,
          Size_Id: null,
          Size_Name: "",
          Promotion_Id: 0,
          Promo_Code: "",
          Discount_Amount: 0.0,
          Net_Amount: 15.0,
          Staff_Id: 48,                    // Working staff ID
          TimeFrame_Ids: [1, 2],           // Working time slots
          Appointment_Date: "07/18/2025"   // MM/dd/yyyy format
        }
      ]
    };

    console.log('\n📋 ORDER DATA:');
    console.log(JSON.stringify(orderData, null, 2));

    // Call the NailIt SaveOrder API directly
    const response = await axios.post('http://nailit.innovasolution.net/SaveOrder', orderData, {
      headers: {
        'Content-Type': 'application/json',
        'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh',
        'UniqueDeviceId': 'whatsapp-bot-device-id'
      },
      timeout: 15000
    });

    console.log('\n✅ NAILIT API RESPONSE:');
    console.log(`Status: ${response.status}`);
    console.log(`Data:`, JSON.stringify(response.data, null, 2));

    if (response.data && response.data.Status === 0) {
      console.log(`\n🎉 SUCCESS! Order created successfully!`);
      console.log(`📋 Order ID: ${response.data.OrderId}`);
      console.log(`👤 Customer ID: ${response.data.CustomerId}`);
      return {
        success: true,
        orderId: response.data.OrderId,
        customerId: response.data.CustomerId,
        message: response.data.Message
      };
    } else {
      console.log(`\n❌ Order creation failed:`);
      console.log(`Status: ${response.data?.Status || 'Unknown'}`);
      console.log(`Message: ${response.data?.Message || 'No message'}`);
      return {
        success: false,
        status: response.data?.Status,
        message: response.data?.Message,
        orderId: response.data?.OrderId || 0
      };
    }

  } catch (error) {
    console.error('❌ Error creating order:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return {
      success: false,
      error: error.message,
      responseData: error.response?.data
    };
  }
}

// Execute the order creation
createLiveOrder()
  .then(result => {
    if (result.success) {
      console.log(`\n🏆 ORDER CREATED SUCCESSFULLY!`);
      console.log(`Order ID: ${result.orderId}`);
      console.log(`Customer ID: ${result.customerId}`);
    } else {
      console.log(`\n💥 ORDER CREATION FAILED:`);
      console.log(`Status: ${result.status}`);
      console.log(`Message: ${result.message}`);
      console.log(`Order ID: ${result.orderId}`);
    }
  })
  .catch(error => {
    console.error('💥 Critical error:', error.message);
  });