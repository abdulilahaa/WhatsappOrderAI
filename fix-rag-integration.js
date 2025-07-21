// Fix RAG Integration for Location-Based Service Search
const fs = require('fs');
const path = require('path');

// Create fixed AI agent method for location-based RAG search
const fixedMethod = `
  private async extractServiceFromMessage(message: string, state: ConversationState): Promise<void> {
    try {
      console.log('🔍 Analyzing customer needs from message:', message);
      
      // Import RAG search service for cached services
      const { ragSearchService } = await import('./rag-search');
      
      // Step 1: Determine location from conversation
      let locationId = state.collectedData.locationId;
      let locationName = state.collectedData.locationName;
      
      if (!locationId) {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('al-plaza') || lowerMessage.includes('al plaza')) {
          locationId = 1;
          locationName = 'Al-Plaza Mall';
          state.collectedData.locationId = 1;
          state.collectedData.locationName = 'Al-Plaza Mall';
          console.log('📍 Location detected: Al-Plaza Mall (ID: 1)');
        } else if (lowerMessage.includes('zahra')) {
          locationId = 52;
          locationName = 'Zahra Complex';
          state.collectedData.locationId = 52;
          state.collectedData.locationName = 'Zahra Complex';
          console.log('📍 Location detected: Zahra Complex (ID: 52)');
        } else if (lowerMessage.includes('arraya')) {
          locationId = 53;
          locationName = 'Arraya Mall';
          state.collectedData.locationId = 53;
          state.collectedData.locationName = 'Arraya Mall';
          console.log('📍 Location detected: Arraya Mall (ID: 53)');
        }
      }
      
      // Step 2: Analyze conversation context for service needs
      const problemKeywords = {
        'oily scalp': ['scalp', 'treatment', 'cleansing', 'detox'],
        'dandruff': ['scalp', 'treatment', 'anti-dandruff', 'medicated'],
        'dry hair': ['hair', 'hydrating', 'moisturizing', 'conditioning'],
        'damaged hair': ['hair', 'repair', 'reconstruction', 'keratin'],
        'thinning hair': ['hair', 'volumizing', 'growth', 'strengthening'],
        'anti-aging': ['facial', 'anti-aging', 'rejuvenating'],
        'acne': ['facial', 'cleansing', 'acne']
      };
      
      const lowerMessage = message.toLowerCase();
      let searchQuery = '';
      let detectedProblem = null;
      
      // Detect specific problems
      for (const [problem, keywords] of Object.entries(problemKeywords)) {
        if (lowerMessage.includes(problem)) {
          searchQuery = keywords.join(' ');
          detectedProblem = problem;
          console.log('🎯 Problem detected:', problem, '→ searching for:', searchQuery);
          break;
        }
      }
      
      // Extract service type keywords if no problem detected
      if (!searchQuery) {
        const serviceWords = ['manicure', 'pedicure', 'facial', 'hair', 'massage', 'scalp', 'nail', 'treatment'];
        for (const word of serviceWords) {
          if (lowerMessage.includes(word)) {
            searchQuery = word;
            console.log('🔍 Service type detected:', word);
            break;
          }
        }
      }
      
      if (!searchQuery) {
        searchQuery = 'treatment';
        console.log('🔍 Using default search: treatment');
      }
      
      // Step 3: Search location-specific cached services using RAG
      console.log('💾 Searching cached services for location', locationId, 'with query:', searchQuery);
      
      const ragResults = await ragSearchService.searchServices(searchQuery, 
        locationId ? { locationId } : {}, 15);
      
      console.log('📊 RAG search results:', ragResults.length, 'services found');
      
      if (ragResults.length === 0) {
        console.log('❌ No matching services found for:', searchQuery);
        return;
      }
      
      // Convert RAG results to expected format
      const allServices = {
        items: ragResults.map(service => ({
          Item_Id: service.itemId,
          Item_Name: service.itemName,
          Item_Desc: service.itemDesc,
          Primary_Price: parseFloat(service.primaryPrice),
          Special_Price: parseFloat(service.primaryPrice),
          Duration: service.durationMinutes ? service.durationMinutes.toString() : '45'
        }))
      };
      
      console.log('✅ Using', ragResults.length, 'location-specific cached services');
      
      // Continue with existing service recommendation logic...
      const recommendations = [];
      
      for (const service of allServices.items) {
        recommendations.push({
          service: service,
          relevance: 90,
          reason: detectedProblem ? 'Recommended for ' + detectedProblem : 'Popular service'
        });
      }
      
      console.log('🔍 Service extraction result:', recommendations.map(r => r.service.Item_Name));
      
      if (recommendations.length > 0) {
        const topRecommendations = recommendations
          .sort((a, b) => b.relevance - a.relevance)
          .slice(0, 3);
        
        for (const rec of topRecommendations) {
          state.collectedData.selectedServices.push({
            itemId: rec.service.Item_Id,
            itemName: rec.service.Item_Name,
            price: rec.service.Primary_Price,
            duration: parseInt(rec.service.Duration),
            reason: rec.reason
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error in extractServiceFromMessage:', error);
    }
  }
`;

console.log('🔧 RAG Integration Fix Instructions:');
console.log('=====================================');
console.log('1. The AI agent needs to use RAG database instead of live API');
console.log('2. Location detection should happen first');
console.log('3. Service search should be filtered by location');
console.log('4. Current issue: AI still calling GetItemsByDate API');
console.log('5. Solution: Replace API calls with RAG search calls');
console.log('\\n✅ Fixed method structure created above');
console.log('\\nNext: Apply this fix to server/ai-fresh.ts');