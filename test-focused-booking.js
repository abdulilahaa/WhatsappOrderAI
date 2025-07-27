import axios from 'axios';

async function testFocusedBooking() {
  console.log('🎯 Testing Focused WhatsApp Booking with Working Phone Number...');
  
  try {
    // Test 1: Simple French Manicure booking with working phone
    console.log('\n=== TEST 1: Simple French Manicure ===');
    const test1 = {
      "messages": [{
        "from": "96541144687", // This is the working phone number
        "timestamp": `${Date.now()}`,
        "text": {
          "body": "Book French Manicure tomorrow 2 PM Plaza Mall, name Sarah, email sarah@test.com"
        }
      }]
    };
    
    console.log('📤 Sending request...');
    const response1 = await axios.post('http://localhost:5000/api/whatsapp/webhook', test1);
    console.log(`✅ Status: ${response1.status}`);
    
    // Wait for processing
    console.log('⏳ Waiting 45 seconds for AI processing...');
    await new Promise(resolve => setTimeout(resolve, 45000));
    
    // Check conversation
    const conv1 = await axios.get('http://localhost:5000/api/conversations/27/messages');
    const recent1 = conv1.data.slice(-3);
    
    console.log('\n📨 Recent messages:');
    recent1.forEach((msg, i) => {
      const sender = msg.isFromAI ? '🤖 AI' : '👤 Customer';
      console.log(`${i+1}. ${sender}: ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}`);
    });
    
    // Wait before next test
    console.log('\n⏸️ Waiting 15 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Test 2: Hair Treatment booking
    console.log('\n=== TEST 2: Hair Treatment ===');
    const test2 = {
      "messages": [{
        "from": "96541144687",
        "timestamp": `${Date.now()}`,
        "text": {
          "body": "I need hair treatment tomorrow 3 PM Plaza Mall, name Emma, email emma@gmail.com"
        }
      }]
    };
    
    console.log('📤 Sending hair treatment request...');
    const response2 = await axios.post('http://localhost:5000/api/whatsapp/webhook', test2);
    console.log(`✅ Status: ${response2.status}`);
    
    // Wait for processing
    console.log('⏳ Waiting 45 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 45000));
    
    // Check results
    const conv2 = await axios.get('http://localhost:5000/api/conversations/27/messages');
    const recent2 = conv2.data.slice(-3);
    
    console.log('\n📨 Recent messages:');
    recent2.forEach((msg, i) => {
      const sender = msg.isFromAI ? '🤖 AI' : '👤 Customer';
      console.log(`${i+1}. ${sender}: ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}`);
    });
    
    // Test 3: Arabic booking
    console.log('\n=== TEST 3: Arabic Booking ===');
    const test3 = {
      "messages": [{
        "from": "96541144687",
        "timestamp": `${Date.now()}`,
        "text": {
          "body": "أريد مانيكير بكرة الساعة 4 عصر البلازا، اسمي فاطمة fatima@test.com"
        }
      }]
    };
    
    console.log('📤 Sending Arabic request...');
    const response3 = await axios.post('http://localhost:5000/api/whatsapp/webhook', test3);
    console.log(`✅ Status: ${response3.status}`);
    
    // Wait for processing
    console.log('⏳ Waiting 45 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 45000));
    
    // Check results
    const conv3 = await axios.get('http://localhost:5000/api/conversations/27/messages');
    const recent3 = conv3.data.slice(-3);
    
    console.log('\n📨 Recent messages:');
    recent3.forEach((msg, i) => {
      const sender = msg.isFromAI ? '🤖 AI' : '👤 Customer';
      console.log(`${i+1}. ${sender}: ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}`);
    });
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FOCUSED BOOKING TEST SUMMARY');
    console.log('='.repeat(60));
    
    const allMessages = conv3.data.slice(-9); // Get last 9 messages
    const orderConfirmations = allMessages.filter(msg => 
      msg.isFromAI && (
        msg.content.includes('Order ID') || 
        msg.content.includes('confirmed') ||
        msg.content.includes('payment')
      )
    );
    
    console.log(`✅ Found ${orderConfirmations.length} order confirmations:`);
    orderConfirmations.forEach((order, i) => {
      const orderIdMatch = order.content.match(/Order.*?(\d+)/i);
      const paymentMatch = order.content.match(/(http:\/\/nailit\.innovasolution\.net\/knet\.aspx\?orderId=\d+)/);
      
      console.log(`${i+1}. Order ID: ${orderIdMatch ? orderIdMatch[1] : 'N/A'}`);
      console.log(`   Payment: ${paymentMatch ? paymentMatch[1] : 'N/A'}`);
      console.log(`   Content: ${order.content.substring(0, 100)}...`);
    });
    
    const failureMessages = allMessages.filter(msg => 
      msg.isFromAI && msg.content.includes('Failed to create booking')
    );
    
    console.log(`❌ Found ${failureMessages.length} booking failures`);
    
    console.log(`\n🎯 SUCCESS RATE: ${orderConfirmations.length}/3 tests (${Math.round(orderConfirmations.length/3*100)}%)`);
    
  } catch (error) {
    console.error('❌ Focused test failed:', error.message);
  }
}

testFocusedBooking();