# WhatsApp AI Agent Testing Plan - NailIt Integration

## Overview
Testing plan for the enhanced AI agent with real NailIt POS integration to ensure proper conversation flow and service booking capabilities.

## Test Scenarios

### **Phase 1: Basic Service Discovery**

#### Test 1.1: Service Search - English
**Input**: "Hi, what nail services do you have?"
**Expected**: 
- Greets in English
- Shows real NailIt services with authentic prices in KWD
- Mentions 3 locations with service counts (378/330/365)

#### Test 1.2: Service Search - Arabic  
**Input**: "مرحبا، ايش عندكم خدمات للأظافر؟"
**Expected**:
- Detects Arabic and responds in Arabic
- Shows real NailIt services  
- Natural conversational tone

#### Test 1.3: Specific Service Search
**Input**: "Do you have manicure services?"
**Expected**:
- Uses enhanced suggestProducts with NailIt API search
- Returns authentic manicure services from live catalog
- Shows real pricing and durations

### **Phase 2: Location-Based Filtering**

#### Test 2.1: Location-Specific Request
**Input**: "What services are available at Zahra Complex?"
**Expected**:
- Uses locationId 52 for Zahra Complex
- Shows services available at that specific location
- Mentions 330 services available there

#### Test 2.2: Location Comparison
**Input**: "Which location has the most services?"
**Expected**:
- Mentions Al-Plaza Mall (ID: 1) has 378 services
- Provides all location options with service counts

### **Phase 3: Complete Booking Flow**

#### Test 3.1: Full Appointment Booking - English
**Conversation Flow**:
1. "I need a gel manicure appointment"
2. Select location: "Arraya Mall"  
3. Date: "Tomorrow"
4. Time: "2pm"
5. Name: "Sarah"
6. Email: "sarah@email.com"
7. Payment: "Card"
8. Confirm: "Yes, confirmed"

**Expected**: Creates appointment using real NailIt booking API

#### Test 3.2: Full Appointment Booking - Arabic
**Conversation Flow**:
1. "أريد موعد مانيكير"
2. Location: "الزهراء"
3. Date: "بكرا"  
4. Time: "العصر"
5. Name: "فاطمة"
6. Email: "fatima@email.com"
7. Payment: "كاش"
8. Confirm: "أكيد"

**Expected**: 
- Maintains Arabic throughout conversation
- Maps "الزهراء" to Zahra Complex (ID: 52)
- Creates appointment successfully

### **Phase 4: Edge Cases & Error Handling**

#### Test 4.1: Service Not Available
**Input**: "Do you have car wash services?"
**Expected**: 
- Politely explains available services
- Suggests relevant nail/beauty services

#### Test 4.2: Location Not Found
**Input**: "Do you have a branch in Dubai?"
**Expected**:
- Lists available Kuwait locations
- Asks customer to choose from available options

#### Test 4.3: Past Date Request
**Input**: "Can I book for yesterday?"
**Expected**:
- Explains minimum 24-hour advance booking
- Suggests available future dates

### **Phase 5: API Integration Verification**

#### Test 5.1: Real-Time Service Search
**Verification**: Check logs for NailIt API calls when AI searches services
**Expected**: See "🔍 Found X NailIt services for query" logs

#### Test 5.2: Live Booking Creation  
**Verification**: Check NailIt POS system for actual appointment records
**Expected**: Real appointments created in NailIt database

#### Test 5.3: Service Count Accuracy
**Verification**: Compare AI responses with actual NailIt API totals
**Expected**: AI mentions correct service counts (378/330/365)

## Testing Tools

### **WhatsApp Numbers for Testing**
- Test with actual WhatsApp Business number
- Use webhook URL for live testing

### **Monitoring & Debugging**
- Server logs: Watch for NailIt API calls and responses
- Database: Verify appointments created in both systems
- Frontend: Use Products page to verify service counts

### **Success Criteria**
✅ AI uses real NailIt services (not hardcoded data)
✅ Accurate service counts per location  
✅ Bilingual conversation flow (Arabic/English)
✅ Successful appointment booking in NailIt POS
✅ Proper location mapping to real IDs
✅ Enhanced service search functionality

## Next Steps After Testing
1. Fix any conversation flow issues found
2. Optimize NailIt API response times if needed
3. Add more sophisticated service matching
4. Implement real-time availability checking
5. Add appointment confirmation workflows

## Notes
- Test with real phone numbers on actual WhatsApp
- Monitor all API calls in server logs
- Verify appointments in NailIt POS dashboard
- Check that all pricing is in KWD (not USD)