/**
 * Cache Management Routes - API endpoints for service cache management
 */

import { Router } from 'express';
import { storage } from './storage.js';
import { SmartServiceCache } from './smart-service-cache.js';

const router = Router();
const serviceCache = new SmartServiceCache(storage);

/**
 * Get cache statistics
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await serviceCache.getCacheStats();
    res.json({
      success: true,
      stats,
      message: `Cache contains ${stats.totalCached} services across ${Object.keys(stats.byLocation).length} locations`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Search cached services
 */
router.post('/cache/search', async (req, res) => {
  try {
    const { query, locationId } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query parameter required' 
      });
    }

    const startTime = Date.now();
    const services = await serviceCache.searchServices(query, locationId);
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      services,
      count: services.length,
      responseTime: `${responseTime}ms`,
      query,
      locationId: locationId || 'all'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Get services for location
 */
router.get('/cache/location/:locationId', async (req, res) => {
  try {
    const locationId = parseInt(req.params.locationId);
    const { category } = req.query;
    
    const startTime = Date.now();
    const services = await serviceCache.getServicesForLocation(locationId, category as string);
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      services,
      count: services.length,
      responseTime: `${responseTime}ms`,
      locationId,
      category: category || 'all'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Sync services for location
 */
router.post('/cache/sync/:locationId', async (req, res) => {
  try {
    const locationId = parseInt(req.params.locationId);
    
    console.log(`🔄 Starting manual sync for location ${locationId}`);
    const startTime = Date.now();
    
    const syncedCount = await serviceCache.syncLocationServices(locationId);
    const syncTime = Date.now() - startTime;
    
    res.json({
      success: true,
      synced: syncedCount,
      syncTime: `${syncTime}ms`,
      locationId,
      message: `Successfully synced ${syncedCount} services for location ${locationId}`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Clear cache
 */
router.delete('/cache/clear', async (req, res) => {
  try {
    const { locationId } = req.query;
    
    serviceCache.clearMemoryCache();
    
    if (locationId) {
      await storage.clearCachedServices(parseInt(locationId as string));
    } else {
      await storage.clearCachedServices();
    }
    
    res.json({
      success: true,
      message: locationId 
        ? `Cache cleared for location ${locationId}` 
        : 'All cache cleared'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Test cache performance
 */
router.get('/cache/test-performance', async (req, res) => {
  try {
    const testQueries = [
      'nail',
      'manicure',
      'french',
      'hair',
      'facial'
    ];
    
    const results = [];
    
    for (const query of testQueries) {
      const startTime = Date.now();
      const services = await serviceCache.searchServices(query, 1);
      const responseTime = Date.now() - startTime;
      
      results.push({
        query,
        count: services.length,
        responseTime: `${responseTime}ms`,
        performanceTarget: responseTime < 500 ? '✅ PASS' : '❌ FAIL'
      });
    }
    
    const avgResponseTime = results.reduce((sum, r) => sum + parseInt(r.responseTime), 0) / results.length;
    
    res.json({
      success: true,
      testResults: results,
      averageResponseTime: `${avgResponseTime.toFixed(0)}ms`,
      performanceTarget: '< 500ms',
      overallStatus: avgResponseTime < 500 ? '✅ PERFORMANCE TARGET MET' : '❌ PERFORMANCE TARGET MISSED'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;