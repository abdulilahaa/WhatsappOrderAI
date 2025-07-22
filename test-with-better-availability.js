import axios from 'axios';

async function testWithBetterAvailability() {
  console.log('🎯 Testing with better staff availability parameters...');
  
  try {
    // Test with Classic Pedicure (ID: 1058) - typically has better staff availability
    const bookingData = {
      "Gross_Amount": 20,
      "Payment_Type_Id": 2,
      "Order_Type": 2,
      "UserId": 110738,
      "FirstName": "Sarah",
      "Mobile": "96541144687", 
      "Email": "sarah@test.com",
      "Discount_Amount": 0,
      "Net_Amount": 20,
      "POS_Location_Id": 1,
      "ChannelId": 4,
      "OrderDetails": [{
        "Prod_Id": 1058,  // Classic Pedicure - real service ID from previous successful orders
        "Prod_Name": "Classic Pedicure",
        "Qty": 1,
        "Rate": 20,
        "Amount": 20,
        "Size_Id": null,
        "Size_Name": "",
        "Promotion_Id": 0,
        "Promo_Code": "",
        "Discount_Amount": 0,
        "Net_Amount": 20,
        "Staff_Id": 1,   // Default staff - let NailIt assign
        "TimeFrame_Ids": [15, 16],  // 3PM-4PM afternoon slot
        "Appointment_Date": "23/07/2025"
      }]
    };
    
    console.log('📦 Testing Classic Pedicure booking...');
    
    const response = await axios.post('http://localhost:5000/api/nailit/save-order-direct', bookingData);
    
    console.log('📊 Response:', response.data);
    
    if (response.data.Status === 0) {
      console.log('✅ SUCCESS! Real service booking completed!');
      console.log(`🎉 Order ID: ${response.data.OrderId}`);
      console.log(`👤 Customer ID: ${response.data.CustomerId}`);
    } else {
      console.log(`⚠️ Status: ${response.data.Status} - ${response.data.Message}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testWithBetterAvailability();