/**
 * Enhanced Service Mapping with Fuzzy Matching and Comprehensive Logging
 * Addresses Audit Finding: "Service name to ID mapping is not reliable. Add fuzzy matching and logging."
 */

export interface ServiceMatch {
  serviceId: number;
  serviceName: string;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'synonym' | 'keyword';
  originalInput: string;
  price?: number;
  locationId?: number;
}

export interface ServiceMappingResult {
  matches: ServiceMatch[];
  bestMatch: ServiceMatch | null;
  confidence: number;
  logData: {
    originalInput: string;
    searchTerms: string[];
    totalCandidates: number;
    processingTimeMs: number;
    mappingStrategy: string;
  };
}

export class EnhancedServiceMapper {
  private static synonymMap: { [key: string]: string[] } = {
    // Nail services synonyms
    'manicure': ['mani', 'nail treatment', 'nail care', 'fingernails'],
    'pedicure': ['pedi', 'foot treatment', 'toe nails', 'feet care'],
    'french': ['french manicure', 'french nails', 'white tips'],
    'gel': ['gel polish', 'gel nails', 'shellac'],
    'acrylic': ['fake nails', 'artificial nails', 'extensions'],
    
    // Hair services synonyms  
    'hair': ['hairstyle', 'haircut', 'hair treatment'],
    'color': ['coloring', 'dye', 'highlights', 'tint'],
    'treatment': ['therapy', 'conditioning', 'mask'],
    'keratin': ['smoothing', 'straightening'],
    
    // Facial services synonyms
    'facial': ['face treatment', 'skin care', 'cleansing'],
    'hydrafacial': ['hydra facial', 'hydro facial'],
    'cleanup': ['deep cleansing', 'pore cleaning'],
    
    // Body services synonyms
    'massage': ['body massage', 'relaxation'],
    'waxing': ['hair removal', 'brazilian', 'bikini'],
    'scrub': ['exfoliation', 'body scrub']
  };

  private static problemKeywords: { [key: string]: string[] } = {
    'oily_scalp': ['oily scalp', 'greasy hair', 'oily hair', 'scalp problems'],
    'dry_hair': ['dry hair', 'damaged hair', 'brittle hair', 'hair damage'],
    'dandruff': ['dandruff', 'itchy scalp', 'flaky scalp'],
    'hair_fall': ['hair fall', 'hair loss', 'thinning hair'],
    'acne': ['acne', 'pimples', 'breakouts', 'skin problems'],
    'dark_circles': ['dark circles', 'under eye', 'tired eyes'],
    'dry_skin': ['dry skin', 'dehydrated skin', 'flaky skin']
  };

  /**
   * Enhanced service mapping with fuzzy matching and comprehensive logging
   */
  static async mapUserInputToServices(
    userInput: string,
    availableServices: any[],
    conversationId?: number,
    customerId?: number
  ): Promise<ServiceMappingResult> {
    const startTime = Date.now();
    
    console.log('🎯 SERVICE MAPPING START:', {
      userInput,
      conversationId,
      customerId,
      availableServices: availableServices.length
    });

    const searchTerms = this.extractSearchTerms(userInput);
    const allMatches: ServiceMatch[] = [];

    // Strategy 1: Exact name matching
    const exactMatches = this.findExactMatches(userInput, searchTerms, availableServices);
    allMatches.push(...exactMatches);

    // Strategy 2: Fuzzy string matching using Levenshtein distance
    const fuzzyMatches = this.findFuzzyMatches(userInput, searchTerms, availableServices);
    allMatches.push(...fuzzyMatches);

    // Strategy 3: Synonym-based matching
    const synonymMatches = this.findSynonymMatches(searchTerms, availableServices);
    allMatches.push(...synonymMatches);

    // Strategy 4: Problem-based matching (e.g., "oily scalp" → hair treatments)
    const problemMatches = this.findProblemBasedMatches(userInput, availableServices);
    allMatches.push(...problemMatches);

    // Remove duplicates and sort by confidence
    const uniqueMatches = this.deduplicateAndSort(allMatches);
    const bestMatch = uniqueMatches.length > 0 ? uniqueMatches[0] : null;
    const confidence = bestMatch ? bestMatch.confidence : 0;

    const processingTime = Date.now() - startTime;

    // Comprehensive logging for transparency
    const logData = {
      originalInput: userInput,
      searchTerms,
      totalCandidates: availableServices.length,
      processingTimeMs: processingTime,
      mappingStrategy: this.determineMappingStrategy(uniqueMatches)
    };

    console.log('📊 SERVICE MAPPING RESULT:', {
      ...logData,
      matchesFound: uniqueMatches.length,
      bestMatch: bestMatch ? {
        name: bestMatch.serviceName,
        confidence: bestMatch.confidence,
        type: bestMatch.matchType
      } : null,
      allMatches: uniqueMatches.map(m => ({
        name: m.serviceName,
        confidence: m.confidence,
        type: m.matchType
      }))
    });

    // Log specific mapping for audit trail
    if (bestMatch) {
      console.log(`✅ SERVICE MAPPED: "${userInput}" → Service ID ${bestMatch.serviceId} (${bestMatch.serviceName}) with ${Math.round(bestMatch.confidence * 100)}% confidence via ${bestMatch.matchType} matching`);
    } else {
      console.log(`❌ NO SERVICE MATCH: "${userInput}" could not be mapped to any service from ${availableServices.length} candidates`);
    }

    return {
      matches: uniqueMatches,
      bestMatch,
      confidence,
      logData
    };
  }

  private static extractSearchTerms(userInput: string): string[] {
    const normalized = userInput.toLowerCase().trim();
    
    // Extract individual words, filtering out common stop words
    const stopWords = ['i', 'want', 'need', 'book', 'appointment', 'for', 'my', 'a', 'an', 'the', 'with', 'and', 'or'];
    const words = normalized.split(/\s+/).filter(word => 
      word.length > 2 && !stopWords.includes(word)
    );
    
    // Also extract multi-word phrases
    const phrases = this.extractPhrases(normalized);
    
    return [...words, ...phrases];
  }

  private static extractPhrases(input: string): string[] {
    const phrases = [];
    
    // Common service phrases
    const servicePatterns = [
      /french manicure/g,
      /gel polish/g,
      /hair treatment/g,
      /nail art/g,
      /deep cleansing/g,
      /body massage/g
    ];
    
    for (const pattern of servicePatterns) {
      const matches = input.match(pattern);
      if (matches) {
        phrases.push(...matches);
      }
    }
    
    return phrases;
  }

  private static findExactMatches(userInput: string, searchTerms: string[], services: any[]): ServiceMatch[] {
    const matches: ServiceMatch[] = [];
    const normalized = userInput.toLowerCase();
    
    for (const service of services) {
      const serviceName = (service.Item_Name || service.name || '').toLowerCase();
      const serviceDesc = (service.Item_Desc || service.description || '').toLowerCase();
      
      // Exact name match
      if (serviceName.includes(normalized) || normalized.includes(serviceName)) {
        matches.push({
          serviceId: service.Item_Id || service.id,
          serviceName: service.Item_Name || service.name,
          confidence: 1.0,
          matchType: 'exact',
          originalInput: userInput,
          price: service.Price || service.price,
          locationId: service.Location_Id || service.locationId
        });
      }
      
      // Exact term matches in name or description
      for (const term of searchTerms) {
        if (serviceName.includes(term) || serviceDesc.includes(term)) {
          matches.push({
            serviceId: service.Item_Id || service.id,
            serviceName: service.Item_Name || service.name,
            confidence: 0.9,
            matchType: 'exact',
            originalInput: userInput,
            price: service.Price || service.price,
            locationId: service.Location_Id || service.locationId
          });
        }
      }
    }
    
    return matches;
  }

  private static findFuzzyMatches(userInput: string, searchTerms: string[], services: any[]): ServiceMatch[] {
    const matches: ServiceMatch[] = [];
    
    for (const service of services) {
      const serviceName = (service.Item_Name || service.name || '').toLowerCase();
      
      // Levenshtein distance-based fuzzy matching
      for (const term of searchTerms) {
        const distance = this.levenshteinDistance(term, serviceName);
        const maxLength = Math.max(term.length, serviceName.length);
        const similarity = 1 - (distance / maxLength);
        
        // Accept matches with >70% similarity and minimum 2-character tolerance
        if (similarity > 0.7 && distance <= 2) {
          matches.push({
            serviceId: service.Item_Id || service.id,
            serviceName: service.Item_Name || service.name,
            confidence: similarity * 0.8, // Slightly lower confidence for fuzzy matches
            matchType: 'fuzzy',
            originalInput: userInput,
            price: service.Price || service.price,
            locationId: service.Location_Id || service.locationId
          });
        }
      }
    }
    
    return matches;
  }

  private static findSynonymMatches(searchTerms: string[], services: any[]): ServiceMatch[] {
    const matches: ServiceMatch[] = [];
    
    for (const term of searchTerms) {
      for (const [baseWord, synonyms] of Object.entries(this.synonymMap)) {
        if (synonyms.includes(term) || term.includes(baseWord)) {
          // Find services that match the base word or its synonyms
          for (const service of services) {
            const serviceName = (service.Item_Name || service.name || '').toLowerCase();
            const serviceDesc = (service.Item_Desc || service.description || '').toLowerCase();
            
            if (serviceName.includes(baseWord) || serviceDesc.includes(baseWord)) {
              matches.push({
                serviceId: service.Item_Id || service.id,
                serviceName: service.Item_Name || service.name,
                confidence: 0.85,
                matchType: 'synonym',
                originalInput: term,
                price: service.Price || service.price,
                locationId: service.Location_Id || service.locationId
              });
            }
          }
        }
      }
    }
    
    return matches;
  }

  private static findProblemBasedMatches(userInput: string, services: any[]): ServiceMatch[] {
    const matches: ServiceMatch[] = [];
    const normalized = userInput.toLowerCase();
    
    for (const [problem, keywords] of Object.entries(this.problemKeywords)) {
      for (const keyword of keywords) {
        if (normalized.includes(keyword)) {
          // Map problems to relevant service categories
          const relevantServices = this.getServicesForProblem(problem, services);
          
          for (const service of relevantServices) {
            matches.push({
              serviceId: service.Item_Id || service.id,
              serviceName: service.Item_Name || service.name,
              confidence: 0.75,
              matchType: 'keyword',
              originalInput: userInput,
              price: service.Price || service.price,
              locationId: service.Location_Id || service.locationId
            });
          }
        }
      }
    }
    
    return matches;
  }

  private static getServicesForProblem(problem: string, services: any[]): any[] {
    const problemServiceMap: { [key: string]: string[] } = {
      'oily_scalp': ['hair', 'treatment', 'scalp', 'keratin'],
      'dry_hair': ['hair', 'treatment', 'conditioning', 'mask'],
      'dandruff': ['hair', 'treatment', 'scalp'],
      'hair_fall': ['hair', 'treatment', 'strengthening'],
      'acne': ['facial', 'cleansing', 'treatment'],
      'dark_circles': ['facial', 'eye', 'treatment'],
      'dry_skin': ['facial', 'hydrating', 'moisturizing']
    };
    
    const serviceKeywords = problemServiceMap[problem] || [];
    
    return services.filter(service => {
      const serviceName = (service.Item_Name || service.name || '').toLowerCase();
      const serviceDesc = (service.Item_Desc || service.description || '').toLowerCase();
      
      return serviceKeywords.some(keyword => 
        serviceName.includes(keyword) || serviceDesc.includes(keyword)
      );
    });
  }

  private static deduplicateAndSort(matches: ServiceMatch[]): ServiceMatch[] {
    // Remove duplicates based on serviceId, keeping highest confidence
    const uniqueMatches = new Map<number, ServiceMatch>();
    
    for (const match of matches) {
      const existing = uniqueMatches.get(match.serviceId);
      if (!existing || match.confidence > existing.confidence) {
        uniqueMatches.set(match.serviceId, match);
      }
    }
    
    // Sort by confidence descending
    return Array.from(uniqueMatches.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  private static determineMappingStrategy(matches: ServiceMatch[]): string {
    if (matches.length === 0) return 'no_match';
    
    const topMatch = matches[0];
    if (topMatch.confidence > 0.95) return 'exact_match';
    if (topMatch.confidence > 0.85) return 'high_confidence';
    if (topMatch.confidence > 0.7) return 'fuzzy_match';
    return 'low_confidence';
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}