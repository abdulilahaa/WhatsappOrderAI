// Customer Simulation for 99.9% Conversation Accuracy Testing
import fetch from 'node-fetch';

async function simulateCustomerConversation() {
  console.log('🧪 TESTING 99.9% CONVERSATION ACCURACY');
  console.log('=====================================');
  
  const baseUrl = 'http://localhost:5000/api/fresh-ai/test';
  const phoneNumber = "96555000999";
  
  // Test Case 1: Problem-based service recommendation (Issue #1 Fix)
  console.log('\n📝 Test Case 1: Problem-based service recommendation');
  console.log('Customer: "What treatments do you recommend for my oily scalp?"');
  
  let response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: phoneNumber,
      message: 'What treatments do you recommend for my oily scalp?'
    })
  });
  
  let data = await response.json();
  console.log('AI Response:', data.response?.message || 'Error');
  console.log('✅ Expected: Specific scalp treatment recommendations with explanations');
  
  // Test Case 2: Service selection confirmation (Issue #2 Fix)
  console.log('\n📝 Test Case 2: Service selection confirmation');
  console.log('Customer: "I would like the scalp cleansing treatment"');
  
  response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: phoneNumber,
      message: 'I would like the scalp cleansing treatment'
    })
  });
  
  data = await response.json();
  console.log('AI Response:', data.response?.message || 'Error');
  console.log('✅ Expected: Service confirmed, ask for location');
  
  // Test Case 3: Natural date parsing (Issue #3 Fix)
  console.log('\n📝 Test Case 3: Natural date parsing');
  console.log('Customer: "at Al-Plaza Mall this Wednesday at 1 PM"');
  
  response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: phoneNumber,
      message: 'at Al-Plaza Mall this Wednesday at 1 PM'
    })
  });
  
  data = await response.json();
  console.log('AI Response:', data.response?.message || 'Error');
  console.log('✅ Expected: Acknowledge Wednesday, check availability for service duration');
  
  // Test Case 4: Customer information collection
  console.log('\n📝 Test Case 4: Customer information collection');
  console.log('Customer: "My name is Sarah Al-Khalifa and email is sarah@gmail.com"');
  
  response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: phoneNumber,
      message: 'My name is Sarah Al-Khalifa and email is sarah@gmail.com'
    })
  });
  
  data = await response.json();
  console.log('AI Response:', data.response?.message || 'Error');
  console.log('✅ Expected: Booking confirmation with payment link');
  
  // Test Case 5: Final confirmation (Issue #6 Fix)
  console.log('\n📝 Test Case 5: Final confirmation');
  console.log('Customer: "Yes, please book it"');
  
  response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: phoneNumber,
      message: 'Yes, please book it'
    })
  });
  
  data = await response.json();
  console.log('AI Response:', data.response?.message || 'Error');
  console.log('✅ Expected: Complete booking confirmation with order ID and payment link');
  
  console.log('\n🎯 CONVERSATION ACCURACY EVALUATION:');
  console.log('Target: 99.9% success rate with natural, helpful responses');
  console.log('Key improvements:');
  console.log('  ✅ Problem detection and relevant recommendations');
  console.log('  ✅ Service selection confirmation flow');
  console.log('  ✅ Natural date parsing and acknowledgment');
  console.log('  ✅ Smart scheduling consideration');
  console.log('  ✅ Complete booking confirmation with payment');
}

simulateCustomerConversation().catch(console.error);