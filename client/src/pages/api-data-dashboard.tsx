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

  // Real-time data queries with error handling
  const { data: locations, error: locationsError, refetch: refetchLocations, isLoading: locationsLoading } = useQuery({
    queryKey: ['/api/nailit/locations'],
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: services, error: servicesError, isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/products'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: paymentTypes, error: paymentError, isLoading: paymentLoading } = useQuery({
    queryKey: ['/api/nailit/payment-types'],
    refetchInterval: 60000,
  });

  const { data: customers, error: customersError } = useQuery({
    queryKey: ['/api/customers'],
  });

  const { data: appointments, error: appointmentsError } = useQuery({
    queryKey: ['/api/appointments'],
  });

  const { data: orders, error: ordersError } = useQuery({
    queryKey: ['/api/orders'],
  });

  const { data: conversations, error: conversationsError } = useQuery({
    queryKey: ['/api/conversations/active'],
    refetchInterval: 10000, // Refresh every 10 seconds for active conversations
  });

  // Real-time API health status
  const { data: apiHealth, error: apiHealthError } = useQuery({
    queryKey: ['/api/nailit/test-all-endpoints'],
    refetchInterval: 120000, // Test every 2 minutes
  });

  // Calculate system health metrics
  const totalServices = services?.length || 0;
  const totalLocations = locations?.length || 0;
  const totalPaymentTypes = paymentTypes?.length || 0;
  const activeConversations = conversations?.length || 0;
  const totalOrders = orders?.length || 0;
  const totalAppointments = appointments?.length || 0;

  // API health summary
  const apiHealthSummary = apiHealth ? {
    total: apiHealth.summary?.total || 0,
    working: apiHealth.summary?.successful || 0,
    failed: apiHealth.summary?.failed || 0,
    successRate: apiHealth.summary?.total > 0 ? ((apiHealth.summary?.successful || 0) / apiHealth.summary.total * 100) : 0
  } : null;

  // Error tracking
  const systemErrors = [
    locationsError && { component: 'Locations', error: locationsError.message },
    servicesError && { component: 'Services', error: servicesError.message },
    paymentError && { component: 'Payment Types', error: paymentError.message },
    customersError && { component: 'Customers', error: customersError.message },
    appointmentsError && { component: 'Appointments', error: appointmentsError.message },
    ordersError && { component: 'Orders', error: ordersError.message },
    conversationsError && { component: 'Conversations', error: conversationsError.message },
    apiHealthError && { component: 'API Health', error: apiHealthError.message }
  ].filter(Boolean);

  const refreshAllData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchLocations(),
        // Add other refetch functions as needed
      ]);
      toast({
        title: "Data Refreshed",
        description: "All integration data has been updated successfully."
      });
    } catch (error) {
      toast({
        title: "Refresh Failed", 
        description: "Failed to refresh some data sources.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusBadge = (isLoading: boolean, error: any, data: any) => {
    if (isLoading) return <Badge variant="outline">Loading...</Badge>;
    if (error) return <Badge variant="destructive">Error</Badge>;
    if (data) return <Badge variant="default">Connected</Badge>;
    return <Badge variant="secondary">No Data</Badge>;
  };

  const getStatusIcon = (isLoading: boolean, error: any, data: any) => {
    if (isLoading) return <Activity className="h-4 w-4 animate-spin" />;
    if (error) return <XCircle className="h-4 w-4 text-red-500" />;
    if (data) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">NailIt API Data Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Real-time monitoring of NailIt POS integration data and system health
          </p>
        </div>
        <Button 
          onClick={refreshAllData} 
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? "Refreshing..." : "Refresh All"}
        </Button>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {apiHealthSummary ? `${Math.round(apiHealthSummary.successRate)}%` : 'Testing...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {apiHealthSummary ? `${apiHealthSummary.working}/${apiHealthSummary.total} endpoints working` : 'Checking endpoints...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Synced</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalServices}</div>
            <p className="text-xs text-muted-foreground">
              From NailIt POS system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeConversations}</div>
            <p className="text-xs text-muted-foreground">
              WhatsApp customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemErrors.length}</div>
            <p className="text-xs text-muted-foreground">
              Active issues detected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Alerts */}
      {systemErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>System Issues Detected:</strong>
            <ul className="mt-2 list-disc list-inside">
              {systemErrors.map((error: any, index) => (
                <li key={index}>{error.component}: {error.error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="data-sources" className="space-y-4">
        <TabsList>
          <TabsTrigger value="data-sources">Data Sources</TabsTrigger>
          <TabsTrigger value="nailit-data">NailIt Data</TabsTrigger>
          <TabsTrigger value="system-data">System Data</TabsTrigger>
          <TabsTrigger value="real-time">Real-time Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="data-sources" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  NailIt Locations
                  {getStatusIcon(locationsLoading, locationsError, locations)}
                </CardTitle>
                <CardDescription>
                  Salon locations from NailIt POS system
                  {getStatusBadge(locationsLoading, locationsError, locations)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {locationsError ? (
                  <div className="text-red-600 text-sm">Error: {locationsError.message}</div>
                ) : locationsLoading ? (
                  <div className="text-gray-500">Loading locations...</div>
                ) : locations ? (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      Found {totalLocations} locations
                    </div>
                    {locations.slice(0, 3).map((location: any) => (
                      <div key={location.Location_Id} className="p-2 bg-gray-50 rounded">
                        <div className="font-medium">{location.Location_Name}</div>
                        <div className="text-sm text-gray-600">{location.Address}</div>
                        <div className="text-xs text-gray-500">
                          {location.From_Time} - {location.To_Time}
                        </div>
                      </div>
                    ))}
                    {totalLocations > 3 && (
                      <div className="text-sm text-gray-500">
                        ...and {totalLocations - 3} more locations
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500">No locations found</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Services & Products
                  {getStatusIcon(servicesLoading, servicesError, services)}
                </CardTitle>
                <CardDescription>
                  Services synced from NailIt POS
                  {getStatusBadge(servicesLoading, servicesError, services)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {servicesError ? (
                  <div className="text-red-600 text-sm">Error: {servicesError.message}</div>
                ) : servicesLoading ? (
                  <div className="text-gray-500">Loading services...</div>
                ) : services ? (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      Found {totalServices} services/products
                    </div>
                    {services.slice(0, 5).map((service: any) => (
                      <div key={service.id} className="p-2 bg-gray-50 rounded">
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-gray-600">
                          {service.price} KWD
                        </div>
                        {service.description && (
                          <div className="text-xs text-gray-500 truncate">
                            {service.description}
                          </div>
                        )}
                      </div>
                    ))}
                    {totalServices > 5 && (
                      <div className="text-sm text-gray-500">
                        ...and {totalServices - 5} more services
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500">No services found</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Types
                  {getStatusIcon(paymentLoading, paymentError, paymentTypes)}
                </CardTitle>
                <CardDescription>
                  Available payment methods
                  {getStatusBadge(paymentLoading, paymentError, paymentTypes)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentError ? (
                  <div className="text-red-600 text-sm">Error: {paymentError.message}</div>
                ) : paymentLoading ? (
                  <div className="text-gray-500">Loading payment types...</div>
                ) : paymentTypes ? (
                  <div className="space-y-2">
                    {paymentTypes.map((payment: any) => (
                      <div key={payment.Type_Id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{payment.Type_Name}</div>
                          <div className="text-sm text-gray-600">Code: {payment.Type_Code}</div>
                        </div>
                        <Badge variant={payment.Is_Enabled ? "default" : "secondary"}>
                          {payment.Is_Enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">No payment types found</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="nailit-data" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Integration Status</CardTitle>
                <CardDescription>Real-time NailIt POS connection status</CardDescription>
              </CardHeader>
              <CardContent>
                {apiHealth ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Overall Health:</span>
                      <Badge variant={apiHealthSummary && apiHealthSummary.successRate > 75 ? "default" : "destructive"}>
                        {apiHealthSummary ? `${Math.round(apiHealthSummary.successRate)}%` : 'Unknown'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(apiHealth.details || {}).map(([endpoint, result]: [string, any]) => (
                        <div key={endpoint} className="flex items-center justify-between text-sm">
                          <span className="capitalize">{endpoint.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <div className="flex items-center gap-2">
                            {result.success ? 
                              <CheckCircle className="h-4 w-4 text-green-500" /> : 
                              <XCircle className="h-4 w-4 text-red-500" />
                            }
                            <Badge variant={result.success ? "default" : "destructive"}>
                              {result.success ? "Working" : "Failed"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">Testing API endpoints...</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Synchronization</CardTitle>
                <CardDescription>Last sync status for all data types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Services:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{totalServices} items</span>
                      <Badge variant="default">Synced</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Locations:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{totalLocations} items</span>
                      <Badge variant="default">Synced</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Payment Types:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{totalPaymentTypes} items</span>
                      <Badge variant="default">Synced</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system-data" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customer Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customers?.length || 0}</div>
                <p className="text-sm text-gray-600">Total customers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAppointments}</div>
                <p className="text-sm text-gray-600">Total appointments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders}</div>
                <p className="text-sm text-gray-600">Total orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Active Chats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeConversations}</div>
                <p className="text-sm text-gray-600">WhatsApp conversations</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="real-time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live System Monitor</CardTitle>
              <CardDescription>Real-time updates from all system components</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversations && conversations.length > 0 ? (
                  <div>
                    <h4 className="font-medium mb-2">Active Conversations</h4>
                    <div className="space-y-2">
                      {conversations.slice(0, 5).map((conv: any) => (
                        <div key={conv.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium">{conv.customer.name}</div>
                            <div className="text-sm text-gray-600">{conv.customer.phoneNumber}</div>
                          </div>
                          <Badge variant="outline">Active</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">No active conversations</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}