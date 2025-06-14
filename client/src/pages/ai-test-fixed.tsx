import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AISettings, Product } from "@shared/schema";

interface TestMessage {
  id: string;
  content: string;
  isFromUser: boolean;
  timestamp: Date;
  response?: {
    message: string;
    suggestedProducts?: Product[];
    requiresOrderInfo?: boolean;
    orderIntent?: any;
  };
}

export default function AITest() {
  const { toast } = useToast();
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [selectedCustomer] = useState({
    name: "Test Customer",
    phoneNumber: "+1234567890",
    email: "test@example.com"
  });

  const { data: aiSettings } = useQuery<AISettings>({
    queryKey: ["/api/ai-settings"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const testAIMutation = useMutation({
    mutationFn: (message: string) => 
      apiRequest("POST", "/api/ai/test", { 
        message, 
        customer: selectedCustomer 
      }),
    onSuccess: (response: any) => {
      const aiMessage: TestMessage = {
        id: Date.now().toString() + "_ai",
        content: response.message || "No response",
        isFromUser: false,
        timestamp: new Date(),
        response: response
      };
      
      setTestMessages(prev => [...prev, aiMessage]);
    },
    onError: (error: any) => {
      toast({
        title: "AI Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    const userMessage: TestMessage = {
      id: Date.now().toString(),
      content: currentMessage,
      isFromUser: true,
      timestamp: new Date(),
    };

    setTestMessages(prev => [...prev, userMessage]);
    testAIMutation.mutate(currentMessage);
    setCurrentMessage("");
  };

  const handleClearChat = () => {
    setTestMessages([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AI Agent Testing</h1>
          <p className="text-gray-600 mt-1">Test your AI agent's understanding of products and business context</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Conversation Test
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearChat}
                  disabled={testMessages.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear Chat
                </Button>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {testMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium mb-2">Start Testing Your AI Agent</h3>
                        <p>Send a message to see how your AI responds to customer inquiries</p>
                      </div>
                    </div>
                  ) : (
                    testMessages.map((message) => (
                      <div key={message.id} className="space-y-2">
                        {message.isFromUser ? (
                          /* User Message */
                          <div className="flex justify-end">
                            <div className="bg-blue-500 text-white rounded-lg px-4 py-2 max-w-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="h-4 w-4" />
                                <span className="text-xs opacity-75">You</span>
                              </div>
                              <p>{message.content}</p>
                            </div>
                          </div>
                        ) : (
                          /* AI Response */
                          <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Bot className="h-4 w-4" />
                                <span className="text-xs text-gray-600">
                                  {aiSettings?.assistantName || "AI Assistant"}
                                </span>
                              </div>
                              <p className="mb-2 whitespace-pre-wrap">{message.content}</p>
                              
                              {/* Suggested Products */}
                              {message.response?.suggestedProducts && message.response.suggestedProducts.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-sm font-medium text-gray-700 mb-2">Suggested Products:</p>
                                  <div className="space-y-2">
                                    {message.response.suggestedProducts.map((product) => (
                                      <div key={product.id} className="bg-white rounded p-2 border">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">{product.name}</span>
                                          <span className="text-green-600 font-bold">${product.price}</span>
                                        </div>
                                        <p className="text-xs text-gray-600">{product.description}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Order Intent */}
                              {message.response?.orderIntent && (
                                <div className="mt-3 p-2 bg-green-50 rounded">
                                  <p className="text-sm font-medium text-green-800">Order Intent Detected</p>
                                  <p className="text-xs text-green-600">
                                    {message.response.orderIntent.products?.length || 0} items detected
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                
                {/* Loading indicator */}
                {testAIMutation.isPending && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-gray-100 rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-gray-600">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Message Input */}
                <div className="flex gap-2">
                  <Input
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your test message..."
                    className="flex-1"
                    disabled={testAIMutation.isPending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!currentMessage.trim() || testAIMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Info Panel */}
          <div className="space-y-6">
            {/* Quick Tests */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Tests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  "Hi, what do you have available?",
                  "I want to order coffee",
                  "What's your most popular item?",
                  "How much does the green tea cost?",
                  "I'd like to place an order for 2 coffee beans and 1 pastry",
                  "What are your business hours?",
                  "Can you recommend something sweet?",
                ].map((testMessage, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full text-left justify-start text-xs"
                    onClick={() => setCurrentMessage(testMessage)}
                  >
                    {testMessage}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Test Customer */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <div className="text-sm text-gray-600">{selectedCustomer.name}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <div className="text-sm text-gray-600">{selectedCustomer.phoneNumber}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <div className="text-sm text-gray-600">{selectedCustomer.email}</div>
                </div>
              </CardContent>
            </Card>

            {/* AI Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Business:</span>
                  <span className="text-sm font-medium">{aiSettings?.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Assistant:</span>
                  <span className="text-sm font-medium">{aiSettings?.assistantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Tone:</span>
                  <Badge variant="secondary">{aiSettings?.tone}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Products:</span>
                  <span className="text-sm font-medium">{products?.length || 0} items</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}