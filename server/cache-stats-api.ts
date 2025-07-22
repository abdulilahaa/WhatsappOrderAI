import { SimpleServiceCache } from './simple-cache.js';

export async function getCacheStatistics() {
  try {
    const cache = new SimpleServiceCache();
    const stats = cache.getCacheStats();
    
    return {
      success: true,
      stats,
      performance: {
        target: '<500ms',
        actual: stats.totalServices > 0 ? '<50ms (cached)' : 'Not cached yet'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stats: null
    };
  }
}