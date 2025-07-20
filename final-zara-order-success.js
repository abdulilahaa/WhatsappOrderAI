// Final Successful Unified Order for Zara Al-Khalifa
// Using updated customer profile to complete the 4-service booking

const API_BASE = 'http://localhost:5000';

async function createSuccessfulUnifiedOrder() {
  console.log('🎉 FINAL UNIFIED ORDER SUCCESS - ZARA AL-KHALIFA');
  console.log('='.repeat(70));
  
  // Updated customer with proper email format
  const customer = {
    appUserId: 110753, // New registration
    name: "Zara Al-Khalifa",
    phone: "96599887",
    email: "zara.premium@nailit-spa.com.kw"
  };
  
  console.log('\n👤 CUSTOMER PROFILE:');
  console.log(`Name: ${customer.name}`);
  console.log(`Phone: ${customer.phone}`);
  console.log(`Email: ${customer.email}`);
  console.log(`App User ID: ${customer.appUserId}`);
  
  // 4 Services Premium Package
  const services = [
    {
      serviceId: 279,
      serviceName: "French Manicure",
      price: 15,
      duration: 30,
      staffId: 12,
      timeSlots: [10]
    },
    {
      serviceId: 258,
      serviceName: "Gelish Hand Polish",
      price: 25,
      duration: 45,
      staffId: 16,
      timeSlots: [11, 12]
    },
    {
      serviceId: 260,
      serviceName: "Classic Facial",
      price: 35,
      duration: 60,
      staffId: 12,
      timeSlots: [13, 14]
    },
    {
      serviceId: 203,
      serviceName: "Hair Styling",
      price: 40,
      duration: 75,
      staffId: 12,
      timeSlots: [15, 16, 17]
    }
  ];
  
  const totalAmount = services.reduce((sum, service) => sum + service.price, 0);
  
  console.log('\n🛍️ PREMIUM SERVICES PACKAGE:');
  console.log(`Total Services: ${services.length}`);
  console.log(`Total Amount: ${totalAmount} KWD`);
  console.log(`Total Duration: 3.5 hours`);
  
  services.forEach((service, index) => {
    const startTime = timeSlotToTime(service.timeSlots[0]);
    const endTime = timeSlotToTime(service.timeSlots[service.timeSlots.length - 1] + 1);
    console.log(`${index + 1}. ${service.serviceName} - ${service.price} KWD (${startTime}-${endTime})`);
  });
  
  // Create unified order
  const unifiedOrderData = {
    Gross_Amount: totalAmount,
    Payment_Type_Id: 2, // KNet
    Order_Type: 2,
    UserId: customer.appUserId,
    FirstName: customer.name,
    Mobile: customer.phone,
    Email: customer.email,
    Discount_Amount: 0.0,
    Net_Amount: totalAmount,
    POS_Location_Id: 1,
    OrderDetails: services.map(service => ({
      Prod_Id: service.serviceId,
      Prod_Name: service.serviceName,
      Qty: 1,
      Rate: service.price,
      Amount: service.price,
      Size_Id: null,
      Size_Name: "",
      Promotion_Id: 0,
      Promo_Code: "",
      Discount_Amount: 0.0,
      Net_Amount: service.price,
      Staff_Id: service.staffId,
      TimeFrame_Ids: service.timeSlots,
      Appointment_Date: "21/07/2025"
    }))
  };
  
  console.log('\n🚀 CREATING UNIFIED ORDER...');
  console.log(`💰 Total: ${totalAmount} KWD for ${services.length} services`);
  
  try {
    const orderResponse = await fetch(`${API_BASE}/api/nailit/save-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unifiedOrderData)
    });
    
    const orderResult = await orderResponse.json();
    
    if (orderResult.OrderId && orderResult.OrderId > 0) {
      console.log('\n🎉 SUCCESS! UNIFIED ORDER CREATED');
      console.log('='.repeat(50));
      console.log(`✅ Order ID: ${orderResult.OrderId}`);
      console.log(`✅ Customer ID: ${orderResult.CustomerId}`);
      console.log(`✅ Customer: ${customer.name}`);
      console.log(`✅ Total Amount: ${totalAmount} KWD`);
      console.log(`✅ Services: ${services.length} premium treatments`);
      console.log(`✅ Payment: KNet (consolidated)`);
      
      // Payment link
      const paymentLink = `http://nailit.innovasolution.net/knet.aspx?orderId=${orderResult.OrderId}`;
      console.log(`\n💳 CONSOLIDATED PAYMENT LINK:`);
      console.log(paymentLink);
      
      // Schedule details
      console.log(`\n⏰ BACK-TO-BACK SCHEDULE (Tomorrow 21/07/2025):`);
      console.log(`2:30 PM - 3:00 PM: French Manicure (Roselyn) - 15 KWD`);
      console.log(`3:00 PM - 4:00 PM: Gelish Hand Polish (Claudine) - 25 KWD`);
      console.log(`4:00 PM - 5:00 PM: Classic Facial (Roselyn) - 35 KWD`);
      console.log(`5:00 PM - 6:30 PM: Hair Styling (Roselyn) - 40 KWD`);
      console.log(`\n📅 Complete Session: 2:30 PM - 6:30 PM (4 hours)`);
      console.log(`💆‍♀️ Premium Beauty Experience: 3.5 hours treatments`);
      
      // Business impact
      console.log(`\n🎯 BUSINESS SUCCESS METRICS:`);
      console.log(`• Single Payment: ${totalAmount} KWD vs 4 separate payments`);
      console.log(`• Customer Experience: 4-hour premium spa day`);
      console.log(`• Staff Optimization: 2 specialists (Roselyn + Claudine)`);
      console.log(`• Revenue Increase: Higher transaction value`);
      console.log(`• Operational Efficiency: Unified booking workflow`);
      
      return {
        success: true,
        orderId: orderResult.OrderId,
        customerId: orderResult.CustomerId,
        customer: customer,
        services: services,
        totalAmount: totalAmount,
        paymentLink: paymentLink,
        schedule: "2:30 PM - 6:30 PM",
        businessImpact: "115 KWD consolidated payment for 4-service spa experience"
      };
      
    } else {
      console.log('\n❌ Order creation failed:', orderResult);
      return { success: false, error: orderResult };
    }
    
  } catch (error) {
    console.error('\n❌ Error creating order:', error);
    return { success: false, error: error.message };
  }
}

function timeSlotToTime(slot) {
  const baseHour = 10; // 10:00 AM is slot 1
  const totalMinutes = (slot - 1) * 30;
  const hours = Math.floor(totalMinutes / 60) + baseHour;
  const minutes = totalMinutes % 60;
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours;
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Execute the final successful unified order
createSuccessfulUnifiedOrder()
  .then(result => {
    if (result.success) {
      console.log('\n🏆 UNIFIED BOOKING SYSTEM: FULLY OPERATIONAL');
      console.log(`Order ${result.orderId} demonstrates complete success!`);
      console.log(`Customer ${result.customer.name} receives consolidated ${result.totalAmount} KWD payment link`);
      console.log(`Premium spa experience: ${result.schedule} with optimized staff allocation`);
    } else {
      console.log('\n❌ Still troubleshooting:', result.error);
    }
  })
  .catch(error => {
    console.error('❌ Execution failed:', error);
  });