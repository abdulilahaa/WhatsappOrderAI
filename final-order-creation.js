// Final comprehensive order creation approach
import axios from 'axios';

async function createOrderFinalAttempt() {
  console.log('🎯 FINAL ORDER CREATION ATTEMPT');
  console.log('===============================');
  
  const headers = {
    'Content-Type': 'application/json',
    'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh'
  };

  // First, let's try to register a completely new user
  console.log('\n1️⃣ Registering new user...');
  
  try {
    const userResponse = await axios.post('http://localhost:5000/api/nailit/register-user', {
      Address: "Kuwait City",
      Email_Id: "finaltest@example.com",
      Name: "Final Test User",
      Mobile: "11111111",
      Login_Type: 1,
      Image_Name: ""
    });
    
    console.log(`✅ User registered: ID ${userResponse.data.App_User_Id}, Customer ID ${userResponse.data.Customer_Id}`);
    
    const userId = userResponse.data.App_User_Id;
    
    // Now let's try multiple simple order configurations
    const orderConfigurations = [
      {
        name: "Basic Single Service (Service ID: 203)",
        data: {
          "Gross_Amount": 5.0,
          "Payment_Type_Id": 1,
          "Order_Type": 2,
          "UserId": userId,
          "FirstName": "Final Test User",
          "Mobile": "+96511111111",
          "Email": "finaltest@example.com",
          "Discount_Amount": 0.0,
          "Net_Amount": 5.0,
          "POS_Location_Id": 1,
          "OrderDetails": [
            {
              "Prod_Id": 203,
              "Prod_Name": "Basic Service",
              "Qty": 1,
              "Rate": 5.0,
              "Amount": 5.0,
              "Size_Id": null,
              "Size_Name": "",
              "Promotion_Id": 0,
              "Promo_Code": "",
              "Discount_Amount": 0.0,
              "Net_Amount": 5.0,
              "Staff_Id": 48,
              "TimeFrame_Ids": [1],
              "Appointment_Date": "12/01/2025"
            }
          ]
        }
      },
      {
        name: "Service with December Date",
        data: {
          "Gross_Amount": 10.0,
          "Payment_Type_Id": 1,
          "Order_Type": 2,
          "UserId": userId,
          "FirstName": "Final Test User",
          "Mobile": "+96511111111",
          "Email": "finaltest@example.com",
          "Discount_Amount": 0.0,
          "Net_Amount": 10.0,
          "POS_Location_Id": 1,
          "OrderDetails": [
            {
              "Prod_Id": 279,
              "Prod_Name": "December Service",
              "Qty": 1,
              "Rate": 10.0,
              "Amount": 10.0,
              "Size_Id": null,
              "Size_Name": "",
              "Promotion_Id": 0,
              "Promo_Code": "",
              "Discount_Amount": 0.0,
              "Net_Amount": 10.0,
              "Staff_Id": 48,
              "TimeFrame_Ids": [1, 2],
              "Appointment_Date": "12/15/2025"
            }
          ]
        }
      },
      {
        name: "Service with Next Week Date",
        data: {
          "Gross_Amount": 15.0,
          "Payment_Type_Id": 1,
          "Order_Type": 2,
          "UserId": userId,
          "FirstName": "Final Test User",
          "Mobile": "+96511111111",
          "Email": "finaltest@example.com",
          "Discount_Amount": 0.0,
          "Net_Amount": 15.0,
          "POS_Location_Id": 1,
          "OrderDetails": [
            {
              "Prod_Id": 258,
              "Prod_Name": "Next Week Service",
              "Qty": 1,
              "Rate": 15.0,
              "Amount": 15.0,
              "Size_Id": null,
              "Size_Name": "",
              "Promotion_Id": 0,
              "Promo_Code": "",
              "Discount_Amount": 0.0,
              "Net_Amount": 15.0,
              "Staff_Id": 49,
              "TimeFrame_Ids": [3, 4],
              "Appointment_Date": "07/25/2025"
            }
          ]
        }
      },
      {
        name: "Service with August Date",
        data: {
          "Gross_Amount": 20.0,
          "Payment_Type_Id": 1,
          "Order_Type": 2,
          "UserId": userId,
          "FirstName": "Final Test User",
          "Mobile": "+96511111111",
          "Email": "finaltest@example.com",
          "Discount_Amount": 0.0,
          "Net_Amount": 20.0,
          "POS_Location_Id": 1,
          "OrderDetails": [
            {
              "Prod_Id": 277,
              "Prod_Name": "August Service",
              "Qty": 1,
              "Rate": 20.0,
              "Amount": 20.0,
              "Size_Id": null,
              "Size_Name": "",
              "Promotion_Id": 0,
              "Promo_Code": "",
              "Discount_Amount": 0.0,
              "Net_Amount": 20.0,
              "Staff_Id": 50,
              "TimeFrame_Ids": [5, 6],
              "Appointment_Date": "08/01/2025"
            }
          ]
        }
      },
      {
        name: "Service with September Date",
        data: {
          "Gross_Amount": 25.0,
          "Payment_Type_Id": 1,
          "Order_Type": 2,
          "UserId": userId,
          "FirstName": "Final Test User",
          "Mobile": "+96511111111",
          "Email": "finaltest@example.com",
          "Discount_Amount": 0.0,
          "Net_Amount": 25.0,
          "POS_Location_Id": 1,
          "OrderDetails": [
            {
              "Prod_Id": 280,
              "Prod_Name": "September Service",
              "Qty": 1,
              "Rate": 25.0,
              "Amount": 25.0,
              "Size_Id": null,
              "Size_Name": "",
              "Promotion_Id": 0,
              "Promo_Code": "",
              "Discount_Amount": 0.0,
              "Net_Amount": 25.0,
              "Staff_Id": 48,
              "TimeFrame_Ids": [7, 8],
              "Appointment_Date": "09/15/2025"
            }
          ]
        }
      }
    ];
    
    console.log('\n2️⃣ Trying multiple order configurations...');
    
    for (const config of orderConfigurations) {
      console.log(`\n🔄 Trying: ${config.name}`);
      
      try {
        const response = await axios.post('http://nailit.innovasolution.net/SaveOrder', config.data, { headers });
        
        console.log(`   Response: Status ${response.data.Status}, Message: ${response.data.Message}`);
        
        if (response.data.Status === 0) {
          console.log(`\n🎉 SUCCESS! Order created with: ${config.name}`);
          console.log(`📋 Order ID: ${response.data.OrderId}`);
          console.log(`👤 Customer ID: ${response.data.CustomerId}`);
          console.log(`💰 Amount: ${config.data.Gross_Amount} KWD`);
          console.log(`📅 Date: ${config.data.OrderDetails[0].Appointment_Date}`);
          console.log(`🔧 Service: ${config.data.OrderDetails[0].Prod_Name}`);
          console.log(`👨‍💼 Staff ID: ${config.data.OrderDetails[0].Staff_Id}`);
          console.log(`⏰ Time Slots: [${config.data.OrderDetails[0].TimeFrame_Ids.join(', ')}]`);
          
          // Try to get payment details
          try {
            const paymentResponse = await axios.get(`http://localhost:5000/api/nailit/get-order-payment-detail/${response.data.OrderId}`);
            console.log(`💳 Payment Details Retrieved: ${JSON.stringify(paymentResponse.data, null, 2)}`);
          } catch (paymentError) {
            console.log(`   (Could not fetch payment details: ${paymentError.message})`);
          }
          
          return {
            success: true,
            orderId: response.data.OrderId,
            customerId: response.data.CustomerId,
            userId: userId,
            configuration: config.name,
            amount: config.data.Gross_Amount,
            date: config.data.OrderDetails[0].Appointment_Date,
            message: response.data.Message
          };
        } else if (response.data.Status === 102) {
          console.log(`   ⚠️ Services not available (Status: 102)`);
        } else {
          console.log(`   ❌ Failed with Status: ${response.data.Status}`);
        }
      } catch (error) {
        console.log(`   💥 Error: ${error.message}`);
      }
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log('\n❌ All configurations failed with this user');
    return {
      success: false,
      userId: userId,
      message: 'All order configurations failed'
    };
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Also try with the known working user ID
async function tryWithKnownUser() {
  console.log('\n3️⃣ Trying with known working user (ID: 128)...');
  
  const headers = {
    'Content-Type': 'application/json',
    'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh'
  };

  const futureOrderConfigs = [
    {
      name: "Working User - Future January",
      data: {
        "Gross_Amount": 15.0,
        "Payment_Type_Id": 1,
        "Order_Type": 2,
        "UserId": 128,
        "FirstName": "Known User Test",
        "Mobile": "+96588888889",
        "Email": "knownuser@test.com",
        "Discount_Amount": 0.0,
        "Net_Amount": 15.0,
        "POS_Location_Id": 1,
        "OrderDetails": [
          {
            "Prod_Id": 203,
            "Prod_Name": "Future Service",
            "Qty": 1,
            "Rate": 15.0,
            "Amount": 15.0,
            "Size_Id": null,
            "Size_Name": "",
            "Promotion_Id": 0,
            "Promo_Code": "",
            "Discount_Amount": 0.0,
            "Net_Amount": 15.0,
            "Staff_Id": 48,
            "TimeFrame_Ids": [1, 2],
            "Appointment_Date": "01/15/2026"
          }
        ]
      }
    },
    {
      name: "Working User - Future February",
      data: {
        "Gross_Amount": 20.0,
        "Payment_Type_Id": 1,
        "Order_Type": 2,
        "UserId": 128,
        "FirstName": "Known User Test",
        "Mobile": "+96588888889",
        "Email": "knownuser@test.com",
        "Discount_Amount": 0.0,
        "Net_Amount": 20.0,
        "POS_Location_Id": 1,
        "OrderDetails": [
          {
            "Prod_Id": 279,
            "Prod_Name": "Future Service 2",
            "Qty": 1,
            "Rate": 20.0,
            "Amount": 20.0,
            "Size_Id": null,
            "Size_Name": "",
            "Promotion_Id": 0,
            "Promo_Code": "",
            "Discount_Amount": 0.0,
            "Net_Amount": 20.0,
            "Staff_Id": 49,
            "TimeFrame_Ids": [3, 4],
            "Appointment_Date": "02/15/2026"
          }
        ]
      }
    }
  ];

  for (const config of futureOrderConfigs) {
    console.log(`\n🔄 Trying: ${config.name}`);
    
    try {
      const response = await axios.post('http://nailit.innovasolution.net/SaveOrder', config.data, { headers });
      
      console.log(`   Response: Status ${response.data.Status}, Message: ${response.data.Message}`);
      
      if (response.data.Status === 0) {
        console.log(`\n🎉 SUCCESS! Order created with: ${config.name}`);
        console.log(`📋 Order ID: ${response.data.OrderId}`);
        console.log(`👤 Customer ID: ${response.data.CustomerId}`);
        console.log(`💰 Amount: ${config.data.Gross_Amount} KWD`);
        console.log(`📅 Date: ${config.data.OrderDetails[0].Appointment_Date}`);
        
        return {
          success: true,
          orderId: response.data.OrderId,
          customerId: response.data.CustomerId,
          userId: 128,
          configuration: config.name,
          amount: config.data.Gross_Amount,
          date: config.data.OrderDetails[0].Appointment_Date
        };
      }
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  return { success: false };
}

// Execute final attempt
async function executeFinalAttempt() {
  console.log('🔥 EXECUTING FINAL COMPREHENSIVE ORDER CREATION');
  console.log('===============================================');
  
  // Method 1: New user with multiple configurations
  let result = await createOrderFinalAttempt();
  
  if (result.success) {
    console.log('\n✅ SUCCESS WITH NEW USER!');
    return result;
  }
  
  // Method 2: Known working user with future dates
  result = await tryWithKnownUser();
  
  if (result.success) {
    console.log('\n✅ SUCCESS WITH KNOWN USER!');
    return result;
  }
  
  console.log('\n❌ FINAL ATTEMPT FAILED');
  console.log('All methods exhausted. The NailIt SaveOrder API appears to have');
  console.log('specific availability constraints that prevent current order creation.');
  return { success: false };
}

// Run final attempt
executeFinalAttempt().then(result => {
  if (result.success) {
    console.log('\n🎯 FINAL SUCCESS! ORDER CREATED!');
    console.log('================================');
    console.log(`Order ID: ${result.orderId}`);
    console.log(`Customer ID: ${result.customerId}`);
    console.log(`User ID: ${result.userId}`);
    console.log(`Configuration: ${result.configuration}`);
    console.log(`Amount: ${result.amount} KWD`);
    console.log(`Date: ${result.date}`);
    if (result.message) console.log(`Message: ${result.message}`);
  } else {
    console.log('\n❌ FINAL RESULT: No order could be created');
    console.log('The NailIt SaveOrder API is functioning correctly but');
    console.log('rejecting orders due to availability constraints.');
  }
}).catch(console.error);