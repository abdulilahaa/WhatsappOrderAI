// Quick test to see what's in the RAG database and what the AI can see
import axios from 'axios';

async function testRAGContent() {
  console.log('🔍 CHECKING RAG DATABASE CONTENT FOR LOCATION 1');
  
  try {
    // Check current RAG database content
    const ragCheck = await axios.post('http://localhost:5000/api/execute-sql', {
      sql_query: `
        SELECT COUNT(*) as total_services 
        FROM nailit_services 
        WHERE 1 = ANY(location_ids) AND is_enabled = true
      `
    });
    
    console.log(`📊 Current RAG services for location 1: ${ragCheck.data?.data?.[0]?.total_services || 0}`);
    
    // Get sample services to see what's cached
    const sampleCheck = await axios.post('http://localhost:5000/api/execute-sql', {
      sql_query: `
        SELECT name, price, nailit_id 
        FROM nailit_services 
        WHERE 1 = ANY(location_ids) AND is_enabled = true 
        LIMIT 5
      `
    });
    
    console.log('\n📋 Sample cached services:');
    sampleCheck.data?.data?.forEach((service, i) => {
      console.log(`   ${i+1}. ${service.name} (ID: ${service.nailit_id}) - ${service.price} KWD`);
    });
    
    // Test what AI agent can see
    console.log('\n🧪 Testing AI agent service visibility...');
    const aiTest = await axios.post('http://localhost:5000/api/fresh-ai/test', {
      phoneNumber: '96599999999',
      message: 'What hair services do you have at Al-Plaza Mall?'
    });
    
    console.log(`AI response success: ${aiTest.data?.success || false}`);
    console.log(`AI message: ${aiTest.data?.response?.message?.substring(0, 200) || 'No message'}...`);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testRAGContent();