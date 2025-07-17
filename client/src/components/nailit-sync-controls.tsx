import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, CheckCircle, AlertCircle, MapPin, Calendar, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NailItLocation {
  Location_Id: number;
  Location_Name: string;
  Address: string;
  Phone: string;
  From_Time: string;
  To_Time: string;
  Working_Days: string;
}

interface NailItService {
  Item_Id: number;
  Item_Name: string;
  Item_Desc: string;
  Primary_Price: number;
  Special_Price: number;
  Duration: string;
  Location_Ids: number[];
}

export default function NailItSyncControls() {
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for NailIt locations
  const { 
    data: locations = [], 
    isLoading: locationsLoading,
    error: locationsError 
  } = useQuery<NailItLocation[]>({
    queryKey: ["/api/nailit/locations"],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Derive sync status from existing queries instead of duplicate API calls
  const syncStatus = {
    deviceRegistered: !locationsError && locations.length > 0,
    lastSync: lastSyncTime,
    locationsCount: locations.length
  };

  // Mutation for syncing services
  const syncServicesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/nailit/sync-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Sync failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setLastSyncTime(new Date());
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nailit/locations"] });
      
      toast({
        title: "Sync Successful",
        description: "All NailIt services have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for device registration
  const registerDeviceMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/nailit/register-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nailit/locations"] });
      
      toast({
        title: "Device Registered",
        description: "Successfully registered with NailIt API.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSyncServices = () => {
    syncServicesMutation.mutate();
  };

  const handleRegisterDevice = () => {
    registerDeviceMutation.mutate();
  };

  const getConnectionStatus = () => {
    if (locationsError) return { status: "error", text: "Connection Failed", color: "destructive" };
    if (locations.length > 0) return { status: "connected", text: "Connected", color: "default" };
    if (locationsLoading) return { status: "checking", text: "Checking...", color: "secondary" };
    return { status: "disconnected", text: "Disconnected", color: "outline" };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                NailIt API Integration
              </CardTitle>
              <CardDescription>
                Real-time connection to NailIt POS system
              </CardDescription>
            </div>
            <Badge variant={connectionStatus.color as any}>
              {connectionStatus.text}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium">{locations.length} Locations</div>
                <div className="text-sm text-gray-600">Active branches</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium">
                  {lastSyncTime ? lastSyncTime.toLocaleTimeString() : "Never"}
                </div>
                <div className="text-sm text-gray-600">Last sync</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <div className="font-medium">Live Data</div>
                <div className="text-sm text-gray-600">Real-time updates</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSyncServices}
              disabled={syncServicesMutation.isPending}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncServicesMutation.isPending ? 'animate-spin' : ''}`} />
              {syncServicesMutation.isPending ? "Syncing..." : "Sync Services Now"}
            </Button>
            
            {!syncStatus?.deviceRegistered && (
              <Button
                variant="outline"
                onClick={handleRegisterDevice}
                disabled={registerDeviceMutation.isPending}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {registerDeviceMutation.isPending ? "Registering..." : "Register Device"}
              </Button>
            )}
          </div>

          {/* Connection Error */}
          {locationsError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                Unable to connect to NailIt API. Please check your internet connection.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Locations Card */}
      {locations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Locations</CardTitle>
            <CardDescription>
              Live data from NailIt salon locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {locations.map((location) => (
                <div key={location.Location_Id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium">{location.Location_Name}</h4>
                      <p className="text-sm text-gray-600">{location.Address}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>📞 {location.Phone}</span>
                        <span>🕐 {location.From_Time} - {location.To_Time}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      ID: {location.Location_Id}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}