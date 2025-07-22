/**
 * Cache Testing Routes - Comprehensive cache validation and population
 */

import { Router } from 'express';
import { populateAllLocationServices, verifyAIAgentCache } from './cache-population.js';

const router = Router();

/**
 * Populate ALL services across all locations
 */
router.post('/populate-all', async (req, res) => {
  try {
    console.log('🚀 Starting comprehensive cache population...');
    const result = await populateAllLocationServices();
    
    res.json({
      success: result.success,
      message: `Populated ${result.totalSynced} total services across all locations`,
      results: result.results,
      totalSynced: result.totalSynced
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Verify AI Agent can use cache properly
 */
router.get('/verify-ai-cache', async (req, res) => {
  try {
    const verification = await verifyAIAgentCache();
    
    res.json({
      success: verification.canAccessCache,
      message: verification.canAccessCache 
        ? `✅ AI Agent cache access verified - ${verification.performance}`
        : '❌ AI Agent cannot access cache properly',
      verification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;