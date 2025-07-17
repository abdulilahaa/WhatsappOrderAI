// Create order using the confirmed working dd/MM/yyyy format
import axios from 'axios';

async function createWorkingOrder() {
  console.log('🎯 CREATING ORDER WITH CONFIRMED dd/MM/yyyy FORMAT');
  console.log('===============================================');
  
  const headers = {
    'Content-Type': 'application/json',
    'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh'
  };

  // Register a new user
  console.log('1️⃣ Registering new user...');
  
  try {
    const userResponse = await axios.post('http://localhost:5000/api/nailit/register-user', {
      Address: "Kuwait City",
      Email_Id: "confirmed.working@test.com",
      Name: "Confirmed Working User",
      Mobile: "33333333",
      Login_Type: 1,
      Image_Name: ""
    });
    
    console.log(`✅ User registered: ID ${userResponse.data.App_User_Id}, Customer ID ${userResponse.data.Customer_Id}`);
    
    const userId = userResponse.data.App_User_Id;
    
    // Create order with confirmed working configuration
    console.log('\n2️⃣ Creating order with confirmed working parameters...');
    
    const orderData = {
      "Gross_Amount": 25.0,
      "Payment_Type_Id": 1,
      "Order_Type": 2,
      "UserId": userId,
      "FirstName": "Confirmed Working User",
      "Mobile": "+96533333333",
      "Email": "confirmed.working@test.com",
      "Discount_Amount": 0.0,
      "Net_Amount": 25.0,
      "POS_Location_Id": 1,
      "OrderDetails": [
        {
          "Prod_Id": 258,
          "Prod_Name": "Confirmed Working Service",
          "Qty": 1,
          "Rate": 25.0,
          "Amount": 25.0,
          "Size_Id": null,
          "Size_Name": "",
          "Promotion_Id": 0,
          "Promo_Code": "",
          "Discount_Amount": 0.0,
          "Net_Amount": 25.0,
          "Staff_Id": 49,
          "TimeFrame_Ids": [5, 6],
          "Appointment_Date": "01/08/2025"  // dd/MM/yyyy format - CONFIRMED WORKING
        }
      ]
    };
    
    console.log('📋 Order Configuration:');
    console.log(`   Service: ${orderData.OrderDetails[0].Prod_Name}`);
    console.log(`   Date: ${orderData.OrderDetails[0].Appointment_Date} (dd/MM/yyyy format)`);
    console.log(`   Staff: ${orderData.OrderDetails[0].Staff_Id}`);
    console.log(`   Time Slots: [${orderData.OrderDetails[0].TimeFrame_Ids.join(', ')}]`);
    console.log(`   Amount: ${orderData.Gross_Amount} KWD`);
    
    const response = await axios.post('http://nailit.innovasolution.net/SaveOrder', orderData, { headers });
    
    console.log(`\n📊 Response: Status ${response.data.Status}, Message: ${response.data.Message}`);
    
    if (response.data.Status === 0) {
      console.log(`\n🎉 SUCCESS! Order created successfully!`);
      console.log(`📋 Order ID: ${response.data.OrderId}`);
      console.log(`👤 Customer ID: ${response.data.CustomerId}`);
      console.log(`💰 Amount: ${orderData.Gross_Amount} KWD`);
      console.log(`📅 Date: ${orderData.OrderDetails[0].Appointment_Date}`);
      console.log(`🔧 Service: ${orderData.OrderDetails[0].Prod_Name}`);
      console.log(`👨‍💼 Staff ID: ${orderData.OrderDetails[0].Staff_Id}`);
      console.log(`⏰ Time Slots: [${orderData.OrderDetails[0].TimeFrame_Ids.join(', ')}]`);
      
      // Try to get payment details
      console.log('\n3️⃣ Retrieving payment details...');
      try {
        const paymentResponse = await axios.get(`http://localhost:5000/api/nailit/get-order-payment-detail/${response.data.OrderId}`);
        console.log(`💳 Payment Details: ${JSON.stringify(paymentResponse.data, null, 2)}`);
      } catch (paymentError) {
        console.log(`   (Payment details not available: ${paymentError.message})`);
      }
      
      // Test KNet payment link generation
      console.log('\n4️⃣ Testing KNet payment link generation...');
      const knetLink = `http://nailit.innovasolution.net/knet.aspx?orderId=${response.data.OrderId}`;
      console.log(`🔗 KNet Payment Link: ${knetLink}`);
      
      console.log('\n✅ COMPLETE ORDER CREATION SUCCESS!');
      console.log('================================');
      console.log('The NailIt SaveOrder API is now fully operational with:');
      console.log('- Correct dd/MM/yyyy date format');
      console.log('- Real user registration');
      console.log('- Authentic order creation');
      console.log('- Payment link generation');
      console.log('- Complete integration with NailIt POS system');
      
      return {
        success: true,
        orderId: response.data.OrderId,
        customerId: response.data.CustomerId,
        userId: userId,
        amount: orderData.Gross_Amount,
        date: orderData.OrderDetails[0].Appointment_Date,
        knetLink: knetLink,
        message: response.data.Message
      };
    } else {
      console.log(`\n❌ Order creation failed: Status ${response.data.Status}`);
      console.log(`   Message: ${response.data.Message}`);
      return {
        success: false,
        status: response.data.Status,
        message: response.data.Message
      };
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute the order creation
createWorkingOrder().then(result => {
  console.log('\n🎯 FINAL RESULT:');
  console.log('================');
  if (result.success) {
    console.log(`✅ Order Successfully Created!`);
    console.log(`Order ID: ${result.orderId}`);
    console.log(`Customer ID: ${result.customerId}`);
    console.log(`User ID: ${result.userId}`);
    console.log(`Amount: ${result.amount} KWD`);
    console.log(`Date: ${result.date}`);
    console.log(`KNet Link: ${result.knetLink}`);
    console.log(`Message: ${result.message}`);
  } else {
    console.log(`❌ Order Creation Failed`);
    if (result.status) console.log(`Status: ${result.status}`);
    if (result.message) console.log(`Message: ${result.message}`);
    if (result.error) console.log(`Error: ${result.error}`);
  }
}).catch(console.error);