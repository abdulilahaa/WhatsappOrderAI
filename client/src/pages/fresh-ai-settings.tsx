import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Settings, Bot, Globe, MessageCircle, Brain, CreditCard, Users, Save, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { FreshAISettings } from '@shared/schema';

export default function FreshAISettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('identity');

  const { data: settings, isLoading } = useQuery<FreshAISettings>({
    queryKey: ['/api/fresh-ai-settings'],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<FreshAISettings>) => {
      return apiRequest('PUT', '/api/fresh-ai-settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fresh-ai-settings'] });
      toast({
        title: "Settings Updated",
        description: "Fresh AI settings have been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: Partial<FreshAISettings>) => {
    updateSettingsMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        Failed to load settings
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Bot className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Fresh AI Settings</h1>
          <p className="text-gray-600">Configure your AI assistant's behavior and responses</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="identity" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Identity
          </TabsTrigger>
          <TabsTrigger value="conversation" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Conversation
          </TabsTrigger>
          <TabsTrigger value="language" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Language
          </TabsTrigger>
          <TabsTrigger value="ai-model" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Model
          </TabsTrigger>
          <TabsTrigger value="booking" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Booking
          </TabsTrigger>
          <TabsTrigger value="display" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Display
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="space-y-6">
          <BusinessIdentityForm settings={settings} onSubmit={handleSubmit} isLoading={updateSettingsMutation.isPending} />
        </TabsContent>

        <TabsContent value="conversation" className="space-y-6">
          <ConversationForm settings={settings} onSubmit={handleSubmit} isLoading={updateSettingsMutation.isPending} />
        </TabsContent>

        <TabsContent value="language" className="space-y-6">
          <LanguageForm settings={settings} onSubmit={handleSubmit} isLoading={updateSettingsMutation.isPending} />
        </TabsContent>

        <TabsContent value="ai-model" className="space-y-6">
          <AIModelForm settings={settings} onSubmit={handleSubmit} isLoading={updateSettingsMutation.isPending} />
        </TabsContent>

        <TabsContent value="booking" className="space-y-6">
          <BookingForm settings={settings} onSubmit={handleSubmit} isLoading={updateSettingsMutation.isPending} />
        </TabsContent>

        <TabsContent value="display" className="space-y-6">
          <DisplayForm settings={settings} onSubmit={handleSubmit} isLoading={updateSettingsMutation.isPending} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BusinessIdentityForm({ settings, onSubmit, isLoading }: { settings: FreshAISettings; onSubmit: (data: Partial<FreshAISettings>) => void; isLoading: boolean }) {
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [assistantName, setAssistantName] = useState(settings.assistantName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ businessName, assistantName });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Identity</CardTitle>
        <CardDescription>Configure how your AI assistant identifies itself</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter your business name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assistantName">Assistant Name</Label>
              <Input
                id="assistantName"
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                placeholder="Enter AI assistant name"
              />
            </div>
          </div>
          <Button type="submit" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Saving..." : "Save Identity"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ConversationForm({ settings, onSubmit, isLoading }: { settings: FreshAISettings; onSubmit: (data: Partial<FreshAISettings>) => void; isLoading: boolean }) {
  const [conversationTone, setConversationTone] = useState(settings.conversationTone);
  const [responseStyle, setResponseStyle] = useState(settings.responseStyle);
  const [collectCustomerInfo, setCollectCustomerInfo] = useState(settings.collectCustomerInfo);
  const [requireEmailConfirmation, setRequireEmailConfirmation] = useState(settings.requireEmailConfirmation);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ conversationTone, responseStyle, collectCustomerInfo, requireEmailConfirmation });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversation Settings</CardTitle>
        <CardDescription>Configure how your AI assistant communicates</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="conversationTone">Conversation Tone</Label>
              <Select value={conversationTone} onValueChange={setConversationTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural">Natural</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="responseStyle">Response Style</Label>
              <Select value={responseStyle} onValueChange={setResponseStyle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concise">Concise</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="collectCustomerInfo">Collect Customer Information</Label>
              <Switch
                id="collectCustomerInfo"
                checked={collectCustomerInfo}
                onCheckedChange={setCollectCustomerInfo}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="requireEmailConfirmation">Require Email Confirmation</Label>
              <Switch
                id="requireEmailConfirmation"
                checked={requireEmailConfirmation}
                onCheckedChange={setRequireEmailConfirmation}
              />
            </div>
          </div>
          <Button type="submit" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Saving..." : "Save Conversation Settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function LanguageForm({ settings, onSubmit, isLoading }: { settings: FreshAISettings; onSubmit: (data: Partial<FreshAISettings>) => void; isLoading: boolean }) {
  const [defaultLanguage, setDefaultLanguage] = useState(settings.defaultLanguage);
  const [welcomeMessageEN, setWelcomeMessageEN] = useState(settings.welcomeMessageEN);
  const [welcomeMessageAR, setWelcomeMessageAR] = useState(settings.welcomeMessageAR);
  const [systemPromptEN, setSystemPromptEN] = useState(settings.systemPromptEN);
  const [systemPromptAR, setSystemPromptAR] = useState(settings.systemPromptAR);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ defaultLanguage, welcomeMessageEN, welcomeMessageAR, systemPromptEN, systemPromptAR });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Language Settings</CardTitle>
        <CardDescription>Configure multilingual messages and system prompts</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultLanguage">Default Language</Label>
            <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Select default language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabic</SelectItem>
                <SelectItem value="both">Both (Auto-detect)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="welcomeMessageEN">Welcome Message (English)</Label>
              <Textarea
                id="welcomeMessageEN"
                value={welcomeMessageEN}
                onChange={(e) => setWelcomeMessageEN(e.target.value)}
                placeholder="Enter welcome message in English"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcomeMessageAR">Welcome Message (Arabic)</Label>
              <Textarea
                id="welcomeMessageAR"
                value={welcomeMessageAR}
                onChange={(e) => setWelcomeMessageAR(e.target.value)}
                placeholder="Enter welcome message in Arabic"
                rows={3}
              />
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="systemPromptEN">System Prompt (English)</Label>
              <Textarea
                id="systemPromptEN"
                value={systemPromptEN}
                onChange={(e) => setSystemPromptEN(e.target.value)}
                placeholder="Enter system prompt in English"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="systemPromptAR">System Prompt (Arabic)</Label>
              <Textarea
                id="systemPromptAR"
                value={systemPromptAR}
                onChange={(e) => setSystemPromptAR(e.target.value)}
                placeholder="Enter system prompt in Arabic"
                rows={4}
              />
            </div>
          </div>
          <Button type="submit" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Saving..." : "Save Language Settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AIModelForm({ settings, onSubmit, isLoading }: { settings: FreshAISettings; onSubmit: (data: Partial<FreshAISettings>) => void; isLoading: boolean }) {
  const [openaiModel, setOpenaiModel] = useState(settings.openaiModel);
  const [openaiTemperature, setOpenaiTemperature] = useState(settings.openaiTemperature);
  const [maxTokens, setMaxTokens] = useState(settings.maxTokens);
  const [useNailItAPI, setUseNailItAPI] = useState(settings.useNailItAPI);
  const [fallbackToDatabase, setFallbackToDatabase] = useState(settings.fallbackToDatabase);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ openaiModel, openaiTemperature, maxTokens, useNailItAPI, fallbackToDatabase });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Model Configuration</CardTitle>
        <CardDescription>Configure OpenAI model and integration settings</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="openaiModel">OpenAI Model</Label>
              <Select value={openaiModel} onValueChange={setOpenaiModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">GPT-4 (Recommended)</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="openaiTemperature">Temperature</Label>
              <Input
                id="openaiTemperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={openaiTemperature}
                onChange={(e) => setOpenaiTemperature(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                min="100"
                max="4000"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
              />
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="useNailItAPI">Use NailIt API</Label>
              <Switch
                id="useNailItAPI"
                checked={useNailItAPI}
                onCheckedChange={setUseNailItAPI}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="fallbackToDatabase">Fallback to Database</Label>
              <Switch
                id="fallbackToDatabase"
                checked={fallbackToDatabase}
                onCheckedChange={setFallbackToDatabase}
              />
            </div>
          </div>
          <Button type="submit" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Saving..." : "Save AI Model Settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function BookingForm({ settings, onSubmit, isLoading }: { settings: FreshAISettings; onSubmit: (data: Partial<FreshAISettings>) => void; isLoading: boolean }) {
  const [autoStaffAssignment, setAutoStaffAssignment] = useState(settings.autoStaffAssignment);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(settings.defaultPaymentMethod);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ autoStaffAssignment, defaultPaymentMethod });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Behavior</CardTitle>
        <CardDescription>Configure how the AI handles bookings and appointments</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="autoStaffAssignment">Auto Staff Assignment</Label>
              <Switch
                id="autoStaffAssignment"
                checked={autoStaffAssignment}
                onCheckedChange={setAutoStaffAssignment}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultPaymentMethod">Default Payment Method</Label>
              <Select value={defaultPaymentMethod || ""} onValueChange={setDefaultPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash on Arrival</SelectItem>
                  <SelectItem value="card">Credit Card</SelectItem>
                  <SelectItem value="knet">KNet</SelectItem>
                  <SelectItem value="apple_pay">Apple Pay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Saving..." : "Save Booking Settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DisplayForm({ settings, onSubmit, isLoading }: { settings: FreshAISettings; onSubmit: (data: Partial<FreshAISettings>) => void; isLoading: boolean }) {
  const [showServicePrices, setShowServicePrices] = useState(settings.showServicePrices);
  const [showServiceDuration, setShowServiceDuration] = useState(settings.showServiceDuration);
  const [showStaffNames, setShowStaffNames] = useState(settings.showStaffNames);
  const [maxServicesDisplay, setMaxServicesDisplay] = useState(settings.maxServicesDisplay);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ showServicePrices, showServiceDuration, showStaffNames, maxServicesDisplay });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Display Preferences</CardTitle>
        <CardDescription>Configure what information to show in AI responses</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="showServicePrices">Show Service Prices</Label>
              <Switch
                id="showServicePrices"
                checked={showServicePrices}
                onCheckedChange={setShowServicePrices}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showServiceDuration">Show Service Duration</Label>
              <Switch
                id="showServiceDuration"
                checked={showServiceDuration}
                onCheckedChange={setShowServiceDuration}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showStaffNames">Show Staff Names</Label>
              <Switch
                id="showStaffNames"
                checked={showStaffNames}
                onCheckedChange={setShowStaffNames}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxServicesDisplay">Max Services to Display</Label>
              <Input
                id="maxServicesDisplay"
                type="number"
                min="1"
                max="10"
                value={maxServicesDisplay}
                onChange={(e) => setMaxServicesDisplay(Number(e.target.value))}
              />
            </div>
          </div>
          <Button type="submit" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Saving..." : "Save Display Settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}