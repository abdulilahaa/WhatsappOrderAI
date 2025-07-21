import type { Request, Response } from 'express';
import { freshAI } from '../ai-fresh';
import { storage } from '../storage';

// Test endpoint for fresh AI agent
export async function testFreshAI(req: Request, res: Response) {
  try {
    const { message, customerId, phoneNumber } = req.body;
    
    // Accept either phoneNumber or customerId for compatibility
    const identifier = phoneNumber || customerId;
    
    if (!message || !identifier) {
      return res.status(400).json({ error: 'Message and phoneNumber (or customerId) are required' });
    }

    // Get or create customer by phone number (for WhatsApp compatibility)
    let customer;
    
    // Check if identifier is actually a phone number
    if (identifier.startsWith('+') || identifier.length > 10) {
      // It's a phone number, find by phone number
      customer = await storage.getCustomerByPhoneNumber(identifier);
      if (!customer) {
        customer = await storage.createCustomer({
          name: 'Test Customer',
          phoneNumber: identifier,
          email: 'test@example.com'
        });
      }
    } else {
      // It's a regular customer ID
      const customerIdNum = parseInt(identifier);
      if (isNaN(customerIdNum)) {
        return res.status(400).json({ error: "Invalid customer ID format" });
      }
      
      customer = await storage.getCustomer(customerIdNum);
      if (!customer) {
        // Create a test customer with a proper phone number
        const testPhoneNumber = `+965${Math.floor(Math.random() * 100000000)}`;
        customer = await storage.createCustomer({
          name: 'Test Customer',
          phoneNumber: testPhoneNumber,
          email: 'test@example.com'
        });
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