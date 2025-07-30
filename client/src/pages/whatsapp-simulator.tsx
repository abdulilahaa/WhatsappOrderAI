import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, MessageSquare, Bot, User, Loader2, Phone, Mail, Calendar, MapPin, DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';

interface SimulatorMessage {
  id: string;
  content: string;
  isFromAI: boolean;
  timestamp: string;
  metadata?: {
    phoneNumber?: string;
    processingTime?: number;
    functionCalls?: string[];
    errors?: string[];
    bookingData?: any;
  };
}

interface ConversationState {
  selectedServices: any[];
  locationId: number | null;
  locationName: string;
  appointmentDate: string;
  preferredTime: string;
  customerName: string;
  customerEmail: string;
  paymentTypeId: number;
}

export default function WhatsAppSimulator() {
  const [messages, setMessages] = useState<SimulatorMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+96541144687');
  const [language, setLanguage] = useState('english');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; phoneNumber: string }) => {
      const startTime = Date.now();
      const response = await fetch('/api/whatsapp/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            from: data.phoneNumber.replace('+', ''),
            timestamp: Math.floor(Date.now() / 1000).toString(),
            text: { body: data.message }
          }]
        })
      });
      
      const result = await response.json();
      const processingTime = Date.now() - startTime;
      return { ...result, processingTime };
    },
    onSuccess: (data: any) => {
      const aiMessage: SimulatorMessage = {
        id: Date.now().toString(),
        content: data.response || 'No response received',
        isFromAI: true,
        timestamp: new Date().toISOString(),
        metadata: {
          processingTime: data.processingTime,
          functionCalls: data.functionCalls || [],
          errors: data.errors || [],
          bookingData: data.bookingData
        }
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Update conversation state if provided
      if (data.conversationState) {
        setConversationState(data.conversationState);
      }
      
      // Add logs
      if (data.logs) {
        setLogs(prev => [...prev, ...data.logs]);
      }
      
      setIsLoading(false);
    },
    onError: (error) => {
      console.error('Message send error:', error);
      const errorMessage: SimulatorMessage = {
        id: Date.now().toString(),
        content: `Error: ${error.message}`,
        isFromAI: true,
        timestamp: new Date().toISOString(),
        metadata: {
          errors: [error.message]
        }
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  });

  const handleSendMessage = () => {
    if (!currentMessage.trim() || isLoading) return;

    // Add user message
    const userMessage: SimulatorMessage = {
      id: Date.now().toString(),
      content: currentMessage,
      isFromAI: false,
      timestamp: new Date().toISOString(),
      metadata: { phoneNumber }
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Send to backend
    sendMessageMutation.mutate({
      message: currentMessage,
      phoneNumber
    });
    
    setCurrentMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setLogs([]);
    setConversationState(null);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusColor = (message: SimulatorMessage) => {
    if (message.metadata?.errors?.length) return 'text-red-600';
    if (message.metadata?.functionCalls?.length) return 'text-blue-600';
    return 'text-gray-600';
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp AI Simulator</h1>
          <p className="text-gray-600 mt-2">Test the complete booking flow as customers would experience it</p>
        </div>
        <Button onClick={clearChat} variant="outline">
          Clear Chat
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-[700px] flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat Simulator
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={phoneNumber} onValueChange={setPhoneNumber}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+96541144687">+965 411 44687</SelectItem>
                      <SelectItem value="+96599123456">+965 991 23456</SelectItem>
                      <SelectItem value="+96512345678">+965 123 45678</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="arabic">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4 bg-gray-50">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Start a conversation to test the AI booking flow</p>
                      <p className="text-sm mt-2">Try: "Book French manicure tomorrow 2PM Plaza Mall"</p>
                    </div>
                  )}
                  
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isFromAI ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[80%] ${message.isFromAI ? 'bg-white' : 'bg-blue-600 text-white'} rounded-lg p-3 shadow-sm`}>
                        <div className="flex items-start gap-2">
                          {message.isFromAI ? (
                            <Bot className="h-4 w-4 mt-1 text-blue-600" />
                          ) : (
                            <User className="h-4 w-4 mt-1" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                              <span>{formatTime(message.timestamp)}</span>
                              {message.metadata?.processingTime && (
                                <span>{message.metadata.processingTime}ms</span>
                              )}
                            </div>
                            
                            {/* Function calls and errors */}
                            {(message.metadata?.functionCalls?.length || message.metadata?.errors?.length) && (
                              <div className="mt-2 text-xs">
                                {message.metadata.functionCalls?.map((call, idx) => (
                                  <Badge key={idx} variant="secondary" className="mr-1 mb-1">
                                    {call}
                                  </Badge>
                                ))}
                                {message.metadata.errors?.map((error, idx) => (
                                  <Badge key={idx} variant="destructive" className="mr-1 mb-1">
                                    Error: {error}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-blue-600" />
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-gray-600">AI is processing...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>
              
              {/* Input Area */}
              <div className="p-4 border-t bg-white">
                <div className="flex gap-2">
                  <Textarea
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!currentMessage.trim() || isLoading}
                    className="px-6"
                  >
                    Send
                  </Button>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>Press Enter to send</span>
                  <span>•</span>
                  <span>Phone: {phoneNumber}</span>
                  <span>•</span>
                  <span>Language: {language}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar with State & Logs */}
        <div className="space-y-6">
          {/* Conversation State */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Booking State
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conversationState ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{conversationState.locationName || 'No location'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{conversationState.customerName || 'No name'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{conversationState.customerEmail || 'No email'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{conversationState.appointmentDate || 'No date'}</span>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Services ({conversationState.selectedServices.length})</p>
                    {conversationState.selectedServices.map((service, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded mb-1">
                        <span>{service.itemName}</span>
                        <span className="font-medium">{service.price} KWD</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No active booking session</p>
              )}
            </CardContent>
          </Card>

          {/* System Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {logs.length === 0 ? (
                  <p className="text-sm text-gray-500">No logs yet</p>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log, idx) => (
                      <div key={idx} className="text-xs font-mono bg-gray-50 p-2 rounded">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quick Test Buttons */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => setCurrentMessage("Hello, I want to book a French manicure")}
                >
                  Basic Service Request
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => setCurrentMessage("Book French manicure tomorrow 2PM Plaza Mall name Sarah email sarah@test.com")}
                >
                  Complete Booking Request
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => setCurrentMessage("What services do you offer?")}
                >
                  Service Inquiry
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => setCurrentMessage("Cancel my booking")}
                >
                  Cancellation Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}