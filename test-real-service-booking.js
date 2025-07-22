import axios from 'axios';

async function testRealServiceBooking() {
  console.log('🎯 Testing booking with REAL Hair Treatment service (ID: 203)...');
  
  try {
    const bookingData = {
      "Gross_Amount": 45,  // Real price for Hair Treatment
      "Payment_Type_Id": 2, // KNet
      "Order_Type": 2,
      "UserId": 110738,  // Known working user
      "FirstName": "Sarah",
      "Mobile": "96541144687", 
      "Email": "sarah@test.com",
      "Discount_Amount": 0,
      "Net_Amount": 45,
      "POS_Location_Id": 1,  // Al-Plaza Mall
      "ChannelId": 4,
      "OrderDetails": [{
        "Prod_Id": 203,  // REAL Hair Treatment service ID
        "Prod_Name": "Hair Treatment",
        "Qty": 1,
        "Rate": 45,
        "Amount": 45,
        "Size_Id": null,
        "Size_Name": "",
        "Promotion_Id": 0,
        "Promo_Code": "",
        "Discount_Amount": 0,
        "Net_Amount": 45,
        "Staff_Id": 20,  // Elvira (confirmed available)
        "TimeFrame_Ids": [11, 12],  // 1PM-2PM
        "Appointment_Date": "23/07/2025"
      }]
    };
    
    console.log('📦 Booking Hair Treatment with authentic NailIt service data...');
    
    const response = await axios.post('http://localhost:5000/api/nailit/save-order-direct', bookingData);
    
    if (response.data.Status === 0) {
      console.log('✅ BOOKING SUCCESS with REAL service!');
      console.log(`🎉 Order ID: ${response.data.OrderId}`);
      console.log(`👤 Customer ID: ${response.data.CustomerId}`);
      console.log(`💳 Service: Hair Treatment (ID: 203) - 45 KWD`);
      console.log(`📍 Location: Al-Plaza Mall (ID: 1)`);
      console.log(`👩‍💼 Staff: Elvira (ID: 20)`);
    } else {
      console.log(`❌ Booking failed - Status: ${response.data.Status}`);
      console.log(`Message: ${response.data.Message}`);
    }
    
  } catch (error) {
    console.error('❌ Real service booking test failed:', error.response?.data || error.message);
  }
}

testRealServiceBooking();