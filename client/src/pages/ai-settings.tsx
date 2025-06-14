import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertAISettingsSchema } from "@shared/schema";
import type { AISettings } from "@shared/schema";
import { Save, AlertCircle } from "lucide-react";

export default function AISettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { data: settings, isLoading } = useQuery<AISettings>({
    queryKey: ["/api/ai-settings"],
  });

  const form = useForm({
    resolver: zodResolver(insertAISettingsSchema),
    defaultValues: {
      businessName: "",
      assistantName: "",
      businessType: "ecommerce",
      tone: "friendly",
      responseSpeed: "natural",
      autoSuggestProducts: true,
      collectCustomerInfo: true,
      welcomeMessage: "",
      appointmentDuration: 60,
      timeZone: "America/New_York",
      bookingLeadTime: 24,
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      form.reset({
        businessName: settings.businessName,
        assistantName: settings.assistantName,
        businessType: settings.businessType || "ecommerce",
        tone: settings.tone,
        responseSpeed: settings.responseSpeed,
        autoSuggestProducts: settings.autoSuggestProducts,
        collectCustomerInfo: settings.collectCustomerInfo,
        welcomeMessage: settings.welcomeMessage,
        appointmentDuration: settings.appointmentDuration || 60,
        timeZone: settings.timeZone || "America/New_York",
        bookingLeadTime: settings.bookingLeadTime || 24,
      });
      setHasUnsavedChanges(false);
    }
  }, [settings, form]);

  // Track form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/ai-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-settings"] });
      setHasUnsavedChanges(false);
      toast({ 
        title: "Configuration saved to database",
        description: "AI agent updated with new settings and product catalog",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Database save failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">AI Settings</h2>
              <p className="text-slate-600 mt-1">Configure your AI assistant's behavior and personality</p>
            </div>
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Unsaved Changes
              </Badge>
            )}
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">AI Settings</h2>
            <p className="text-slate-600 mt-1">Configure your AI assistant's behavior and personality</p>
          </div>
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Unsaved Changes
            </Badge>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>AI Agent Configuration</CardTitle>
            <p className="text-sm text-slate-600">Customize how your AI assistant interacts with customers</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Personality & Tone */}
                <div>
                  <h4 className="font-medium text-slate-800 mb-4">Personality & Tone</h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        {...form.register("businessName")}
                        placeholder="Your business name"
                      />
                      {form.formState.errors.businessName && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.businessName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="assistantName">AI Assistant Name</Label>
                      <Input
                        id="assistantName"
                        {...form.register("assistantName")}
                        placeholder="AI assistant name"
                      />
                      {form.formState.errors.assistantName && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.assistantName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="businessType">Business Type</Label>
                      <Select value={form.watch("businessType")} onValueChange={(value) => form.setValue("businessType", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ecommerce">E-commerce (Product Orders)</SelectItem>
                          <SelectItem value="appointment_based">Appointment Based (Bookings)</SelectItem>
                          <SelectItem value="hybrid">Hybrid (Both Orders & Appointments)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500 mt-1">
                        {form.watch("businessType") === "ecommerce" && "AI will focus on product sales and order processing"}
                        {form.watch("businessType") === "appointment_based" && "AI will handle appointment scheduling and service bookings"}
                        {form.watch("businessType") === "hybrid" && "AI will handle both product orders and appointment bookings"}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="tone">Tone of Voice</Label>
                      <Select value={form.watch("tone")} onValueChange={(value) => form.setValue("tone", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="friendly">Friendly & Casual</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                          <SelectItem value="helpful">Helpful & Supportive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Response Settings */}
                <div>
                  <h4 className="font-medium text-slate-800 mb-4">Response Settings</h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="responseSpeed">Response Speed</Label>
                      <Select value={form.watch("responseSpeed")} onValueChange={(value) => form.setValue("responseSpeed", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instant">Instant</SelectItem>
                          <SelectItem value="quick">Quick (1-2 seconds)</SelectItem>
                          <SelectItem value="natural">Natural (2-5 seconds)</SelectItem>
                          <SelectItem value="thoughtful">Thoughtful (5-10 seconds)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoSuggestProducts">Auto-suggest products</Label>
                      <Switch
                        id="autoSuggestProducts"
                        checked={form.watch("autoSuggestProducts")}
                        onCheckedChange={(checked) => form.setValue("autoSuggestProducts", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="collectCustomerInfo">Collect customer info</Label>
                      <Switch
                        id="collectCustomerInfo"
                        checked={form.watch("collectCustomerInfo")}
                        onCheckedChange={(checked) => form.setValue("collectCustomerInfo", checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Welcome Message */}
              <div>
                <h4 className="font-medium text-slate-800 mb-4">Welcome Message</h4>
                <div>
                  <Label htmlFor="welcomeMessage">Custom Welcome Message</Label>
                  <Textarea
                    id="welcomeMessage"
                    {...form.register("welcomeMessage")}
                    rows={3}
                    placeholder="Enter a custom welcome message for new customers"
                  />
                  {form.formState.errors.welcomeMessage && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.welcomeMessage.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Appointment Settings (conditional) */}
              {(form.watch("businessType") === "appointment_based" || form.watch("businessType") === "hybrid") && (
                <div>
                  <h4 className="font-medium text-slate-800 mb-4">Appointment Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="appointmentDuration">Default Duration (minutes)</Label>
                      <Input
                        id="appointmentDuration"
                        type="number"
                        {...form.register("appointmentDuration", { valueAsNumber: true })}
                        placeholder="60"
                        min="15"
                        step="15"
                      />
                    </div>

                    <div>
                      <Label htmlFor="timeZone">Time Zone</Label>
                      <Select value={form.watch("timeZone")} onValueChange={(value) => form.setValue("timeZone", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          <SelectItem value="America/Phoenix">Arizona Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="bookingLeadTime">Lead Time (hours)</Label>
                      <Input
                        id="bookingLeadTime"
                        type="number"
                        {...form.register("bookingLeadTime", { valueAsNumber: true })}
                        placeholder="24"
                        min="1"
                      />
                      <p className="text-xs text-slate-500 mt-1">Minimum hours in advance for bookings</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-slate-200">
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending || !hasUnsavedChanges}
                  className={hasUnsavedChanges ? "bg-[#ba212a] hover:bg-[#ba212a]/90" : ""}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Save className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {hasUnsavedChanges ? "Save AI Configuration" : "Configuration Saved"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
