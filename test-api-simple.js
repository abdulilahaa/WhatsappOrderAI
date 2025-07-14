// Simple test to match the working API call that generated the attached file
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://nailit.innovasolution.net',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh'
  }
});

// Test with the absolute minimum parameters
async function testMinimal() {
  try {
    console.log('Testing GetItemsByDate with minimal parameters...');
    
    const response = await client.post('/GetItemsByDate', {
      Selected_Date: '07/14/2025'
    });
    
    console.log('✅ Success!');
    console.log('Status:', response.data.Status);
    console.log('Message:', response.data.Message || 'No message');
    console.log('Total Items:', response.data.Total_Items);
    console.log('Items Array Length:', response.data.Items?.length || 0);
    
    if (response.data.Items && response.data.Items.length > 0) {
      console.log('\n📋 First few items:');
      response.data.Items.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. ${item.Item_Name} - ${item.Primary_Price} KWD - Locations: [${item.Location_Ids?.join(', ')}]`);
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

testMinimal();