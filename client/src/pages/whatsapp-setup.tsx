import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertWhatsAppSettingsSchema } from "@shared/schema";
import type { WhatsAppSettings } from "@shared/schema";
import { z } from "zod";

const testMessageSchema = z.object({
  phoneNumber: z.string().min(1, "Phone number is required"),
  message: z.string().min(1, "Message is required"),
});

type TestMessageForm = z.infer<typeof testMessageSchema>;

export default function WhatsAppSetup() {
  const [testMessageSent, setTestMessageSent] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<WhatsAppSettings>({
    queryKey: ["/api/whatsapp-settings"],
  });

  const form = useForm({
    resolver: zodResolver(insertWhatsAppSettingsSchema),
    defaultValues: {
      phoneNumberId: settings?.phoneNumberId || "",
      accessToken: settings?.accessToken || "",
      webhookVerifyToken: settings?.webhookVerifyToken || "",
    },
  });

  const testForm = useForm<TestMessageForm>({
    resolver: zodResolver(testMessageSchema),
    defaultValues: {
      phoneNumber: "",
      message: "Hello! This is a test message from your WhatsApp AI ordering system.",
    },
  });

  // Update form when settings load
  if (settings && !form.formState.isDirty) {
    form.reset({
      phoneNumberId: settings.phoneNumberId || "",
      accessToken: settings.accessToken || "",
      webhookVerifyToken: settings.webhookVerifyToken || "",
    });
  }

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/whatsapp-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-settings"] });
      toast({ title: "WhatsApp settings updated successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating WhatsApp settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testMessageMutation = useMutation({
    mutationFn: (data: TestMessageForm) => 
      apiRequest("POST", "/api/whatsapp/test-message", data),
    onSuccess: () => {
      setTestMessageSent(true);
      toast({ title: "Test message sent successfully!" });
      testForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error sending test message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  const onTestMessage = (data: TestMessageForm) => {
    testMessageMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">WhatsApp Setup</h2>
            <p className="text-slate-600 mt-1">Configure WhatsApp Business API integration</p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-6">
                <div className="h-6 bg-slate-200 rounded w-48"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-slate-200 rounded w-32"></div>
                  <div className="h-10 bg-slate-200 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isConfigured = settings?.isConfigured;
  const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">WhatsApp Setup</h2>
            <p className="text-slate-600 mt-1">Configure WhatsApp Business API integration</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant={isConfigured ? "default" : "secondary"} className={isConfigured ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
              <i className={`fas ${isConfigured ? "fa-check-circle" : "fa-exclamation-triangle"} mr-1`}></i>
              {isConfigured ? "Configured" : "Not Configured"}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fab fa-whatsapp text-whatsapp mr-3"></i>
                WhatsApp Business API Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <i className="fas fa-info-circle"></i>
                  <AlertDescription>
                    To enable WhatsApp integration, you need to set up a WhatsApp Business API account and configure the webhook settings below.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">Step 1: WhatsApp Business Account</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>• Create a Meta Developer account</li>
                      <li>• Set up WhatsApp Business API</li>
                      <li>• Get your Phone Number ID and Access Token</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">Step 2: Webhook Configuration</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>• Set webhook URL in Meta Developer Console</li>
                      <li>• Configure verify token</li>
                      <li>• Subscribe to message events</li>
                    </ul>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-medium text-slate-800 mb-2">Your Webhook URL:</h4>
                  <div className="flex items-center space-x-2">
                    <code className="bg-white px-2 py-1 rounded border text-sm flex-1">{webhookUrl}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(webhookUrl);
                        toast({ title: "Webhook URL copied to clipboard!" });
                      }}
                    >
                      <i className="fas fa-copy"></i>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Form */}
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings">API Settings</TabsTrigger>
              <TabsTrigger value="test">Test Integration</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>API Configuration</CardTitle>
                  <p className="text-sm text-slate-600">Enter your WhatsApp Business API credentials</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                      <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                      <Input
                        id="phoneNumberId"
                        {...form.register("phoneNumberId")}
                        placeholder="Enter your WhatsApp Phone Number ID"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Found in your Meta Developer Console under WhatsApp → API Setup
                      </p>
                      {form.formState.errors.phoneNumberId && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.phoneNumberId.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="accessToken">Access Token</Label>
                      <Input
                        id="accessToken"
                        type="password"
                        {...form.register("accessToken")}
                        placeholder="Enter your WhatsApp Access Token"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Temporary or permanent access token from Meta Developer Console
                      </p>
                      {form.formState.errors.accessToken && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.accessToken.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="webhookVerifyToken">Webhook Verify Token</Label>
                      <Input
                        id="webhookVerifyToken"
                        {...form.register("webhookVerifyToken")}
                        placeholder="Enter a secure verify token"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Create a secure token for webhook verification (use the same token in Meta Console)
                      </p>
                      {form.formState.errors.webhookVerifyToken && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.webhookVerifyToken.message}
                        </p>
                      )}
                    </div>

                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        disabled={updateMutation.isPending}
                        className="bg-whatsapp hover:bg-whatsapp/90"
                      >
                        {updateMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Saving...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save mr-2"></i>
                            Save Configuration
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="test" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Test WhatsApp Integration</CardTitle>
                  <p className="text-sm text-slate-600">Send a test message to verify your setup</p>
                </CardHeader>
                <CardContent>
                  {!isConfigured ? (
                    <Alert>
                      <i className="fas fa-exclamation-triangle"></i>
                      <AlertDescription>
                        Please configure your WhatsApp API settings first before testing.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <form onSubmit={testForm.handleSubmit(onTestMessage)} className="space-y-4">
                      <div>
                        <Label htmlFor="phoneNumber">Test Phone Number</Label>
                        <Input
                          id="phoneNumber"
                          {...testForm.register("phoneNumber")}
                          placeholder="+1234567890"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Include country code (e.g., +1 for US, +44 for UK)
                        </p>
                        {testForm.formState.errors.phoneNumber && (
                          <p className="text-sm text-red-600 mt-1">
                            {testForm.formState.errors.phoneNumber.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="message">Test Message</Label>
                        <Textarea
                          id="message"
                          {...testForm.register("message")}
                          rows={3}
                          placeholder="Enter your test message"
                        />
                        {testForm.formState.errors.message && (
                          <p className="text-sm text-red-600 mt-1">
                            {testForm.formState.errors.message.message}
                          </p>
                        )}
                      </div>

                      <Button 
                        type="submit" 
                        disabled={testMessageMutation.isPending}
                        className="bg-ai hover:bg-ai/90"
                      >
                        {testMessageMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Sending...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-paper-plane mr-2"></i>
                            Send Test Message
                          </>
                        )}
                      </Button>

                      {testMessageSent && (
                        <Alert className="border-green-200 bg-green-50">
                          <i className="fas fa-check-circle text-green-600"></i>
                          <AlertDescription className="text-green-800">
                            Test message sent successfully! Check the recipient's WhatsApp for the message.
                          </AlertDescription>
                        </Alert>
                      )}
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Status and Documentation */}
          <Card>
            <CardHeader>
              <CardTitle>Integration Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-slate-800 mb-3">Configuration Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${settings?.phoneNumberId ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm">Phone Number ID</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${settings?.accessToken ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm">Access Token</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${settings?.webhookVerifyToken ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm">Webhook Verify Token</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-slate-800 mb-3">Next Steps</h4>
                  <div className="text-sm text-slate-600 space-y-1">
                    {!isConfigured ? (
                      <>
                        <p>• Complete API configuration</p>
                        <p>• Test the integration</p>
                        <p>• Configure webhook in Meta Console</p>
                      </>
                    ) : (
                      <>
                        <p>✓ Configuration complete</p>
                        <p>• Test message functionality</p>
                        <p>• Monitor customer conversations</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
