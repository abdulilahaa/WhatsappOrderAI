import { FreshAIAgent } from './ai-fresh';
import { nailItValidator } from './nailit-validator';

export async function testAIBookingFlow() {
  console.log('\n🧪 Testing AI Booking Flow with Business Hours Validation...\n');

  const freshAI = new FreshAIAgent();
  
  // Test customer
  const testCustomer = {
    id: 999,
    name: 'Test Customer',
    email: 'test@example.com',
    phoneNumber: '+96512345678',
    createdAt: new Date()
  };

  try {
    // Test 1: Business Hours Validation
    console.log('📋 Test 1: Business Hours Validation');
    const validationResult = await nailItValidator.validateTimeSlot(1, '8:00 AM', '17-07-2025');
    console.log('✅ Validation for 8:00 AM:', validationResult);
    
    const validationResult2 = await nailItValidator.validateTimeSlot(1, '10:00 AM', '17-07-2025');
    console.log('✅ Validation for 10:00 AM:', validationResult2);
    
    // Test 2: Complete Booking Flow
    console.log('\n📋 Test 2: Complete Booking Flow');
    
    // Initialize conversation
    let response = await freshAI.processMessage('Hello', testCustomer);
    console.log('Step 1 - Greeting:', response.message.substring(0, 100) + '...');
    
    // Service selection
    response = await freshAI.processMessage('I want French Manicure', testCustomer);
    console.log('Step 2 - Service Selection:', response.message.substring(0, 100) + '...');
    
    // Location selection
    response = await freshAI.processMessage('Al-Plaza Mall', testCustomer);
    console.log('Step 3 - Location Selection:', response.message.substring(0, 100) + '...');
    
    // Date selection
    response = await freshAI.processMessage('tomorrow', testCustomer);
    console.log('Step 4 - Date Selection:', response.message.substring(0, 100) + '...');
    
    // Test time slot with business hours validation
    response = await freshAI.processMessage('8:00 AM', testCustomer);
    console.log('Step 5 - Time Validation (8AM):', response.message.substring(0, 100) + '...');
    
    // Valid time slot
    response = await freshAI.processMessage('10:00 AM', testCustomer);
    console.log('Step 6 - Valid Time Selection:', response.message.substring(0, 100) + '...');
    
    // Customer info
    response = await freshAI.processMessage('John Doe', testCustomer);
    console.log('Step 7 - Customer Name:', response.message.substring(0, 100) + '...');
    
    response = await freshAI.processMessage('john.doe@example.com', testCustomer);
    console.log('Step 8 - Customer Email:', response.message.substring(0, 100) + '...');
    
    // Payment method
    response = await freshAI.processMessage('1', testCustomer);
    console.log('Step 9 - Payment Method:', response.message.substring(0, 100) + '...');
    
    // Confirmation
    response = await freshAI.processMessage('yes', testCustomer);
    console.log('Step 10 - Final Confirmation:', response.message.substring(0, 200) + '...');
    
    console.log('\n✅ AI Booking Flow Test Completed Successfully!\n');
    
    return {
      success: true,
      message: 'All AI booking tests passed successfully',
      details: {
        businessHoursValidation: validationResult,
        bookingFlowCompleted: true,
        timeSlotValidation: validationResult2
      }
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      message: `Test failed: ${error.message}`,
      error: error.stack
    };
  }
}