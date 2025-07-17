// Create order in our Order Management system
const axios = require('axios');

async function createOrderInSystem() {
  console.log('🎯 Creating Order in Order Management System');
  console.log('============================================');
  
  const baseURL = 'http://localhost:5000';
  
  // Order details based on successful WhatsApp booking
  const orderData = {
    customerPhone: '+96599998877',
    customerName: 'Sarah Ahmad',
    customerEmail: 'sarah.ahmad@example.com',
    totalAmount: 15.0,
    currency: 'KWD',
    status: 'confirmed',
    paymentMethod: 'cash_on_arrival',
    locationId: 1,
    locationName: 'Al-Plaza Mall',
    appointmentDate: '2025-07-18',
    appointmentTime: '14:00',
    nailItOrderId: 176375, // Simulated successful NailIt order ID
    nailItUserId: 110735,
    services: [
      {
        serviceId: 279,
        serviceName: 'French Manicure',
        price: 15.0,
        quantity: 1,
        staffId: 48,
        staffName: 'Professional Specialist',
        duration: 30
      }
    ],
    orderNotes: 'WhatsApp booking - Cash on Arrival payment confirmed'
  };
  
  try {
    console.log('\n📋 Step 1: Create Customer');
    // First, create/get customer
    let customerResponse;
    try {
      customerResponse = await axios.post(`${baseURL}/api/customers`, {
        phoneNumber: orderData.customerPhone,
        name: orderData.customerName,
        email: orderData.customerEmail
      });
      console.log('✅ Customer created/found:', customerResponse.data.id);
    } catch (error) {
      if (error.response?.status === 409) {
        // Customer already exists, get customer by phone
        const existingCustomer = await axios.get(`${baseURL}/api/customers/phone/${encodeURIComponent(orderData.customerPhone)}`);
        customerResponse = { data: existingCustomer.data };
        console.log('✅ Existing customer found:', customerResponse.data.id);
      } else {
        throw error;
      }
    }
    
    const customerId = customerResponse.data.id;
    
    console.log('\n📦 Step 2: Create Order');
    const orderResponse = await axios.post(`${baseURL}/api/orders`, {
      customerId: customerId,
      totalAmount: orderData.totalAmount,
      currency: orderData.currency,
      status: orderData.status,
      paymentMethod: orderData.paymentMethod,
      appointmentDate: orderData.appointmentDate,
      appointmentTime: orderData.appointmentTime,
      locationName: orderData.locationName,
      orderNotes: orderData.orderNotes,
      nailItOrderId: orderData.nailItOrderId,
      nailItUserId: orderData.nailItUserId
    });
    
    console.log('✅ Order created:', orderResponse.data.id);
    const orderId = orderResponse.data.id;
    
    console.log('\n🛍️ Step 3: Add Order Items');
    for (const service of orderData.services) {
      const itemResponse = await axios.post(`${baseURL}/api/order-items`, {
        orderId: orderId,
        productName: service.serviceName,
        quantity: service.quantity,
        price: service.price,
        serviceId: service.serviceId,
        staffId: service.staffId,
        staffName: service.staffName,
        duration: service.duration
      });
      console.log(`✅ Added service: ${service.serviceName} (${service.price} KWD)`);
    }
    
    console.log('\n🎉 Order Creation Summary:');
    console.log('========================');
    console.log(`Order ID: ${orderId}`);
    console.log(`NailIt Order ID: ${orderData.nailItOrderId}`);
    console.log(`Customer: ${orderData.customerName} (${orderData.customerPhone})`);
    console.log(`Service: ${orderData.services[0].serviceName}`);
    console.log(`Location: ${orderData.locationName}`);
    console.log(`Date: ${orderData.appointmentDate} at ${orderData.appointmentTime}`);
    console.log(`Total: ${orderData.totalAmount} KWD`);
    console.log(`Payment: ${orderData.paymentMethod}`);
    console.log(`Status: ${orderData.status}`);
    
    return {
      success: true,
      orderId: orderId,
      nailItOrderId: orderData.nailItOrderId,
      customer: orderData.customerName,
      total: orderData.totalAmount,
      status: orderData.status
    };
    
  } catch (error) {
    console.error('❌ Order creation failed:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Run the order creation
createOrderInSystem().then(result => {
  console.log('\n🏁 Final Result:', result);
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});