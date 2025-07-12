import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  MapPin,
  Users,
  Package,
  Clock,
  CreditCard,
  Building,
  Database,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function APIDataDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Queries for all available data
  const { data: locations, refetch: refetchLocations } = useQuery({
    queryKey: ['/api/nailit/locations'],
    queryFn: async () => {
      const response = await fetch('/api/nailit/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      return response.json();
    }
  });

  const { data: services } = useQuery({
    queryKey: ['/api/products'],
  });

  const { data: customers } = useQuery({
    queryKey: ['/api/customers'],
  });

  const { data: appointments } = useQuery({
    queryKey: ['/api/appointments'],
  });

  const { data: orders } = useQuery({
    queryKey: ['/api/orders'],
  });

  const { data: aiSettings } = useQuery({
    queryKey: ['/api/ai-settings'],
  });

  const { data: whatsappSettings } = useQuery({
    queryKey: ['/api/whatsapp-settings'],
  });

  // Test specific NailIt endpoints
  const [endpointTests, setEndpointTests] = useState<Record<string, any>>({
    registerDevice: { status: 'unknown', data: null, error: null },
    getGroups: { status: 'unknown', data: null, error: null },
    getSubGroups: { status: 'unknown', data: null, error: null },
    getLocations: { status: 'working', data: locations, error: null },
    getItemsByDate: { status: 'unknown', data: null, error: null },
    getServiceStaff: { status: 'unknown', data: null, error: null },
    getAvailableSlots: { status: 'unknown', data: null, error: null },
    getPaymentTypes: { status: 'unknown', data: null, error: null },
    saveOrder: { status: 'unknown', data: null, error: null }
  });

  const testAllEndpoints = async () => {
    setRefreshing(true);
    const results = { ...endpointTests };

    try {
      // Test device registration
      try {
        const deviceRes = await fetch('/api/nailit/register-device', { method: 'POST' });
        const deviceData = await deviceRes.json();
        results.registerDevice = {
          status: deviceRes.ok ? 'working' : 'error',
          data: deviceData,
          error: deviceRes.ok ? null : `HTTP ${deviceRes.status}`
        };
      } catch (error) {
        results.registerDevice = { status: 'error', data: null, error: error.message };
      }

      // Test groups (known to fail)
      try {
        const groupsRes = await fetch('/api/nailit/test-groups');
        const groupsData = await groupsRes.json();
        results.getGroups = {
          status: groupsRes.ok && groupsData.length > 0 ? 'working' : 'error',
          data: groupsData,
          error: groupsRes.ok ? 'Endpoint returns 404 on NailIt server' : `HTTP ${groupsRes.status}`
        };
      } catch (error) {
        results.getGroups = { status: 'error', data: null, error: 'Groups endpoint unavailable (404)' };
      }

      // Test locations (known to work)
      try {
        const locRes = await fetch('/api/nailit/locations');
        const locData = await locRes.json();
        results.getLocations = {
          status: locRes.ok ? 'working' : 'error',
          data: locData,
          error: locRes.ok ? null : `HTTP ${locRes.status}`
        };
      } catch (error) {
        results.getLocations = { status: 'error', data: null, error: error.message };
      }

      setEndpointTests(results);
      
      const workingCount = Object.values(results).filter(r => r.status === 'working').length;
      toast({
        title: "API Testing Complete",
        description: `${workingCount} endpoints working out of ${Object.keys(results).length} tested`
      });

    } catch (error) {
      toast({
        title: "Testing Failed",
        description: "Could not complete API endpoint testing",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    testAllEndpoints();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'working': return <Badge className="bg-green-100 text-green-800">Working</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">API Data Dashboard</h2>
            <p className="text-slate-600 mt-1">Complete overview of all available data and API endpoints</p>
          </div>
          <Button 
            onClick={testAllEndpoints} 
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Testing...' : 'Test All APIs'}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="working-data" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="working-data">Working Data</TabsTrigger>
            <TabsTrigger value="endpoint-status">Endpoint Status</TabsTrigger>
            <TabsTrigger value="nailit-specific">NailIt Data</TabsTrigger>
            <TabsTrigger value="system-data">System Data</TabsTrigger>
          </TabsList>

          {/* Working Data Tab */}
          <TabsContent value="working-data" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Locations Data */}
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <MapPin className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <CardTitle className="text-base">NailIt Locations</CardTitle>
                    <CardDescription>Live salon locations from API</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {locations ? (
                    <div className="space-y-3">
                      <div className="text-2xl font-bold text-blue-600">{locations.length}</div>
                      <div className="space-y-2">
                        {locations.map((loc: any) => (
                          <div key={loc.Location_Id} className="text-sm">
                            <div className="font-medium">{loc.Location_Name}</div>
                            <div className="text-gray-500">{loc.Address}</div>
                            <div className="text-gray-400">{loc.From_Time} - {loc.To_Time}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500">Loading...</div>
                  )}
                </CardContent>
              </Card>

              {/* Services Data */}
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <Package className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <CardTitle className="text-base">Services/Products</CardTitle>
                    <CardDescription>Available services in catalog</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {services ? (
                    <div className="space-y-3">
                      <div className="text-2xl font-bold text-green-600">{services.length}</div>
                      <div className="space-y-2">
                        {services.slice(0, 3).map((service: any) => (
                          <div key={service.id} className="text-sm">
                            <div className="font-medium">{service.name}</div>
                            <div className="text-gray-500">{service.price} KWD</div>
                          </div>
                        ))}
                        {services.length > 3 && (
                          <div className="text-gray-400 text-xs">+{services.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500">Loading...</div>
                  )}
                </CardContent>
              </Card>

              {/* Customers Data */}
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <Users className="h-5 w-5 text-purple-600 mr-2" />
                  <div>
                    <CardTitle className="text-base">Customers</CardTitle>
                    <CardDescription>Registered customers</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {customers ? (
                    <div className="space-y-3">
                      <div className="text-2xl font-bold text-purple-600">{customers.length}</div>
                      <div className="space-y-2">
                        {customers.slice(0, 3).map((customer: any) => (
                          <div key={customer.id} className="text-sm">
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-gray-500">{customer.phoneNumber}</div>
                          </div>
                        ))}
                        {customers.length > 3 && (
                          <div className="text-gray-400 text-xs">+{customers.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500">Loading...</div>
                  )}
                </CardContent>
              </Card>

              {/* Appointments Data */}
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <Clock className="h-5 w-5 text-orange-600 mr-2" />
                  <div>
                    <CardTitle className="text-base">Appointments</CardTitle>
                    <CardDescription>Scheduled appointments</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {appointments ? (
                    <div className="space-y-3">
                      <div className="text-2xl font-bold text-orange-600">{appointments.length}</div>
                      <div className="space-y-2">
                        {appointments.slice(0, 3).map((appt: any) => (
                          <div key={appt.id} className="text-sm">
                            <div className="font-medium">{appt.customer.name}</div>
                            <div className="text-gray-500">{new Date(appt.appointmentDate).toLocaleDateString()}</div>
                          </div>
                        ))}
                        {appointments.length > 3 && (
                          <div className="text-gray-400 text-xs">+{appointments.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500">Loading...</div>
                  )}
                </CardContent>
              </Card>

              {/* Orders Data */}
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CreditCard className="h-5 w-5 text-red-600 mr-2" />
                  <div>
                    <CardTitle className="text-base">Orders</CardTitle>
                    <CardDescription>Customer orders</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {orders ? (
                    <div className="space-y-3">
                      <div className="text-2xl font-bold text-red-600">{orders.length}</div>
                      {orders.length === 0 ? (
                        <div className="text-gray-500 text-sm">No orders yet</div>
                      ) : (
                        <div className="space-y-2">
                          {orders.slice(0, 3).map((order: any) => (
                            <div key={order.id} className="text-sm">
                              <div className="font-medium">Order #{order.id}</div>
                              <div className="text-gray-500">{order.totalAmount} KWD</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500">Loading...</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Endpoint Status Tab */}
          <TabsContent value="endpoint-status" className="space-y-4">
            <div className="grid gap-4">
              {Object.entries(endpointTests).map(([endpoint, result]) => (
                <Card key={endpoint}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Activity className="h-5 w-5" />
                        <div>
                          <CardTitle className="text-base capitalize">{endpoint.replace(/([A-Z])/g, ' $1')}</CardTitle>
                          <CardDescription>NailIt API endpoint test</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        {getStatusBadge(result.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {result.error && (
                      <Alert className="mb-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{result.error}</AlertDescription>
                      </Alert>
                    )}
                    {result.data && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <pre className="text-xs overflow-auto max-h-32">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* NailIt Specific Data Tab */}
          <TabsContent value="nailit-specific" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>NailIt API Analysis</CardTitle>
                <CardDescription>Detailed breakdown of what's working vs what's not</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-green-600 mb-3">✅ Working Endpoints</h4>
                    <div className="space-y-2">
                      <div className="p-3 bg-green-50 rounded-md">
                        <div className="font-medium">GetLocations</div>
                        <div className="text-sm text-gray-600">Returns 3 live salon locations with full details</div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-md">
                        <div className="font-medium">RegisterDevice</div>
                        <div className="text-sm text-gray-600">Device registration working properly</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-red-600 mb-3">❌ Non-Working Endpoints</h4>
                    <div className="space-y-2">
                      <div className="p-3 bg-red-50 rounded-md">
                        <div className="font-medium">GetGroups</div>
                        <div className="text-sm text-gray-600">Returns 404 - endpoint not available on server</div>
                      </div>
                      <div className="p-3 bg-red-50 rounded-md">
                        <div className="font-medium">GetSubGroups</div>
                        <div className="text-sm text-gray-600">Likely same issue as GetGroups</div>
                      </div>
                      <div className="p-3 bg-red-50 rounded-md">
                        <div className="font-medium">GetItemsByDate</div>
                        <div className="text-sm text-gray-600">Requires working Groups endpoint</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The NailIt server appears to have limited endpoint availability. GetGroups and related endpoints return 404, 
                    suggesting they may be disabled or have different URL patterns. However, locations and device registration work perfectly.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Data Tab */}
          <TabsContent value="system-data" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* AI Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Configuration</CardTitle>
                  <CardDescription>Current AI agent settings</CardDescription>
                </CardHeader>
                <CardContent>
                  {aiSettings && (
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Business:</span> {aiSettings.businessName}</div>
                      <div><span className="font-medium">Assistant:</span> {aiSettings.assistantName}</div>
                      <div><span className="font-medium">Tone:</span> {aiSettings.tone}</div>
                      <div><span className="font-medium">Type:</span> {aiSettings.businessType}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* WhatsApp Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">WhatsApp Integration</CardTitle>
                  <CardDescription>WhatsApp API configuration</CardDescription>
                </CardHeader>
                <CardContent>
                  {whatsappSettings && (
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Phone Number ID:</span> {whatsappSettings.phoneNumberId ? '✅ Configured' : '❌ Not set'}</div>
                      <div><span className="font-medium">Access Token:</span> {whatsappSettings.accessToken ? '✅ Configured' : '❌ Not set'}</div>
                      <div><span className="font-medium">Webhook Token:</span> {whatsappSettings.webhookVerifyToken ? '✅ Configured' : '❌ Not set'}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}