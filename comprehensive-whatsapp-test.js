/**
 * Comprehensive WhatsApp Conversation Test - Manual Execution
 * Tests 4 complete booking scenarios with premium services
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5000';

// Premium Service Test Scenarios
const testScenarios = [
  {
    id: 1,
    customer: 'Sarah Al-Mahmoud',
    phone: '+96541144687',
    email: 'sarah.mahmoud@email.com',
    category: 'Hair Treatment (Premium)',
    conversation: [
      'Hi! I need the most expensive hair treatment available for tomorrow at Al-Plaza Mall',
      '2:00 PM would be perfect',
      'Sarah Al-Mahmoud', 
      'sarah.mahmoud@email.com',
      'KNet payment please'
    ]
  },
  {
    id: 2,
    customer: 'Layla Hassan',
    phone: '+96541144688', 
    email: 'layla.hassan@email.com',
    category: 'Luxury Nail Service',
    conversation: [
      'I want the most luxury nail service you have at Zahra Complex',
      'afternoon appointment would be great',
      'Layla Hassan',
      'layla.hassan@email.com',
      'KNet'
    ]
  },
  {
    id: 3,
    customer: 'Fatima Al-Rashid',
    phone: '+96541144689',
    email: 'fatima.rashid@email.com', 
    category: 'Premium Massage & Body Treatment',
    conversation: [
      'Looking for the most expensive massage and body treatment at Al-Plaza Mall',
      'morning appointment tomorrow please',
      'Fatima Al-Rashid',
      'fatima.rashid@email.com',
      'KNet payment'
    ]
  },
  {
    id: 4,
    customer: 'Nour Al-Khalifa',  
    phone: '+96541144690',
    email: 'nour.khalifa@email.com',
    category: 'Premium Combo Package',
    conversation: [
      'I need hair treatment, luxury manicure and massage - your most expensive services',
      'any location is fine, flexible with timing',
      'Nour Al-Khalifa',
      'nour.khalifa@email.com', 
      'KNet please'
    ]
  }
];

async function testWhatsAppConversation(scenario) {
  console.log(`\n🎭 === TESTING SCENARIO ${scenario.id}: ${scenario.customer} ===`);
  console.log(`📱 Phone: ${scenario.phone}`);
  console.log(`🏷️ Category: ${scenario.category}`);
  console.log(`💬 Messages to send: ${scenario.conversation.length}`);
  
  const results = {
    scenario: scenario.id,
    customer: scenario.customer,
    messagesResults: [],
    finalStatus: 'unknown',
    orderCreated: false,
    orderId: null,
    totalAmount: null
  };
  
  // Send each message in sequence
  for (let i = 0; i < scenario.conversation.length; i++) {
    const message = scenario.conversation[i];
    console.log(`\n📝 Step ${i + 1}/${scenario.conversation.length}: "${message}"`);
    
    try {
      const response = await axios.post(`${BASE_URL}/api/whatsapp/send-message`, {
        phoneNumber: scenario.phone,
        message: message
      });
      
      results.messagesResults.push({
        step: i + 1,
        message: message,
        success: true,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Message sent successfully`);
      
      // Wait for AI processing
      await new Promise(resolve => setTimeout(resolve, 4000));
      
    } catch (error) {
      console.log(`❌ Failed to send message: ${error.message}`);
      results.messagesResults.push({
        step: i + 1,
        message: message,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Check for order creation after final message
  console.log(`\n🔍 Checking for order creation...`);
  try {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for order processing
    
    const ordersResponse = await axios.get(`${BASE_URL}/api/orders`);
    const recentOrders = ordersResponse.data.filter(order => 
      order.customer.phoneNumber === scenario.phone &&
      new Date(order.createdAt) > new Date(Date.now() - 600000) // Last 10 minutes
    );
    
    if (recentOrders.length > 0) {
      const latestOrder = recentOrders[0];
      results.orderCreated = true;
      results.orderId = latestOrder.id;
      results.totalAmount = latestOrder.total;
      results.finalStatus = 'success';
      console.log(`✅ Order created: ID ${latestOrder.id}, Total: ${latestOrder.total} KWD`);
    } else {
      results.finalStatus = 'no_order';
      console.log(`⚠️ No order found for ${scenario.phone}`);
    }
  } catch (error) {
    console.log(`❌ Error checking orders: ${error.message}`);
    results.finalStatus = 'error';
  }
  
  return results;
}

async function runComprehensiveTest() {
  console.log('🚀 COMPREHENSIVE WHATSAPP BOOKING TEST');
  console.log('Testing 4 premium service booking scenarios');
  console.log('=' .repeat(60));
  
  const allResults = [];
  
  // Test each scenario
  for (const scenario of testScenarios) {
    const result = await testWhatsAppConversation(scenario);
    allResults.push(result);
    
    // Wait between scenarios to avoid overwhelming the system
    if (scenario.id < testScenarios.length) {
      console.log(`\n⏸️ Waiting 15 seconds before next scenario...`);
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }
  
  // Generate comprehensive report
  console.log('\n📊 === COMPREHENSIVE TEST RESULTS ===');
  console.log('=' .repeat(60));
  
  let totalMessages = 0;
  let successfulOrders = 0;
  let totalRevenue = 0;
  
  allResults.forEach(result => {
    console.log(`\n🎯 SCENARIO ${result.scenario} - ${result.customer}:`);
    console.log(`   Messages Sent: ${result.messagesResults.length}`);
    console.log(`   Order Created: ${result.orderCreated ? '✅ YES' : '❌ NO'}`);
    
    if (result.orderCreated) {
      console.log(`   Order ID: ${result.orderId}`);
      console.log(`   Amount: ${result.totalAmount} KWD`);
      successfulOrders++;
      totalRevenue += parseFloat(result.totalAmount || 0);
    }
    
    console.log(`   Final Status: ${result.finalStatus}`);
    totalMessages += result.messagesResults.length;
  });
  
  console.log('\n📈 SUMMARY STATISTICS:');
  console.log(`Total Scenarios Tested: ${testScenarios.length}`);
  console.log(`Total Messages Sent: ${totalMessages}`);
  console.log(`Successful Orders: ${successfulOrders}/${testScenarios.length}`);
  console.log(`Success Rate: ${((successfulOrders / testScenarios.length) * 100).toFixed(1)}%`);
  console.log(`Total Revenue Generated: ${totalRevenue.toFixed(2)} KWD`);
  console.log(`Average Order Value: ${successfulOrders > 0 ? (totalRevenue / successfulOrders).toFixed(2) : 0} KWD`);
  
  return allResults;
}

// Export for use
export { runComprehensiveTest, testScenarios };