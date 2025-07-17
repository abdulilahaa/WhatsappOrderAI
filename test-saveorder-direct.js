// Test the SaveOrder API directly using the working test endpoint
import axios from 'axios';

async function testSaveOrderDirect() {
  console.log('🎯 TESTING SAVEORDER DIRECT - GET ORDER ID');
  console.log('==========================================');
  
  try {
    console.log('\n🧪 Testing SaveOrder direct endpoint...');
    const response = await axios.post('http://localhost:5000/api/nailit/test-saveorder-direct', {});
    console.log('Response:', response.data);
    
    if (response.data.success && response.data.orderId) {
      console.log(`\n🎉 SUCCESS! Order ID: ${response.data.orderId}`);
      console.log(`👤 Customer ID: ${response.data.customerId}`);
      console.log(`📋 Full Response: ${JSON.stringify(response.data, null, 2)}`);
      
      return {
        success: true,
        orderId: response.data.orderId,
        customerId: response.data.customerId,
        data: response.data
      };
    } else {
      console.log(`\n❌ Test failed: ${response.data.message || 'Unknown error'}`);
      return {
        success: false,
        message: response.data.message,
        data: response.data
      };
    }
    
  } catch (error) {
    console.error('❌ Error during SaveOrder direct test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return {
      success: false,
      error: error.message,
      responseData: error.response?.data
    };
  }
}

// Execute the SaveOrder direct test
testSaveOrderDirect()
  .then(result => {
    console.log('\n🏁 SAVEORDER DIRECT TEST RESULT:');
    console.log('================================');
    if (result.success) {
      console.log(`✅ ORDER CREATED SUCCESSFULLY!`);
      console.log(`📋 Order ID: ${result.orderId}`);
      console.log(`👤 Customer ID: ${result.customerId}`);
    } else {
      console.log(`❌ ORDER FAILED: ${result.message || result.error}`);
      console.log(`📋 Full Response: ${JSON.stringify(result.data || result.responseData, null, 2)}`);
    }
  })
  .catch(error => {
    console.error('💥 Test failed:', error.message);
  });