import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send, RotateCcw, User, Bot, Trash2 } from "lucide-react";

interface Message {
  id: string;
  content: string;
  isFromUser: boolean;
  timestamp: Date;
  response?: any;
}

export default function FreshAITest() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customerId, setCustomerId] = useState('1');
  const [conversationState, setConversationState] = useState<any>(null);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isFromUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/fresh-ai/test', {
        message: inputMessage,
        customerId: customerId
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response.message,
          isFromUser: false,
          timestamp: new Date(),
          response: data.response
        };

        setMessages(prev => [...prev, aiMessage]);
        setConversationState(data.conversationState);
        
        toast({
          title: "Message sent successfully",
          description: `Current phase: ${data.response.collectionPhase}`,
        });
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = async () => {
    try {
      const response = await apiRequest('DELETE', `/api/fresh-ai/conversation/${customerId}`);
      const data = await response.json();

      if (data.success) {
        setMessages([]);
        setConversationState(null);
        
        toast({
          title: "Conversation cleared",
          description: "Starting fresh conversation",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear conversation",
        variant: "destructive",
      });
    }
  };

  const getConversationState = async () => {
    try {
      const response = await apiRequest('GET', `/api/fresh-ai/conversation/${customerId}`);
      const data = await response.json();

      if (data.success) {
        setConversationState(data.state);
        
        toast({
          title: "Conversation state retrieved",
          description: data.state ? `Phase: ${data.state.phase}` : "No active conversation",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get conversation state",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Fresh AI Agent Testing</h1>
        <p className="text-gray-600">Test the new AI agent system with NailIt API integration</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Chat Interface</span>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Customer ID"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-32"
                  />
                  <Button onClick={clearConversation} variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full border rounded p-4 mb-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No messages yet. Start a conversation!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isFromUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.isFromUser
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {message.isFromUser ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                            <span className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          
                          {/* Show AI response details */}
                          {message.response && (
                            <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
                              <Badge variant="outline" className="mb-1">
                                Phase: {message.response.collectionPhase}
                              </Badge>
                              {message.response.suggestedServices?.length > 0 && (
                                <div className="mt-1">
                                  <p className="font-medium">Suggested Services:</p>
                                  {message.response.suggestedServices.slice(0, 3).map((service, idx) => (
                                    <p key={idx} className="text-xs">
                                      • {service.Item_Name} - {service.Special_Price || service.Primary_Price} KWD
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1"
                  rows={2}
                />
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversation State */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Conversation State</span>
                <Button onClick={getConversationState} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conversationState ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Current Phase:</p>
                    <Badge variant="secondary">{conversationState.phase}</Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">Language:</p>
                    <Badge variant="outline">{conversationState.language}</Badge>
                  </div>

                  <div>
                    <p className="text-sm font-medium">Collected Data:</p>
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                      {JSON.stringify(conversationState.collectedData, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <p className="text-sm font-medium">Last Updated:</p>
                    <p className="text-xs text-gray-600">
                      {new Date(conversationState.lastUpdated).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No active conversation state</p>
              )}
            </CardContent>
          </Card>

          {/* Test Scenarios */}
          <Card>
            <CardHeader>
              <CardTitle>Test Scenarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  onClick={() => setInputMessage("Hi, what nail services do you have?")}
                  variant="outline"
                  className="w-full text-left justify-start text-sm"
                >
                  English Service Inquiry
                </Button>
                
                <Button
                  onClick={() => setInputMessage("مرحبا، ايش عندكم خدمات للأظافر؟")}
                  variant="outline"
                  className="w-full text-left justify-start text-sm"
                >
                  Arabic Service Inquiry
                </Button>
                
                <Button
                  onClick={() => setInputMessage("I need a gel manicure appointment")}
                  variant="outline"
                  className="w-full text-left justify-start text-sm"
                >
                  Specific Service Request
                </Button>
                
                <Button
                  onClick={() => setInputMessage("What's available at Zahra Complex?")}
                  variant="outline"
                  className="w-full text-left justify-start text-sm"
                >
                  Location-Specific Query
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}