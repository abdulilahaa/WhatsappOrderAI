import { storage } from './storage.js';
const db = storage.db;
import { servicesRag } from '../shared/schema.js';
import { NailItAPIService } from './nailit-api.js';
import { eq, and, like, or, inArray, sql } from 'drizzle-orm';

interface CachedService {
  serviceId: number;
  name: string;
  description: string;
  keywords: string[];
  category: string;
  durationMinutes: number;
  priceKwd: number;
  locationIds: number[];
  imageUrl?: string;
  itemTypeId: number;
  specialPrice?: number;
  itemId: number;
  itemName: string;
  itemDesc: string;
  isActive: boolean;
  lastUpdatedAt: Date;
}

export class SmartServiceCache {
  private nailItAPI: NailItAPIService;
  private memoryCache: Map<string, CachedService[]> = new Map();
  private lastSyncTime: Date | null = null;
  
  constructor() {
    this.nailItAPI = new NailItAPIService();
  }

  /**
   * Search services ONLY from pre-cached database - NO API calls during search
   */
  async searchServices(query: string, locationId?: number): Promise<CachedService[]> {
    console.log(`🔍 [SmartServiceCache] Searching cached services: "${query}" at location ${locationId}`);
    
    try {
      // Check memory cache first for ultra-fast responses
      const cacheKey = `${query}_${locationId || 'all'}`;
      if (this.memoryCache.has(cacheKey)) {
        console.log(`⚡ [SmartServiceCache] Memory cache hit - instant response`);
        return this.memoryCache.get(cacheKey) || [];
      }
      
      // Search pre-cached database only
      let dbQuery = db.select().from(servicesRag).where(eq(servicesRag.isActive, true));
      
      if (locationId) {
        // Use JSON contains for location filtering
        dbQuery = dbQuery.where(sql`JSON_CONTAINS(${servicesRag.locationIds}, ${locationId.toString()})`);
      }
      
      const allCachedServices = await dbQuery;
      console.log(`📊 [SmartServiceCache] Found ${allCachedServices.length} pre-cached services`);
      
      if (allCachedServices.length === 0) {
        console.log(`⚠️ Cache is empty for location ${locationId} - needs sync`);
        return [];
      }
      
      // Intelligent search with multiple strategies
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);
      const matchingServices = allCachedServices.filter(service => {
        const searchableText = `${service.name} ${service.description} ${service.keywords?.join(' ')} ${service.category}`.toLowerCase();
        
        // Strategy 1: Exact phrase match (highest priority)
        if (searchableText.includes(query.toLowerCase())) return true;
        
        // Strategy 2: All search terms match
        if (searchTerms.every(term => searchableText.includes(term))) return true;
        
        // Strategy 3: Any search term matches (for partial matches)
        return searchTerms.some(term => searchableText.includes(term));
      });
      
      // Score and sort results by relevance
      const scoredResults = matchingServices.map(service => {
        let score = 0;
        const searchableText = `${service.name} ${service.description}`.toLowerCase();
        
        // Higher score for name matches
        if (service.name.toLowerCase().includes(query.toLowerCase())) score += 10;
        
        // Score for keyword matches
        searchTerms.forEach(term => {
          if (service.name.toLowerCase().includes(term)) score += 5;
          if (service.description.toLowerCase().includes(term)) score += 2;
          if (service.keywords.some(kw => kw.includes(term))) score += 3;
        });
        
        return { service, score };
      }).sort((a, b) => b.score - a.score);
      
      // Transform to consistent format
      const results: CachedService[] = scoredResults.slice(0, 12).map(({service}) => ({
        serviceId: service.serviceId,
        name: service.name,
        description: service.description,
        keywords: service.keywords || [],
        category: service.category,
        durationMinutes: service.durationMinutes,
        priceKwd: service.priceKwd,
        locationIds: service.locationIds || [],
        imageUrl: service.imageUrl,
        itemTypeId: service.itemTypeId,
        specialPrice: service.specialPrice,
        itemId: service.itemId,
        itemName: service.itemName,
        itemDesc: service.itemDesc,
        isActive: service.isActive,
        lastUpdatedAt: service.lastUpdatedAt
      }));
      
      // Cache in memory for instant future access
      this.memoryCache.set(cacheKey, results);
      
      console.log(`✅ [SmartServiceCache] Instant search complete - ${results.length} relevant services`);
      return results;
      
    } catch (error) {
      console.error(`❌ [SmartServiceCache] Search error:`, error);
      return [];
    }
  }

  /**
   * Full sync of ALL services across ALL pages (background operation)
   */
  async fullSyncAllLocations(): Promise<void> {
    console.log(`🔄 [SmartServiceCache] Starting full sync of all locations...`);
    
    const locations = [1, 52, 53]; // Al-Plaza Mall, Zahra Complex, Arraya Mall
    
    for (const locationId of locations) {
      await this.syncServicesForLocation(locationId);
    }
    
    console.log(`✅ [SmartServiceCache] Full sync completed for all locations`);
  }

  /**
   * Sync services for a specific location - FULL PAGINATION HANDLING
   */
  async syncServicesForLocation(locationId: number): Promise<void> {
    console.log(`🔄 [SmartServiceCache] Full sync for location ${locationId}...`);
    
    try {
      const currentDate = this.nailItAPI.formatDateForAPI(new Date());
      
      // Get first page to determine total pagination needs  
      const firstPage = await this.nailItAPI.getItemsByDate({
        itemTypeId: 2,
        groupId: 0,
        selectedDate: currentDate,
        pageNo: 1,
        locationIds: [locationId]
      });
      
      const totalItems = firstPage.totalItems || 378;
      const itemsPerPage = 20;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      
      console.log(`📊 [SmartServiceCache] Syncing ALL ${totalPages} pages (${totalItems} items) for location ${locationId}`);
      
      // Collect ALL items across ALL pages
      let allItems = [...(firstPage.items || [])];
      
      // Fetch ALL remaining pages
      for (let page = 2; page <= totalPages; page++) {
        try {
          const pageResult = await this.nailItAPI.getItemsByDate({
            itemTypeId: 2,
            groupId: 0,
            selectedDate: currentDate,
            pageNo: page,
            locationIds: [locationId]
          });
          allItems.push(...(pageResult.items || []));
          
          // Add small delay to avoid overwhelming API
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (pageError) {
          console.error(`Error fetching page ${page}:`, pageError);
        }
      }
      
      console.log(`📦 [SmartServiceCache] Collected ${allItems.length} total items from ${totalPages} pages`);
      
      // Transform ALL items for caching
      const servicesToCache = allItems.map(item => ({
        serviceId: item.Item_Id,
        name: item.Item_Name,
        description: item.Item_Desc?.replace(/<[^>]*>/g, '') || '',
        keywords: this.extractKeywords(item.Item_Name, item.Item_Desc),
        category: this.categorizeService(item.Item_Name),
        durationMinutes: parseInt(item.Duration?.toString() || '60'),
        priceKwd: item.Special_Price > 0 ? item.Special_Price : item.Primary_Price,
        locationIds: Array.isArray(item.Location_Ids) ? item.Location_Ids : [locationId],
        imageUrl: item.Image_Url || null,
        itemTypeId: item.Item_Type_Id,
        specialPrice: item.Special_Price > 0 ? item.Special_Price : null,
        itemId: item.Item_Id,
        itemName: item.Item_Name,
        itemDesc: item.Item_Desc || '',
        isActive: true,
        lastUpdatedAt: new Date()
      }));
      
      // Clear existing cache for this location and insert ALL new data
      await db.delete(servicesRag).where(sql`JSON_CONTAINS(${servicesRag.locationIds}, ${locationId.toString()})`);
      
      if (servicesToCache.length > 0) {
        // Insert in batches to handle large datasets
        const batchSize = 50;
        for (let i = 0; i < servicesToCache.length; i += batchSize) {
          const batch = servicesToCache.slice(i, i + batchSize);
          await db.insert(servicesRag).values(batch);
        }
      }
      
      // Clear memory cache to force fresh data
      this.memoryCache.clear();
      this.lastSyncTime = new Date();
      
      console.log(`✅ [SmartServiceCache] Successfully cached ${servicesToCache.length} services for location ${locationId}`);
      
    } catch (error) {
      console.error(`❌ [SmartServiceCache] Sync error for location ${locationId}:`, error);
      throw error;
    }
  }

  /**
   * Extract intelligent keywords for better search matching
   */
  private extractKeywords(name: string, description?: string): string[] {
    const text = `${name} ${description || ''}`.toLowerCase();
    const keywords = new Set<string>();
    
    // Beauty service patterns with variations
    const patterns = [
      // Nail services
      ['nail', 'nails'], ['manicure', 'mani'], ['pedicure', 'pedi'], 
      ['polish', 'lacquer'], ['gel', 'shellac'], ['french', 'classic'],
      ['acrylic', 'tips'], ['chrome', 'mirror'], ['art', 'design'],
      
      // Hair services  
      ['hair', 'hairstyle'], ['cut', 'cutting', 'trim'], ['style', 'styling'],
      ['color', 'coloring', 'dye'], ['treatment', 'therapy'], ['blow', 'blowdry'],
      ['curl', 'wave'], ['straight', 'rebonding'], ['highlight', 'lowlight'],
      
      // Facial services
      ['facial', 'face'], ['skin', 'skincare'], ['cleansing', 'cleanse'], 
      ['hydra', 'hydrating'], ['anti-aging', 'antiaging'], ['peeling', 'peel'],
      ['mask', 'masque'], ['extraction', 'cleanup'],
      
      // Body services
      ['massage', 'therapy'], ['body', 'full-body'], ['spa', 'wellness'], 
      ['relax', 'relaxing'], ['aromatherapy', 'aroma'], ['hot-stone', 'stone'],
      ['deep-tissue', 'tissue'], ['swedish', 'therapeutic'],
      
      // Waxing services (Brazilian is a waxing service)
      ['wax', 'waxing'], ['brazilian', 'bikini'], ['full-body', 'body'],
      ['legs', 'arms'], ['underarm', 'facial-hair']
    ];
    
    patterns.forEach(patternGroup => {
      patternGroup.forEach(pattern => {
        if (text.includes(pattern)) {
          keywords.add(pattern);
        }
      });
    });
    
    return Array.from(keywords);
  }

  /**
   * Categorize service with business context awareness
   */
  private categorizeService(itemName: string): string {
    const name = itemName.toLowerCase();
    
    // Primary nail salon services (main business focus)
    if (name.includes('nail') || name.includes('manicure') || name.includes('pedicure') || 
        name.includes('polish') || name.includes('gel') || name.includes('french')) {
      return 'Nail Services';
    }
    
    // Hair services
    if (name.includes('hair') || name.includes('cut') || name.includes('style') || 
        name.includes('color') || name.includes('treatment') || name.includes('blow')) {
      return 'Hair Services';
    }
    
    // Facial services  
    if (name.includes('facial') || name.includes('face') || name.includes('skin') || 
        name.includes('hydra') || name.includes('cleansing')) {
      return 'Facial Services';
    }
    
    // Body/Spa services including waxing
    if (name.includes('massage') || name.includes('body') || name.includes('spa') || 
        name.includes('relax') || name.includes('therapy') || name.includes('wax') ||
        name.includes('brazilian')) {
      return 'Body Services';
    }
    
    // Event packages
    if (name.includes('event') || name.includes('party') || name.includes('package')) {
      return 'Event Packages';
    }
    
    return 'Beauty Services';
  }

  /**
   * Get comprehensive cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      const allCached = await db.select().from(servicesRag);
      const byLocation = allCached.reduce((acc, service) => {
        (service.locationIds || []).forEach(locId => {
          acc[locId] = (acc[locId] || 0) + 1;
        });
        return acc;
      }, {} as Record<number, number>);
      
      const byCategory = allCached.reduce((acc, service) => {
        acc[service.category] = (acc[service.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        totalServices: allCached.length,
        byLocation: {
          1: byLocation[1] || 0,    // Al-Plaza Mall
          52: byLocation[52] || 0,  // Zahra Complex  
          53: byLocation[53] || 0   // Arraya Mall
        },
        byCategory,
        lastSyncTime: this.lastSyncTime,
        memoryCacheSize: this.memoryCache.size,
        oldestService: allCached.length > 0 ? Math.min(...allCached.map(s => s.lastUpdatedAt.getTime())) : null,
        newestService: allCached.length > 0 ? Math.max(...allCached.map(s => s.lastUpdatedAt.getTime())) : null
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { error: error.message };
    }
  }
}