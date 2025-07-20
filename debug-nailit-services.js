// Debug NailIt Services to Find Actual Nail Services
const baseUrl = 'http://localhost:5000';

async function findNailServices() {
  console.log('🔍 SEARCHING FOR ACTUAL NAIL SERVICES IN NAILIT API...\n');
  
  try {
    // Get all available services
    const response = await fetch(`${baseUrl}/api/nailit/test-items`);
    const data = await response.json();
    
    console.log(`📋 Total services available: ${data.items?.length || 0}\n`);
    
    if (!data.items) {
      console.log('❌ No services found in NailIt API');
      return;
    }
    
    // Search for nail-related services
    const nailKeywords = ['nail', 'manicure', 'pedicure', 'gel', 'acrylic', 'polish', 'cuticle', 'shellac', 'french'];
    const foundNailServices = [];
    
    data.items.forEach(item => {
      const name = item.Item_Name.toLowerCase();
      const desc = (item.Item_Desc || '').toLowerCase();
      
      const hasNailKeyword = nailKeywords.some(keyword => 
        name.includes(keyword) || desc.includes(keyword)
      );
      
      if (hasNailKeyword) {
        foundNailServices.push(item);
      }
    });
    
    console.log(`💅 Found ${foundNailServices.length} potential nail services:`);
    foundNailServices.forEach(service => {
      console.log(`   - ${service.Item_Name} (ID: ${service.Item_Id}, Price: ${service.Primary_Price} KWD, Group: ${service.Parent_Group_Id})`);
    });
    
    // If no nail services found, show all service categories
    if (foundNailServices.length === 0) {
      console.log('\n❌ NO NAIL SERVICES FOUND! Available service categories:');
      
      const groupCounts = {};
      data.items.forEach(item => {
        const groupId = item.Parent_Group_Id;
        groupCounts[groupId] = (groupCounts[groupId] || 0) + 1;
      });
      
      Object.entries(groupCounts).forEach(([groupId, count]) => {
        console.log(`   Group ${groupId}: ${count} services`);
      });
      
      console.log('\nSample services by category:');
      const sampleByGroup = {};
      data.items.forEach(item => {
        const groupId = item.Parent_Group_Id;
        if (!sampleByGroup[groupId]) {
          sampleByGroup[groupId] = [];
        }
        if (sampleByGroup[groupId].length < 3) {
          sampleByGroup[groupId].push(item.Item_Name);
        }
      });
      
      Object.entries(sampleByGroup).forEach(([groupId, services]) => {
        console.log(`   Group ${groupId}: ${services.join(', ')}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findNailServices();