// Create order using the working server endpoints
import axios from 'axios';

async function createOrderViaServer() {
  console.log('🔥 CREATING ORDER VIA SERVER ENDPOINTS');
  console.log('=====================================');
  
  const SERVER_BASE = 'http://localhost:5000';
  
  try {
    // Step 1: Register user via server endpoint
    console.log('\n👤 Step 1: Registering user via server...');
    const userData = {
      Address: "Kuwait City",
      Email_Id: "serverorder@example.com",
      Name: "Server Order User",
      Mobile: "65991234",  // Kuwait format
      Login_Type: 1,
      Image_Name: ""
    };

    const registerResponse = await axios.post(`${SERVER_BASE}/api/nailit/register-user`, userData);
    console.log('User registration response:', registerResponse.data);
    
    if (registerResponse.data.Status !== 0) {
      throw new Error(`User registration failed: ${registerResponse.data.Message}`);
    }

    const userId = registerResponse.data.App_User_Id;
    console.log(`✅ User registered with ID: ${userId}`);

    // Step 2: Create order via server endpoint
    console.log('\n📋 Step 2: Creating order via server...');
    const orderData = {
      Gross_Amount: 12.0,
      Payment_Type_Id: 1,  // On Arrival
      Order_Type: 2,       // Service
      UserId: userId,
      FirstName: "Server Order User",
      Mobile: "65991234",  // Match registration
      Email: "serverorder@example.com",
      Discount_Amount: 0.0,
      Net_Amount: 12.0,
      POS_Location_Id: 1,
      OrderDetails: [
        {
          Prod_Id: 203,
          Prod_Name: "Dry Manicure Without Polish",
          Qty: 1,
          Rate: 12.0,
          Amount: 12.0,
          Size_Id: null,
          Size_Name: "",
          Promotion_Id: 0,
          Promo_Code: "",
          Discount_Amount: 0.0,
          Net_Amount: 12.0,
          Staff_Id: 48,
          TimeFrame_Ids: [1, 2],
          Appointment_Date: "07/18/2025"
        }
      ]
    };

    console.log('Order data:', JSON.stringify(orderData, null, 2));
    
    // Try the test save order endpoint first
    console.log('\n🚀 Testing save order endpoint...');
    const testResponse = await axios.post(`${SERVER_BASE}/api/nailit/create-order`, orderData);
    console.log('Test response:', testResponse.data);
    
    // Also try the regular create order endpoint
    console.log('\n🚀 Trying regular create order endpoint...');
    const regularOrderData = {
      customerId: userId,
      total: 12.0,
      items: [
        {
          productId: 203,
          quantity: 1,
          price: 12.0,
          serviceId: 203,
          staffId: 48,
          appointmentDate: "2025-07-18",
          timeSlots: [1, 2]
        }
      ],
      locationId: 1,
      paymentMethod: "cash"
    };

    const regularResponse = await axios.post(`${SERVER_BASE}/api/orders`, regularOrderData);
    console.log('Regular order response:', regularResponse.data);

    return {
      success: true,
      userId: userId,
      testResponse: testResponse.data,
      regularResponse: regularResponse.data
    };

  } catch (error) {
    console.error('❌ Error creating order via server:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return {
      success: false,
      error: error.message,
      responseData: error.response?.data
    };
  }
}

// Execute the server-based order creation
createOrderViaServer()
  .then(result => {
    console.log('\n🏁 SERVER ORDER CREATION RESULT:');
    console.log('================================');
    if (result.success) {
      console.log(`✅ SUCCESS: Order processing completed!`);
      console.log(`👤 User ID: ${result.userId}`);
      console.log(`📋 Test Response:`, result.testResponse);
      console.log(`📋 Regular Response:`, result.regularResponse);
    } else {
      console.log(`❌ FAILED: ${result.error}`);
      console.log(`Response Data:`, result.responseData);
    }
  })
  .catch(error => {
    console.error('💥 Critical error:', error.message);
  });