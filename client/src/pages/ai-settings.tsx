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
import { Save, AlertCircle, MapPin, Plus, Trash2, ExternalLink } from "lucide-react";

export default function AISettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [locations, setLocations] = useState<Array<{
    id: number;
    name: string;
    address: string;
    googleMapsLink?: string;
  }>>([]);

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
      timeZone: "Asia/Kuwait",
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
      
      // Load locations if they exist, otherwise initialize with one empty location
      if (settings.locations && Array.isArray(settings.locations) && settings.locations.length > 0) {
        setLocations(settings.locations);
      } else {
        setLocations([{
          id: 1,
          name: "",
          address: "",
          googleMapsLink: ""
        }]);
      }
    }
  }, [settings, form]);

  // Track form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Location management functions
  const addLocation = () => {
    const newId = Math.max(0, ...locations.map(l => l.id)) + 1;
    setLocations([...locations, {
      id: newId,
      name: "",
      address: "",
      googleMapsLink: ""
    }]);
    setHasUnsavedChanges(true);
  };

  const updateLocation = (id: number, field: string, value: string) => {
    setLocations(locations.map(loc => 
      loc.id === id ? { ...loc, [field]: value } : loc
    ));
    setHasUnsavedChanges(true);
  };

  const removeLocation = (id: number) => {
    setLocations(locations.filter(loc => loc.id !== id));
    setHasUnsavedChanges(true);
  };

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
    // Include locations in the data being saved
    const dataWithLocations = {
      ...data,
      locations: locations.filter(loc => loc.name.trim() && loc.address.trim())
    };
    updateMutation.mutate(dataWithLocations);
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
                          <SelectItem value="natural">Natural & Conversational</SelectItem>
                          <SelectItem value="friendly">Friendly & Casual</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500 mt-1">
                        Natural tone uses phrases like "sure," "of course," "no worries" and keeps messages 40-250 characters
                      </p>
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
                          <SelectItem value="Asia/Kuwait">Kuwait Time (UTC+3)</SelectItem>
                          <SelectItem value="America/New_York">Eastern Time (UTC-5)</SelectItem>
                          <SelectItem value="America/Chicago">Central Time (UTC-6)</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time (UTC-7)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time (UTC-8)</SelectItem>
                          <SelectItem value="Europe/London">London Time (UTC+0)</SelectItem>
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

              {/* Locations Management Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#ba212a]" />
                  <h3 className="text-lg font-semibold">Business Locations</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Add your business locations with addresses and Google Maps links to help customers choose the right location for their appointments.
                </p>

                <div className="space-y-4">
                  {locations.map((location, index) => (
                    <div key={location.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-700">Location {index + 1}</h4>
                        {locations.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLocation(location.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`location-name-${location.id}`}>Location Name</Label>
                          <Input
                            id={`location-name-${location.id}`}
                            value={location.name}
                            onChange={(e) => updateLocation(location.id, 'name', e.target.value)}
                            placeholder="e.g., Main Branch, Downtown Location"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`location-address-${location.id}`}>Street Address</Label>
                          <Input
                            id={`location-address-${location.id}`}
                            value={location.address}
                            onChange={(e) => updateLocation(location.id, 'address', e.target.value)}
                            placeholder="e.g., 123 Kuwait City Center, Block 5"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <Label htmlFor={`location-maps-${location.id}`}>Google Maps Link (Optional)</Label>
                          <div className="flex gap-2">
                            <Input
                              id={`location-maps-${location.id}`}
                              value={location.googleMapsLink || ''}
                              onChange={(e) => updateLocation(location.id, 'googleMapsLink', e.target.value)}
                              placeholder="https://maps.google.com/..."
                            />
                            {location.googleMapsLink && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(location.googleMapsLink, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Copy the Google Maps link to help customers find your location easily
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addLocation}
                    className="w-full border-dashed border-slate-300 text-slate-600 hover:text-slate-700 hover:border-slate-400"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Location
                  </Button>
                </div>
              </div>

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
