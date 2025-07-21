// Test RAG Integration with 1,105 Cached Services
const fetch = require('node-fetch');

async function testRAGIntegration() {
  console.log('🧪 Testing RAG Integration with 1,105 Cached Services');
  
  try {
    // Test 1: RAG Search Endpoint
    console.log('\n1. Testing RAG Search for "French Manicure" at Al-Plaza Mall...');
    const ragResponse = await fetch('http://localhost:5000/api/rag/search?query=French%20Manicure&location_id=1');
    const ragData = await ragResponse.json();
    console.log('RAG Search Results:', ragData);
    
    // Test 2: AI Agent with Service Request
    console.log('\n2. Testing AI Agent Service Recognition...');
    const aiResponse = await fetch('http://localhost:5000/api/fresh-ai/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: '96599999995',
        message: 'I want a French Manicure at Al-Plaza Mall'
      })
    });
    const aiData = await aiResponse.json();
    console.log('AI Response:', aiData.response?.message || 'No response');
    
    // Test 3: Location-specific Services
    console.log('\n3. Testing location-specific service availability...');
    for (const locationId of [1, 52, 53]) {
      const locationResponse = await fetch(`http://localhost:5000/api/rag/search?query=manicure&location_id=${locationId}`);
      const locationData = await locationResponse.json();
      console.log(`Location ${locationId} services:`, locationData?.results?.length || 'Error');
    }
    
    console.log('\n✅ RAG Integration Test Complete');
    
  } catch (error) {
    console.error('❌ RAG Integration Test Failed:', error.message);
  }
}

testRAGIntegration();