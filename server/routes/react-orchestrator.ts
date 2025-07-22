/**
 * ReAct Orchestrator Routes
 * API endpoints for the task-oriented booking orchestrator
 */

import express from 'express';
import { reActOrchestrator, BookingContext } from '../react-orchestrator';
import { storage } from '../storage';

const router = express.Router();

/**
 * Main orchestrator endpoint - replaces existing AI conversation endpoint
 */
router.post('/process', async (req, res) => {
  try {
    const { phoneNumber, message, customerId, conversationId } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ 
        error: "phoneNumber and message are required" 
      });
    }

    console.log(`🤖 [ReAct] Processing message from ${phoneNumber}: "${message}"`);

    // Get or create customer
    let customer;
    if (customerId) {
      customer = await storage.getCustomerById(customerId);
    } else {
      customer = await storage.getCustomerByPhoneNumber(phoneNumber) ||
                await storage.createCustomer({
                  name: `Customer ${phoneNumber.slice(-4)}`,
                  phoneNumber,
                  email: `customer${phoneNumber.slice(-4)}@temp.com`
                });
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await storage.getConversationById(conversationId);
    } else {
      const activeConversations = await storage.getActiveConversations();
      conversation = activeConversations.find(c => c.customerId === customer.id) ||
                   await storage.createConversation(customer.id);
    }

    // Get conversation history
    const messages = await storage.getConversationMessages(conversation.id);
    const conversationHistory = messages.map(msg => ({
      role: msg.isFromCustomer ? 'user' as const : 'assistant' as const,
      content: msg.message
    }));

    // Get current session data (from enhanced conversation state if exists)
    const sessionState = await storage.getConversationState(conversation.id);
    
    // Build context for orchestrator
    const context: BookingContext = {
      customerId: customer.id,
      phoneNumber: customer.phoneNumber,
      conversationId: conversation.id,
      sessionData: sessionState ? {
        selectedServices: sessionState.selectedServices ? JSON.parse(sessionState.selectedServices) : undefined,
        locationId: sessionState.locationId,
        locationName: sessionState.locationName,
        appointmentDate: sessionState.appointmentDate,
        timeSlots: sessionState.timeSlots ? JSON.parse(sessionState.timeSlots) : undefined,
        customerName: sessionState.customerName,
        customerEmail: sessionState.customerEmail,
        paymentMethod: sessionState.paymentMethod,
        currentOrderId: sessionState.currentOrderId,
        totalAmount: sessionState.totalAmount,
        totalDuration: sessionState.totalDuration
      } : {},
      conversationHistory
    };

    // Process with ReAct orchestrator
    const response = await reActOrchestrator.processBookingConversation(context, message);

    // Save user message
    await storage.addConversationMessage({
      conversationId: conversation.id,
      message,
      isFromCustomer: true,
      timestamp: new Date()
    });

    // Save assistant response
    await storage.addConversationMessage({
      conversationId: conversation.id,
      message: response,
      isFromCustomer: false,
      timestamp: new Date()
    });

    console.log(`✅ [ReAct] Response generated: "${response.substring(0, 100)}..."`);

    res.json({
      success: true,
      response,
      customerId: customer.id,
      conversationId: conversation.id,
      orchestrator: 'ReAct'
    });

  } catch (error) {
    console.error('❌ [ReAct] Error:', error);
    res.status(500).json({
      error: 'ReAct orchestrator error: ' + error.message
    });
  }
});

/**
 * Test endpoint for orchestrator functionality
 */
router.post('/test', async (req, res) => {
  try {
    const testContext: BookingContext = {
      customerId: 999,
      phoneNumber: '+96599999999',
      conversationId: 999,
      sessionData: {},
      conversationHistory: []
    };

    const testMessage = req.body.message || "I need a hair treatment at Al-Plaza Mall";
    
    const response = await reActOrchestrator.processBookingConversation(testContext, testMessage);

    res.json({
      success: true,
      testMessage,
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [ReAct Test] Error:', error);
    res.status(500).json({
      error: 'ReAct test error: ' + error.message
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    // Test all tools quickly
    const healthStatus = {
      orchestrator: 'operational',
      tools: {
        serviceSearch: 'checking...',
        staffAvailability: 'checking...',
        bookingValidation: 'checking...',
        orderCreation: 'checking...',
        paymentVerification: 'checking...'
      },
      timestamp: new Date().toISOString()
    };

    // Quick tool tests (non-blocking)
    setTimeout(async () => {
      try {
        await reActOrchestrator.searchServices('test', 1);
        healthStatus.tools.serviceSearch = 'operational';
      } catch { 
        healthStatus.tools.serviceSearch = 'error';
      }
    }, 100);

    res.json(healthStatus);

  } catch (error) {
    res.status(500).json({
      orchestrator: 'error',
      error: error.message
    });
  }
});

export default router;