// Server-side order creation with fresh user registration
import axios from 'axios';

async function createOrderWithNewUser() {
  console.log('🔥 SERVER-SIDE ORDER CREATION WITH NEW USER');
  console.log('===========================================');
  
  const headers = {
    'Content-Type': 'application/json',
    'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh'
  };

  try {
    // Step 1: Register a completely new user
    console.log('\n👤 Step 1: Registering new user...');
    const newUserData = {
      Address: "Al-Plaza Mall, Kuwait City",
      Email_Id: "newuser@example.com",
      Name: "New Test User",
      Mobile: "99999999",  // Different number
      Login_Type: 1,
      Image_Name: ""
    };

    const registerResponse = await axios.post('http://localhost:5000/api/nailit/register-user', newUserData);
    console.log('New user registration response:', registerResponse.data);
    
    if (registerResponse.data.Status !== 0) {
      throw new Error(`User registration failed: ${registerResponse.data.Message}`);
    }
    
    const newUserId = registerResponse.data.App_User_Id;
    console.log(`✅ New User ID: ${newUserId}`);

    // Step 2: Try with exact working parameters but new user
    console.log('\n📋 Step 2: Creating order with working parameters...');
    
    const orderData = {
      "Gross_Amount": 10.0,
      "Payment_Type_Id": 1,
      "Order_Type": 2,
      "UserId": newUserId,
      "FirstName": "New Test User",
      "Mobile": "+96599999999",
      "Email": "newuser@example.com",
      "Discount_Amount": 0.0,
      "Net_Amount": 10.0,
      "POS_Location_Id": 1,
      "OrderDetails": [
        {
          "Prod_Id": 203,
          "Prod_Name": "Dry manicure without polish",
          "Qty": 1,
          "Rate": 5.0,
          "Amount": 5.0,
          "Size_Id": null,
          "Size_Name": "",
          "Promotion_Id": 0,
          "Promo_Code": "",
          "Discount_Amount": 0.0,
          "Net_Amount": 5.0,
          "Staff_Id": 48,
          "TimeFrame_Ids": [1, 2],
          "Appointment_Date": "07/18/2025"
        },
        {
          "Prod_Id": 258,
          "Prod_Name": "Gelish hand polish",
          "Qty": 1,
          "Rate": 5.0,
          "Amount": 5.0,
          "Size_Id": null,
          "Size_Name": "",
          "Promotion_Id": 0,
          "Promo_Code": "",
          "Discount_Amount": 0.0,
          "Net_Amount": 5.0,
          "Staff_Id": 48,
          "TimeFrame_Ids": [3, 4],
          "Appointment_Date": "07/18/2025"
        }
      ]
    };

    console.log('🚀 Sending order to NailIt POS...');
    const response = await axios.post('http://nailit.innovasolution.net/SaveOrder', orderData, { headers });
    
    console.log('\n✅ NailIt POS Response:');
    console.log(`Status: ${response.data.Status}`);
    console.log(`Message: ${response.data.Message}`);
    console.log(`Order ID: ${response.data.OrderId}`);
    console.log(`Customer ID: ${response.data.CustomerId}`);
    
    if (response.data.Status === 0) {
      console.log('\n🎉 SUCCESS! Order created!');
      return {
        success: true,
        orderId: response.data.OrderId,
        customerId: response.data.CustomerId,
        userId: newUserId
      };
    } else {
      console.log('\n❌ Order creation failed. Trying alternative approaches...');
      
      // Try with different approaches
      const alternatives = [
        // Different time slots
        { timeFrames: [[5, 6], [7, 8]], description: "Different time slots" },
        { timeFrames: [[11, 12], [13, 14]], description: "Mid-day slots" },
        { timeFrames: [[1], [2]], description: "Single time frames" },
        
        // Different dates
        { date: "07/19/2025", description: "Next day" },
        { date: "07/20/2025", description: "Two days later" },
        { date: "07/21/2025", description: "Three days later" },
        
        // Different staff
        { staffId: 49, description: "Different staff member" },
        { staffId: 50, description: "Another staff member" },
        
        // Different services
        { serviceId: 279, serviceName: "French Manicure", description: "French Manicure service" },
        { serviceId: 277, serviceName: "Basic Manicure", description: "Basic Manicure service" },
        
        // Different locations
        { locationId: 52, description: "Different location" },
        { locationId: 53, description: "Another location" }
      ];
      
      for (const alt of alternatives) {
        console.log(`\n🔄 Trying: ${alt.description}`);
        
        const altOrderData = {
          ...orderData,
          "POS_Location_Id": alt.locationId || 1,
          "OrderDetails": [
            {
              ...orderData.OrderDetails[0],
              "Prod_Id": alt.serviceId || 203,
              "Prod_Name": alt.serviceName || "Dry manicure without polish",
              "Staff_Id": alt.staffId || 48,
              "TimeFrame_Ids": alt.timeFrames ? alt.timeFrames[0] : [1, 2],
              "Appointment_Date": alt.date || "07/18/2025"
            }
          ]
        };
        
        try {
          const altResponse = await axios.post('http://nailit.innovasolution.net/SaveOrder', altOrderData, { headers });
          console.log(`Result: Status ${altResponse.data.Status}, Message: ${altResponse.data.Message}`);
          
          if (altResponse.data.Status === 0) {
            console.log(`🎉 SUCCESS with ${alt.description}!`);
            console.log(`Order ID: ${altResponse.data.OrderId}`);
            return {
              success: true,
              orderId: altResponse.data.OrderId,
              customerId: altResponse.data.CustomerId,
              userId: newUserId,
              strategy: alt.description
            };
          }
        } catch (altError) {
          console.log(`Error with ${alt.description}: ${altError.message}`);
        }
        
        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      return {
        success: false,
        message: response.data.Message,
        userId: newUserId
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
      error: error.message
    };
  }
}

// Also try using the server's endpoint
async function tryServerEndpoint() {
  console.log('\n🔧 Trying server endpoint approach...');
  
  try {
    const response = await axios.post('http://localhost:5000/api/nailit/register-user', {
      Address: "Kuwait City",
      Email_Id: "servertest@example.com",
      Name: "Server Test User",
      Mobile: "77777777",
      Login_Type: 1,
      Image_Name: ""
    });
    
    console.log('Server user registration:', response.data);
    
    if (response.data.Status === 0) {
      // Try creating order through server
      const orderResponse = await axios.post('http://localhost:5000/api/nailit/save-order', {
        "Gross_Amount": 15.0,
        "Payment_Type_Id": 1,
        "Order_Type": 2,
        "UserId": response.data.App_User_Id,
        "FirstName": "Server Test User",
        "Mobile": "+96577777777",
        "Email": "servertest@example.com",
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
            "TimeFrame_Ids": [1, 2],
            "Appointment_Date": "07/18/2025"
          }
        ]
      });
      
      console.log('Server order response:', orderResponse.data);
      
      if (orderResponse.data.success) {
        return {
          success: true,
          orderId: orderResponse.data.orderId,
          approach: 'server-endpoint'
        };
      }
    }
  } catch (error) {
    console.log('Server endpoint error:', error.message);
  }
  
  return { success: false };
}

// Execute both approaches
async function runAllApproaches() {
  console.log('🎯 RUNNING ALL ORDER CREATION APPROACHES');
  console.log('=======================================');
  
  // Approach 1: Direct API with new user
  let result = await createOrderWithNewUser();
  
  if (result.success) {
    console.log('\n🎉 SUCCESS WITH DIRECT API!');
    console.log(`Order ID: ${result.orderId}`);
    console.log(`Customer ID: ${result.customerId}`);
    console.log(`User ID: ${result.userId}`);
    if (result.strategy) {
      console.log(`Strategy: ${result.strategy}`);
    }
    return result;
  }
  
  // Approach 2: Server endpoint
  result = await tryServerEndpoint();
  
  if (result.success) {
    console.log('\n🎉 SUCCESS WITH SERVER ENDPOINT!');
    console.log(`Order ID: ${result.orderId}`);
    return result;
  }
  
  console.log('\n❌ All approaches failed');
  return { success: false };
}

// Run all approaches
runAllApproaches().catch(console.error);