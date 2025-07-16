import type { Request, Response } from 'express';
import { freshAI } from '../ai-fresh';
import { storage } from '../storage';

// Test endpoint for fresh AI agent
export async function testFreshAI(req: Request, res: Response) {
  try {
    const { message, customerId } = req.body;
    
    if (!message || !customerId) {
      return res.status(400).json({ error: 'Message and customerId are required' });
    }

    // Get or create customer
    let customer = await storage.getCustomer(parseInt(customerId));
    if (!customer) {
      // Always check if customer exists by phone number to avoid duplicates
      const testPhoneNumber = '+96500000000';
      try {
        const existingCustomer = await storage.getCustomerByPhoneNumber(testPhoneNumber);
        if (existingCustomer) {
          customer = existingCustomer;
        } else {
          customer = await storage.createCustomer({
            name: 'Test Customer',
            phoneNumber: testPhoneNumber,
            email: 'test@example.com'
          });
        }
      } catch (createError) {
        // If creation fails due to duplicate, try to get the existing customer again
        const existingCustomer = await storage.getCustomerByPhoneNumber(testPhoneNumber);
        if (existingCustomer) {
          customer = existingCustomer;
        } else {
          throw createError;
        }
      }
    }

    // Process message with fresh AI
    const response = await freshAI.processMessage(message, customer, []);
    
    res.json({
      success: true,
      response,
      conversationState: freshAI.getConversationState(customerId)
    });
  } catch (error) {
    console.error('Fresh AI test error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Clear conversation state endpoint
export async function clearConversationState(req: Request, res: Response) {
  try {
    const { customerId } = req.params;
    
    freshAI.clearConversationState(customerId);
    
    res.json({ success: true, message: 'Conversation state cleared' });
  } catch (error) {
    console.error('Clear conversation state error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get conversation state endpoint
export async function getConversationState(req: Request, res: Response) {
  try {
    const { customerId } = req.params;
    
    const state = freshAI.getConversationState(customerId);
    
    res.json({ 
      success: true, 
      state: state || null 
    });
  } catch (error) {
    console.error('Get conversation state error:', error);
    res.status(500).json({ error: error.message });
  }
}