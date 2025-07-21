// RAG Search Service - Fast local service discovery and intelligent matching
// Provides instant service search without external API calls

import { db } from './db';
import { nailItServices, nailItLocations, nailItStaff, nailItPaymentTypes } from '../shared/schema';
import { eq, like, and, sql, inArray, or } from 'drizzle-orm';

interface ServiceSearchResult {
  itemId: number;
  itemName: string;
  itemDesc: string | null;
  primaryPrice: string;

  durationMinutes: number | null;
  categoryTags: string[];
  locationIds: number[];
  imageUrl: string | null;
  matchScore: number;
}

interface SearchFilters {
  locationId?: number;
  maxPrice?: number;
  maxDuration?: number;
  categoryTags?: string[];
}

interface LocationData {
  locationId: number;
  locationName: string;
  address: string | null;
  fromTime: string | null;
  toTime: string | null;
  workingDays: string | null;
}

interface StaffAvailability {
  staffId: number;
  staffName: string;
  locationId: number;
  qualifiedServices: number[];
  isAvailable: boolean;
  nextAvailableTime?: string;
}

class RAGSearchService {
  
  /**
   * Fast service search using local database
   */
  async searchServices(
    query: string, 
    filters: SearchFilters = {}, 
    limit: number = 10
  ): Promise<ServiceSearchResult[]> {
    try {
      const searchTerms = this.normalizeSearchQuery(query);
      
      if (searchTerms.length === 0) {
        return this.getPopularServices(filters, limit);
      }

      // Build search conditions
      const searchConditions = [];
      
      // Location filter
      if (filters.locationId) {
        searchConditions.push(
          sql`${nailItServices.locationIds} @> ${JSON.stringify([filters.locationId])}`
        );
      }
      
      // Price filter
      if (filters.maxPrice) {
        searchConditions.push(
          sql`CAST(${nailItServices.primaryPrice} AS DECIMAL) <= ${filters.maxPrice}`
        );
      }
      
      // Duration filter
      if (filters.maxDuration) {
        searchConditions.push(
          sql`${nailItServices.durationMinutes} <= ${filters.maxDuration}`
        );
      }
      
      // Active services only
      searchConditions.push(eq(nailItServices.isEnabled, true));

      // Perform search with ranking
      const searchResults = await db
        .select({
          itemId: nailItServices.itemId,
          itemName: nailItServices.itemName,
          itemDesc: nailItServices.itemDesc,
          primaryPrice: nailItServices.primaryPrice,
          durationMinutes: nailItServices.durationMinutes,
          locationIds: nailItServices.locationIds,
          categoryTags: nailItServices.categoryTags
        })
        .from(nailItServices)
        .where(
          searchConditions.length > 0 
            ? and(...searchConditions)
            : eq(nailItServices.isEnabled, true)
        )
        .limit(limit * 3); // Get more results for scoring

      // Score and rank results
      const scoredResults = searchResults
        .map(service => ({
          ...service,
          matchScore: this.calculateMatchScore(service, searchTerms),
        }))
        .filter(result => result.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);

      return scoredResults.map(service => ({
        itemId: service.itemId,
        itemName: service.itemName,
        itemDesc: service.itemDesc,
        primaryPrice: service.primaryPrice,
        durationMinutes: service.durationMinutes,
        categoryTags: Array.isArray(service.categoryTags) ? service.categoryTags : [],
        locationIds: Array.isArray(service.locationIds) ? service.locationIds : [],
        imageUrl: '',
        matchScore: service.matchScore,
      }));

    } catch (error) {
      console.error('Service search error:', error);
      return [];
    }
  }

  /**
   * Get services by location for location-based browsing
   */
  async getServicesByLocation(locationId: number, limit: number = 20): Promise<ServiceSearchResult[]> {
    try {
      const services = await db
        .select()
        .from(nailItServices)
        .where(
          and(
            sql`${nailItServices.locationIds} @> ${JSON.stringify([locationId])}`,
            eq(nailItServices.isEnabled, true)
          )
        )
        .orderBy(sql`CAST(${nailItServices.primaryPrice} AS DECIMAL) ASC`)
        .limit(limit);

      return services.map(service => ({
        itemId: service.itemId,
        itemName: service.itemName,
        itemDesc: service.itemDesc,
        primaryPrice: service.primaryPrice,
        durationMinutes: service.durationMinutes,
        categoryTags: Array.isArray(service.categoryTags) ? service.categoryTags : [],
        locationIds: Array.isArray(service.locationIds) ? service.locationIds : [],
        imageUrl: '',
        matchScore: 100,
      }));

    } catch (error) {
      console.error('Location services error:', error);
      return [];
    }
  }

  /**
   * Get popular services when no specific search query
   */
  async getPopularServices(filters: SearchFilters = {}, limit: number = 10): Promise<ServiceSearchResult[]> {
    try {
      const conditions = [eq(nailItServices.isEnabled, true)];
      
      if (filters.locationId) {
        conditions.push(
          sql`${nailItServices.locationIds} @> ${JSON.stringify([filters.locationId])}`
        );
      }

      // Get popular hair and beauty services
      const popularServices = await db
        .select({
          itemId: nailItServices.itemId,
          itemName: nailItServices.itemName,
          itemDesc: nailItServices.itemDesc,
          primaryPrice: nailItServices.primaryPrice,
          durationMinutes: nailItServices.durationMinutes,
          locationIds: nailItServices.locationIds,
          categoryTags: nailItServices.categoryTags
        })
        .from(nailItServices)
        .where(and(...conditions))
        .orderBy(sql`CAST(${nailItServices.primaryPrice} AS DECIMAL) ASC`)
        .limit(limit);

      return popularServices.map(service => ({
        itemId: service.itemId,
        itemName: service.itemName,
        itemDesc: service.itemDesc,
        primaryPrice: service.primaryPrice,
        durationMinutes: service.durationMinutes,
        categoryTags: Array.isArray(service.categoryTags) ? service.categoryTags : [],
        locationIds: Array.isArray(service.locationIds) ? service.locationIds : [],
        imageUrl: '',
        matchScore: 80,
      }));

    } catch (error) {
      console.error('Popular services error:', error);
      return [];
    }
  }

  /**
   * Get all locations from local database
   */
  async getAllLocations(): Promise<LocationData[]> {
    try {
      const locations = await db
        .select()
        .from(nailItLocations)
        .where(eq(nailItLocations.isActive, true))
        .orderBy(nailItLocations.locationName);

      return locations.map(location => ({
        locationId: location.id,
        locationName: location.locationName,
        address: location.address,
        fromTime: location.fromTime,
        toTime: location.toTime,
        workingDays: location.workingDays,
      }));

    } catch (error) {
      console.error('Locations error:', error);
      return [];
    }
  }

  /**
   * Get payment types from local database
   */
  async getPaymentTypes() {
    try {
      const paymentTypes = await db
        .select()
        .from(nailItPaymentTypes)
        .where(eq(nailItPaymentTypes.isEnabled, true))
        .orderBy(nailItPaymentTypes.nailitId);

      return {
        success: true,
        paymentTypes: paymentTypes.map(pt => ({
          Payment_Type_Id: pt.nailitId,
          Payment_Type_Name: pt.paymentTypeName,
          Payment_Type_Code: pt.paymentTypeCode,
          Is_Enabled: pt.isEnabled,
          Image_URL: pt.imageUrl,
        }))
      };

    } catch (error) {
      console.error('Payment types error:', error);
      return {
        success: false,
        paymentTypes: []
      };
    }
  }

  /**
   * Get staff by location with service qualifications
   */
  async getStaffByLocation(locationId: number): Promise<StaffAvailability[]> {
    try {
      const staff = await db
        .select()
        .from(nailItStaff)
        .where(
          and(
            eq(nailItStaff.nailitLocationId, locationId),
            eq(nailItStaff.isActive, true)
          )
        )
        .orderBy(nailItStaff.staffName);

      return staff.map(member => ({
        staffId: member.staffId,
        staffName: member.staffName,
        locationId: member.nailitLocationId,
        qualifiedServices: [], // Will be populated with real-time data
        isAvailable: true, // Will be checked in real-time
      }));

    } catch (error) {
      console.error('Staff by location error:', error);
      return [];
    }
  }

  /**
   * Get service by ID from local database
   */
  async getServiceById(itemId: number): Promise<ServiceSearchResult | null> {
    try {
      const service = await db
        .select()
        .from(nailItServices)
        .where(
          and(
            eq(nailItServices.itemId, itemId),
            eq(nailItServices.isEnabled, true)
          )
        )
        .limit(1);

      if (service.length === 0) return null;

      const result = service[0];
      return {
        itemId: result.itemId,
        itemName: result.itemName,
        itemDesc: result.itemDesc,
        primaryPrice: result.primaryPrice,

        durationMinutes: result.durationMinutes,
        categoryTags: Array.isArray(result.categoryTags) ? result.categoryTags : [],
        locationIds: Array.isArray(result.locationIds) ? result.locationIds : [],
        imageUrl: result.imageUrl,
        matchScore: 100,
      };

    } catch (error) {
      console.error('Service by ID error:', error);
      return null;
    }
  }

  /**
   * Calculate match score for search ranking
   */
  private calculateMatchScore(service: any, searchTerms: string[]): number {
    let score = 0;
    const serviceName = (service.itemName || '').toLowerCase();
    const serviceDesc = (service.itemDesc || '').toLowerCase();
    const serviceKeywords = (service.searchKeywords || '').toLowerCase();
    
    // Exact name match (highest score)
    if (searchTerms.some(term => serviceName.includes(term))) {
      score += 100;
    }
    
    // Keyword match
    if (searchTerms.some(term => serviceKeywords.includes(term))) {
      score += 80;
    }
    
    // Description match
    if (searchTerms.some(term => serviceDesc.includes(term))) {
      score += 60;
    }
    
    // Partial matches
    searchTerms.forEach(term => {
      if (serviceName.includes(term.substring(0, 4))) {
        score += 40;
      }
    });
    
    // Category tag bonus
    if (service.categoryTags && Array.isArray(service.categoryTags)) {
      const hasRelevantCategory = service.categoryTags.some((tag: string) =>
        searchTerms.some(term => tag.toLowerCase().includes(term))
      );
      if (hasRelevantCategory) {
        score += 30;
      }
    }
    
    return score;
  }

  /**
   * Normalize search query for better matching
   */
  private normalizeSearchQuery(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
      .slice(0, 5); // Limit to 5 terms for performance
  }

  /**
   * Check if local data is available and recent
   */
  async isDataAvailable(): Promise<boolean> {
    try {
      const serviceCount = await db
        .select({ count: sql`count(*)` })
        .from(nailItServices)
        .where(eq(nailItServices.isEnabled, true));
      
      const locationCount = await db
        .select({ count: sql`count(*)` })
        .from(nailItLocations)
        .where(eq(nailItLocations.isActive, true));

      return (
        parseInt(serviceCount[0]?.count?.toString() || '0') > 50 &&
        parseInt(locationCount[0]?.count?.toString() || '0') > 0
      );

    } catch (error) {
      console.error('Data availability check error:', error);
      return false;
    }
  }
}

export const ragSearchService = new RAGSearchService();