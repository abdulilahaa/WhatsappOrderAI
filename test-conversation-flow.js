#!/usr/bin/env node

// Test script for verifying the 6 conversation flow improvements

const testEndpoint = 'http://localhost:5000/api/fresh-ai/test';

// Test scenarios covering all 6 fixes
const testScenarios = [
  {
    name: "Fix #1: Understanding Initial Questions",
    phoneNumber: "96599999991",
    messages: [
      {
        message: "What treatments do you recommend for my oily scalp?",
        expectedInResponse: ["recommend", "scalp", "treatment"],
        shouldNotContain: ["selected", "booked"]
      }
    ]
  },
  {
    name: "Fix #2: No Auto-Selection",
    phoneNumber: "96599999992", 
    messages: [
      {
        message: "I want a manicure",
        expectedInResponse: ["manicure", "would you like", "prefer"],
        shouldNotContain: ["Selected:", "Your service:"]
      }
    ]
  },
  {
    name: "Fix #3: Date Parsing",
    phoneNumber: "96599999993",
    messages: [
      {
        message: "Book French manicure",
        expectedInResponse: ["French", "location"]
      },
      {
        message: "Al-Plaza Mall",
        expectedInResponse: ["when", "appointment"]
      },
      {
        message: "Wednesday",
        expectedInResponse: ["Wednesday", "availability"],
        shouldNotContain: ["error", "no appointments"]
      }
    ]
  },
  {
    name: "Fix #4: Smart Scheduling",
    phoneNumber: "96599999994",
    messages: [
      {
        message: "I want French manicure and facial treatment",
        expectedInResponse: ["services", "duration", "total"]
      }
    ]
  },
  {
    name: "Fix #5: Natural Conversation",
    phoneNumber: "96599999995",
    messages: [
      {
        message: "Hi, I need help with my damaged hair",
        expectedInResponse: ["help", "damaged hair", "recommend"],
        shouldNotContain: ["Error", "Sorry"]
      }
    ]
  },
  {
    name: "Fix #6: Payment Summary",
    phoneNumber: "96599999996",
    messages: [
      {
        message: "Book a gel manicure at Zahra Complex tomorrow at 2pm",
        expectedInResponse: ["gel", "Zahra", "tomorrow", "2"],
        finalTest: true
      }
    ]
  }
];

async function sendMessage(phoneNumber, message) {
  try {
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, message })
    });
    return await response.json();
  } catch (error) {
    console.error('Request failed:', error);
    return null;
  }
}

async function runTests() {
  console.log('🧪 Testing Conversation Flow Improvements\n');
  console.log('=' .repeat(50));
  
  for (const scenario of testScenarios) {
    console.log(`\n📋 Testing: ${scenario.name}`);
    console.log('-'.repeat(40));
    
    for (const test of scenario.messages) {
      console.log(`💬 User: "${test.message}"`);
      
      const result = await sendMessage(scenario.phoneNumber, test.message);
      
      if (result && result.success) {
        const response = result.response.message;
        console.log(`🤖 AI: ${response.substring(0, 150)}...`);
        
        // Check expected content
        const hasExpected = test.expectedInResponse.every(expected => 
          response.toLowerCase().includes(expected.toLowerCase())
        );
        
        // Check unwanted content
        const hasUnwanted = test.shouldNotContain ? 
          test.shouldNotContain.some(unwanted => 
            response.toLowerCase().includes(unwanted.toLowerCase())
          ) : false;
        
        if (hasExpected && !hasUnwanted) {
          console.log('✅ PASS: Response contains expected content');
        } else {
          console.log('❌ FAIL: Response missing expected content or contains unwanted text');
          if (!hasExpected) {
            console.log('   Missing:', test.expectedInResponse.filter(exp => 
              !response.toLowerCase().includes(exp.toLowerCase())
            ));
          }
          if (hasUnwanted) {
            console.log('   Unwanted found:', test.shouldNotContain.filter(unw => 
              response.toLowerCase().includes(unw.toLowerCase())
            ));
          }
        }
        
        // Check conversation state
        if (result.response.collectedData) {
          const data = result.response.collectedData;
          console.log('📊 State:', {
            services: data.selectedServices?.length || 0,
            location: data.locationName || 'none',
            phase: result.response.collectionPhase
          });
        }
      } else {
        console.log('❌ FAIL: Request failed');
      }
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Conversation Flow Testing Complete');
}

// Run tests
runTests().catch(console.error);