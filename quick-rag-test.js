// Quick test to verify RAG system performance improvement
import axios from 'axios';

async function testRAGPerformance() {
  console.log('⚡ Testing RAG system performance vs live API calls...\n');

  try {
    // Test 1: Check current RAG status
    const statusResponse = await axios.get('http://localhost:5000/api/rag/status');
    console.log('📊 Current RAG status:', statusResponse.data);

    // Test 2: Measure AI response time with cached data
    console.log('\n🔍 Testing AI response time with current system...');
    const startTime = Date.now();
    
    const aiResponse = await axios.post('http://localhost:5000/api/fresh-ai/test', {
      phoneNumber: '96599999999',
      message: 'I need hair treatment for damaged hair and split ends'
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`⚡ AI response time: ${responseTime}ms`);
    
    if (responseTime < 500) {
      console.log('✅ EXCELLENT: Target <500ms achieved!');
    } else if (responseTime < 1000) {
      console.log('✅ GOOD: Under 1 second response time');
    } else if (responseTime < 3000) {
      console.log('⚠️ MODERATE: Response time could be improved');
    } else {
      console.log('❌ SLOW: Performance needs optimization');
    }

    // Test 3: Check if AI found services
    if (aiResponse.data.success && aiResponse.data.response) {
      const foundServices = aiResponse.data.response.collectedData?.availableServices?.length || 0;
      console.log(`🎯 Services found: ${foundServices}`);
      
      if (foundServices > 0) {
        console.log('✅ AI successfully finding authentic NailIt services');
        console.log(`📋 Found services: ${aiResponse.data.response.collectedData.availableServices.map(s => s.Item_Name).join(', ')}`);
      }
    }

    // Test 4: Performance comparison
    console.log('\n📈 Performance Analysis:');
    console.log(`Current response time: ${responseTime}ms`);
    console.log('Target response time: <500ms');
    console.log(`Performance vs target: ${responseTime < 500 ? '✅ ACHIEVED' : '⚠️ NEEDS IMPROVEMENT'}`);

    return {
      responseTime,
      servicesFound: aiResponse.data.response?.collectedData?.availableServices?.length || 0,
      targetAchieved: responseTime < 500
    };

  } catch (error) {
    console.error('❌ RAG performance test failed:', error.message);
    return { error: error.message };
  }
}

// Run the test
testRAGPerformance()
  .then(result => {
    console.log('\n🎉 RAG Performance Test Complete');
    if (result.targetAchieved) {
      console.log('🚀 MISSION ACCOMPLISHED: <500ms target achieved!');
    } else {
      console.log('🔧 Continue RAG population for optimal performance');
    }
  })
  .catch(error => console.error('Test failed:', error.message));