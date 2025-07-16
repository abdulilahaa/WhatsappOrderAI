import { nailItAPI } from './nailit-api';

export async function testOrderAndPayment() {
  console.log('\n🧪 TESTING ORDER AND PAYMENT FLOW\n');

  try {
    // Step 1: Get available services for Al-Plaza Mall
    console.log('📋 Step 1: Get Available Services');
    const services = await nailItAPI.getItemsByDate({
      Lang: 'E',
      Like: '',
      Page_No: 1,
      Item_Type_Id: 2,
      Group_Id: 0,
      Location_Ids: [1],
      Is_Home_Service: false,
      Selected_Date: '17-07-2025'
    });
    
    console.log(`✅ Found ${services.totalItems} total services`);
    const firstService = services.items[0];
    console.log(`📌 Testing with: ${firstService.Item_Name} (ID: ${firstService.Item_Id}) - ${firstService.Special_Price || firstService.Primary_Price} KWD`);

    // Step 2: Get staff for this service
    console.log('\n📋 Step 2: Get Service Staff');
    const staff = await nailItAPI.getServiceStaff(firstService.Item_Id, 1, 'E', '17-07-2025');
    console.log(`✅ Found ${staff.length} staff members`);
    const assignedStaff = staff[0];
    console.log(`📌 Assigned Staff: ${assignedStaff.Name} (ID: ${assignedStaff.Id})`);

    // Step 3: Get available time slots
    console.log('\n📋 Step 3: Get Available Time Slots');
    const timeSlots = await nailItAPI.getAvailableSlots(1, firstService.Item_Id, '17-07-2025', 'E');
    console.log(`✅ Found ${timeSlots.length} time slots`);
    const selectedSlot = timeSlots[0];
    console.log(`📌 Selected Time: ${selectedSlot.TimeFrame_Name} (ID: ${selectedSlot.TimeFrame_Id})`);

    // Step 4: Get payment types
    console.log('\n📋 Step 4: Get Payment Types');
    const paymentTypes = await nailItAPI.getPaymentTypes('E');
    console.log(`✅ Found ${paymentTypes.length} payment types`);
    
    // Use default payment type if none found
    const paymentTypeId = paymentTypes.length > 0 ? paymentTypes[0].Type_Id : 1;
    console.log(`📌 Using Payment Type ID: ${paymentTypeId}`);

    // Step 5: Register test customer
    console.log('\n📋 Step 5: Register Test Customer');
    const customer = await nailItAPI.registerUser({
      Address: '+96512345678',
      Email_Id: 'order.test@example.com',
      Name: 'Order Test Customer',
      Mobile: '+96512345678',
      Login_Type: 1
    });
    
    console.log(`✅ Customer registered: ID ${customer.App_User_Id}`);

    // Step 6: Create order
    console.log('\n📋 Step 6: Create Order in NailIt POS');
    const orderData = {
      Gross_Amount: firstService.Special_Price || firstService.Primary_Price,
      Payment_Type_Id: paymentTypeId,
      Order_Type: 1,
      UserId: customer.App_User_Id,
      FirstName: 'Order Test Customer',
      Mobile: '+96512345678',
      Email: 'order.test@example.com',
      Discount_Amount: 0,
      Net_Amount: firstService.Special_Price || firstService.Primary_Price,
      POS_Location_Id: 1,
      OrderDetails: [{
        Prod_Id: firstService.Item_Id,
        Prod_Name: firstService.Item_Name,
        Qty: 1,
        Rate: firstService.Special_Price || firstService.Primary_Price,
        Amount: firstService.Special_Price || firstService.Primary_Price,
        Size_Id: null,
        Size_Name: "",
        Promotion_Id: 0,
        Promo_Code: "",
        Discount_Amount: 0,
        Net_Amount: firstService.Special_Price || firstService.Primary_Price,
        Staff_Id: assignedStaff.Id,
        TimeFrame_Ids: [selectedSlot.TimeFrame_Id],
        Appointment_Date: '17-07-2025'
      }]
    };

    console.log('📤 Sending Order Data:');
    console.log(JSON.stringify(orderData, null, 2));

    const orderResult = await nailItAPI.saveOrder(orderData);
    console.log('\n📥 Order Result:');
    console.log(JSON.stringify(orderResult, null, 2));

    // Step 7: Check order payment details if order was created
    if (orderResult && orderResult.OrderId && orderResult.OrderId > 0) {
      console.log('\n📋 Step 7: Get Order Payment Details');
      const paymentDetails = await nailItAPI.getOrderPaymentDetail(orderResult.OrderId);
      console.log('✅ Order Payment Details:');
      console.log(JSON.stringify(paymentDetails, null, 2));
    }

    return {
      success: true,
      testResults: {
        servicesFound: services.totalItems,
        staffFound: staff.length,
        timeSlotsFound: timeSlots.length,
        paymentTypesFound: paymentTypes.length,
        customerRegistered: customer.App_User_Id,
        orderCreated: orderResult?.OrderId || 0,
        orderStatus: orderResult?.Status || 0,
        orderMessage: orderResult?.Message || 'No message'
      },
      orderData,
      orderResult
    };

  } catch (error) {
    console.error('❌ Order and Payment test failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}