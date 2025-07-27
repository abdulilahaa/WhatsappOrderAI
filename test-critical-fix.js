import axios from 'axios';

async function testCriticalFix() {
  console.log('🚀 Testing Critical Staff & Time Slot Fixes...');
  
  try {
    // Test 1: French Manicure
    console.log('\n=== TEST 1: French Manicure ===');
    const test1 = {
      "messages": [{
        "from": "96541144687",
        "timestamp": `${Date.now()}`,
        "text": {
          "body": "Book French Manicure tomorrow 2 PM Plaza Mall, name Emma, email emma@test.com"
        }
      }]
    };
    
    console.log('📤 Sending request...');
    await axios.post('http://localhost:5000/api/whatsapp/webhook', test1);
    
    console.log('⏳ Waiting 45 seconds...');
    await new Promise(resolve => setTimeout(resolve, 45000));
    
    const conv1 = await axios.get('http://localhost:5000/api/conversations/27/messages');
    const recent1 = conv1.data.slice(-2);
    const aiMsg1 = recent1.find(m => m.isFromAI);
    
    if (aiMsg1?.content.includes('Order ID')) {
      const orderMatch = aiMsg1.content.match(/Order.*?(\d+)/i);
      console.log(`✅ SUCCESS - Order ID: ${orderMatch ? orderMatch[1] : 'Unknown'}`);
    } else if (aiMsg1?.content.includes('Failed')) {
      console.log('❌ FAILED - Still getting booking failure');
    } else {
      console.log(`❓ OTHER: ${aiMsg1?.content.substring(0, 100)}...`);
    }
    
    // Wait before next test
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Test 2: Different service - Hair service
    console.log('\n=== TEST 2: Hair Treatment ===');
    const test2 = {
      "messages": [{
        "from": "96541144687",
        "timestamp": `${Date.now()}`,
        "text": {
          "body": "I need hair treatment tomorrow 3 PM Plaza, name Lisa, email lisa@gmail.com"
        }
      }]
    };
    
    console.log('📤 Sending hair treatment request...');
    await axios.post('http://localhost:5000/api/whatsapp/webhook', test2);
    
    console.log('⏳ Waiting 45 seconds...');
    await new Promise(resolve => setTimeout(resolve, 45000));
    
    const conv2 = await axios.get('http://localhost:5000/api/conversations/27/messages');
    const recent2 = conv2.data.slice(-2);
    const aiMsg2 = recent2.find(m => m.isFromAI);
    
    if (aiMsg2?.content.includes('Order ID')) {
      const orderMatch = aiMsg2.content.match(/Order.*?(\d+)/i);
      console.log(`✅ SUCCESS - Order ID: ${orderMatch ? orderMatch[1] : 'Unknown'}`);
    } else if (aiMsg2?.content.includes('Failed')) {
      console.log('❌ FAILED - Still getting booking failure');
    } else {
      console.log(`❓ OTHER: ${aiMsg2?.content.substring(0, 100)}...`);
    }
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 CRITICAL FIX TEST RESULTS');
    console.log('='.repeat(50));
    
    const allMessages = conv2.data.slice(-6);
    const successOrders = allMessages.filter(m => m.isFromAI && m.content.includes('Order ID'));
    const failures = allMessages.filter(m => m.isFromAI && m.content.includes('Failed'));
    
    console.log(`✅ Successful Orders: ${successOrders.length}`);
    console.log(`❌ Failed Bookings: ${failures.length}`);
    console.log(`🎯 Success Rate: ${successOrders.length}/2 (${Math.round(successOrders.length/2*100)}%)`);
    
    if (successOrders.length > 0) {
      console.log('\n🎉 WORKING ORDERS:');
      successOrders.forEach((order, i) => {
        const orderMatch = order.content.match(/Order.*?(\d+)/i);
        const paymentMatch = order.content.match(/(http:\/\/nailit\.innovasolution\.net\/knet\.aspx\?orderId=\d+)/);
        console.log(`${i+1}. Order ID: ${orderMatch ? orderMatch[1] : 'N/A'}`);
        console.log(`   Payment: ${paymentMatch ? paymentMatch[1] : 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Critical fix test failed:', error.message);
  }
}

testCriticalFix();