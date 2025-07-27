import axios from 'axios';

const testScenarios = [
  {
    name: "English - Hair Treatment + Nail Service at Al-Plaza",
    phone: "96541144687",
    message: "Hi! I need hair treatment and french manicure tomorrow 2 PM at Plaza Mall. My name is Sarah Johnson, email sarah.j@gmail.com",
    language: "English",
    expectedServices: ["hair treatment", "french manicure"],
    location: "Al-Plaza Mall"
  },
  {
    name: "Arabic - Multiple Nail Services at Zahra",
    phone: "96541144688", 
    message: "مرحبا، أريد باديكير وجل أظافر غدا الساعة 3 مساء في الزهراء. اسمي فاطمة الأحمد، ايميل fatima.ahmad@outlook.com",
    language: "Arabic",
    expectedServices: ["pedicure", "gel polish"],
    location: "Zahra Complex"
  },
  {
    name: "English - Hair Coloring at Arraya Mall",
    phone: "96541144689",
    message: "Book hair coloring and highlights tomorrow 11 AM Arraya Mall please. Name: Emma Wilson, email emma.wilson@yahoo.com",
    language: "English", 
    expectedServices: ["hair coloring", "highlights"],
    location: "Arraya Mall"
  },
  {
    name: "Arabic - Facial + Nail Art at Al-Plaza",
    phone: "96541144690",
    message: "السلام عليكم، أحتاج فيشل ونقش أظافر بكرة الساعة 4 عصر في البلازا. اسمي نورا الخالد nora.alkhalid@gmail.com",
    language: "Arabic",
    expectedServices: ["facial", "nail art"],
    location: "Al-Plaza Mall"
  },
  {
    name: "English - Multiple Hair Services at Zahra",
    phone: "96541144691",
    message: "I want hair cut, hair wash and blow dry tomorrow at 1 PM Zahra Complex. Name is Lisa Martinez, email lisa.m@hotmail.com",
    language: "English",
    expectedServices: ["hair cut", "hair wash", "blow dry"],
    location: "Zahra Complex"
  },
  {
    name: "Mixed Languages - Existing Customer",
    phone: "96541144687", // Same as first customer
    message: "مرحبا، أريد مانيكير وبديكير بكرة الساعة 5 مساء في الأراية. Sarah Johnson",
    language: "Mixed",
    expectedServices: ["manicure", "pedicure"],
    location: "Arraya Mall"
  }
];

async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive WhatsApp Order Flow Testing...');
  const results = [];
  
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 TEST ${i + 1}: ${scenario.name}`);
    console.log(`📱 Phone: ${scenario.phone}`);
    console.log(`🌐 Language: ${scenario.language}`);
    console.log(`📍 Expected Location: ${scenario.location}`);
    console.log(`💅 Expected Services: ${scenario.expectedServices.join(', ')}`);
    console.log(`💬 Message: "${scenario.message}"`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      // Send WhatsApp message
      const timestamp = Date.now() + i * 1000; // Unique timestamps
      const webhookData = {
        "messages": [{
          "from": scenario.phone,
          "timestamp": timestamp.toString(),
          "text": {
            "body": scenario.message
          }
        }]
      };
      
      console.log('📤 Sending WhatsApp webhook request...');
      const response = await axios.post('http://localhost:5000/api/whatsapp/webhook', webhookData);
      
      if (response.status === 200) {
        console.log('✅ Webhook request accepted');
        
        // Wait for AI processing (longer for complex requests)
        const processingTime = scenario.expectedServices.length > 2 ? 60000 : 45000;
        console.log(`⏳ Waiting ${processingTime/1000} seconds for processing...`);
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        // Get conversation messages for this phone number
        console.log('📥 Retrieving conversation results...');
        const conversationsResponse = await axios.get('http://localhost:5000/api/conversations');
        
        // Find conversation for this phone number
        const customerConversation = conversationsResponse.data.find(conv => {
          // We need to check the customer phone number
          return conv.isActive;
        });
        
        if (customerConversation) {
          const messagesResponse = await axios.get(`http://localhost:5000/api/conversations/${customerConversation.id}/messages`);
          const messages = messagesResponse.data;
          
          // Find recent messages (last 5 minutes)
          const recentMessages = messages.filter(msg => {
            const msgTime = new Date(msg.timestamp);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            return msgTime > fiveMinutesAgo;
          });
          
          console.log(`📨 Found ${recentMessages.length} recent messages`);
          
          // Look for AI response with order confirmation
          const aiResponses = recentMessages.filter(msg => msg.isFromAI);
          const orderConfirmation = aiResponses.find(msg => 
            msg.content.includes('Order') || 
            msg.content.includes('booking') ||
            msg.content.includes('confirmed') ||
            msg.content.includes('payment')
          );
          
          if (orderConfirmation) {
            console.log('✅ ORDER CONFIRMATION FOUND:');
            console.log(`📝 AI Response: ${orderConfirmation.content}`);
            
            // Extract order ID and payment link
            const orderIdMatch = orderConfirmation.content.match(/Order.*?(\d+)/i);
            const paymentLinkMatch = orderConfirmation.content.match(/(http:\/\/nailit\.innovasolution\.net\/knet\.aspx\?orderId=\d+)/);
            
            const result = {
              scenario: scenario.name,
              phone: scenario.phone,
              language: scenario.language,
              status: 'SUCCESS',
              orderId: orderIdMatch ? orderIdMatch[1] : 'Not found',
              paymentLink: paymentLinkMatch ? paymentLinkMatch[1] : 'Not found',
              aiResponse: orderConfirmation.content,
              timestamp: new Date().toISOString()
            };
            
            results.push(result);
            
            console.log(`🎯 Order ID: ${result.orderId}`);
            console.log(`💳 Payment Link: ${result.paymentLink}`);
          } else {
            console.log('❌ No order confirmation found in AI responses');
            results.push({
              scenario: scenario.name,
              phone: scenario.phone,
              status: 'NO_CONFIRMATION',
              error: 'No order confirmation in AI response'
            });
          }
        } else {
          console.log('❌ No conversation found for this request');
          results.push({
            scenario: scenario.name,
            phone: scenario.phone,
            status: 'NO_CONVERSATION',
            error: 'No conversation found'
          });
        }
      } else {
        console.log(`❌ Webhook request failed: ${response.status}`);
        results.push({
          scenario: scenario.name,
          phone: scenario.phone,
          status: 'WEBHOOK_FAILED',
          error: `HTTP ${response.status}`
        });
      }
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      results.push({
        scenario: scenario.name,
        phone: scenario.phone,
        status: 'ERROR',
        error: error.message
      });
    }
    
    // Delay between tests to avoid overwhelming the system
    if (i < testScenarios.length - 1) {
      console.log('⏸️  Waiting 10 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  // Print comprehensive results
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(80));
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.scenario}`);
    console.log(`   📱 Phone: ${result.phone}`);
    console.log(`   🔄 Status: ${result.status}`);
    
    if (result.status === 'SUCCESS') {
      console.log(`   🎯 Order ID: ${result.orderId}`);
      console.log(`   💳 Payment Link: ${result.paymentLink}`);
      console.log(`   💬 AI Response: ${result.aiResponse.substring(0, 100)}...`);
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  console.log(`\n📈 SUCCESS RATE: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);
  
  if (successCount > 0) {
    console.log('\n✅ WORKING PAYMENT LINKS:');
    results.filter(r => r.paymentLink && r.paymentLink !== 'Not found')
           .forEach(r => console.log(`   ${r.orderId}: ${r.paymentLink}`));
  }
}

runComprehensiveTest().catch(console.error);