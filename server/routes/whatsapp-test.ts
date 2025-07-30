import express from 'express';

const router = express.Router();

// Test webhook endpoint for WhatsApp simulator
router.post('/test-webhook', async (req, res) => {
  try {
    console.log('🧪 Test webhook received:', JSON.stringify(req.body, null, 2));
    
    const messages = req.body?.messages || [];
    if (messages.length === 0) {
      return res.json({
        success: false,
        error: 'No messages found in request',
        logs: ['No messages found in webhook data']
      });
    }

    const message = messages[0];
    const phoneNumber = `+${message.from}`;
    const messageText = message.text?.body || '';
    
    console.log(`📱 Simulating WhatsApp message from ${phoneNumber}: "${messageText}"`);
    
    // Import the AI agent and process the message
    const { FreshAIAgent } = await import('../ai-fresh.js');
    const aiAgent = new FreshAIAgent();
    
    // Get or create customer
    const { storage } = await import('../storage.js');
    let customer = await storage.getCustomerByPhoneNumber(phoneNumber);
    
    if (!customer) {
      customer = await storage.createCustomer({
        name: `Test Customer ${phoneNumber.slice(-4)}`,
        phoneNumber,
        email: `test${phoneNumber.slice(-4)}@example.com`
      });
      console.log(`👤 Created test customer: ID ${customer.id}`);
    }
    
    // Get or create conversation
    let conversation = await storage.getConversationByCustomer(customer.id);
    if (!conversation) {
      conversation = await storage.createConversation({
        customerId: customer.id,
        isActive: true
      });
      console.log(`💬 Created test conversation: ID ${conversation.id}`);
    }
    
    // Store incoming message
    await storage.createMessage({
      conversationId: conversation.id,
      content: messageText,
      isFromAI: false
    });
    
    // Process with AI agent
    const startTime = Date.now();
    const aiResponse = await aiAgent.processMessage(messageText, customer, conversation.id);
    const processingTime = Date.now() - startTime;
    
    console.log(`🤖 AI Response (${processingTime}ms):`, aiResponse.message);
    
    // Store AI response
    await storage.createMessage({
      conversationId: conversation.id,
      content: aiResponse.message,
      isFromAI: true
    });
    
    // Get basic conversation state for simulator
    const conversationState = {
      selectedServices: [],
      locationId: null,
      locationName: '',
      appointmentDate: '',
      preferredTime: '',
      customerName: customer.name || '',
      customerEmail: customer.email || '',
      paymentTypeId: 2
    };
    
    const response = {
      success: true,
      response: aiResponse.message,
      processingTime,
      conversationState,
      functionCalls: [],
      errors: aiResponse.error ? [aiResponse.error] : [],
      bookingData: null,
      logs: [
        `Message received from ${phoneNumber}`,
        `Processing time: ${processingTime}ms`,
        `AI response: ${aiResponse.message.substring(0, 100)}...`
      ]
    };
    
    console.log('✅ Test webhook response ready');
    res.json(response);
    
  } catch (error: any) {
    console.error('❌ Test webhook error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Unknown error',
      response: 'Sorry, there was a technical error processing your message.',
      logs: [`Error: ${error?.message || 'Unknown error'}`]
    });
  }
});

export default router;