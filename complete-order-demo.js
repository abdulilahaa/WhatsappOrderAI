// Complete Order Demo - Start to Finish
// This demonstrates the Enhanced AI Agent creating a real order in NailIt POS

const baseUrl = 'http://localhost:5000';
const testPhone = '+96599DEMO001';

async function completeOrderDemo() {
  console.log('🚀 COMPLETE ORDER DEMO - START TO FINISH');
  console.log('==========================================\n');
  
  try {
    // Step 1: Greeting and Service Selection
    console.log('STEP 1: Customer Greeting and Service Request');
    const step1 = await fetch(`${baseUrl}/api/enhanced-ai/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Hi, I want hair treatment",
        phoneNumber: testPhone
      })
    });
    const response1 = await step1.json();
    console.log('Customer: "Hi, I want hair treatment"');
    console.log('AI Response:', response1.response);
    console.log('---\n');

    // Step 2: Service Selection (Olaplex)
    console.log('STEP 2: Specific Service Selection');
    const step2 = await fetch(`${baseUrl}/api/enhanced-ai/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Olaplex Hair Treatment",
        phoneNumber: testPhone
      })
    });
    const response2 = await step2.json();
    console.log('Customer: "Olaplex Hair Treatment"');
    console.log('AI Response:', response2.response);
    console.log('---\n');

    // Step 3: Continue with booking
    console.log('STEP 3: Continue with Booking');
    const step3 = await fetch(`${baseUrl}/api/enhanced-ai/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "continue with booking",
        phoneNumber: testPhone
      })
    });
    const response3 = await step3.json();
    console.log('Customer: "continue with booking"');
    console.log('AI Response:', response3.response);
    console.log('---\n');

    // Step 4: Location Selection
    console.log('STEP 4: Location Selection');
    const step4 = await fetch(`${baseUrl}/api/enhanced-ai/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "1",
        phoneNumber: testPhone
      })
    });
    const response4 = await step4.json();
    console.log('Customer: "1" (Al-Plaza Mall)');
    console.log('AI Response:', response4.response);
    console.log('---\n');

    // Step 5: Date Selection
    console.log('STEP 5: Date Selection');
    const step5 = await fetch(`${baseUrl}/api/enhanced-ai/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "tomorrow",
        phoneNumber: testPhone
      })
    });
    const response5 = await step5.json();
    console.log('Customer: "tomorrow"');
    console.log('AI Response:', response5.response);
    console.log('---\n');

    // Step 6: Time Selection
    console.log('STEP 6: Time Selection');
    const step6 = await fetch(`${baseUrl}/api/enhanced-ai/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "3:00 PM",
        phoneNumber: testPhone
      })
    });
    const response6 = await step6.json();
    console.log('Customer: "3:00 PM"');
    console.log('AI Response:', response6.response);
    console.log('---\n');

    // Step 7: Customer Name
    console.log('STEP 7: Customer Information - Name');
    const step7 = await fetch(`${baseUrl}/api/enhanced-ai/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Ahmed Al-Rashid",
        phoneNumber: testPhone
      })
    });
    const response7 = await step7.json();
    console.log('Customer: "Ahmed Al-Rashid"');
    console.log('AI Response:', response7.response);
    console.log('---\n');

    // Step 8: Customer Email
    console.log('STEP 8: Customer Information - Email');
    const step8 = await fetch(`${baseUrl}/api/enhanced-ai/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "ahmed.alrashid@example.com",
        phoneNumber: testPhone
      })
    });
    const response8 = await step8.json();
    console.log('Customer: "ahmed.alrashid@example.com"');
    console.log('AI Response:', response8.response);
    console.log('---\n');

    // Step 9: Payment Method
    console.log('STEP 9: Payment Method Selection');
    const step9 = await fetch(`${baseUrl}/api/enhanced-ai/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "KNet",
        phoneNumber: testPhone
      })
    });
    const response9 = await step9.json();
    console.log('Customer: "KNet"');
    console.log('AI Response:', response9.response);
    console.log('---\n');

    // Step 10: Final Confirmation
    console.log('STEP 10: Final Booking Confirmation');
    const step10 = await fetch(`${baseUrl}/api/enhanced-ai/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "confirm booking",
        phoneNumber: testPhone
      })
    });
    const response10 = await step10.json();
    console.log('Customer: "confirm booking"');
    console.log('AI Response:', response10.response);
    console.log('---\n');

    // Validation: Check booking completion
    console.log('STEP 11: Validation - Check Booking Completion');
    const validation = await fetch(`${baseUrl}/api/enhanced-ai/validate-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: testPhone
      })
    });
    const validationData = await validation.json();
    console.log('Booking Validation Result:');
    console.log(`Data Completion: ${validationData.dataCompletion}%`);
    console.log(`Can Proceed to Booking: ${validationData.canProceedToBooking}`);
    console.log('Collected Data Summary:');
    console.log(`- Services: ${validationData.collectedData.selectedServices?.length || 0} selected`);
    console.log(`- Location: ${validationData.collectedData.locationName || 'Not set'}`);
    console.log(`- Total Amount: ${validationData.collectedData.totalAmount || 0} KWD`);
    console.log(`- Duration: ${validationData.collectedData.totalDuration || 0} minutes`);
    
    if (validationData.collectedData.selectedServices?.length > 0) {
      console.log('\nSelected Services:');
      validationData.collectedData.selectedServices.forEach((service, index) => {
        console.log(`  ${index + 1}. ${service.itemName} - ${service.price} KWD (${service.duration}min)`);
      });
    }

    console.log('\n🎉 COMPLETE ORDER DEMO FINISHED');
    console.log('==========================================');
    
    return {
      success: true,
      completionPercentage: validationData.dataCompletion,
      orderData: validationData.collectedData
    };

  } catch (error) {
    console.error('Demo error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

completeOrderDemo();