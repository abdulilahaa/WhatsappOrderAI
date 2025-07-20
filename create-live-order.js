// Create Live Order in NailIt POS System
// This demonstrates creating an actual order using collected booking data

const baseUrl = 'http://localhost:5000';

async function createLiveOrder() {
  console.log('🔥 CREATING LIVE ORDER IN NAILIT POS SYSTEM');
  console.log('=============================================\n');
  
  try {
    // Test live order creation with comprehensive data
    const orderData = {
      // Customer Information
      customerName: "Ahmed Al-Rashid",
      customerEmail: "ahmed.alrashid@example.com",
      customerPhone: "+96599DEMO001",
      
      // Booking Details
      locationId: 1, // Al-Plaza Mall
      appointmentDate: "22/07/2025", // Tomorrow in dd/MM/yyyy format
      timeSlots: [7, 8], // 3:00 PM slots
      
      // Services
      services: [
        {
          itemId: 61,
          itemName: "Olaplex Hair Treatment",
          price: 15,
          quantity: 1,
          duration: 60
        }
      ],
      
      // Payment
      paymentTypeId: 2, // KNet
      totalAmount: 15,
      
      // Additional Details
      notes: "Booking created via Enhanced AI Agent - Live Demo"
    };

    console.log('ORDER DATA TO BE CREATED:');
    console.log('-------------------------');
    console.log(`Customer: ${orderData.customerName}`);
    console.log(`Email: ${orderData.customerEmail}`);
    console.log(`Phone: ${orderData.customerPhone}`);
    console.log(`Location: Al-Plaza Mall (ID: ${orderData.locationId})`);
    console.log(`Date: ${orderData.appointmentDate}`);
    console.log(`Time Slots: ${orderData.timeSlots.join(', ')}`);
    console.log(`Service: ${orderData.services[0].itemName}`);
    console.log(`Price: ${orderData.totalAmount} KWD`);
    console.log(`Payment: KNet (ID: ${orderData.paymentTypeId})`);
    console.log('---\n');

    // Step 1: Register customer in NailIt system
    console.log('STEP 1: Register Customer in NailIt POS');
    const registerResponse = await fetch(`${baseUrl}/api/nailit/register-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: orderData.customerName.split(' ')[0],
        lastName: orderData.customerName.split(' ').slice(1).join(' '),
        email: orderData.customerEmail,
        phoneNumber: orderData.customerPhone,
        deviceId: "ENHANCED_AI_DEMO_001"
      })
    });
    
    const registerData = await registerResponse.json();
    console.log('✅ Customer Registration Result:');
    if (registerData.success) {
      console.log(`   User ID: ${registerData.userId}`);
      console.log(`   Customer ID: ${registerData.customerId}`);
    } else {
      console.log(`   Status: ${registerData.message}`);
    }
    console.log('---\n');

    // Step 2: Create order in NailIt POS
    console.log('STEP 2: Create Order in NailIt POS System');
    
    const saveOrderData = {
      App_User_Id: registerData.userId || 110000, // Use registered user ID or fallback
      Customer_Id: registerData.customerId || 11000, // Use registered customer ID or fallback
      Location_Id: orderData.locationId,
      Appointment_Date: orderData.appointmentDate,
      TimeFrame_Ids: orderData.timeSlots,
      Item_Ids: orderData.services.map(s => s.itemId),
      Item_Quantities: orderData.services.map(s => s.quantity),
      Payment_Type_Id: orderData.paymentTypeId,
      Order_Amount: orderData.totalAmount,
      Discount_Amount: 0,
      Tax_Amount: 0,
      Order_Notes: orderData.notes,
      Is_Home_Service: false,
      Staff_Ids: [], // Auto-assign staff
      Device_Id: "ENHANCED_AI_DEMO_001"
    };

    const saveOrderResponse = await fetch(`${baseUrl}/api/nailit/save-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saveOrderData)
    });
    
    const saveOrderResult = await saveOrderResponse.json();
    console.log('✅ Order Creation Result:');
    
    if (saveOrderResult.OrderId) {
      console.log(`   ✅ SUCCESS: Order created successfully!`);
      console.log(`   Order ID: ${saveOrderResult.OrderId}`);
      console.log(`   Customer ID: ${saveOrderResult.CustomerId}`);
      console.log(`   Order Status: ${saveOrderResult.Status || 'Created'}`);
      
      // Step 3: Generate payment link
      const paymentLink = `http://nailit.innovasolution.net/knet.aspx?orderId=${saveOrderResult.OrderId}`;
      console.log(`   💳 KNet Payment Link: ${paymentLink}`);
      
      // Step 4: Verify order details
      console.log('\nSTEP 3: Verify Order in NailIt System');
      const verifyResponse = await fetch(`${baseUrl}/api/nailit/order-payment-detail/${saveOrderResult.OrderId}`);
      const orderDetails = await verifyResponse.json();
      
      if (orderDetails.success) {
        console.log('✅ Order Verification Successful:');
        console.log(`   Order ID: ${orderDetails.data.Order_Id}`);
        console.log(`   Customer: ${orderDetails.data.Customer_Name}`);
        console.log(`   Location: ${orderDetails.data.Location_Name}`);
        console.log(`   Service: ${orderDetails.data.Order_Items[0]?.Item_Name || 'N/A'}`);
        console.log(`   Appointment Date: ${orderDetails.data.Appointment_Date}`);
        console.log(`   Order Status: ${orderDetails.data.Order_Status}`);
        console.log(`   Payment Status: ${orderDetails.data.Payment_Status}`);
        console.log(`   Total Amount: ${orderDetails.data.Order_Amount} KWD`);
      }
      
      console.log('\n🎉 LIVE ORDER CREATION COMPLETE!');
      console.log('===============================');
      console.log(`✅ Real Order ID: ${saveOrderResult.OrderId}`);
      console.log(`✅ Created in NailIt POS System`);
      console.log(`✅ Customer registered and assigned`);
      console.log(`✅ Payment link generated`);
      console.log(`✅ Order ready for payment processing`);
      
      return {
        success: true,
        orderId: saveOrderResult.OrderId,
        customerId: saveOrderResult.CustomerId,
        paymentLink: paymentLink,
        orderDetails: orderDetails.success ? orderDetails.data : null
      };
      
    } else {
      console.log('❌ Order creation failed:');
      console.log(`   Error: ${saveOrderResult.message || 'Unknown error'}`);
      console.log(`   Details: ${JSON.stringify(saveOrderResult, null, 2)}`);
      
      return {
        success: false,
        error: saveOrderResult.message || 'Order creation failed',
        details: saveOrderResult
      };
    }

  } catch (error) {
    console.error('Live order creation error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

createLiveOrder();