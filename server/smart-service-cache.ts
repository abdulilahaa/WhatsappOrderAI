/**
 * Smart Service Cache - Optimized service storage for ReAct Orchestration
 * Implements the recommended service storage structure for <500ms responses
 */

import { nailItAPI } from './nailit-api.js';
import { IStorage } from './storage.js';

export class SmartServiceCache {
  private storage: IStorage;
  private cache = new Map<string, any[]>();

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Get services for location with <500ms response time
   */
  async getServicesForLocation(locationId: number, category?: string): Promise<any[]> {
    const cacheKey = `${locationId}_${category || 'all'}`;
    
    // Memory cache first (fastest)
    if (this.cache.has(cacheKey)) {
      console.log(`⚡ Memory cache hit: ${this.cache.get(cacheKey)!.length} services`);
      return this.cache.get(cacheKey)!;
    }

    // Database cache second (fast)
    const cachedServices = await this.storage.getCachedServices(locationId, category);
    if (cachedServices.length > 0) {
      console.log(`💾 Database cache hit: ${cachedServices.length} services for location ${locationId}`);
      this.cache.set(cacheKey, cachedServices);
      return cachedServices;
    }

    // Fallback: sync from NailIt API and cache
    console.log(`🔄 Cache miss - syncing from NailIt API for location ${locationId}`);
    await this.syncLocationServices(locationId);
    
    const freshServices = await this.storage.getCachedServices(locationId, category);
    this.cache.set(cacheKey, freshServices);
    return freshServices;
  }

  /**
   * Search services by keywords with intelligent matching
   */
  async searchServices(query: string, locationId?: number): Promise<any[]> {
    const keywords = this.extractKeywords(query);
    console.log(`🔍 Searching for keywords: ${keywords.join(', ')}`);
    
    return await this.storage.searchServicesByKeywords(keywords, locationId);
  }

  /**
   * Sync services from NailIt API for a specific location
   */
  async syncLocationServices(locationId: number): Promise<number> {
    const currentDate = nailItAPI.formatDateForAPI(new Date());
    let allServices: any[] = [];
    let syncedCount = 0;

    console.log(`📡 Starting sync for location ${locationId}`);

    // Fetch all pages from NailIt API
    for (let page = 1; page <= 19; page++) {
      try {
        const response = await nailItAPI.getItemsByDate({
          itemTypeId: 2,
          groupId: 0,
          selectedDate: currentDate,
          pageNo: page,
          locationIds: [locationId]
        });

        if (response.items && response.items.length > 0) {
          allServices = allServices.concat(response.items);
          console.log(`📄 Page ${page}: ${response.items.length} services`);
        } else {
          break;
        }
      } catch (error) {
        console.log(`⚠️ Page ${page} error: ${error}, stopping`);
        break;
      }
    }

    console.log(`📊 Total fetched: ${allServices.length} services`);

    // Process and cache each service
    for (const service of allServices) {
      try {
        const processedService = this.processNailItService(service, locationId);
        await this.storage.upsertService(processedService);
        syncedCount++;
      } catch (error) {
        console.error(`Failed to cache service ${service.Item_Id}:`, error);
      }
    }

    // Clear memory cache to force refresh
    this.clearMemoryCache();

    console.log(`✅ Synced ${syncedCount} services for location ${locationId}`);
    return syncedCount;
  }

  /**
   * Process NailIt API service into optimized storage format
   */
  private processNailItService(service: any, locationId: number): any {
    const name = service.Item_Name?.trim() || 'Service';
    const description = service.Item_Desc?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() || '';
    
    return {
      serviceId: service.Item_Id,
      name: name,
      description: description,
      keywords: this.generateKeywords(name, description),
      category: this.categorizeService(name, description),
      durationMinutes: service.Duration || 60,
      priceKwd: service.Special_Price > 0 ? service.Special_Price : service.Primary_Price,
      locationIds: Array.isArray(service.Location_Ids) ? service.Location_Ids : [locationId],
      isActive: true,
      imageUrl: service.Image_Url || null,
      itemTypeId: 2,
      groupId: service.Group_Id || 0,
      lastUpdatedAt: new Date()
    };
  }

  /**
   * Generate keywords for intelligent search
   */
  private generateKeywords(name: string, description: string): string[] {
    const text = `${name} ${description}`.toLowerCase();
    const keywords = [];

    // Nail service keywords
    if (text.includes('nail') || text.includes('manicure') || text.includes('pedicure')) {
      keywords.push('nail', 'manicure', 'pedicure');
    }
    if (text.includes('gel') || text.includes('polish')) {
      keywords.push('gel', 'polish');
    }
    if (text.includes('french') || text.includes('chrome')) {
      keywords.push('french', 'chrome');
    }
    if (text.includes('acrylic') || text.includes('extension')) {
      keywords.push('acrylic', 'extension');
    }

    // Hair service keywords
    if (text.includes('hair') || text.includes('scalp')) {
      keywords.push('hair', 'scalp');
    }
    if (text.includes('oily') || text.includes('dry')) {
      keywords.push('oily', 'dry');
    }
    if (text.includes('treatment') || text.includes('therapy')) {
      keywords.push('treatment', 'therapy');
    }

    // Facial service keywords
    if (text.includes('facial') || text.includes('face')) {
      keywords.push('facial', 'face');
    }
    if (text.includes('hydra') || text.includes('cleansing')) {
      keywords.push('hydra', 'cleansing');
    }

    // Problem-based keywords
    if (text.includes('growth') || text.includes('loss')) {
      keywords.push('growth', 'loss');
    }
    if (text.includes('damage') || text.includes('repair')) {
      keywords.push('damage', 'repair');
    }

    return Array.from(new Set(keywords));
  }

  /**
   * Categorize service for filtering
   */
  private categorizeService(name: string, description: string): string {
    const text = `${name} ${description}`.toLowerCase();

    if (text.includes('nail') || text.includes('manicure') || text.includes('pedicure') || 
        text.includes('gel') || text.includes('polish') || text.includes('french') || 
        text.includes('chrome') || text.includes('acrylic')) {
      return 'Nails';
    }

    if (text.includes('hair') || text.includes('scalp') || text.includes('treatment') ||
        text.includes('blowout') || text.includes('style')) {
      return 'Hair';
    }

    if (text.includes('facial') || text.includes('face') || text.includes('skin') ||
        text.includes('hydra') || text.includes('cleansing')) {
      return 'Facial';
    }

    if (text.includes('massage') || text.includes('body') || text.includes('relax')) {
      return 'Body';
    }

    return 'Beauty';
  }

  /**
   * Extract keywords from user query
   */
  private extractKeywords(query: string): string[] {
    const normalized = query.toLowerCase();
    const keywords = [];

    // Direct keyword mapping
    const keywordMap = {
      'nail': ['nail', 'nails'],
      'manicure': ['manicure', 'mani'],
      'pedicure': ['pedicure', 'pedi'],
      'hair': ['hair', 'scalp'],
      'facial': ['facial', 'face'],
      'oily': ['oily', 'greasy'],
      'dry': ['dry', 'damaged'],
      'growth': ['growth', 'loss', 'thinning'],
      'gel': ['gel', 'polish'],
      'french': ['french', 'classic'],
      'chrome': ['chrome', 'mirror']
    };

    for (const [keyword, variants] of Object.entries(keywordMap)) {
      if (variants.some(variant => normalized.includes(variant))) {
        keywords.push(keyword);
      }
    }

    // Add words from query
    const words = normalized.split(' ').filter(word => word.length > 2);
    keywords.push(...words);

    return Array.from(new Set(keywords));
  }

  /**
   * Clear memory cache
   */
  clearMemoryCache(): void {
    this.cache.clear();
    console.log('🧹 Memory cache cleared');
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    const totalServices = await this.storage.getCachedServices();
    const byLocation = {
      1: await this.storage.getCachedServices(1),
      52: await this.storage.getCachedServices(52),
      53: await this.storage.getCachedServices(53)
    };

    return {
      totalCached: totalServices.length,
      byLocation: {
        'Al-Plaza Mall': byLocation[1].length,
        'Zahra Complex': byLocation[52].length,
        'Arraya Mall': byLocation[53].length
      },
      memoryCache: this.cache.size,
      categories: this.groupByCategory(totalServices)
    };
  }

  private groupByCategory(services: any[]): any {
    const categories = {};
    services.forEach(service => {
      const cat = service.category || 'Other';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return categories;
  }
}