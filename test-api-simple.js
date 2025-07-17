// Simple test to get an Order ID using the working system
import axios from 'axios';

async function testAPISimple() {
  console.log('🎯 SIMPLE API TEST - GET ORDER ID');
  console.log('==================================');
  
  try {
    // Test the working SaveOrder endpoint through our server
    console.log('\n🔥 Testing SaveOrder through server endpoint...');
    const response = await axios.post('http://localhost:5000/api/nailit/save-order', {
      "Gross_Amount": 15.0,
      "Payment_Type_Id": 1,
      "Order_Type": 2,
      "UserId": 110741,  // Our registered user
      "FirstName": "API Test Customer",
      "Mobile": "+96588888889",
      "Email": "apitest@example.com",
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
    
    console.log('Response:', response.data);
    
    if (response.data.OrderId && response.data.OrderId > 0) {
      console.log(`\n🎉 SUCCESS! Order ID: ${response.data.OrderId}`);
      console.log(`👤 Customer ID: ${response.data.CustomerId}`);
      return {
        success: true,
        orderId: response.data.OrderId,
        customerId: response.data.CustomerId
      };
    } else {
      console.log(`\n❌ No Order ID received: ${response.data.message || 'Unknown error'}`);
      return {
        success: false,
        message: response.data.message,
        data: response.data
      };
    }
    
  } catch (error) {
    console.error('❌ Error during API test:', error.message);
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

// Execute the simple API test
testAPISimple()
  .then(result => {
    console.log('\n🏁 SIMPLE API TEST RESULT:');
    console.log('==========================');
    if (result.success) {
      console.log(`✅ ORDER ID OBTAINED: ${result.orderId}`);
      console.log(`👤 Customer ID: ${result.customerId}`);
    } else {
      console.log(`❌ FAILED: ${result.message || result.error}`);
      console.log(`📋 Response: ${JSON.stringify(result.data || result.responseData, null, 2)}`);
    }
  })
  .catch(error => {
    console.error('💥 Test failed:', error.message);
  });