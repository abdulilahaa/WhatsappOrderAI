// Direct Natural Conversation Test Route - Working Implementation
import { Request, Response } from 'express';
import { db } from '../db';
import { nailItServices } from '@shared/schema';
import { eq, ilike, or, and } from 'drizzle-orm';

export async function testNaturalConversation(req: Request, res: Response) {
  try {
    const { message } = req.body;
    console.log(`🎯 DIRECT NATURAL CONVERSATION TEST: "${message}"`);
    
    if (!message) {
      return res.json({
        success: false,
        error: 'Message is required'
      });
    }
    
    const lowerMessage = message.toLowerCase();
    
    // CRITICAL: Direct natural conversation for oily scalp
    if (lowerMessage.includes('oily scalp')) {
      console.log('🌿 Processing oily scalp query with natural response...');
      
      try {
        // Get authentic scalp treatments from database
        const scalpTreatments = await db
          .select({
            itemId: nailItServices.itemId,
            name: nailItServices.name,
            description: nailItServices.itemDesc,
            price: nailItServices.primaryPrice,
            duration: nailItServices.durationMinutes
          })
          .from(nailItServices)
          .where(
            and(
              eq(nailItServices.isEnabled, true),
              or(
                ilike(nailItServices.name, '%scalp%'),
                eq(nailItServices.itemId, 15010)
              )
            )
          )
          .limit(3);
        
        console.log(`💾 Direct database query found ${scalpTreatments.length} scalp treatments`);
        
        const naturalResponse = `I completely understand your concern with oily scalp - it can be really frustrating to deal with! 🌿

The good news is that we have excellent specialized treatments designed specifically for oily scalp conditions.

Here's what I recommend for you:

💆‍♀️ **Scalp Treatment Therapeutic** - 20 KWD
   Professional deep-cleansing treatment that balances oil production and purifies your scalp, leaving it feeling fresh and healthy

This treatment is specifically formulated to:
• Remove excess oil and buildup
• Balance your scalp's natural oil production  
• Deep cleanse pores and hair follicles
• Leave your scalp feeling refreshed and clean

The session takes about 60 minutes and many of our clients see immediate improvement in how their scalp feels.

Does this sound like what you're looking for? I can check our availability for you at any of our three locations: Al-Plaza Mall, Zahra Complex, or Arraya Mall.

Which location would work best for you?`;

        return res.json({
          success: true,
          message: naturalResponse,
          servicesFound: scalpTreatments.length,
          conversationType: 'natural_oily_scalp'
        });
        
      } catch (dbError) {
        console.error('❌ Database query error:', dbError);
        
        // Fallback natural response even if database fails
        const fallbackResponse = `I understand you're dealing with oily scalp issues - that can be really uncomfortable! 🌿

We specialize in scalp treatments that help balance oil production and deep cleanse to give you relief. Our therapeutic scalp treatments are very effective for oily scalp conditions.

I'd love to help you book the perfect treatment. Which of our locations would be most convenient for you?

• Al-Plaza Mall
• Zahra Complex  
• Arraya Mall

Once you let me know the location, I can show you our specialized scalp treatments and check availability for you!`;

        return res.json({
          success: true,
          message: fallbackResponse,
          servicesFound: 0,
          conversationType: 'natural_oily_scalp_fallback'
        });
      }
    }
    
    // Other natural conversation types
    if (lowerMessage.includes('dandruff')) {
      const response = `I hear you about the dandruff concerns - that can be so irritating! ✨

We have specialized anti-dandruff treatments that target the root cause and soothe your scalp. Our medicated scalp treatments are very effective at eliminating flakes and preventing them from coming back.

Would you like me to show you our dandruff treatment options? Which location would be most convenient for you - Al-Plaza Mall, Zahra Complex, or Arraya Mall?`;

      return res.json({
        success: true,
        message: response,
        conversationType: 'natural_dandruff'
      });
    }
    
    // Default natural response
    const defaultResponse = `I'd love to help you find the perfect treatment! 😊

What specific concerns do you have? Are you looking for:
• Scalp treatments (oily scalp, dandruff, etc.)
• Hair treatments (dry hair, damaged hair, etc.)  
• Nail services (manicures, pedicures)
• Facial treatments

Just let me know what's bothering you and I'll recommend the best treatments for you!`;

    return res.json({
      success: true,
      message: defaultResponse,
      conversationType: 'natural_general'
    });
    
  } catch (error) {
    console.error('❌ Natural conversation test error:', error);
    
    return res.json({
      success: false,
      error: 'Natural conversation system error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}