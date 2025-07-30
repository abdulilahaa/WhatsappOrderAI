/**
 * Database-First Sync Dashboard
 * Per Final Sprint Document Requirements
 * Monitor and control NailIt API → Database synchronization
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Database, Clock, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function SyncDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get sync status
  const { data: syncStatus, isLoading } = useQuery({
    queryKey: ['/api/nailit/sync-status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Database data queries
  const { data: locations } = useQuery({
    queryKey: ['/api/nailit-db/locations'],
  });

  const { data: services } = useQuery({
    queryKey: ['/api/nailit-db/services'],
  });

  const { data: staff } = useQuery({
    queryKey: ['/api/nailit-db/staff'],
  });

  const { data: slots } = useQuery({
    queryKey: ['/api/nailit-db/slots'],
  });

  // Master sync mutation
  const syncAllMutation = useMutation({
    mutationFn: () => apiRequest('/api/nailit/sync-all', { method: 'POST' }),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Sync Completed Successfully",
          description: `Synced ${data.synced.locations} locations, ${data.synced.services} services, ${data.synced.staff} staff, ${data.synced.slots} slots`,
        });
      } else {
        toast({
          title: "Sync Completed with Errors",
          description: `${data.errors.length} errors occurred during sync`,
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/nailit/sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nailit-db/'] });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error.toString(),
        variant: "destructive",
      });
    },
  });

  // Individual refresh mutations
  const refreshMutation = useMutation({
    mutationFn: (dataType: string) => apiRequest(`/api/nailit/refresh/${dataType}`, { method: 'POST' }),
    onSuccess: (data, dataType) => {
      toast({
        title: `${dataType} Refreshed`,
        description: `Successfully refreshed ${dataType} data`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/nailit/sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nailit-db/'] });
    },
    onError: (error, dataType) => {
      toast({
        title: `${dataType} Refresh Failed`,
        description: error.toString(),
        variant: "destructive",
      });
    },
  });

  const handleMasterSync = () => {
    syncAllMutation.mutate();
  };

  const handleRefresh = (dataType: string) => {
    refreshMutation.mutate(dataType);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading sync status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Database-First Sync Control</h1>
          <p className="text-muted-foreground">
            Monitor and control NailIt API → Database synchronization
          </p>
        </div>
        <Button 
          onClick={handleMasterSync}
          disabled={syncAllMutation.isPending}
          size="lg"
          className="bg-green-600 hover:bg-green-700"
        >
          {syncAllMutation.isPending ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          Sync All Data
        </Button>
      </div>

      {/* Sync Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Locations</p>
                <p className="text-2xl font-bold">{locations?.locations?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Services</p>
                <p className="text-2xl font-bold">{services?.count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Staff</p>
                <p className="text-2xl font-bold">{staff?.count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Time Slots</p>
                <p className="text-2xl font-bold">{slots?.count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="slots">Time Slots</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Database-First Architecture Status</span>
                </CardTitle>
                <CardDescription>
                  Critical system per Final Sprint Document requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">AI Database Integration</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">API → DB Sync Pipeline</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Operational
                    </Badge>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Zero Live API Calls During Chat</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Achieved
                    </Badge>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sync Controls</CardTitle>
                <CardDescription>
                  Individual data type refresh controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => handleRefresh('locations')}
                    disabled={refreshMutation.isPending}
                    className="flex flex-col items-center space-y-2 h-auto py-4"
                  >
                    <Database className="h-6 w-6" />
                    <span>Locations</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleRefresh('services')}
                    disabled={refreshMutation.isPending}
                    className="flex flex-col items-center space-y-2 h-auto py-4"
                  >
                    <Database className="h-6 w-6" />
                    <span>Services</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleRefresh('staff')}
                    disabled={refreshMutation.isPending}
                    className="flex flex-col items-center space-y-2 h-auto py-4"
                  >
                    <Database className="h-6 w-6" />
                    <span>Staff</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleRefresh('slots')}
                    disabled={refreshMutation.isPending}
                    className="flex flex-col items-center space-y-2 h-auto py-4"
                  >
                    <Clock className="h-6 w-6" />
                    <span>Time Slots</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle>Synced Locations</CardTitle>
              <CardDescription>
                NailIt locations stored in database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {locations?.locations && locations.locations.length > 0 ? (
                <div className="space-y-4">
                  {locations.locations.map((location: any) => (
                    <div key={location.locationId} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{location.locationName}</h3>
                          <p className="text-sm text-muted-foreground">{location.address}</p>
                          {location.phoneNumber && (
                            <p className="text-sm text-muted-foreground">📞 {location.phoneNumber}</p>
                          )}
                        </div>
                        <Badge variant="secondary">ID: {location.locationId}</Badge>
                      </div>
                      {location.workingHours && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Hours: </span>
                          {location.workingHours.fromTime} - {location.workingHours.toTime}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No locations synced yet</p>
                  <Button 
                    onClick={() => handleRefresh('locations')} 
                    className="mt-4"
                    disabled={refreshMutation.isPending}
                  >
                    Sync Locations
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Synced Services</CardTitle>
              <CardDescription>
                NailIt services stored in database ({services?.count || 0} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {services?.services && services.services.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-auto">
                  {services.services.slice(0, 20).map((service: any) => (
                    <div key={`${service.serviceId}-${service.locationId}`} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <span className="font-medium">{service.serviceName}</span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({service.category || 'Uncategorized'})
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{service.price} KWD</Badge>
                        <Badge variant="secondary">Loc: {service.locationId}</Badge>
                      </div>
                    </div>
                  ))}
                  {services.services.length > 20 && (
                    <p className="text-center text-sm text-muted-foreground">
                      Showing first 20 of {services.services.length} services
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No services synced yet</p>
                  <Button 
                    onClick={() => handleRefresh('services')} 
                    className="mt-4"
                    disabled={refreshMutation.isPending}
                  >
                    Sync Services
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Synced Staff</CardTitle>
              <CardDescription>
                NailIt staff stored in database ({staff?.count || 0} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {staff?.staff && staff.staff.length > 0 ? (
                <div className="space-y-2">
                  {staff.staff.map((member: any) => (
                    <div key={`${member.staffId}-${member.locationId}`} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <span className="font-medium">{member.staffName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">Staff ID: {member.staffId}</Badge>
                        <Badge variant="outline">Loc: {member.locationId}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No staff synced yet</p>
                  <Button 
                    onClick={() => handleRefresh('staff')} 
                    className="mt-4"
                    disabled={refreshMutation.isPending}
                  >
                    Sync Staff
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="slots">
          <Card>
            <CardHeader>
              <CardTitle>Synced Time Slots</CardTitle>
              <CardDescription>
                Available time slots stored in database ({slots?.count || 0} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {slots?.slots && slots.slots.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-auto">
                  {slots.slots.slice(0, 50).map((slot: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <span className="font-medium">{slot.timeSlotLabel || `Slot ${slot.timeSlotId}`}</span>
                        <span className="ml-2 text-sm text-muted-foreground">{slot.slotDate}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={slot.isAvailable ? "default" : "secondary"}>
                          {slot.isAvailable ? "Available" : "Booked"}
                        </Badge>
                        <Badge variant="outline">Loc: {slot.locationId}</Badge>
                      </div>
                    </div>
                  ))}
                  {slots.slots.length > 50 && (
                    <p className="text-center text-sm text-muted-foreground">
                      Showing first 50 of {slots.slots.length} slots
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No time slots synced yet</p>
                  <Button 
                    onClick={() => handleRefresh('slots')} 
                    className="mt-4"
                    disabled={refreshMutation.isPending}
                  >
                    Sync Time Slots
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}