import { nailItAPI } from './nailit-api';

export async function testComprehensiveBooking() {
  console.log('🧪 COMPREHENSIVE 3-SERVICE BOOKING TEST 🧪');
  
  // Step 1: Find services with available staff
  const testServices = [203, 279, 1058, 977, 523, 342, 421, 845];
  const availableServices = [];
  
  console.log('🔍 Finding services with available staff...');
  
  for (const serviceId of testServices) {
    try {
      const staff = await nailItAPI.getServiceStaff(serviceId, 1, 'E', '23-07-2025');
      if (staff && staff.length > 0) {
        console.log(`✅ Service ${serviceId}: ${staff.length} staff available`);
        availableServices.push({
          serviceId,
          staffCount: staff.length,
          staff: staff
        });
      } else {
        console.log(`❌ Service ${serviceId}: No staff available`);
      }
    } catch (error) {
      console.log(`❌ Service ${serviceId}: Error checking staff`);
    }
  }
  
  if (availableServices.length < 3) {
    console.log('❌ Not enough services with staff availability');
    return;
  }
  
  console.log(`✅ Found ${availableServices.length} services with staff`);
  
  // Step 2: Create customer
  const testCustomer = await nailItAPI.registerUser({
    Address: "Kuwait City",
    Email_Id: "extreme.test@nailit.com",
    Name: "Extreme Test Customer",
    Mobile: "99887766",
    Login_Type: 1
  });
  
  console.log('👤 Test customer created:', testCustomer);
  
  // Step 3: Create comprehensive 3-service booking
  const selectedServices = availableServices.slice(0, 3);
  const totalAmount = 45; // 15 KWD per service
  
  const orderData = {
    Gross_Amount: totalAmount,
    Payment_Type_Id: 2, // KNet
    Order_Type: 2,
    UserId: testCustomer.App_User_Id,
    FirstName: "Extreme Test Customer",
    Mobile: "99887766",
    Email: "extreme.test@nailit.com",
    Discount_Amount: 0,
    Net_Amount: totalAmount,
    POS_Location_Id: 1,
    ChannelId: 4,
    OrderDetails: selectedServices.map((service, index) => ({
      Prod_Id: service.serviceId,
      Prod_Name: `Service ${service.serviceId}`,
      Qty: 1,
      Rate: 15,
      Amount: 15,
      Size_Id: null,
      Size_Name: "",
      Promotion_Id: 0,
      Promo_Code: "",
      Discount_Amount: 0,
      Net_Amount: 15,
      Staff_Id: service.staff[0].Id,
      TimeFrame_Ids: [7 + index, 8 + index], // Sequential time slots
      Appointment_Date: "23/07/2025"
    }))
  };
  
  console.log('📋 Creating comprehensive order:', JSON.stringify(orderData, null, 2));
  
  // Step 4: Execute order
  const orderResult = await nailItAPI.saveOrder(orderData);
  
  if (orderResult && orderResult.Status === 0) {
    console.log(`🎉 SUCCESS! Order ID: ${orderResult.OrderId}, Customer ID: ${orderResult.CustomerId}`);
    
    // Step 5: Get payment details
    const paymentDetails = await nailItAPI.getOrderPaymentDetail(orderResult.OrderId);
    console.log('💳 Payment details:', paymentDetails);
    
    return {
      success: true,
      orderId: orderResult.OrderId,
      customerId: orderResult.CustomerId,
      services: selectedServices,
      paymentDetails
    };
  } else {
    console.log('❌ Order failed:', orderResult);
    return { success: false, error: orderResult };
  }
}