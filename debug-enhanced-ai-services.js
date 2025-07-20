// Debug Enhanced AI Service Loading
const baseUrl = 'http://localhost:5000';

async function debugServices() {
  console.log('🔍 DEBUGGING ENHANCED AI SERVICE LOADING...\n');
  
  try {
    // Test 1: Get raw services from NailIt API
    console.log('1. Testing raw NailIt API services...');
    const rawResponse = await fetch(`${baseUrl}/api/nailit/items-by-date?Lang=E&Like=&Page_No=1&Item_Type_Id=2&Group_Id=0&Location_Ids=1,52,53&Is_Home_Service=false`);
    const rawData = await rawResponse.json();
    
    console.log(`   Raw API returned ${rawData.items?.length || 0} services`);
    
    if (rawData.items && rawData.items.length > 0) {
      console.log('   Sample services:');
      rawData.items.slice(0, 5).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.Item_Name} (ID: ${item.Item_Id}, Group: ${item.Parent_Group_Id})`);
      });
    }
    
    // Test 2: Check for nail-related services manually
    console.log('\n2. Filtering for nail-related services...');
    const nailServices = rawData.items?.filter(item => {
      const name = item.Item_Name.toLowerCase();
      return name.includes('nail') || 
             name.includes('manicure') || 
             name.includes('pedicure') ||
             name.includes('gel') ||
             name.includes('french') ||
             name.includes('acrylic') ||
             name.includes('polish');
    }) || [];
    
    console.log(`   Found ${nailServices.length} nail-related services`);
    nailServices.slice(0, 10).forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.Item_Name} (ID: ${item.Item_Id}) - ${item.Primary_Price} KWD`);
    });
    
    // Test 3: Test Enhanced AI extraction
    console.log('\n3. Testing Enhanced AI service extraction...');
    const testMessages = ['french manicure', 'manicure', 'nail service', 'gel nails'];
    
    for (const message of testMessages) {
      console.log(`\n   Testing message: "${message}"`);
      const response = await fetch(`${baseUrl}/api/enhanced-ai/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          phoneNumber: `+96599${Math.floor(Math.random() * 1000000)}`
        })
      });
      
      const data = await response.json();
      console.log(`   Response: ${data.response?.substring(0, 100)}...`);
      console.log(`   Services found: ${data.collectedData?.selectedServices?.length || 0}`);
      console.log(`   Suggestions: ${data.suggestedServices?.length || 0}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugServices();