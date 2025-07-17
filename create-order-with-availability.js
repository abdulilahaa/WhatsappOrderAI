// Create order with real-time availability checking
import axios from 'axios';

async function createOrderWithAvailability() {
  console.log('🔥 CREATING ORDER WITH REAL-TIME AVAILABILITY');
  console.log('============================================');
  
  const API_URL = 'http://nailit.innovasolution.net/SaveOrder';
  const headers = {
    'Content-Type': 'application/json',
    'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh'
  };

  try {
    // Use our registered user ID: 110741
    const userId = 110741;
    console.log(`Using registered User ID: ${userId}`);
    
    // Step 1: Get available time slots for today
    console.log('\n⏰ Step 1: Getting available time slots...');
    const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-'); // DD-MM-YYYY format
    console.log(`Date: ${today}`);
    
    const availableSlots = await axios.get(`http://localhost:5000/api/nailit/get-available-slots/E/48/${today}`);
    console.log('Available slots response:', availableSlots.data);
    
    let timeFrameIds = [1, 2]; // Default fallback
    if (availableSlots.data && availableSlots.data.length > 0) {
      // Use the first available time slots
      timeFrameIds = availableSlots.data.slice(0, 2).map(slot => slot.TimeFrame_Id || slot.id);
      console.log(`✅ Using available TimeFrame_Ids: ${timeFrameIds}`);
    } else {
      console.log('⚠️ No specific slots found, using default TimeFrame_Ids: [1, 2]');
    }
    
    // Step 2: Create order with available time slots
    console.log('\n📋 Step 2: Creating order with available time slots...');
    const orderData = {
      "Gross_Amount": 15.0,
      "Payment_Type_Id": 1,
      "Order_Type": 2,
      "UserId": userId,
      "FirstName": "Test Customer",
      "Mobile": "+96588888889",
      "Email": "booking@example.com",
      "Discount_Amount": 0.0,
      "Net_Amount": 15.0,
      "POS_Location_Id": 1,
      "OrderDetails": [
        {
          "Prod_Id": 203,
          "Prod_Name": "Dry manicure without polish",
          "Qty": 1,
          "Rate": 15.0,
          "Amount": 15.0,
          "Size_Id": null,
          "Size_Name": "",
          "Promotion_Id": 0,
          "Promo_Code": "",
          "Discount_Amount": 0.0,
          "Net_Amount": 15.0,
          "Staff_Id": 48,
          "TimeFrame_Ids": timeFrameIds,
          "Appointment_Date": "07/18/2025"  // Tomorrow in MM/dd/yyyy format
        }
      ]
    };

    console.log('\n🚀 Sending order to NailIt POS...');
    console.log('Order data:', JSON.stringify(orderData, null, 2));
    
    const response = await axios.post(API_URL, orderData, { headers });
    
    console.log('\n✅ NailIt POS Response:');
    console.log(`Status: ${response.status}`);
    console.log(`Data:`, JSON.stringify(response.data, null, 2));
    
    if (response.data.Status === 0) {
      console.log(`\n🎉 SUCCESS! Order created successfully!`);
      console.log(`📋 Order ID: ${response.data.OrderId}`);
      console.log(`👤 Customer ID: ${response.data.CustomerId}`);
      
      return {
        success: true,
        orderId: response.data.OrderId,
        customerId: response.data.CustomerId,
        message: response.data.Message,
        userId: userId
      };
    } else {
      console.log(`\n❌ Order creation failed:`);
      console.log(`Status: ${response.data.Status}`);
      console.log(`Message: ${response.data.Message}`);
      
      // Try with different TimeFrame_Ids if availability failed
      if (response.data.Status === 102) {
        console.log('\n🔄 Retrying with different time slots...');
        const retryOrderData = {
          ...orderData,
          OrderDetails: [
            {
              ...orderData.OrderDetails[0],
              TimeFrame_Ids: [1, 2, 3],  // Try different time slots
              Appointment_Date: "07/19/2025"  // Try day after tomorrow
            }
          ]
        };
        
        console.log('Retry order data:', JSON.stringify(retryOrderData, null, 2));
        const retryResponse = await axios.post(API_URL, retryOrderData, { headers });
        
        console.log('\n✅ Retry Response:');
        console.log(`Data:`, JSON.stringify(retryResponse.data, null, 2));
        
        if (retryResponse.data.Status === 0) {
          console.log(`\n🎉 SUCCESS ON RETRY! Order created successfully!`);
          console.log(`📋 Order ID: ${retryResponse.data.OrderId}`);
          console.log(`👤 Customer ID: ${retryResponse.data.CustomerId}`);
          
          return {
            success: true,
            orderId: retryResponse.data.OrderId,
            customerId: retryResponse.data.CustomerId,
            message: retryResponse.data.Message,
            userId: userId,
            retryAttempt: true
          };
        } else {
          return {
            success: false,
            status: retryResponse.data.Status,
            message: retryResponse.data.Message,
            orderId: retryResponse.data.OrderId,
            userId: userId
          };
        }
      }
      
      return {
        success: false,
        status: response.data.Status,
        message: response.data.Message,
        orderId: response.data.OrderId,
        userId: userId
      };
    }
    
  } catch (error) {
    console.error('❌ Error during order creation:', error.message);
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

// Execute the availability-based order creation
createOrderWithAvailability()
  .then(result => {
    console.log('\n🏁 AVAILABILITY-BASED ORDER RESULT:');
    console.log('===================================');
    if (result.success) {
      console.log(`✅ ORDER CREATED SUCCESSFULLY!`);
      console.log(`📋 Order ID: ${result.orderId}`);
      console.log(`👤 Customer ID: ${result.customerId}`);
      console.log(`👤 User ID: ${result.userId}`);
      if (result.retryAttempt) {
        console.log(`🔄 Success on retry attempt`);
      }
    } else {
      console.log(`❌ ORDER FAILED: ${result.message || result.error}`);
      console.log(`Status: ${result.status || 'Unknown'}`);
      console.log(`Order ID: ${result.orderId || 'N/A'}`);
      console.log(`User ID: ${result.userId || 'N/A'}`);
    }
  })
  .catch(error => {
    console.error('💥 Test failed:', error.message);
  });