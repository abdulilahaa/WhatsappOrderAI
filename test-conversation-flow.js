// Test Complete Conversation Flow with Location-Based Service Filtering
const fetch = require('node-fetch');

async function testLocationBasedConversation() {
  console.log('🧪 Testing Location-Based Conversation Flow');
  console.log('========================================');
  
  const phoneNumber = "96555000999";
  
  // Test 1: Customer mentions location and problem in first message
  console.log('\n👤 Customer: "Hi, I have oily scalp and want treatment at Al-Plaza Mall"');
  
  let response = await fetch('http://localhost:5000/api/fresh-ai/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: phoneNumber,
      message: 'Hi, I have oily scalp and want treatment at Al-Plaza Mall'
    })
  });
  
  let data = await response.json();
  console.log('🤖 AI Response:', data.response?.message || 'Error');
  
  // Check what services are available for Al-Plaza Mall
  console.log('\n🔍 Checking Al-Plaza Mall cached services...');
  const scalpServices = await fetch('http://localhost:5000/api/rag/search?query=scalp&location_id=1');
  const scalpData = await scalpServices.json();
  console.log(`📊 Found ${scalpData.results?.length || 0} scalp-related services at Al-Plaza Mall`);
  
  if (scalpData.results?.length > 0) {
    console.log('Available scalp treatments:');
    scalpData.results.slice(0, 3).forEach((service, index) => {
      console.log(`  ${index + 1}. ${service.itemName} - ${service.primaryPrice} KWD`);
    });
  }
  
  // Test 2: Customer asks for specific location services
  console.log('\n👤 Customer: "What scalp treatments do you have at Zahra Complex?"');
  
  response = await fetch('http://localhost:5000/api/fresh-ai/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: phoneNumber,
      message: 'What scalp treatments do you have at Zahra Complex?'
    })
  });
  
  data = await response.json();
  console.log('🤖 AI Response:', data.response?.message || 'Error');
  
  // Check Zahra Complex services
  console.log('\n🔍 Checking Zahra Complex cached services...');
  const zahraServices = await fetch('http://localhost:5000/api/rag/search?query=scalp&location_id=52');
  const zahraData = await zahraServices.json();
  console.log(`📊 Found ${zahraData.results?.length || 0} scalp-related services at Zahra Complex`);
  
  // Test 3: General treatment search without location
  console.log('\n👤 Customer: "I need a facial treatment"');
  
  response = await fetch('http://localhost:5000/api/fresh-ai/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: phoneNumber,
      message: 'I need a facial treatment'
    })
  });
  
  data = await response.json();
  console.log('🤖 AI Response:', data.response?.message || 'Error');
  
  // Test 4: Location comparison
  console.log('\n📊 Location Service Comparison:');
  for (const location of [
    { id: 1, name: 'Al-Plaza Mall' },
    { id: 52, name: 'Zahra Complex' },
    { id: 53, name: 'Arraya Mall' }
  ]) {
    const serviceCount = await fetch(`http://localhost:5000/api/rag/search?query=&location_id=${location.id}`);
    const serviceData = await serviceCount.json();
    console.log(`  ${location.name}: ${serviceData.results?.length || 0} services cached`);
  }
  
  console.log('\n✅ Conversation Flow Test Complete');
  console.log('Expected: AI should filter services by detected location and conversation context');
}

testLocationBasedConversation().catch(console.error);