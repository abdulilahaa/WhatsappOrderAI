import axios from 'axios';

async function testRealAvailability() {
  console.log('🔍 Testing Real Staff Availability Data...');
  
  try {
    // Direct API call to check what staff data we actually get
    console.log('\n=== DIRECT GETSERVICESTAFF API TEST ===');
    
    const directTest = await axios.get('http://localhost:5000/api/nailit/test-service-staff', {
      params: {
        itemId: 163, // Nail It henna brown
        locationId: 1, // Al-Plaza Mall
        language: 'E',
        date: '28-07-2025' // Tomorrow
      }
    });
    
    console.log('📊 Raw Staff Response:');
    console.log(JSON.stringify(directTest.data, null, 2));
    
    // Analyze the staff data structure
    if (directTest.data && Array.isArray(directTest.data) && directTest.data.length > 0) {
      console.log(`\n👥 Found ${directTest.data.length} staff members:`);
      
      directTest.data.forEach((staff, index) => {
        const staffId = staff.Staff_Id || staff.Id || staff.staff_id;
        const staffName = staff.Staff_Name || staff.Name || staff.staff_name;
        const isAvailable = staff.IsAvailable || staff.is_available || staff.Available;
        const timeFrames = staff.Time_Frames || staff.TimeFrames || staff.available_slots || [];
        
        console.log(`\n${index + 1}. ${staffName} (ID: ${staffId})`);
        console.log(`   Available: ${isAvailable}`);
        console.log(`   Time Frames: ${timeFrames.length} slots`);
        
        if (timeFrames.length > 0) {
          console.log(`   Time Details:`, JSON.stringify(timeFrames[0], null, 2));
        }
        
        // Check all possible fields that might indicate availability
        const allFields = Object.keys(staff);
        const availabilityFields = allFields.filter(field => 
          field.toLowerCase().includes('available') || 
          field.toLowerCase().includes('time') ||
          field.toLowerCase().includes('slot')
        );
        
        if (availabilityFields.length > 0) {
          console.log(`   Availability Fields: ${availabilityFields.join(', ')}`);
        }
      });
      
      // Find actually available staff
      const availableStaff = directTest.data.filter(staff => {
        const hasTimeFrames = (staff.Time_Frames && staff.Time_Frames.length > 0) ||
                             (staff.TimeFrames && staff.TimeFrames.length > 0) ||
                             (staff.available_slots && staff.available_slots.length > 0);
        const isMarkedAvailable = staff.IsAvailable || staff.is_available || staff.Available;
        
        return hasTimeFrames || isMarkedAvailable;
      });
      
      console.log(`\n✅ Actually Available Staff: ${availableStaff.length}/${directTest.data.length}`);
      
      if (availableStaff.length > 0) {
        const bestStaff = availableStaff[0];
        const staffId = bestStaff.Staff_Id || bestStaff.Id;
        const staffName = bestStaff.Staff_Name || bestStaff.Name;
        
        console.log(`🎯 Best Available Staff: ${staffName} (ID: ${staffId})`);
        
        // Extract available time slots
        const timeFrames = bestStaff.Time_Frames || bestStaff.TimeFrames || [];
        if (timeFrames.length > 0) {
          console.log(`⏰ Available Times:`);
          timeFrames.forEach((frame, i) => {
            const fromTime = frame.From_Time || frame.from_time || frame.time;
            const toTime = frame.To_Time || frame.to_time;
            console.log(`   ${i+1}. ${fromTime} - ${toTime}`);
          });
        }
      } else {
        console.log('❌ No clearly available staff found - system will need fallback logic');
      }
      
    } else {
      console.log('❌ No staff data returned or invalid format');
    }
    
    console.log('\n=== RECOMMENDATION ===');
    console.log('Based on this real data, the booking system should:');
    if (directTest.data && directTest.data.length > 0) {
      console.log('1. Parse actual staff availability from GetServiceStaff API');
      console.log('2. Use staff with Time_Frames data or availability flags');
      console.log('3. Extract real available time slots from Time_Frames');
      console.log('4. Only fallback to hardcoded staff if no API data available');
    } else {
      console.log('1. Fix GetServiceStaff API call parameters');
      console.log('2. Check date format and service ID validity');
      console.log('3. Verify location ID and language parameters');
    }
    
  } catch (error) {
    console.error('❌ Staff availability test failed:', error.message);
    if (error.response) {
      console.error('HTTP Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

testRealAvailability();