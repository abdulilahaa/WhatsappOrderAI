// Push order to NailIt POS using the actual API client
import { NailItAPI } from './server/nailit-api.js';

async function pushOrderToNailIt() {
  console.log('🔥 PUSHING ORDER TO NAILIT POS NOW');
  console.log('===================================');
  
  const nailItAPI = new NailItAPI();
  
  try {
    // Create order with the actual API client that has proper configuration
    const orderData = await nailItAPI.createTestOrder();
    
    console.log('\n📋 ORDER DATA CREATED:');
    console.log(JSON.stringify(orderData, null, 2));
    
    console.log('\n🚀 SENDING ORDER TO NAILIT POS...');
    const response = await nailItAPI.saveOrder(orderData);
    
    console.log('\n✅ NAILIT POS RESPONSE:');
    console.log(JSON.stringify(response, null, 2));
    
    if (response.Status === 0) {
      console.log(`\n🎉 SUCCESS! Order created in NailIt POS!`);
      console.log(`Order ID: ${response.OrderId}`);
      console.log(`Customer ID: ${response.CustomerId}`);
      
      // Get order details to confirm
      if (response.OrderId > 0) {
        console.log('\n📋 Fetching order details...');
        const orderDetails = await nailItAPI.getOrderPaymentDetail(response.OrderId);
        console.log('Order Payment Details:', JSON.stringify(orderDetails, null, 2));
      }
      
      return { success: true, orderId: response.OrderId, customerId: response.CustomerId };
    } else {
      console.log(`\n❌ Order failed with Status: ${response.Status}`);
      console.log(`Message: ${response.Message}`);
      return { success: false, error: response.Message, status: response.Status };
    }
    
  } catch (error) {
    console.error('❌ Failed to push order to NailIt POS:', error.message);
    return { success: false, error: error.message };
  }
}

// Execute the order push
pushOrderToNailIt()
  .then(result => {
    if (result.success) {
      console.log(`\n🏁 ORDER SUCCESSFULLY PUSHED TO NAILIT POS!`);
      console.log(`Order ID: ${result.orderId}, Customer ID: ${result.customerId}`);
    } else {
      console.log(`\n💥 ORDER PUSH FAILED: ${result.error}`);
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Critical error:', error.message);
    process.exit(1);
  });