import { SimpleServiceCache } from './server/simple-cache.js';

async function getRealCachedServices() {
  console.log('🔍 Getting REAL cached services...');
  
  try {
    const cache = new SimpleServiceCache();
    
    // Get nail services from cache
    console.log('💅 Searching for nail services...');
    const nailServices = await cache.searchServices('nail', 1, 20);
    console.log(`Found ${nailServices.length} nail services:`);
    
    nailServices.slice(0, 10).forEach((service, index) => {
      console.log(`${index + 1}. ID: ${service.service_id} | Name: "${service.name}" | Price: ${service.price_kwd} KWD`);
    });
    
    // Get manicure services 
    console.log('\n💅 Searching for manicure services...');
    const manicureServices = await cache.searchServices('manicure', 1, 20);
    console.log(`Found ${manicureServices.length} manicure services:`);
    
    manicureServices.slice(0, 5).forEach((service, index) => {
      console.log(`${index + 1}. ID: ${service.service_id} | Name: "${service.name}" | Price: ${service.price_kwd} KWD`);
    });
    
    // Get any popular services for testing
    console.log('\n🎯 Searching for popular services...');
    const popularServices = await cache.searchServices('', 1, 10); // Empty query gets popular services
    console.log(`Found ${popularServices.length} popular services:`);
    
    popularServices.slice(0, 5).forEach((service, index) => {
      console.log(`${index + 1}. ID: ${service.service_id} | Name: "${service.name}" | Price: ${service.price_kwd} KWD`);
    });
    
    // Show first real service for testing
    if (popularServices.length > 0) {
      const testService = popularServices[0];
      console.log(`\n🎯 REAL SERVICE FOR TESTING:`);
      console.log(`Service ID: ${testService.service_id}`);
      console.log(`Service Name: "${testService.name}"`);
      console.log(`Price: ${testService.price_kwd} KWD`);
      console.log(`Location: ${testService.location_ids}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to get cached services:', error.message);
    console.error('Stack:', error.stack);
  }
}

getRealCachedServices();