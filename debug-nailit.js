// Debug script to test NailIt API calls
const axios = require('axios');

async function testNailItAPI() {
  const client = axios.create({
    baseURL: 'http://nailit.innovasolution.net',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh'
    }
  });

  const today = new Date();
  const currentDate = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`;
  
  console.log(`Testing with date: ${currentDate}`);

  // Test different parameter combinations
  const testCases = [
    {
      name: "Basic request",
      body: {
        Lang: 'E',
        Like: '',
        Page_No: 1,
        Item_Type_Id: 2,
        Group_Id: 0,
        Location_Ids: [],
        Is_Home_Service: false,
        Selected_Date: currentDate
      }
    },
    {
      name: "No filters",
      body: {
        Lang: 'E',
        Like: '',
        Page_No: 1,
        Item_Type_Id: 0,
        Group_Id: 0,
        Location_Ids: [],
        Is_Home_Service: false,
        Selected_Date: currentDate
      }
    },
    {
      name: "Different date format",
      body: {
        Lang: 'E',
        Like: '',
        Page_No: 1,
        Item_Type_Id: 2,
        Group_Id: 0,
        Location_Ids: [],
        Is_Home_Service: false,
        Selected_Date: '07/14/2025'
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n=== Testing: ${testCase.name} ===`);
      console.log('Request body:', JSON.stringify(testCase.body, null, 2));
      
      const response = await client.post('/GetItemsByDate', testCase.body);
      
      console.log(`Status: ${response.data.Status}`);
      console.log(`Message: ${response.data.Message}`);
      console.log(`Total Items: ${response.data.Total_Items}`);
      console.log(`Items count: ${response.data.Items ? response.data.Items.length : 0}`);
      
      if (response.data.Items && response.data.Items.length > 0) {
        console.log('First item:', JSON.stringify(response.data.Items[0], null, 2));
        break; // Found working parameters
      }
      
    } catch (error) {
      console.log(`Error: ${error.message}`);
      if (error.response) {
        console.log(`Response status: ${error.response.status}`);
        console.log(`Response data:`, JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

testNailItAPI().catch(console.error);