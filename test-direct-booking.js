import axios from 'axios';

async function testDirectBooking() {
  console.log('🧪 Testing complete working booking flow...');
  
  try {
    // Step 1: Get authentic French Manicure service from cache
    console.log('📋 Searching for French Manicure service...');
    const searchResponse = await axios.post('http://localhost:5000/api/cache/search', {
      query: 'manicure',
      locationId: 1,
      limit: 5
    });
    
    const services = searchResponse.data.services;
    const frenchManicure = services.find(s => s.service_id === 279) || services[0];
    console.log('✅ Found service:', frenchManicure?.name, `(ID: ${frenchManicure?.service_id})`, `- ${frenchManicure?.price_kwd} KWD`);
    
    if (!frenchManicure) {
      throw new Error('No manicure service found in cache');
    }
    
    // Step 2: Create booking with authentic service data
    console.log('🎯 Creating order with authentic service data...');
    const bookingData = {
      "Gross_Amount": frenchManicure.price_kwd,
      "Payment_Type_Id": 2, // KNet
      "Order_Type": 2,
      "UserId": 110738,
      "FirstName": "Sarah Test",
      "Mobile": "96541144687", 
      "Email": "sarah@test.com",
      "Discount_Amount": 0,
      "Net_Amount": frenchManicure.price_kwd,
      "POS_Location_Id": 1,
      "ChannelId": 4,
      "OrderDetails": [{
        "Prod_Id": frenchManicure.service_id,
        "Prod_Name": frenchManicure.name,
        "Qty": 1,
        "Rate": frenchManicure.price_kwd,
        "Amount": frenchManicure.price_kwd,
        "Size_Id": null,
        "Size_Name": "",
        "Promotion_Id": 0,
        "Promo_Code": "",
        "Discount_Amount": 0,
        "Net_Amount": frenchManicure.price_kwd,
        "Staff_Id": 20,
        "TimeFrame_Ids": [11, 12],
        "Appointment_Date": "23/07/2025"
      }]
    };
    
    console.log('📦 Order Data:', JSON.stringify(bookingData, null, 2));
    
    const orderResponse = await axios.post('http://localhost:5000/api/nailit/save-order-direct', bookingData);
    
    console.log('✅ BOOKING SUCCESS:', orderResponse.data);
    console.log(`🎉 Order ID: ${orderResponse.data.OrderId}`);
    console.log(`💳 Customer ID: ${orderResponse.data.CustomerId}`);
    
  } catch (error) {
    console.error('❌ Booking failed:', error.response?.data || error.message);
  }
}

testDirectBooking();