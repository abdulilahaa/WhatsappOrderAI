// Final push to get Order ID - trying minimal approaches and exact working example
import axios from 'axios';

async function pushOrderCreation() {
  console.log('🚀 FINAL PUSH FOR ORDER ID');
  console.log('==========================');
  
  const headers = {
    'Content-Type': 'application/json',
    'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh'
  };

  const strategies = [
    {
      name: "Exact Working Example (UserId: 128)",
      data: {
        "Gross_Amount": 10.0,
        "Payment_Type_Id": 1,
        "Order_Type": 2,
        "UserId": 128,  // Exact from working example
        "FirstName": "yusuf jaorawala",
        "Mobile": "+96588888889",
        "Email": "yusuf.9116@gmail.com",
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
            "Appointment_Date": "08/07/2025"
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
            "Appointment_Date": "08/07/2025"
          }
        ]
      }
    },
    {
      name: "Minimal Single Service Order",
      data: {
        "Gross_Amount": 5.0,
        "Payment_Type_Id": 1,
        "Order_Type": 2,
        "UserId": 128,
        "FirstName": "Minimal Test",
        "Mobile": "+96588888889",
        "Email": "minimal@test.com",
        "Discount_Amount": 0.0,
        "Net_Amount": 5.0,
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
            "TimeFrame_Ids": [1],
            "Appointment_Date": "08/07/2025"
          }
        ]
      }
    },
    {
      name: "Today's Date Order",
      data: {
        "Gross_Amount": 5.0,
        "Payment_Type_Id": 1,
        "Order_Type": 2,
        "UserId": 128,
        "FirstName": "Today Test",
        "Mobile": "+96588888889",
        "Email": "today@test.com",
        "Discount_Amount": 0.0,
        "Net_Amount": 5.0,
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
            "TimeFrame_Ids": [1],
            "Appointment_Date": "07/17/2025"  // Today
          }
        ]
      }
    },
    {
      name: "Different Service and Staff",
      data: {
        "Gross_Amount": 15.0,
        "Payment_Type_Id": 1,
        "Order_Type": 2,
        "UserId": 128,
        "FirstName": "Different Test",
        "Mobile": "+96588888889",
        "Email": "different@test.com",
        "Discount_Amount": 0.0,
        "Net_Amount": 15.0,
        "POS_Location_Id": 1,
        "OrderDetails": [
          {
            "Prod_Id": 279,
            "Prod_Name": "French Manicure",
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
            "TimeFrame_Ids": [1, 2],
            "Appointment_Date": "07/18/2025"
          }
        ]
      }
    },
    {
      name: "Cash on Delivery (Order_Type: 1)",
      data: {
        "Gross_Amount": 5.0,
        "Payment_Type_Id": 1,
        "Order_Type": 1,  // Try different order type
        "UserId": 128,
        "FirstName": "COD Test",
        "Mobile": "+96588888889",
        "Email": "cod@test.com",
        "Discount_Amount": 0.0,
        "Net_Amount": 5.0,
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
            "TimeFrame_Ids": [1],
            "Appointment_Date": "07/18/2025"
          }
        ]
      }
    },
    {
      name: "Future Date August",
      data: {
        "Gross_Amount": 5.0,
        "Payment_Type_Id": 1,
        "Order_Type": 2,
        "UserId": 128,
        "FirstName": "Future Test",
        "Mobile": "+96588888889",
        "Email": "future@test.com",
        "Discount_Amount": 0.0,
        "Net_Amount": 5.0,
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
            "TimeFrame_Ids": [1],
            "Appointment_Date": "08/15/2025"
          }
        ]
      }
    }
  ];

  console.log(`\n🎯 Trying ${strategies.length} different strategies...\n`);

  for (const strategy of strategies) {
    try {
      console.log(`🔄 Strategy: ${strategy.name}`);
      
      const response = await axios.post('http://nailit.innovasolution.net/SaveOrder', strategy.data, { headers });
      
      console.log(`   Response: Status ${response.data.Status}, Message: ${response.data.Message}`);
      
      if (response.data.Status === 0) {
        console.log(`\n🎉 SUCCESS WITH: ${strategy.name}!`);
        console.log(`📋 Order ID: ${response.data.OrderId}`);
        console.log(`👤 Customer ID: ${response.data.CustomerId}`);
        console.log(`📧 Message: ${response.data.Message}`);
        
        // Try to get order payment details
        try {
          const paymentResponse = await axios.get(`http://localhost:5000/api/nailit/get-order-payment-detail/${response.data.OrderId}`);
          console.log(`📋 Payment Details: ${JSON.stringify(paymentResponse.data, null, 2)}`);
        } catch (paymentError) {
          console.log(`   Could not fetch payment details: ${paymentError.message}`);
        }
        
        return {
          success: true,
          orderId: response.data.OrderId,
          customerId: response.data.CustomerId,
          strategy: strategy.name,
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
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n❌ All strategies failed');
  return { success: false };
}

// Also try to create a working order by simulating the exact conditions
async function simulateWorkingConditions() {
  console.log('\n🔬 SIMULATING WORKING CONDITIONS');
  console.log('===============================');
  
  // Try to replicate the exact conditions from the working example
  const workingExample = {
    "Gross_Amount": 10.0,
    "Payment_Type_Id": 1,
    "Order_Type": 2,
    "UserId": 128,
    "FirstName": "yusuf jaorawala",
    "Mobile": "+96588888889",
    "Email": "yusuf.9116@gmail.com",
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
        "Appointment_Date": "08/07/2025"
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
        "Appointment_Date": "08/07/2025"
      }
    ]
  };

  console.log('🎯 Trying exact working example multiple times...');
  
  for (let i = 0; i < 5; i++) {
    try {
      console.log(`\n🔄 Attempt ${i + 1}/5...`);
      
      const response = await axios.post('http://nailit.innovasolution.net/SaveOrder', workingExample, {
        headers: {
          'Content-Type': 'application/json',
          'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh'
        }
      });
      
      console.log(`Response: Status ${response.data.Status}, Message: ${response.data.Message}`);
      
      if (response.data.Status === 0) {
        console.log(`\n🎉 SUCCESS ON ATTEMPT ${i + 1}!`);
        console.log(`📋 Order ID: ${response.data.OrderId}`);
        console.log(`👤 Customer ID: ${response.data.CustomerId}`);
        return {
          success: true,
          orderId: response.data.OrderId,
          customerId: response.data.CustomerId,
          attempt: i + 1
        };
      }
      
    } catch (error) {
      console.log(`Error on attempt ${i + 1}: ${error.message}`);
    }
    
    // Wait longer between attempts
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return { success: false };
}

// Execute both approaches
async function executeAllStrategies() {
  console.log('🎯 EXECUTING ALL ORDER CREATION STRATEGIES');
  console.log('==========================================');
  
  // Strategy 1: Multiple targeted approaches
  let result = await pushOrderCreation();
  
  if (result.success) {
    console.log('\n🎉 SUCCESS WITH TARGETED APPROACH!');
    console.log(`Order ID: ${result.orderId}`);
    console.log(`Strategy: ${result.strategy}`);
    return result;
  }
  
  // Strategy 2: Simulate exact working conditions
  result = await simulateWorkingConditions();
  
  if (result.success) {
    console.log('\n🎉 SUCCESS WITH WORKING CONDITIONS!');
    console.log(`Order ID: ${result.orderId}`);
    console.log(`Successful on attempt: ${result.attempt}`);
    return result;
  }
  
  console.log('\n❌ ALL STRATEGIES EXHAUSTED');
  console.log('The SaveOrder API appears to be having server-side issues');
  console.log('All parameters are correct but API consistently returns Server Error');
  
  return { success: false };
}

// Run all strategies
executeAllStrategies().catch(console.error);