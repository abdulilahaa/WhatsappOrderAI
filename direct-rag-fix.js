// Direct RAG Integration Fix
import fs from 'fs/promises';

async function fixRAGIntegration() {
  console.log('🔧 Fixing AI Agent to Use RAG Database Instead of Live API');
  console.log('=========================================================');
  
  try {
    // Read the current AI Fresh file
    const aiFilePath = './server/ai-fresh.ts';
    let content = await fs.readFile(aiFilePath, 'utf8');
    
    // Find the extractServiceFromMessage method
    const methodStart = content.indexOf('private async extractServiceFromMessage');
    if (methodStart === -1) {
      console.log('❌ Method not found');
      return;
    }
    
    // Find the end of the method (next method or end of class)
    let braceCount = 0;
    let methodEnd = methodStart;
    let inMethod = false;
    
    for (let i = methodStart; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        inMethod = true;
      } else if (content[i] === '}') {
        braceCount--;
        if (inMethod && braceCount === 0) {
          methodEnd = i + 1;
          break;
        }
      }
    }
    
    console.log('✅ Found method boundaries');
    console.log('Method starts at:', methodStart);
    console.log('Method ends at:', methodEnd);
    
    // Create the new RAG-based method
    const newMethod = `  private async extractServiceFromMessage(message: string, state: ConversationState): Promise<void> {
    try {
      console.log(\`🔍 Analyzing customer needs from message: "\${message}"\`);
      
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
          console.log(\`📍 Location detected: Al-Plaza Mall (ID: 1)\`);
        } else if (lowerMessage.includes('zahra')) {
          locationId = 52;
          locationName = 'Zahra Complex';
          state.collectedData.locationId = 52;
          state.collectedData.locationName = 'Zahra Complex';
          console.log(\`📍 Location detected: Zahra Complex (ID: 52)\`);
        } else if (lowerMessage.includes('arraya')) {
          locationId = 53;
          locationName = 'Arraya Mall';
          state.collectedData.locationId = 53;
          state.collectedData.locationName = 'Arraya Mall';
          console.log(\`📍 Location detected: Arraya Mall (ID: 53)\`);
        } else {
          console.log(\`❓ No location specified in message\`);
        }
      } else {
        console.log(\`📍 Using existing location: \${locationName} (ID: \${locationId})\`);
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
          console.log(\`🎯 Problem detected: "\${problem}" → searching for: "\${searchQuery}"\`);
          break;
        }
      }
      
      // Extract service type keywords if no problem detected
      if (!searchQuery) {
        const serviceWords = ['manicure', 'pedicure', 'facial', 'hair', 'massage', 'scalp', 'nail', 'treatment'];
        for (const word of serviceWords) {
          if (lowerMessage.includes(word)) {
            searchQuery = word;
            console.log(\`🔍 Service type detected: "\${word}"\`);
            break;
          }
        }
      }
      
      if (!searchQuery) {
        searchQuery = 'treatment';
        console.log(\`🔍 Using default search: "treatment"\`);
      }
      
      // Step 3: Search location-specific cached services using RAG
      console.log(\`💾 Searching cached services for location \${locationId} with query: "\${searchQuery}"\`);
      
      const ragResults = await ragSearchService.searchServices(searchQuery, 
        locationId ? { locationId } : {}, 15);
      
      console.log(\`📊 RAG search results: \${ragResults.length} services found\`);
      if (locationId) {
        console.log(\`📍 Filtered for location: \${locationName} (ID: \${locationId})\`);
      }
      
      if (ragResults.length === 0) {
        console.log(\`❌ No matching services found for: "\${searchQuery}"\`);
        console.log(\`🔄 Trying broader search for location \${locationId}...\`);
        
        const broadResults = await ragSearchService.searchServices('', 
          locationId ? { locationId } : {}, 20);
        
        if (broadResults.length > 0) {
          ragResults.push(...broadResults.slice(0, 10));
          console.log(\`✅ Found \${broadResults.length} general services for location \${locationId}\`);
        } else {
          console.log(\`❌ No services available for location \${locationId}\`);
          return;
        }
      }
      
      // Log first few services for debugging
      ragResults.slice(0, 3).forEach((service, index) => {
        console.log(\`  \${index + 1}. \${service.itemName} - \${service.primaryPrice} KWD\`);
      });
      
      console.log(\`🔍 Service extraction result: \${ragResults.map(s => s.itemName).slice(0, 3)}\`);
      
      // Store found services in state for later use
      if (ragResults.length > 0) {
        const topServices = ragResults.slice(0, 3);
        
        for (const service of topServices) {
          state.collectedData.selectedServices.push({
            itemId: service.itemId,
            itemName: service.itemName,
            price: parseFloat(service.primaryPrice),
            duration: service.durationMinutes || 45,
            reason: detectedProblem ? \`Recommended for \${detectedProblem}\` : 'Popular service'
          });
        }
        
        console.log(\`✅ Added \${topServices.length} services to conversation state\`);
      }
      
    } catch (error) {
      console.error('❌ Error in extractServiceFromMessage:', error);
    }
  }`;
    
    // Replace the old method with the new one
    const beforeMethod = content.substring(0, methodStart);
    const afterMethod = content.substring(methodEnd);
    const newContent = beforeMethod + newMethod + afterMethod;
    
    // Write the fixed file
    await fs.writeFile(aiFilePath, newContent, 'utf8');
    
    console.log('✅ Successfully replaced AI method with RAG-based implementation');
    console.log('🔧 AI agent now uses cached services instead of live API');
    console.log('📍 Location detection and filtering implemented');
    console.log('🎯 Problem-based service matching enabled');
    
  } catch (error) {
    console.error('❌ Error fixing RAG integration:', error);
  }
}

fixRAGIntegration();