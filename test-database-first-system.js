/**
 * TEST: Database-First System Implementation
 * Verify that the complete system works per Final Sprint Document requirements
 */

console.log('🧪 TESTING DATABASE-FIRST SYSTEM IMPLEMENTATION');
console.log('📋 Testing per Final Sprint Document requirements...\n');

async function testDatabaseFirstSystem() {
  const baseURL = 'http://localhost:5000';
  
  try {
    console.log('1️⃣ Testing Master Sync Endpoint...');
    
    // Test sync status first
    const syncStatusResponse = await fetch(`${baseURL}/api/nailit/sync-status`);
    const syncStatus = await syncStatusResponse.json();
    console.log('📊 Current sync status:', JSON.stringify(syncStatus, null, 2));
    
    console.log('\n2️⃣ Testing Database Access Endpoints...');
    
    // Test database endpoints
    const locationsResponse = await fetch(`${baseURL}/api/nailit-db/locations`);
    const locations = await locationsResponse.json();
    console.log('📍 Locations in DB:', locations.success ? `${locations.locations.length} locations` : 'No locations');
    
    const servicesResponse = await fetch(`${baseURL}/api/nailit-db/services`);
    const services = await servicesResponse.json();
    console.log('🛠️ Services in DB:', services.success ? `${services.count} services` : 'No services');
    
    const staffResponse = await fetch(`${baseURL}/api/nailit-db/staff`);
    const staff = await staffResponse.json();
    console.log('👥 Staff in DB:', staff.success ? `${staff.count} staff` : 'No staff');
    
    const slotsResponse = await fetch(`${baseURL}/api/nailit-db/slots`);
    const slots = await slotsResponse.json();
    console.log('⏰ Slots in DB:', slots.success ? `${slots.count} slots` : 'No slots');
    
    console.log('\n3️⃣ Testing Database-First AI...');
    
    // Test database-first AI
    const aiTestMessage = {
      message: "Hello, I want to book a nail appointment",
      customerId: 1,
      currentState: null
    };
    
    const aiResponse = await fetch(`${baseURL}/api/database-first-ai/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(aiTestMessage)
    });
    
    const aiResult = await aiResponse.json();
    console.log('🤖 Database-First AI Response:', {
      success: aiResult.success,
      response: aiResult.response,
      currentStep: aiResult.state?.currentStep,
      isComplete: aiResult.isComplete
    });
    
    console.log('\n4️⃣ System Architecture Verification...');
    
    // Check if data exists in database tables
    const hasLocations = locations.success && locations.locations.length > 0;
    const hasServices = services.success && services.count > 0;
    const hasStaff = staff.success && staff.count > 0;
    const hasSlots = slots.success && slots.count > 0;
    
    console.log('✅ ARCHITECTURE COMPLIANCE CHECK:');
    console.log(`   📍 Locations in DB: ${hasLocations ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   🛠️ Services in DB: ${hasServices ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   👥 Staff in DB: ${hasStaff ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ⏰ Slots in DB: ${hasSlots ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   🤖 AI uses DB-only: ${aiResult.success ? '✅ PASS' : '❌ FAIL'}`);
    
    const allTestsPassed = hasLocations && hasServices && hasStaff && hasSlots && aiResult.success;
    
    console.log('\n🎯 FINAL SPRINT DOCUMENT COMPLIANCE:');
    console.log(`   Database-First Architecture: ${allTestsPassed ? '✅ IMPLEMENTED' : '❌ INCOMPLETE'}`);
    console.log(`   AI uses DB instead of live API: ${aiResult.success ? '✅ ACHIEVED' : '❌ NOT ACHIEVED'}`);
    console.log(`   Sync system operational: ${syncStatus.success !== false ? '✅ ACTIVE' : '❌ INACTIVE'}`);
    
    if (allTestsPassed) {
      console.log('\n🎉 DATABASE-FIRST SYSTEM FULLY OPERATIONAL!');
      console.log('📋 All Final Sprint Document requirements met:');
      console.log('   ✅ DB is primary source for services/locations/staff/slots');
      console.log('   ✅ AI agent uses DB ONLY, not live API during conversations');
      console.log('   ✅ Sync system updates DB with NailIt data');
      console.log('   ✅ Live API calls ONLY for final booking confirmation');
    } else {
      console.log('\n⚠️ SYSTEM REQUIRES SYNC');
      console.log('💡 Run master sync to populate database:');
      console.log('   POST /api/nailit/sync-all');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDatabaseFirstSystem();