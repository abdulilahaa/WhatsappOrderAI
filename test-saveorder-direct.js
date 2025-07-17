// Direct test of SaveOrder API with correct date format
const axios = require('axios');

async function testSaveOrderDirect() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Format date as MM/dd/yyyy (required by SaveOrder API)
    const month = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
    const day = tomorrow.getDate().toString().padStart(2, '0');
    const year = tomorrow.getFullYear();
    const formattedDate = `${month}/${day}/${year}`;
    
    console.log(`Testing SaveOrder with date: ${formattedDate}`);
    
    const orderData = {
      Gross_Amount: 15.0,
      Payment_Type_Id: 1,
      Order_Type: 2,
      UserId: 110735,
      FirstName: "Test Customer Direct",
      Mobile: "+96599887766",
      Email: "test.direct@example.com",
      Discount_Amount: 0.0,
      Net_Amount: 15.0,
      POS_Location_Id: 1,
      OrderDetails: [
        {
          Prod_Id: 203,
          Prod_Name: "Test Service Direct",
          Qty: 1,
          Rate: 15.0,
          Amount: 15.0,
          Size_Id: null,
          Size_Name: "",
          Promotion_Id: 0,
          Promo_Code: "",
          Discount_Amount: 0.0,
          Net_Amount: 15.0,
          Staff_Id: 48,
          TimeFrame_Ids: [1, 2],
          Appointment_Date: formattedDate
        }
      ]
    };
    
    console.log('Sending order data:', JSON.stringify(orderData, null, 2));
    
    const response = await axios.post('http://nailit.innovasolution.net/SaveOrder', orderData, {
      headers: {
        'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response:', response.data);
    
    if (response.data.Status === 0) {
      console.log('✅ SUCCESS: Order created with ID:', response.data.OrderId);
      return true;
    } else {
      console.log('❌ FAILED: Status:', response.data.Status, 'Message:', response.data.Message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.response?.data || error.message);
    return false;
  }
}

testSaveOrderDirect();