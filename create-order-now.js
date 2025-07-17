// Create order in NailIt POS using server endpoint
import axios from 'axios';

async function createOrderNow() {
  console.log('🔥 CREATING ORDER IN NAILIT POS NOW');
  console.log('==================================');
  
  try {
    // First, let's register a user with a proper mobile number
    console.log('\n📱 Step 1: Testing user registration...');
    const registerResponse = await axios.post('http://localhost:5000/api/nailit/register-user', {
      Address: "Kuwait City",
      Email_Id: "liveorder@example.com",
      Name: "Live Order Customer",
      Mobile: "99123456",  // Try Kuwait format without +965
      Login_Type: 1,
      Image_Name: ""
    });
    
    console.log('User registration response:', registerResponse.data);
    
    // Now let's create order with direct API call using proper parameters
    console.log('\n🛍️ Step 2: Creating order with proper parameters...');
    const orderData = {
      Gross_Amount: 20.0,
      Payment_Type_Id: 1,  // Cash on Arrival
      Order_Type: 2,       // Service
      UserId: registerResponse.data.App_User_Id || 17,  // Use registered user ID
      FirstName: "Live Order Customer",
      Mobile: "99123456",  // Match registration mobile
      Email: "liveorder@example.com",
      Discount_Amount: 0.0,
      Net_Amount: 20.0,
      POS_Location_Id: 1,  // Al-Plaza Mall
      OrderDetails: [
        {
          Prod_Id: 203,                    // Use working service ID
          Prod_Name: "Test Service",
          Qty: 1,
          Rate: 20.0,
          Amount: 20.0,
          Size_Id: null,
          Size_Name: "",
          Promotion_Id: 0,
          Promo_Code: "",
          Discount_Amount: 0.0,
          Net_Amount: 20.0,
          Staff_Id: 48,                    // Known working staff
          TimeFrame_Ids: [1, 2],           // Simple time slots
          Appointment_Date: "07/18/2025"   // MM/dd/yyyy format
        }
      ]
    };
    
    // Create order using the server endpoint
    console.log('\n📋 Sending order data to server...');
    const response = await axios.post('http://localhost:5000/api/orders', orderData);
    console.log('Order creation response:', response.data);
    
    // Also try the NailIt save order endpoint
    console.log('\n🎯 Testing direct NailIt save order endpoint...');
    const nailItResponse = await axios.post('http://localhost:5000/api/nailit/create-order', orderData);
    console.log('NailIt order response:', nailItResponse.data);
    
    return { success: true, message: 'Order created successfully' };
    
  } catch (error) {
    console.error('❌ Error creating order:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return { success: false, error: error.message };
  }
}

// Execute the order creation
createOrderNow()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 ORDER CREATION COMPLETED!');
    } else {
      console.log('\n❌ ORDER CREATION FAILED:', result.error);
    }
  })
  .catch(error => {
    console.error('💥 Critical error:', error.message);
  });