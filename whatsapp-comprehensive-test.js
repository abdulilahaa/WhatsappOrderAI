#!/usr/bin/env node

/**
 * Comprehensive WhatsApp Conversation Test System
 * Tests 4 complete booking scenarios with premium services
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

// Test customers for comprehensive scenario testing
const testCustomers = [
  {
    name: 'Sarah Al-Mahmoud',
    phoneNumber: '+96541144687',
    email: 'sarah.mahmoud@email.com',
    type: 'new',
    servicePreference: 'hair',
    budgetLevel: 'premium'
  },
  {
    name: 'Layla Hassan', 
    phoneNumber: '+96541144688',
    email: 'layla.hassan@email.com',
    type: 'existing',
    servicePreference: 'nail',
    budgetLevel: 'luxury'
  },
  {
    name: 'Fatima Al-Rashid',
    phoneNumber: '+96541144689', 
    email: 'fatima.rashid@email.com',
    type: 'new',
    servicePreference: 'massage',
    budgetLevel: 'premium'
  },
  {
    name: 'Nour Al-Khalifa',
    phoneNumber: '+96541144690',
    email: 'nour.khalifa@email.com', 
    type: 'existing',
    servicePreference: 'combo',
    budgetLevel: 'luxury'
  }
];

// Test conversation scenarios
const conversationScenarios = [
  {
    customer: 0,
    messages: [
      "Hi! I need an expensive hair treatment for tomorrow",
      "Al-Plaza Mall location please",
      "2:00 PM would be perfect",
      "Sarah Al-Mahmoud",
      "sarah.mahmoud@email.com",
      "KNet payment"
    ]
  },
  {
    customer: 1, 
    messages: [
      "I want the most luxury nail service you have",
      "Zahra Complex location",
      "afternoon is good for me",
      "yes that's my name",
      "layla.hassan@email.com", 
      "KNet"
    ]
  },
  {
    customer: 2,
    messages: [
      "Looking for premium massage therapy and body treatment",
      "Al-Plaza Mall",
      "morning appointment tomorrow",
      "Fatima Al-Rashid",
      "fatima.rashid@email.com",
      "KNet payment please"
    ]
  },
  {
    customer: 3,
    messages: [
      "I need hair treatment, manicure and massage - the most expensive package",
      "any location is fine",
      "flexible with timing",
      "Nour Al-Khalifa", 
      "nour.khalifa@email.com",
      "KNet"
    ]
  }
];

async function getExpensiveServices() {
  try {
    console.log('🔍 Fetching premium services from NailIt API...');
    
    // Get services from all locations
    const locations = [1, 52, 53]; // Al-Plaza, Zahra, Arraya
    const servicesByLocation = {};
    
    for (const locationId of locations) {
      try {
        const response = await axios.get(`${BASE_URL}/api/nailit/services/location/${locationId}`);
        if (response.data.success) {
          servicesByLocation[locationId] = response.data.products
            .filter(service => service.price > 25)
            .sort((a, b) => b.price - a.price)
            .slice(0, 10);
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch services for location ${locationId}`);
      }
    }
    
    return servicesByLocation;
  } catch (error) {
    console.error('❌ Error fetching services:', error.message);
    return {};
  }
}

async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    console.log(`📱 Sending to ${phoneNumber}: "${message}"`);
    
    const response = await axios.post(`${BASE_URL}/api/whatsapp/send-message`, {
      phoneNumber,
      message
    });
    
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to send message to ${phoneNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function simulateConversation(customerIndex, scenario) {
  const customer = testCustomers[customerIndex];
  const messages = scenario.messages;
  
  console.log(`\n🎭 === CONVERSATION ${customerIndex + 1}: ${customer.name} (${customer.type} customer) ===`);
  console.log(`📍 Service preference: ${customer.servicePreference}`);
  console.log(`💰 Budget level: ${customer.budgetLevel}`);
  
  const conversationLog = [];
  let orderResult = null;
  
  // Send each message with realistic delays
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    console.log(`\n📝 Step ${i + 1}/${messages.length}: Customer message`);
    
    const result = await sendWhatsAppMessage(customer.phoneNumber, message);
    conversationLog.push({
      step: i + 1,
      customerMessage: message,
      timestamp: new Date().toISOString(),
      sendResult: result
    });
    
    // Wait for AI processing and response (simulate realistic conversation timing)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if order was created after payment confirmation
    if (i === messages.length - 1) {
      // Final message - check for order creation
      try {
        const ordersCheck = await axios.get(`${BASE_URL}/api/orders`);
        const recentOrders = ordersCheck.data.filter(order => 
          order.customer.phoneNumber === customer.phoneNumber &&
          new Date(order.createdAt) > new Date(Date.now() - 300000) // Last 5 minutes
        );
        
        if (recentOrders.length > 0) {
          orderResult = recentOrders[0];
          console.log(`✅ Order created: ID ${orderResult.id}`);
        }
      } catch (error) {
        console.log('⚠️ Could not verify order creation');
      }
    }
  }
  
  return {
    customer: customer,
    conversationLog: conversationLog,
    orderResult: orderResult,
    completedAt: new Date().toISOString()
  };
}

async function runComprehensiveTest() {
  console.log('🚀 STARTING COMPREHENSIVE WHATSAPP CONVERSATION TEST');
  console.log('=' .repeat(60));
  
  // Step 1: Get expensive services
  const expensiveServices = await getExpensiveServices();
  console.log('\n💎 Premium Services Available:');
  Object.entries(expensiveServices).forEach(([locationId, services]) => {
    console.log(`\nLocation ${locationId}:`);
    services.slice(0, 5).forEach(service => {
      console.log(`  - ${service.name}: ${service.price} KWD`);
    });
  });
  
  // Step 2: Run all 4 conversation scenarios
  const testResults = [];
  
  for (let i = 0; i < conversationScenarios.length; i++) {
    const scenario = conversationScenarios[i];
    console.log(`\n⏳ Starting conversation ${i + 1}/4...`);
    
    const result = await simulateConversation(scenario.customer, scenario);
    testResults.push(result);
    
    // Wait between conversations to avoid overwhelming the system
    if (i < conversationScenarios.length - 1) {
      console.log('\n⏸️ Waiting 10 seconds before next conversation...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  // Step 3: Generate comprehensive report
  console.log('\n📊 COMPREHENSIVE TEST RESULTS');
  console.log('=' .repeat(60));
  
  testResults.forEach((result, index) => {
    console.log(`\n🎯 CONVERSATION ${index + 1} RESULTS:`);
    console.log(`Customer: ${result.customer.name} (${result.customer.type})`);
    console.log(`Phone: ${result.customer.phoneNumber}`);
    console.log(`Service Preference: ${result.customer.servicePreference}`);
    console.log(`Messages Sent: ${result.conversationLog.length}`);
    console.log(`Order Created: ${result.orderResult ? '✅ YES (ID: ' + result.orderResult.id + ')' : '❌ NO'}`);
    
    if (result.orderResult) {
      console.log(`Order Total: ${result.orderResult.total} KWD`);
      console.log(`Order Status: ${result.orderResult.status}`);
      console.log(`Items: ${JSON.stringify(result.orderResult.items)}`);
    }
  });
  
  // Summary statistics
  const successfulOrders = testResults.filter(r => r.orderResult).length;
  const totalMessages = testResults.reduce((sum, r) => sum + r.conversationLog.length, 0);
  
  console.log('\n📈 SUMMARY STATISTICS:');
  console.log(`Total Conversations: ${testResults.length}`);
  console.log(`Successful Orders: ${successfulOrders}/${testResults.length}`);
  console.log(`Success Rate: ${((successfulOrders / testResults.length) * 100).toFixed(1)}%`);
  console.log(`Total Messages Sent: ${totalMessages}`);
  console.log(`Average Messages per Conversation: ${(totalMessages / testResults.length).toFixed(1)}`);
  
  return testResults;
}

// Execute the comprehensive test
if (require.main === module) {
  runComprehensiveTest()
    .then(results => {
      console.log('\n🎉 COMPREHENSIVE TEST COMPLETED');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 TEST FAILED:', error);
      process.exit(1);
    });
}

module.exports = { runComprehensiveTest, testCustomers, conversationScenarios };