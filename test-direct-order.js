// Direct test of NailIt Save Order API
import axios from 'axios';

const API_BASE_URL = 'http://nailit.innovasolution.net';

// Create a test order directly
async function createDirectOrder() {
  console.log('🔥 CREATING DIRECT ORDER IN NAILIT POS');
  console.log('======================================');
  
  // Order data with known working parameters
  const orderData = {
    Gross_Amount: 15.0,
    Payment_Type_Id: 1,  // Cash on Arrival
    Order_Type: 2,       // Service appointment
    UserId: 17,          // Known working user ID
    FirstName: "Test Customer",
    Mobile: "+96500000000",  // Valid Kuwait format
    Email: "test@example.com",
    Discount_Amount: 0.0,
    Net_Amount: 15.0,
    POS_Location_Id: 1,  // Al-Plaza Mall
    OrderDetails: [
      {
        Prod_Id: 279,                    // French Manicure
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
        Staff_Id: 48,                    // Known working staff
        TimeFrame_Ids: [1, 2],           // Time slots
        Appointment_Date: "07/18/2025"   // MM/dd/yyyy
      }
    ]
  };

  try {
    console.log('\n📋 SENDING ORDER DATA:');
    console.log(JSON.stringify(orderData, null, 2));
    
    const response = await axios.post(`${API_BASE_URL}/SaveOrder`, orderData, {
      headers: {
        'Content-Type': 'application/json',
        'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh',
        'UniqueDeviceId': 'whatsapp-bot-device-id'
      },
      timeout: 15000
    });
    
    console.log('\n✅ NAILIT RESPONSE:');
    console.log(`Status: ${response.status}`);
    console.log(`Data:`, JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.Status === 0) {
      console.log(`\n🎉 SUCCESS! Order created with ID: ${response.data.OrderId}`);
      console.log(`Customer ID: ${response.data.CustomerId}`);
      return response.data;
    } else {
      console.log(`\n❌ Order failed with Status: ${response.data?.Status || 'Unknown'}`);
      console.log(`Message: ${response.data?.Message || 'No message'}`);
      return response.data;
    }
    
  } catch (error) {
    console.error('❌ Direct order failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Run the test
createDirectOrder()
  .then(result => {
    console.log('\n🏁 Test completed:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  });