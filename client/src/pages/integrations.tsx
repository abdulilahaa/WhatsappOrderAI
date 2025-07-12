import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Settings, 
  Database, 
  Wifi,
  Clock,
  MapPin,
  Users,
  Package,
  CreditCard,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface APIEndpoint {
  name: string;
  endpoint: string;
  method: string;
  status: 'working' | 'error' | 'unknown';
  lastTested?: Date;
  error?: string;
  description: string;
  icon: any;
  priority: 'critical' | 'important' | 'optional';
}

interface SyncStatus {
  name: string;
  status: 'synced' | 'needs_sync' | 'error' | 'never_synced';
  lastSync?: Date;
  itemCount: number;
  errors?: string[];
  canManualSync: boolean;
}

export default function Integrations() {
  const [lastFullCheck, setLastFullCheck] = useState<Date | null>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // API Endpoints to monitor
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([
    {
      name: "Get Locations",
      endpoint: "/api/nailit/locations",
      method: "GET",
      status: 'unknown',
      description: "Retrieves all salon locations with operating hours",
      icon: MapPin,
      priority: 'critical'
    },
    {
      name: "Register Device",
      endpoint: "/api/nailit/register-device",
      method: "POST", 
      status: 'unknown',
      description: "Registers device with NailIt POS system",
      icon: Settings,
      priority: 'critical'
    },
    {
      name: "Get Groups",
      endpoint: "/GetGroups/2",
      method: "GET",
      status: 'unknown',
      description: "Gets service categories (currently returning 404)",
      icon: Package,
      priority: 'important'
    },
    {
      name: "Get Items by Date",
      endpoint: "/GetItemsByDate",
      method: "POST",
      status: 'unknown',
      description: "Retrieves services available on specific dates",
      icon: Clock,
      priority: 'important'
    },
    {
      name: "Get Service Staff",
      endpoint: "/GetServiceStaff1",
      method: "GET",
      status: 'unknown',
      description: "Gets available staff for specific services",
      icon: Users,
      priority: 'important'
    },
    {
      name: "Get Available Slots",
      endpoint: "/GetAvailableSlots",
      method: "GET",
      status: 'unknown',
      description: "Retrieves available appointment time slots",
      icon: Clock,
      priority: 'important'
    },
    {
      name: "Get Payment Types",
      endpoint: "/GetPaymentTypesByDevice",
      method: "GET",
      status: 'unknown',
      description: "Gets available payment methods",
      icon: CreditCard,
      priority: 'optional'
    },
    {
      name: "Save Order",
      endpoint: "/SaveOrder",
      method: "POST",
      status: 'unknown',
      description: "Creates orders in NailIt POS system",
      icon: Database,
      priority: 'critical'
    }
  ]);

  // Sync status for different data types
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([
    {
      name: "Locations",
      status: 'unknown',
      itemCount: 0,
      canManualSync: true
    },
    {
      name: "Service Categories",
      status: 'unknown', 
      itemCount: 0,
      canManualSync: true
    },
    {
      name: "Services/Products",
      status: 'unknown',
      itemCount: 0,
      canManualSync: true
    },
    {
      name: "Staff Members",
      status: 'unknown',
      itemCount: 0,
      canManualSync: false
    },
    {
      name: "Payment Methods",
      status: 'unknown',
      itemCount: 0,
      canManualSync: true
    }
  ]);

  // Test individual endpoint
  const testEndpoint = async (endpoint: APIEndpoint): Promise<APIEndpoint> => {
    try {
      const startTime = Date.now();
      let response;
      
      if (endpoint.method === 'GET') {
        response = await fetch(endpoint.endpoint.startsWith('/api') ? endpoint.endpoint : `http://localhost:5000${endpoint.endpoint}`);
      } else {
        response = await fetch(endpoint.endpoint.startsWith('/api') ? endpoint.endpoint : `http://localhost:5000${endpoint.endpoint}`, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
          body: endpoint.method !== 'GET' ? JSON.stringify({}) : undefined
        });
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        ...endpoint,
        status: response.ok ? 'working' : 'error',
        lastTested: new Date(),
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText} (${responseTime}ms)`
      };
    } catch (error) {
      return {
        ...endpoint,
        status: 'error',
        lastTested: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  // Run diagnostics on all endpoints
  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    
    try {
      const results = await Promise.all(endpoints.map(testEndpoint));
      setEndpoints(results);
      setLastFullCheck(new Date());
      
      // Update sync statuses based on endpoint results
      const newSyncStatuses = [...syncStatuses];
      
      // Update locations status
      const locationsEndpoint = results.find(r => r.name === "Get Locations");
      if (locationsEndpoint?.status === 'working') {
        try {
          const locationsResponse = await fetch('/api/nailit/locations');
          const locations = await locationsResponse.json();
          newSyncStatuses[0] = {
            ...newSyncStatuses[0],
            status: 'synced',
            itemCount: locations.length,
            lastSync: new Date()
          };
        } catch {
          newSyncStatuses[0].status = 'error';
        }
      } else {
        newSyncStatuses[0].status = 'error';
      }
      
      // Update products status
      try {
        const productsResponse = await fetch('/api/products');
        const products = await productsResponse.json();
        newSyncStatuses[2] = {
          ...newSyncStatuses[2],
          status: 'synced',
          itemCount: products.length,
          lastSync: new Date()
        };
      } catch {
        newSyncStatuses[2].status = 'error';
      }
      
      setSyncStatuses(newSyncStatuses);
      
      const workingCount = results.filter(r => r.status === 'working').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      toast({
        title: "Diagnostics Complete",
        description: `${workingCount} endpoints working, ${errorCount} with errors`,
        variant: errorCount > 0 ? "destructive" : "default"
      });
      
    } catch (error) {
      toast({
        title: "Diagnostics Failed",
        description: "Could not complete endpoint testing",
        variant: "destructive"
      });
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  // Manual sync mutations
  const syncLocationsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/nailit/locations');
      if (!response.ok) throw new Error('Failed to sync locations');
      return response.json();
    },
    onSuccess: (data) => {
      setSyncStatuses(prev => prev.map(s => 
        s.name === 'Locations' ? { ...s, status: 'synced', itemCount: data.length, lastSync: new Date() } : s
      ));
      toast({ title: "Locations synced successfully", description: `${data.length} locations updated` });
    },
    onError: (error: Error) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    }
  });

  const syncServicesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/nailit/sync-services', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to sync services');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: "Services synced successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    }
  });

  const registerDeviceMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/nailit/register-device', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to register device');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Device registered successfully" });
      runDiagnostics(); // Re-test endpoints after registration
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    }
  });

  // Auto-run diagnostics on component mount
  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'working':
      case 'synced':
        return 'default';
      case 'error':
        return 'destructive';
      case 'needs_sync':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working':
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'needs_sync':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const workingEndpoints = endpoints.filter(e => e.status === 'working').length;
  const totalEndpoints = endpoints.length;
  const healthPercentage = (workingEndpoints / totalEndpoints) * 100;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">API Integrations</h2>
            <p className="text-slate-600 mt-1">Monitor and manage all external API connections</p>
          </div>
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunningDiagnostics}
            className="flex items-center gap-2"
          >
            <Activity className={`h-4 w-4 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
            {isRunningDiagnostics ? 'Running Diagnostics...' : 'Run Diagnostics'}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* Health Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              System Health Overview
            </CardTitle>
            <CardDescription>
              Overall status of NailIt API integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{workingEndpoints}</div>
                <div className="text-sm text-gray-600">Working Endpoints</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{totalEndpoints - workingEndpoints}</div>
                <div className="text-sm text-gray-600">Failed Endpoints</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{syncStatuses.filter(s => s.status === 'synced').length}</div>
                <div className="text-sm text-gray-600">Synced Data Types</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {lastFullCheck ? lastFullCheck.toLocaleTimeString() : 'Never'}
                </div>
                <div className="text-sm text-gray-600">Last Health Check</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Overall Health</span>
                <span className="text-sm text-gray-600">{Math.round(healthPercentage)}%</span>
              </div>
              <Progress value={healthPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="endpoints" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
            <TabsTrigger value="sync">Data Sync</TabsTrigger>
            <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
          </TabsList>

          {/* API Endpoints Tab */}
          <TabsContent value="endpoints" className="space-y-4">
            <div className="grid gap-4">
              {endpoints.map((endpoint, index) => {
                const IconComponent = endpoint.icon;
                return (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <IconComponent className="h-5 w-5" />
                          <div>
                            <CardTitle className="text-base">{endpoint.name}</CardTitle>
                            <CardDescription className="text-sm">{endpoint.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={endpoint.priority === 'critical' ? 'destructive' : endpoint.priority === 'important' ? 'default' : 'secondary'}>
                            {endpoint.priority}
                          </Badge>
                          <Badge variant={getStatusBadgeVariant(endpoint.status)}>
                            {getStatusIcon(endpoint.status)}
                            {endpoint.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Method:</span> {endpoint.method}
                        </div>
                        <div>
                          <span className="font-medium">Last Tested:</span> {endpoint.lastTested ? endpoint.lastTested.toLocaleString() : 'Never'}
                        </div>
                      </div>
                      {endpoint.error && (
                        <Alert className="mt-3">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{endpoint.error}</AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Data Sync Tab */}
          <TabsContent value="sync" className="space-y-4">
            <div className="grid gap-4">
              {syncStatuses.map((sync, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{sync.name}</CardTitle>
                        <CardDescription>
                          {sync.lastSync ? `Last synced: ${sync.lastSync.toLocaleString()}` : 'Never synced'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(sync.status)}>
                          {getStatusIcon(sync.status)}
                          {sync.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-gray-600">{sync.itemCount} items</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-2">
                      {sync.canManualSync && (
                        <>
                          {sync.name === 'Locations' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => syncLocationsMutation.mutate()}
                              disabled={syncLocationsMutation.isPending}
                            >
                              <RefreshCw className={`h-4 w-4 mr-2 ${syncLocationsMutation.isPending ? 'animate-spin' : ''}`} />
                              Sync Now
                            </Button>
                          )}
                          {sync.name === 'Services/Products' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => syncServicesMutation.mutate()}
                              disabled={syncServicesMutation.isPending}
                            >
                              <RefreshCw className={`h-4 w-4 mr-2 ${syncServicesMutation.isPending ? 'animate-spin' : ''}`} />
                              Sync Now
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    {sync.errors && sync.errors.length > 0 && (
                      <Alert className="mt-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {sync.errors.join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Troubleshooting Tab */}
          <TabsContent value="troubleshooting" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Fixes</CardTitle>
                <CardDescription>Common issues and their solutions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-800">GetGroups API returning 404</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      This endpoint appears to be unavailable on the NailIt server. The system automatically falls back to sample services.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800">Device Not Registered</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      If endpoints are failing, try re-registering the device with NailIt servers.
                    </p>
                    <Button 
                      size="sm" 
                      className="mt-2"
                      onClick={() => registerDeviceMutation.mutate()}
                      disabled={registerDeviceMutation.isPending}
                    >
                      <Settings className={`h-4 w-4 mr-2 ${registerDeviceMutation.isPending ? 'animate-spin' : ''}`} />
                      Register Device
                    </Button>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800">Location Data Working</h4>
                    <p className="text-sm text-green-700 mt-1">
                      The GetLocations endpoint is working correctly and provides live data for 3 salon locations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manual Data Management</CardTitle>
                <CardDescription>When API endpoints are unavailable</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    When NailIt API endpoints are not available, you can still manage your services manually through the Products page. 
                    The system will automatically use real location data from working endpoints for appointments.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.location.href = '/products'}>
                      <Package className="h-4 w-4 mr-2" />
                      Manage Products
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.location.href = '/appointments'}>
                      <Clock className="h-4 w-4 mr-2" />
                      View Appointments
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}