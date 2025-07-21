import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Save, Upload, Eye, EyeOff, Zap, Settings, Bot, Database, MessageCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Comprehensive AI Agent Settings Schema
const aiAgentSettingsSchema = z.object({
  // Business Identity
  businessName: z.string().min(1, "Business name is required"),
  assistantName: z.string().min(1, "Assistant name is required"),
  welcomeMessageEN: z.string().min(1, "English welcome message is required"),
  welcomeMessageAR: z.string().min(1, "Arabic welcome message is required"),

  // Conversation Settings
  conversationTone: z.enum(["natural", "friendly", "professional", "enthusiastic"]),
  responseStyle: z.enum(["concise", "detailed", "conversational"]),
  defaultLanguage: z.enum(["en", "ar", "both"]),

  // OpenAI Configuration
  openaiModel: z.string().min(1, "OpenAI model is required"),
  openaiTemperature: z.number().min(0).max(2),
  maxTokens: z.number().min(1).max(4000),

  // System Prompts (Critical)
  systemPromptEN: z.string().min(50, "English system prompt must be at least 50 characters"),
  systemPromptAR: z.string().min(50, "Arabic system prompt must be at least 50 characters"),

  // Booking Behavior
  autoStaffAssignment: z.boolean(),
  collectCustomerInfo: z.boolean(),
  requireEmailConfirmation: z.boolean(),
  defaultPaymentMethod: z.enum(["cash", "card", "knet"]),

  // Response Preferences
  showServicePrices: z.boolean(),
  showServiceDuration: z.boolean(),
  showStaffNames: z.boolean(),
  maxServicesDisplay: z.number().min(1).max(20),

  // Integration Settings
  useNailItAPI: z.boolean(),
  fallbackToDatabase: z.boolean(),
});

type AIAgentSettings = z.infer<typeof aiAgentSettingsSchema>;

export default function AIAgentSettings() {
  const { toast } = useToast();
  const [isDraft, setIsDraft] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const queryClientInstance = queryClient;

  // Fetch current settings
  const { data: settings, isLoading, error } = useQuery<AIAgentSettings>({
    queryKey: ["/api/fresh-ai-settings"],
  });

  // Fetch environment variables and API status
  const { data: systemStatus } = useQuery({
    queryKey: ["/api/system/status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const form = useForm<AIAgentSettings>({
    resolver: zodResolver(aiAgentSettingsSchema),
    defaultValues: settings,
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset(settings);
      setIsDraft(false);
    }
  }, [settings, form]);

  // Save Draft Mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (data: AIAgentSettings) => {
      const response = await fetch("/api/fresh-ai-settings/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    onSuccess: () => {
      setIsDraft(true);
      toast({
        title: "Draft Saved",
        description: "Your changes have been saved as a draft",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save draft",
        variant: "destructive",
      });
    },
  });

  // Publish Live Mutation
  const publishMutation = useMutation({
    mutationFn: async (data: AIAgentSettings) => {
      setIsPublishing(true);
      const response = await fetch("/api/fresh-ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ["/api/fresh-ai-settings"] });
      setIsDraft(false);
      setIsPublishing(false);
      toast({
        title: "Settings Published",
        description: "AI agent has been updated with new settings instantly",
      });
    },
    onError: (error: any) => {
      setIsPublishing(false);
      toast({
        title: "Error",
        description: error.message || "Failed to publish settings",
        variant: "destructive",
      });
    },
  });

  // Test AI Agent Mutation
  const testAgentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/fresh-ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: "test",
          message: "Hello, test my settings"
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Test Successful",
        description: `AI responded: "${data.response?.message?.substring(0, 100)}..."`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "AI agent test failed",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AIAgentSettings) => {
    publishMutation.mutate(data);
  };

  const saveDraft = () => {
    const data = form.getValues();
    saveDraftMutation.mutate(data);
  };

  const testAgent = () => {
    testAgentMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load AI agent settings. Please refresh the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="w-8 h-8 text-blue-600" />
            AI Agent Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Complete control panel for your AI assistant configuration
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {isDraft && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
              Draft Changes
            </Badge>
          )}
          
          <Button 
            variant="outline" 
            onClick={testAgent}
            disabled={testAgentMutation.isPending}
          >
            <Zap className="w-4 h-4 mr-2" />
            Test Agent
          </Button>
          
          <Button onClick={saveDraft} disabled={saveDraftMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={publishMutation.isPending || isPublishing}
            className="bg-green-600 hover:bg-green-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isPublishing ? "Publishing..." : "Publish Live"}
          </Button>
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">AI Agent Online</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">NailIt API Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">RAG System Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">WhatsApp Ready</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="identity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="conversation">Conversation</TabsTrigger>
            <TabsTrigger value="prompts">System Prompts</TabsTrigger>
            <TabsTrigger value="behavior">Behavior</TabsTrigger>
            <TabsTrigger value="integration">Integration</TabsTrigger>
          </TabsList>

          {/* Business Identity */}
          <TabsContent value="identity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      {...form.register("businessName")}
                      placeholder="NailIt Salon"
                    />
                    {form.formState.errors.businessName && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.businessName.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="assistantName">Assistant Name</Label>
                    <Input
                      id="assistantName"
                      {...form.register("assistantName")}
                      placeholder="NailIt Assistant"
                    />
                    {form.formState.errors.assistantName && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.assistantName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="welcomeMessageEN">Welcome Message (English)</Label>
                  <Textarea
                    id="welcomeMessageEN"
                    {...form.register("welcomeMessageEN")}
                    placeholder="Welcome to NailIt! How can I help you today?"
                    rows={3}
                  />
                  {form.formState.errors.welcomeMessageEN && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.welcomeMessageEN.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="welcomeMessageAR">Welcome Message (Arabic)</Label>
                  <Textarea
                    id="welcomeMessageAR"
                    {...form.register("welcomeMessageAR")}
                    placeholder="مرحباً بك في نيل إت! كيف يمكنني مساعدتك اليوم؟"
                    rows={3}
                  />
                  {form.formState.errors.welcomeMessageAR && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.welcomeMessageAR.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conversation Settings */}
          <TabsContent value="conversation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Conversation Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Conversation Tone</Label>
                    <Select
                      value={form.watch("conversationTone")}
                      onValueChange={(value) => form.setValue("conversationTone", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="natural">Natural</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Response Style</Label>
                    <Select
                      value={form.watch("responseStyle")}
                      onValueChange={(value) => form.setValue("responseStyle", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concise">Concise</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                        <SelectItem value="conversational">Conversational</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Default Language</Label>
                    <Select
                      value={form.watch("defaultLanguage")}
                      onValueChange={(value) => form.setValue("defaultLanguage", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                        <SelectItem value="both">Both Languages</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">OpenAI Model Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="openaiModel">Model</Label>
                      <Select
                        value={form.watch("openaiModel")}
                        onValueChange={(value) => form.setValue("openaiModel", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4">GPT-4</SelectItem>
                          <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="openaiTemperature">Temperature (0-2)</Label>
                      <Input
                        id="openaiTemperature"
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        {...form.register("openaiTemperature", { valueAsNumber: true })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="maxTokens">Max Tokens</Label>
                      <Input
                        id="maxTokens"
                        type="number"
                        min="1"
                        max="4000"
                        {...form.register("maxTokens", { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Prompts */}
          <TabsContent value="prompts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>System Prompts (Critical Configuration)</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSecrets(!showSecrets)}
                  >
                    {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showSecrets ? "Hide" : "Show"} Prompts
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    System prompts define how your AI agent behaves. Changes here affect all conversations immediately after publishing.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="systemPromptEN">System Prompt (English)</Label>
                  <Textarea
                    id="systemPromptEN"
                    {...form.register("systemPromptEN")}
                    rows={showSecrets ? 12 : 4}
                    className={`font-mono text-sm ${!showSecrets ? 'filter blur-sm' : ''}`}
                    placeholder="You are a professional customer service agent..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Characters: {form.watch("systemPromptEN")?.length || 0}
                  </p>
                  {form.formState.errors.systemPromptEN && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.systemPromptEN.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="systemPromptAR">System Prompt (Arabic)</Label>
                  <Textarea
                    id="systemPromptAR"
                    {...form.register("systemPromptAR")}
                    rows={showSecrets ? 12 : 4}
                    className={`font-mono text-sm ${!showSecrets ? 'filter blur-sm' : ''}`}
                    placeholder="أنت وكيل خدمة عملاء مهني..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Characters: {form.watch("systemPromptAR")?.length || 0}
                  </p>
                  {form.formState.errors.systemPromptAR && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.systemPromptAR.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Behavior Settings */}
          <TabsContent value="behavior" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Booking Behavior</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="autoStaffAssignment">Auto Staff Assignment</Label>
                      <p className="text-sm text-gray-600">Automatically assign staff to bookings</p>
                    </div>
                    <Switch
                      id="autoStaffAssignment"
                      checked={form.watch("autoStaffAssignment")}
                      onCheckedChange={(checked) => form.setValue("autoStaffAssignment", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="collectCustomerInfo">Collect Customer Info</Label>
                      <p className="text-sm text-gray-600">Gather customer details during booking</p>
                    </div>
                    <Switch
                      id="collectCustomerInfo"
                      checked={form.watch("collectCustomerInfo")}
                      onCheckedChange={(checked) => form.setValue("collectCustomerInfo", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="requireEmailConfirmation">Require Email Confirmation</Label>
                      <p className="text-sm text-gray-600">Send booking confirmations via email</p>
                    </div>
                    <Switch
                      id="requireEmailConfirmation"
                      checked={form.watch("requireEmailConfirmation")}
                      onCheckedChange={(checked) => form.setValue("requireEmailConfirmation", checked)}
                    />
                  </div>

                  <div>
                    <Label>Default Payment Method</Label>
                    <Select
                      value={form.watch("defaultPaymentMethod")}
                      onValueChange={(value) => form.setValue("defaultPaymentMethod", value as any)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash on Arrival</SelectItem>
                        <SelectItem value="card">Credit/Debit Card</SelectItem>
                        <SelectItem value="knet">KNet (Kuwait)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="showServicePrices">Show Service Prices</Label>
                      <p className="text-sm text-gray-600">Display prices when suggesting services</p>
                    </div>
                    <Switch
                      id="showServicePrices"
                      checked={form.watch("showServicePrices")}
                      onCheckedChange={(checked) => form.setValue("showServicePrices", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="showServiceDuration">Show Service Duration</Label>
                      <p className="text-sm text-gray-600">Display estimated time for services</p>
                    </div>
                    <Switch
                      id="showServiceDuration"
                      checked={form.watch("showServiceDuration")}
                      onCheckedChange={(checked) => form.setValue("showServiceDuration", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="showStaffNames">Show Staff Names</Label>
                      <p className="text-sm text-gray-600">Include staff member names in responses</p>
                    </div>
                    <Switch
                      id="showStaffNames"
                      checked={form.watch("showStaffNames")}
                      onCheckedChange={(checked) => form.setValue("showStaffNames", checked)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxServicesDisplay">Max Services to Display</Label>
                    <Input
                      id="maxServicesDisplay"
                      type="number"
                      min="1"
                      max="20"
                      {...form.register("maxServicesDisplay", { valueAsNumber: true })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum number of services to show in each recommendation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integration Settings */}
          <TabsContent value="integration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  API Integration Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="useNailItAPI">Use NailIt API</Label>
                      <p className="text-sm text-gray-600">Connect to live NailIt POS system</p>
                    </div>
                    <Switch
                      id="useNailItAPI"
                      checked={form.watch("useNailItAPI")}
                      onCheckedChange={(checked) => form.setValue("useNailItAPI", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="fallbackToDatabase">Fallback to Database</Label>
                      <p className="text-sm text-gray-600">Use local cached data if API is unavailable</p>
                    </div>
                    <Switch
                      id="fallbackToDatabase"
                      checked={form.watch("fallbackToDatabase")}
                      onCheckedChange={(checked) => form.setValue("fallbackToDatabase", checked)}
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">RAG System Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded">
                      <strong>Cached Services:</strong> 1,105 services
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <strong>Search Performance:</strong> &lt;500ms
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <strong>Locations Covered:</strong> 3 locations
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <strong>Last Sync:</strong> {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}