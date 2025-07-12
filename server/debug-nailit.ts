// Debug script to test NailIt API endpoints individually
import { nailItAPI } from './nailit-api.js';

async function debugNailItAPI() {
  console.log('🔍 Testing NailIt API endpoints...\n');

  // Test device registration
  console.log('1. Testing device registration...');
  const registered = await nailItAPI.registerDevice();
  console.log('Device registered:', registered);

  // Test locations
  console.log('\n2. Testing locations...');
  const locations = await nailItAPI.getLocations();
  console.log('Locations found:', locations.length);
  locations.forEach(loc => console.log(`  - ${loc.Location_Name} (ID: ${loc.Location_Id})`));

  // Test groups
  console.log('\n3. Testing service groups...');
  const groups = await nailItAPI.getGroups(2); // 2 = Services
  console.log('Groups found:', groups.length);
  groups.forEach(group => console.log(`  - ${group.Name} (ID: ${group.Id})`));

  // Test items by date for each group and location
  if (groups.length > 0 && locations.length > 0) {
    console.log('\n4. Testing items by date...');
    const testDate = nailItAPI.formatDateForAPI(new Date());
    
    for (let i = 0; i < Math.min(2, groups.length); i++) {
      const group = groups[i];
      console.log(`\n   Testing group: ${group.Name} (ID: ${group.Id})`);
      
      const itemsResult = await nailItAPI.getItemsByDate({
        groupId: group.Id,
        locationIds: [locations[0].Location_Id],
        selectedDate: testDate
      });
      
      console.log(`   Items found: ${itemsResult.totalItems}`);
      itemsResult.items.slice(0, 3).forEach(item => {
        console.log(`     - ${item.Item_Name}: ${item.Primary_Price} KWD`);
      });
    }
  }

  console.log('\n✅ NailIt API debug complete');
}

// Run the debug
debugNailItAPI().catch(console.error);