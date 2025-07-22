/**
 * Comprehensive Cache Population - Ensure ALL services are cached
 */

import { SmartServiceCache } from './smart-service-cache.js';
import { storage } from './storage.js';

const serviceCache = new SmartServiceCache(storage);

export async function populateAllLocationServices(): Promise<{
  success: boolean;
  results: Record<string, any>;
  totalSynced: number;
}> {
  console.log('🚀 COMPREHENSIVE SERVICE CACHE POPULATION');
  console.log('==========================================');
  
  const locations = [
    { id: 1, name: 'Al-Plaza Mall' },
    { id: 52, name: 'Zahra Complex' },
    { id: 53, name: 'Arraya Mall' }
  ];
  
  const results: Record<string, any> = {};
  let totalSynced = 0;
  
  for (const location of locations) {
    console.log(`\n📍 Syncing ${location.name} (ID: ${location.id})`);
    
    try {
      const startTime = Date.now();
      const synced = await serviceCache.syncLocationServices(location.id);
      const syncTime = Date.now() - startTime;
      
      // Verify services were cached
      const cachedServices = await serviceCache.getServicesForLocation(location.id);
      
      results[location.name] = {
        locationId: location.id,
        synced,
        cached: cachedServices.length,
        syncTime: `${syncTime}ms`,
        status: cachedServices.length > 0 ? '✅ SUCCESS' : '❌ FAILED'
      };
      
      totalSynced += synced;
      console.log(`✅ ${location.name}: ${synced} synced, ${cachedServices.length} cached`);
      
    } catch (error) {
      results[location.name] = {
        locationId: location.id,
        synced: 0,
        cached: 0,
        error: error.message,
        status: '❌ ERROR'
      };
      console.log(`❌ ${location.name}: ${error.message}`);
    }
  }
  
  // Final verification
  console.log('\n📊 FINAL CACHE VERIFICATION:');
  const finalStats = await serviceCache.getCacheStats();
  console.log(`Total services cached: ${finalStats.totalCached}`);
  console.log(`Categories: ${Object.keys(finalStats.categories).join(', ')}`);
  
  return {
    success: totalSynced > 0,
    results,
    totalSynced
  };
}

export async function verifyAIAgentCache(): Promise<{
  canAccessCache: boolean;
  searchResults: any[];
  performance: string;
}> {
  console.log('\n🤖 AI AGENT CACHE VERIFICATION');
  console.log('===============================');
  
  // Test AI-typical search queries
  const testQueries = [
    'nail',
    'manicure', 
    'french',
    'gel polish',
    'pedicure',
    'chrome nails'
  ];
  
  const searchResults = [];
  const startTime = Date.now();
  
  for (const query of testQueries) {
    try {
      const results = await serviceCache.searchServices(query, 1);
      searchResults.push({
        query,
        found: results.length,
        services: results.slice(0, 3).map(s => s.name)
      });
      console.log(`🔍 "${query}": ${results.length} services found`);
    } catch (error) {
      searchResults.push({
        query,
        found: 0,
        error: error.message
      });
    }
  }
  
  const totalTime = Date.now() - startTime;
  const avgTime = totalTime / testQueries.length;
  
  console.log(`⚡ Average search time: ${avgTime.toFixed(1)}ms`);
  
  return {
    canAccessCache: searchResults.some(r => r.found > 0),
    searchResults,
    performance: `${avgTime.toFixed(1)}ms average (target: <500ms)`
  };
}