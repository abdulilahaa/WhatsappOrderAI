import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send, Bot, User, RefreshCw, MessageSquare, ShoppingCart, Lightbulb } from "lucide-react";
import type { Product, AISettings } from "@shared/schema";

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
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState({
    name: "Test Customer",
    phoneNumber: "+1234567890",
    email: "test@example.com"
  });
  const { toast } = useToast();

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: aiSettings } = useQuery<AISettings>({
    queryKey: ["/api/ai-settings"],
  });

  const testAIMutation = useMutation({
    mutationFn: (message: string) => 
      apiRequest("POST", "/api/ai/test", { 
        message, 
        customer: selectedCustomer 
      }),
    onSuccess: (response: any) => {
      // Add AI response as a new message
      const aiMessage: TestMessage = {
        id: Date.now().toString() + "_ai",
        content: "",
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
      
      // Remove loading message if it exists
      setTestMessages(prev => prev.filter(msg => !msg.id.includes("_loading")));
    },
  });

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    const messageId = Date.now().toString();
    const newMessage: TestMessage = {
      id: messageId,
      content: currentMessage,
      isFromUser: true,
      timestamp: new Date(),
    };

    setTestMessages(prev => [...prev, newMessage]);
    testAIMutation.mutate(currentMessage);
    setCurrentMessage("");
  };

  const handleClearChat = () => {
    setTestMessages([]);
  };

  const quickTests = [
    "Hi, what do you have available?",
    "I want to order coffee",
    "What's your most popular item?",
    "How much does the green tea cost?",
    "I'd like to place an order for 2 coffee beans and 1 pastry",
    "What are your business hours?",
    "Can you recommend something sweet?",
  ];

  const handleQuickTest = (message: string) => {
    setCurrentMessage(message);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">AI Agent Testing</h2>
            <p className="text-slate-600 mt-1">Test your AI agent's understanding of products and business context</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              {aiSettings?.assistantName || "AI Assistant"}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              {products?.length || 0} Products
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Chat Interface */}
          <div className="lg:col-span-2 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    AI Conversation Test
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={handleClearChat}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear Chat
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0">
                  {testMessages.length === 0 ? (
                    <div className="text-center text-slate-500 py-12">
                      <Bot className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Start Testing Your AI Agent</h3>
                      <p>Send a message to see how your AI responds to customer inquiries</p>
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
                          message.response ? (
                            <div className="flex justify-start">
                              <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <Bot className="h-4 w-4" />
                                  <span className="text-xs text-gray-600">{aiSettings?.assistantName || "AI Assistant"}</span>
                                </div>
                                <p className="mb-2 whitespace-pre-wrap">{message.response.message}</p>
                                
                                {/* Suggested Products */}
                                {message.response.suggestedProducts && message.response.suggestedProducts.length > 0 && (
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
                                {message.response.orderIntent && (
                                  <div className="mt-3 p-2 bg-green-50 rounded">
                                    <p className="text-sm font-medium text-green-800">Order Intent Detected</p>
                                    <p className="text-xs text-green-600">
                                      {message.response.orderIntent.products?.length || 0} items detected
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : null
                        )}
                        
                        {/* Loading state for AI response */}
                        {testAIMutation.isPending && !message.isFromUser && (
                          <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-lg px-4 py-2">
                              <div className="flex items-center gap-2">
                                <Bot className="h-4 w-4 animate-spin" />
                                <span className="text-sm text-gray-600">AI is thinking...</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                
                {/* Message Input */}
                <div className="flex-shrink-0">
                  <div className="flex gap-2">
                    <Input
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      placeholder="Type your test message..."
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!currentMessage.trim() || testAIMutation.isPending}
                      className="hover:bg-whatsapp/90 bg-[#ba212a]"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Controls & Info */}
          <div className="space-y-6">
            {/* Quick Tests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Quick Tests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {quickTests.map((test, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickTest(test)}
                      className="w-full text-left justify-start text-xs"
                    >
                      {test}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Test Customer */}
            <Card>
              <CardHeader>
                <CardTitle>Test Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={selectedCustomer.name}
                      onChange={(e) => setSelectedCustomer(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={selectedCustomer.phoneNumber}
                      onChange={(e) => setSelectedCustomer(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      value={selectedCustomer.email || ""}
                      onChange={(e) => setSelectedCustomer(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Settings */}
            <Card>
              <CardHeader>
                <CardTitle>AI Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Business:</span>
                    <span className="font-medium">{aiSettings?.businessName || "Not Set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Assistant:</span>
                    <span className="font-medium">{aiSettings?.assistantName || "Not Set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tone:</span>
                    <span className="font-medium capitalize">{aiSettings?.tone || "Not Set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Products:</span>
                    <span className="font-medium">{products?.length || 0} items</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}