// Create order using exact working format from successful example (Order ID: 176373)
import axios from 'axios';

async function createOrderNow() {
  console.log('🎯 CREATING ORDER WITH EXACT WORKING FORMAT');
  console.log('==========================================');
  
  const API_URL = 'http://nailit.innovasolution.net/SaveOrder';
  const headers = {
    'Content-Type': 'application/json',
    'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh'
  };

  try {
    // Use the exact working format from the successful example
    const orderData = {
      "Gross_Amount": 10.0,
      "Payment_Type_Id": 1,
      "Order_Type": 2,
      "UserId": 110741,  // Our successfully registered user
      "FirstName": "Test Customer",
      "Mobile": "+96588888889",
      "Email": "booking@example.com",
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
          "TimeFrame_Ids": [5, 6],
          "Appointment_Date": "07/20/2025"  // Try a future date
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
          "TimeFrame_Ids": [7, 8],
          "Appointment_Date": "07/20/2025"  // Try a future date
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
      console.log(`\n🎉 SUCCESS! Order created in NailIt POS!`);
      console.log(`📋 Order ID: ${response.data.OrderId}`);
      console.log(`👤 Customer ID: ${response.data.CustomerId}`);
      console.log(`📧 Message: ${response.data.Message}`);
      
      return {
        success: true,
        orderId: response.data.OrderId,
        customerId: response.data.CustomerId,
        message: response.data.Message
      };
    } else {
      console.log(`\n❌ Order creation failed:`);
      console.log(`Status: ${response.data.Status}`);
      console.log(`Message: ${response.data.Message}`);
      console.log(`Order ID: ${response.data.OrderId}`);
      console.log(`Customer ID: ${response.data.CustomerId}`);
      
      return {
        success: false,
        status: response.data.Status,
        message: response.data.Message,
        orderId: response.data.OrderId,
        customerId: response.data.CustomerId
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

// Execute the order creation
createOrderNow()
  .then(result => {
    console.log('\n🏁 ORDER CREATION FINAL RESULT:');
    console.log('===============================');
    if (result.success) {
      console.log(`✅ ORDER CREATED SUCCESSFULLY!`);
      console.log(`📋 Order ID: ${result.orderId}`);
      console.log(`👤 Customer ID: ${result.customerId}`);
      console.log(`📧 Message: ${result.message}`);
      
      console.log('\n🎯 SUMMARY:');
      console.log(`- Order successfully created in NailIt POS system`);
      console.log(`- Order ID: ${result.orderId}`);
      console.log(`- Customer ID: ${result.customerId}`);
      console.log(`- Services: Dry manicure without polish + Gelish hand polish`);
      console.log(`- Total: 10.0 KWD`);
      console.log(`- Payment: Cash on Arrival`);
      console.log(`- Location: Al-Plaza Mall (ID: 1)`);
      console.log(`- Staff: ID 48`);
      console.log(`- Date: 07/20/2025`);
      
    } else {
      console.log(`❌ ORDER FAILED: ${result.message || result.error}`);
      console.log(`Status: ${result.status || 'Unknown'}`);
      console.log(`Order ID: ${result.orderId || 'N/A'}`);
      console.log(`Customer ID: ${result.customerId || 'N/A'}`);
    }
  })
  .catch(error => {
    console.error('💥 Critical error:', error.message);
  });