// Test SaveOrder API with dd/MM/yyyy date format
import axios from 'axios';

async function testDDMMYYYYFormat() {
  console.log('🔄 TESTING dd/MM/yyyy DATE FORMAT');
  console.log('=================================');
  
  const headers = {
    'Content-Type': 'application/json',
    'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh'
  };

  // Register a new user first
  console.log('1️⃣ Registering new user...');
  
  try {
    const userResponse = await axios.post('http://localhost:5000/api/nailit/register-user', {
      Address: "Kuwait City Test",
      Email_Id: "ddmmyyyy@test.com",
      Name: "DD MM YYYY Test User",
      Mobile: "22222222",
      Login_Type: 1,
      Image_Name: ""
    });
    
    console.log(`✅ User registered: ID ${userResponse.data.App_User_Id}, Customer ID ${userResponse.data.Customer_Id}`);
    
    const userId = userResponse.data.App_User_Id;
    
    // Test configurations with dd/MM/yyyy format
    const orderConfigs = [
      {
        name: "July 18th 2025 - dd/MM/yyyy format",
        data: {
          "Gross_Amount": 15.0,
          "Payment_Type_Id": 1,
          "Order_Type": 2,
          "UserId": userId,
          "FirstName": "DD MM YYYY Test User",
          "Mobile": "+96522222222",
          "Email": "ddmmyyyy@test.com",
          "Discount_Amount": 0.0,
          "Net_Amount": 15.0,
          "POS_Location_Id": 1,
          "OrderDetails": [
            {
              "Prod_Id": 203,
              "Prod_Name": "Test Service July 18",
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
              "Appointment_Date": "18/07/2025"  // dd/MM/yyyy format
            }
          ]
        }
      },
      {
        name: "July 20th 2025 - dd/MM/yyyy format",
        data: {
          "Gross_Amount": 20.0,
          "Payment_Type_Id": 1,
          "Order_Type": 2,
          "UserId": userId,
          "FirstName": "DD MM YYYY Test User",
          "Mobile": "+96522222222",
          "Email": "ddmmyyyy@test.com",
          "Discount_Amount": 0.0,
          "Net_Amount": 20.0,
          "POS_Location_Id": 1,
          "OrderDetails": [
            {
              "Prod_Id": 279,
              "Prod_Name": "Test Service July 20",
              "Qty": 1,
              "Rate": 20.0,
              "Amount": 20.0,
              "Size_Id": null,
              "Size_Name": "",
              "Promotion_Id": 0,
              "Promo_Code": "",
              "Discount_Amount": 0.0,
              "Net_Amount": 20.0,
              "Staff_Id": 48,
              "TimeFrame_Ids": [3, 4],
              "Appointment_Date": "20/07/2025"  // dd/MM/yyyy format
            }
          ]
        }
      },
      {
        name: "August 1st 2025 - dd/MM/yyyy format",
        data: {
          "Gross_Amount": 25.0,
          "Payment_Type_Id": 1,
          "Order_Type": 2,
          "UserId": userId,
          "FirstName": "DD MM YYYY Test User",
          "Mobile": "+96522222222",
          "Email": "ddmmyyyy@test.com",
          "Discount_Amount": 0.0,
          "Net_Amount": 25.0,
          "POS_Location_Id": 1,
          "OrderDetails": [
            {
              "Prod_Id": 258,
              "Prod_Name": "Test Service August 1",
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
              "Appointment_Date": "01/08/2025"  // dd/MM/yyyy format
            }
          ]
        }
      },
      {
        name: "December 15th 2025 - dd/MM/yyyy format",
        data: {
          "Gross_Amount": 30.0,
          "Payment_Type_Id": 1,
          "Order_Type": 2,
          "UserId": userId,
          "FirstName": "DD MM YYYY Test User",
          "Mobile": "+96522222222",
          "Email": "ddmmyyyy@test.com",
          "Discount_Amount": 0.0,
          "Net_Amount": 30.0,
          "POS_Location_Id": 1,
          "OrderDetails": [
            {
              "Prod_Id": 277,
              "Prod_Name": "Test Service December 15",
              "Qty": 1,
              "Rate": 30.0,
              "Amount": 30.0,
              "Size_Id": null,
              "Size_Name": "",
              "Promotion_Id": 0,
              "Promo_Code": "",
              "Discount_Amount": 0.0,
              "Net_Amount": 30.0,
              "Staff_Id": 50,
              "TimeFrame_Ids": [7, 8],
              "Appointment_Date": "15/12/2025"  // dd/MM/yyyy format
            }
          ]
        }
      },
      {
        name: "January 15th 2026 - dd/MM/yyyy format",
        data: {
          "Gross_Amount": 35.0,
          "Payment_Type_Id": 1,
          "Order_Type": 2,
          "UserId": userId,
          "FirstName": "DD MM YYYY Test User",
          "Mobile": "+96522222222",
          "Email": "ddmmyyyy@test.com",
          "Discount_Amount": 0.0,
          "Net_Amount": 35.0,
          "POS_Location_Id": 1,
          "OrderDetails": [
            {
              "Prod_Id": 280,
              "Prod_Name": "Test Service January 15",
              "Qty": 1,
              "Rate": 35.0,
              "Amount": 35.0,
              "Size_Id": null,
              "Size_Name": "",
              "Promotion_Id": 0,
              "Promo_Code": "",
              "Discount_Amount": 0.0,
              "Net_Amount": 35.0,
              "Staff_Id": 48,
              "TimeFrame_Ids": [9, 10],
              "Appointment_Date": "15/01/2026"  // dd/MM/yyyy format
            }
          ]
        }
      }
    ];
    
    console.log('\n2️⃣ Testing dd/MM/yyyy format with multiple dates...');
    
    for (const config of orderConfigs) {
      console.log(`\n🔄 Testing: ${config.name}`);
      console.log(`   Date: ${config.data.OrderDetails[0].Appointment_Date}`);
      console.log(`   Service: ${config.data.OrderDetails[0].Prod_Name}`);
      console.log(`   Staff: ${config.data.OrderDetails[0].Staff_Id}`);
      console.log(`   Time Slots: [${config.data.OrderDetails[0].TimeFrame_Ids.join(', ')}]`);
      
      try {
        const response = await axios.post('http://nailit.innovasolution.net/SaveOrder', config.data, { headers });
        
        console.log(`   📊 Response: Status ${response.data.Status}, Message: ${response.data.Message}`);
        
        if (response.data.Status === 0) {
          console.log(`\n🎉 SUCCESS! Order created with dd/MM/yyyy format!`);
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
            console.log(`💳 Payment Details: ${JSON.stringify(paymentResponse.data, null, 2)}`);
          } catch (paymentError) {
            console.log(`   (Payment details not available: ${paymentError.message})`);
          }
          
          return {
            success: true,
            orderId: response.data.OrderId,
            customerId: response.data.CustomerId,
            userId: userId,
            configuration: config.name,
            amount: config.data.Gross_Amount,
            date: config.data.OrderDetails[0].Appointment_Date,
            message: response.data.Message,
            formatUsed: 'dd/MM/yyyy'
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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n❌ All dd/MM/yyyy format tests failed');
    return { success: false, userId: userId, formatUsed: 'dd/MM/yyyy' };
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Also test with known working user ID 128
async function testDDMMYYYYWithKnownUser() {
  console.log('\n3️⃣ Testing dd/MM/yyyy format with known user (ID: 128)...');
  
  const headers = {
    'Content-Type': 'application/json',
    'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh'
  };

  const knownUserConfigs = [
    {
      name: "Known User - July 18th 2025 dd/MM/yyyy",
      data: {
        "Gross_Amount": 10.0,
        "Payment_Type_Id": 1,
        "Order_Type": 2,
        "UserId": 128,
        "FirstName": "Known User DD MM Test",
        "Mobile": "+96588888889",
        "Email": "knownuser@ddmm.com",
        "Discount_Amount": 0.0,
        "Net_Amount": 10.0,
        "POS_Location_Id": 1,
        "OrderDetails": [
          {
            "Prod_Id": 203,
            "Prod_Name": "Known User Service July 18",
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
            "TimeFrame_Ids": [5, 6],
            "Appointment_Date": "18/07/2025"  // dd/MM/yyyy format
          },
          {
            "Prod_Id": 258,
            "Prod_Name": "Known User Service July 18 Part 2",
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
            "TimeFrame_Ids": [7, 8],
            "Appointment_Date": "18/07/2025"  // dd/MM/yyyy format
          }
        ]
      }
    },
    {
      name: "Known User - August 7th 2025 dd/MM/yyyy (Original Working Example Date)",
      data: {
        "Gross_Amount": 10.0,
        "Payment_Type_Id": 1,
        "Order_Type": 2,
        "UserId": 128,
        "FirstName": "Known User DD MM Test",
        "Mobile": "+96588888889",
        "Email": "knownuser@ddmm.com",
        "Discount_Amount": 0.0,
        "Net_Amount": 10.0,
        "POS_Location_Id": 1,
        "OrderDetails": [
          {
            "Prod_Id": 203,
            "Prod_Name": "Dry manicure without polish",
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
            "TimeFrame_Ids": [5, 6],
            "Appointment_Date": "07/08/2025"  // dd/MM/yyyy format (August 7th)
          },
          {
            "Prod_Id": 258,
            "Prod_Name": "Gelish hand polish",
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
            "TimeFrame_Ids": [7, 8],
            "Appointment_Date": "07/08/2025"  // dd/MM/yyyy format (August 7th)
          }
        ]
      }
    }
  ];

  for (const config of knownUserConfigs) {
    console.log(`\n🔄 Testing: ${config.name}`);
    console.log(`   Date: ${config.data.OrderDetails[0].Appointment_Date}`);
    
    try {
      const response = await axios.post('http://nailit.innovasolution.net/SaveOrder', config.data, { headers });
      
      console.log(`   📊 Response: Status ${response.data.Status}, Message: ${response.data.Message}`);
      
      if (response.data.Status === 0) {
        console.log(`\n🎉 SUCCESS! Order created with known user and dd/MM/yyyy format!`);
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
          date: config.data.OrderDetails[0].Appointment_Date,
          formatUsed: 'dd/MM/yyyy'
        };
      }
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return { success: false };
}

// Execute both tests
async function runDDMMYYYYTests() {
  console.log('🎯 COMPREHENSIVE dd/MM/yyyy FORMAT TESTING');
  console.log('==========================================');
  
  // Test 1: New user with dd/MM/yyyy format
  let result = await testDDMMYYYYFormat();
  
  if (result.success) {
    console.log('\n✅ SUCCESS WITH NEW USER AND dd/MM/yyyy FORMAT!');
    return result;
  }
  
  // Test 2: Known user with dd/MM/yyyy format
  result = await testDDMMYYYYWithKnownUser();
  
  if (result.success) {
    console.log('\n✅ SUCCESS WITH KNOWN USER AND dd/MM/yyyy FORMAT!');
    return result;
  }
  
  console.log('\n❌ dd/MM/yyyy FORMAT TESTS FAILED');
  console.log('Date format may not be the issue, or specific availability constraints still apply.');
  return { success: false };
}

// Run comprehensive dd/MM/yyyy tests
runDDMMYYYYTests().then(result => {
  if (result.success) {
    console.log('\n🎯 FINAL SUCCESS WITH dd/MM/yyyy FORMAT!');
    console.log('========================================');
    console.log(`Order ID: ${result.orderId}`);
    console.log(`Customer ID: ${result.customerId}`);
    console.log(`User ID: ${result.userId}`);
    console.log(`Configuration: ${result.configuration}`);
    console.log(`Amount: ${result.amount} KWD`);
    console.log(`Date: ${result.date}`);
    console.log(`Format Used: ${result.formatUsed}`);
    if (result.message) console.log(`Message: ${result.message}`);
  } else {
    console.log('\n❌ FINAL RESULT: dd/MM/yyyy format did not resolve the issue');
    console.log('The date format may not be the primary constraint.');
  }
}).catch(console.error);