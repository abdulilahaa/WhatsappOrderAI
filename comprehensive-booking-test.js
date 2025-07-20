// Comprehensive Multi-Service Booking Test
// This script demonstrates complete order creation with staff availability

const API_BASE = 'http://localhost:5000';

async function createMultiServiceBooking() {
  console.log('🎯 COMPREHENSIVE MULTI-SERVICE BOOKING TEST');
  console.log('='.repeat(60));
  
  // Step 1: Customer Registration
  console.log('\n📋 STEP 1: Register New Customer');
  const customerData = {
    customerName: "Layla Al-Mansouri",
    customerPhone: "96588999",
    customerEmail: "layla.almansouri@email.com"
  };
  
  const customerResponse = await fetch(`${API_BASE}/api/nailit/register-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerData)
  });
  const customer = await customerResponse.json();
  console.log('✅ Customer Registered:', customer);
  
  // Step 2: Get Available Services
  console.log('\n📋 STEP 2: Get Available Services');
  const servicesResponse = await fetch(`${API_BASE}/api/nailit/get-items-by-date`);
  const servicesData = await servicesResponse.json();
  
  // Select 3 diverse services for booking
  const selectedServices = [
    servicesData.items.find(item => item.Item_Name.includes('Manicure') || item.Item_Id === 279),
    servicesData.items.find(item => item.Item_Name.includes('Facial') || item.Item_Id === 260),
    servicesData.items.find(item => item.Item_Name.includes('Hair') || item.Item_Id === 258)
  ].filter(Boolean).slice(0, 3);
  
  console.log('📝 Selected Services:');
  selectedServices.forEach(service => {
    console.log(`   • ${service.Item_Name} (ID: ${service.Item_Id}) - ${service.Primary_Price} KWD`);
  });
  
  // Step 3: Check Staff Availability for Each Service
  console.log('\n📋 STEP 3: Check Staff Availability');
  const appointmentDate = "23-07-2025";
  const staffAvailability = [];
  
  for (const service of selectedServices) {
    const staffResponse = await fetch(`${API_BASE}/api/nailit/get-service-staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: service.Item_Id,
        locationId: 1,
        selectedDate: appointmentDate
      })
    });
    const staffData = await staffResponse.json();
    
    if (staffData.staff && staffData.staff.length > 0) {
      const assignedStaff = staffData.staff[0]; // Select first available staff
      staffAvailability.push({
        serviceId: service.Item_Id,
        serviceName: service.Item_Name,
        staffId: assignedStaff.Staff_Id,
        staffName: assignedStaff.Staff_Name,
        duration: service.Duration_Minutes || 30,
        price: service.Primary_Price
      });
      console.log(`   ✅ ${service.Item_Name}: ${assignedStaff.Staff_Name} (ID: ${assignedStaff.Staff_Id})`);
    } else {
      console.log(`   ❌ ${service.Item_Name}: No staff available`);
    }
  }
  
  // Step 4: Calculate Time Slots
  console.log('\n📋 STEP 4: Calculate Time Slots');
  let currentTimeSlot = 10; // Start at 10:00 AM
  const bookingDetails = [];
  let totalAmount = 0;
  
  staffAvailability.forEach(booking => {
    const slotsNeeded = Math.ceil(booking.duration / 30); // 30-min slots
    const timeSlots = [];
    for (let i = 0; i < slotsNeeded; i++) {
      timeSlots.push(currentTimeSlot + i);
    }
    
    bookingDetails.push({
      serviceId: booking.serviceId,
      serviceName: booking.serviceName,
      staffId: booking.staffId,
      staffName: booking.staffName,
      timeSlots: timeSlots,
      duration: booking.duration,
      price: booking.price
    });
    
    totalAmount += booking.price;
    currentTimeSlot += slotsNeeded; // Move to next available slot
    
    console.log(`   📅 ${booking.serviceName}: Slots ${timeSlots.join(',')} (${booking.staffName})`);
  });
  
  console.log(`   💰 Total Amount: ${totalAmount} KWD`);
  
  // Step 5: Create Complete Order
  console.log('\n📋 STEP 5: Create Complete Order');
  
  // Create individual orders for each service (NailIt requires separate orders per service)
  const orderResults = [];
  
  for (const booking of bookingDetails) {
    const orderData = {
      App_User_Id: customer.App_User_Id,
      Customer_Name: customerData.customerName,
      Customer_Phone: customerData.customerPhone,
      Location_Id: 1,
      Item_Id: booking.serviceId,
      Staff_Id: booking.staffId,
      Appointment_Date: "23/07/2025", // NailIt format
      TimeFrame_Ids: booking.timeSlots,
      Pay_Type: 2, // KNet
      Order_Type: 2,
      Total_Amount: booking.price,
      Item_Qty: 1
    };
    
    console.log(`\n🔄 Creating order for ${booking.serviceName}...`);
    
    const orderResponse = await fetch(`${API_BASE}/api/nailit/save-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    
    const orderResult = await orderResponse.json();
    orderResults.push({
      service: booking.serviceName,
      staff: booking.staffName,
      timeSlots: booking.timeSlots,
      result: orderResult
    });
    
    console.log(`   📋 Order Result:`, orderResult);
  }
  
  // Step 6: Payment Verification
  console.log('\n📋 STEP 6: Payment Verification');
  for (const order of orderResults) {
    if (order.result.Order_Id) {
      try {
        const paymentResponse = await fetch(`${API_BASE}/api/nailit/verify-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.result.Order_Id.toString() })
        });
        const paymentResult = await paymentResponse.json();
        
        console.log(`   💳 Payment for ${order.service}:`, {
          orderId: order.result.Order_Id,
          status: paymentResult.orderStatus || 'Pending',
          paymentType: paymentResult.paymentType || 'KNet'
        });
      } catch (error) {
        console.log(`   ❌ Payment verification failed for ${order.service}`);
      }
    }
  }
  
  // Summary Report
  console.log('\n📊 BOOKING SUMMARY REPORT');
  console.log('='.repeat(60));
  console.log(`Customer: ${customerData.customerName} (ID: ${customer.App_User_Id})`);
  console.log(`Phone: ${customerData.customerPhone}`);
  console.log(`Date: July 23, 2025`);
  console.log(`Location: Al-Plaza Mall`);
  console.log(`Total Services: ${bookingDetails.length}`);
  console.log(`Total Amount: ${totalAmount} KWD`);
  console.log('\nService Details:');
  
  orderResults.forEach((order, index) => {
    console.log(`${index + 1}. ${order.service}`);
    console.log(`   Staff: ${order.staff}`);
    console.log(`   Time: Slots ${order.timeSlots.join(', ')}`);
    console.log(`   Order ID: ${order.result.Order_Id || 'Failed'}`);
    console.log(`   Status: ${order.result.Message || 'Unknown'}`);
  });
  
  return {
    customer: customer,
    bookings: bookingDetails,
    orders: orderResults,
    totalAmount: totalAmount
  };
}

// Run the comprehensive booking test
createMultiServiceBooking()
  .then(result => {
    console.log('\n✅ COMPREHENSIVE BOOKING TEST COMPLETED');
    console.log('Results available in return object');
  })
  .catch(error => {
    console.error('❌ Booking test failed:', error);
  });