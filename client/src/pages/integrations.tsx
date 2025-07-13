import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Activity,
  Zap,
  AlertTriangle,
  PlayCircle,
  PauseCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SystemStatus {
  component: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  lastCheck?: Date;
  details?: string;
  count?: number;
  icon: any;
  priority: 'critical' | 'important' | 'optional';
}

interface IntegrationHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  score: number;
  issues: string[];
  lastFullCheck?: Date;
}

export default function Integrations() {
  const [lastFullCheck, setLastFullCheck] = useState<Date | null>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [refreshingData, setRefreshingData] = useState<string | null>(null);
  const [isTestingIntegration, setIsTestingIntegration] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Real-time data queries
  const { data: locations, error: locationsError, isLoading: locationsLoading } = useQuery({
    queryKey: ['/api/nailit/locations'],
    refetchInterval: 60000
  });

  const { data: services, error: servicesError, isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/products'],
    refetchInterval: 30000
  });

  const { data: paymentTypes, error: paymentError, isLoading: paymentLoading } = useQuery({
    queryKey: ['/api/nailit/payment-types'],
    refetchInterval: 60000
  });

  const { data: customers, error: customersError } = useQuery({
    queryKey: ['/api/customers']
  });

  const { data: orders, error: ordersError } = useQuery({
    queryKey: ['/api/orders']
  });

  const { data: conversations, error: conversationsError } = useQuery({
    queryKey: ['/api/conversations/active'],
    refetchInterval: 10000
  });

  const { data: appointments, error: appointmentsError } = useQuery({
    queryKey: ['/api/appointments']
  });

  const { data: apiHealth, error: apiHealthError } = useQuery({
    queryKey: ['/api/nailit/test-all-endpoints'],
    refetchInterval: 120000
  });

  const { data: integrationTest } = useQuery({
    queryKey: ['/api/nailit/test-integration'],
    enabled: false
  });

  // System Status Components
  const systemComponents: SystemStatus[] = [
    {
      component: 'NailIt API Connection',
      status: apiHealthError ? 'error' : apiHealth?.details ? 'healthy' : 'unknown',
      details: apiHealth?.summary ? `${Object.values(apiHealth.details || {}).filter((r: any) => r.success).length}/${Object.keys(apiHealth.details || {}).length} endpoints working` : apiHealthError?.message,
      icon: Wifi,
      priority: 'critical'
    },
    {
      component: 'Service Synchronization',
      status: servicesError ? 'error' : services ? 'healthy' : servicesLoading ? 'unknown' : 'warning',
      details: servicesError ? servicesError.message : `${services?.length || 0} services synced`,
      count: services?.length || 0,
      icon: Package,
      priority: 'critical'
    },
    {
      component: 'Location Data',
      status: locationsError ? 'error' : locations ? 'healthy' : locationsLoading ? 'unknown' : 'warning',
      details: locationsError ? locationsError.message : `${locations?.length || 0} locations available`,
      count: locations?.length || 0,
      icon: MapPin,
      priority: 'critical'
    },
    {
      component: 'Payment Integration',
      status: paymentError ? 'error' : paymentTypes ? 'healthy' : paymentLoading ? 'unknown' : 'warning',
      details: paymentError ? paymentError.message : `${paymentTypes?.length || 0} payment methods`,
      count: paymentTypes?.length || 0,
      icon: CreditCard,
      priority: 'important'
    },
    {
      component: 'WhatsApp Conversations',
      status: conversationsError ? 'error' : conversations ? 'healthy' : 'unknown',
      details: conversationsError ? conversationsError.message : `${conversations?.length || 0} active chats`,
      count: conversations?.length || 0,
      icon: Users,
      priority: 'important'
    },
    {
      component: 'Order Management',
      status: ordersError ? 'error' : orders ? 'healthy' : 'unknown',
      details: ordersError ? ordersError.message : `${orders?.length || 0} total orders`,
      count: orders?.length || 0,
      icon: Database,
      priority: 'important'
    },
    {
      component: 'Appointment System',
      status: appointmentsError ? 'error' : appointments ? 'healthy' : 'unknown',
      details: appointmentsError ? appointmentsError.message : `${appointments?.length || 0} appointments`,
      count: appointments?.length || 0,
      icon: Clock,
      priority: 'optional'
    }
  ];

  // Calculate integration health
  const integrationHealth: IntegrationHealth = (() => {
    const totalComponents = systemComponents.length;
    const healthyComponents = systemComponents.filter(c => c.status === 'healthy').length;
    const errorComponents = systemComponents.filter(c => c.status === 'error').length;
    const criticalErrors = systemComponents.filter(c => c.status === 'error' && c.priority === 'critical').length;
    
    const score = (healthyComponents / totalComponents) * 100;
    const issues = systemComponents
      .filter(c => c.status === 'error' || c.status === 'warning')
      .map(c => `${c.component}: ${c.details || 'Unknown issue'}`);

    let overall: 'healthy' | 'degraded' | 'critical';
    if (criticalErrors > 0) {
      overall = 'critical';
    } else if (score >= 85) {
      overall = 'healthy';
    } else {
      overall = 'degraded';
    }

    return {
      overall,
      score: Math.round(score),
      issues,
      lastFullCheck: lastFullCheck
    };
  })();

  // Mutations
  const runDiagnosticsMutation = useMutation({
    mutationFn: () => apiRequest("/api/nailit/test-all-endpoints"),
    onSuccess: () => {
      setLastFullCheck(new Date());
      queryClient.invalidateQueries({ queryKey: ['/api/nailit/test-all-endpoints'] });
      toast({
        title: "Diagnostics Complete",
        description: "System health check completed successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Diagnostics Failed",
        description: error.message || "Failed to run system diagnostics",
        variant: "destructive"
      });
    }
  });

  const syncDataMutation = useMutation({
    mutationFn: async (dataType: string) => {
      setRefreshingData(dataType);
      
      switch (dataType) {
        case 'services':
          return apiRequest("/api/nailit/sync-services", { method: "POST" });
        case 'locations':
          return apiRequest("/api/nailit/sync-locations", { method: "POST" });
        case 'payments':
          return apiRequest("/api/nailit/sync-payment-types", { method: "POST" });
        default:
          throw new Error('Unknown data type');
      }
    },
    onSuccess: (_, dataType) => {
      toast({
        title: "Sync Complete",
        description: `${dataType} data has been refreshed successfully`
      });
      setRefreshingData(null);
    },
    onError: (error: any, dataType) => {
      toast({
        title: "Sync Failed",
        description: `Failed to sync ${dataType}: ${error.message}`,
        variant: "destructive"
      });
      setRefreshingData(null);
    }
  });

  const handleRunDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      await runDiagnosticsMutation.mutateAsync();
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const handleSyncData = (dataType: string) => {
    syncDataMutation.mutate(dataType);
  };

  const testIntegrationMutation = useMutation({
    mutationFn: () => apiRequest("/api/nailit/test-integration", { method: "POST" }),
    onSuccess: (data) => {
      toast({
        title: "Integration Test Complete",
        description: data.integrationHealth.summary
      });
      queryClient.setQueryData(['/api/nailit/test-integration'], data);
    },
    onError: (error: any) => {
      toast({
        title: "Integration Test Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleTestIntegration = async () => {
    setIsTestingIntegration(true);
    try {
      await testIntegrationMutation.mutateAsync();
    } finally {
      setIsTestingIntegration(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'default',
      warning: 'secondary',
      error: 'destructive',
      unknown: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Integrations</h1>
          <p className="text-gray-600 mt-2">
            Monitor and manage all system integrations and data synchronization
          </p>
          {lastFullCheck && (
            <p className="text-sm text-gray-500 mt-1">
              Last full check: {lastFullCheck.toLocaleString()}
            </p>
          )}
        </div>
        <Button 
          onClick={handleRunDiagnostics} 
          disabled={isRunningDiagnostics}
          className="flex items-center gap-2"
        >
          <Activity className={`h-4 w-4 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
          {isRunningDiagnostics ? "Running..." : "Run Diagnostics"}
        </Button>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(integrationHealth.overall)}`}>
              {integrationHealth.score}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall integration health
            </p>
            <Badge 
              variant={integrationHealth.overall === 'healthy' ? 'default' : integrationHealth.overall === 'degraded' ? 'secondary' : 'destructive'}
              className="mt-2"
            >
              {integrationHealth.overall}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrationHealth.issues.length}</div>
            <p className="text-xs text-muted-foreground">
              Components need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemComponents.filter(c => c.status === 'healthy').length}</div>
            <p className="text-xs text-muted-foreground">
              Of {systemComponents.length} components working
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Endpoints</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {apiHealth?.details ? Object.values(apiHealth.details).filter((r: any) => r.success).length : 0}/{apiHealth?.details ? Object.keys(apiHealth.details).length : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              NailIt API endpoints working
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Issues Alert */}
      {integrationHealth.overall === 'critical' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Critical System Issues Detected:</strong> Essential integration components are failing. 
            Immediate attention required to maintain system functionality.
          </AlertDescription>
        </Alert>
      )}

      {/* Health Issues Warning */}
      {integrationHealth.issues.length > 0 && integrationHealth.overall !== 'critical' && (
        <Alert variant="default">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>System Health Issues:</strong>
            <ul className="mt-2 list-disc list-inside">
              {integrationHealth.issues.slice(0, 3).map((issue, index) => (
                <li key={index} className="text-sm">{issue}</li>
              ))}
              {integrationHealth.issues.length > 3 && (
                <li className="text-sm">...and {integrationHealth.issues.length - 3} more issues</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="data-sync">Data Sync</TabsTrigger>
          <TabsTrigger value="requirements">Order Requirements</TabsTrigger>
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            {['critical', 'important', 'optional'].map((priority) => {
              const componentsInPriority = systemComponents.filter(c => c.priority === priority);
              
              return (
                <Card key={priority}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="capitalize">{priority} Components</span>
                      <Badge variant={priority === 'critical' ? 'destructive' : priority === 'important' ? 'default' : 'secondary'}>
                        {componentsInPriority.filter(c => c.status === 'healthy').length}/{componentsInPriority.length} Healthy
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {priority === 'critical' && "Essential for core system functionality"}
                      {priority === 'important' && "Required for optimal user experience"}
                      {priority === 'optional' && "Enhanced features and analytics"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {componentsInPriority.map((component) => (
                        <div key={component.component} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <component.icon className="h-5 w-5 text-gray-500" />
                            <div>
                              <div className="font-medium">{component.component}</div>
                              <div className="text-sm text-gray-600">{component.details}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {typeof component.count === 'number' && (
                              <Badge variant="outline">{component.count} items</Badge>
                            )}
                            {getStatusIcon(component.status)}
                            {getStatusBadge(component.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="data-sync" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Manual Data Synchronization</CardTitle>
                <CardDescription>Force refresh data from external sources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5" />
                    <div>
                      <div className="font-medium">Services & Products</div>
                      <div className="text-sm text-gray-600">{services?.length || 0} items synced</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSyncData('services')}
                    disabled={refreshingData === 'services'}
                  >
                    {refreshingData === 'services' ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Sync Now'
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5" />
                    <div>
                      <div className="font-medium">Locations</div>
                      <div className="text-sm text-gray-600">{locations?.length || 0} locations</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSyncData('locations')}
                    disabled={refreshingData === 'locations'}
                  >
                    {refreshingData === 'locations' ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Sync Now'
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5" />
                    <div>
                      <div className="font-medium">Payment Types</div>
                      <div className="text-sm text-gray-600">{paymentTypes?.length || 0} payment methods</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSyncData('payments')}
                    disabled={refreshingData === 'payments'}
                  >
                    {refreshingData === 'payments' ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Sync Now'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integration Health Check</CardTitle>
                <CardDescription>Test full system integration with NailIt POS</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {integrationTest && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Integration Score</span>
                      <Badge variant={integrationTest.integrationHealth.score === 100 ? 'default' : 'secondary'}>
                        {integrationTest.integrationHealth.score}%
                      </Badge>
                    </div>
                    <Progress value={integrationTest.integrationHealth.score} className="h-2" />
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {Object.entries(integrationTest.integrationHealth.tests).map(([test, passed]) => (
                        <div key={test} className="flex items-center gap-2 text-sm">
                          {passed ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-xs">{test.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleTestIntegration}
                  disabled={isTestingIntegration}
                  className="w-full"
                >
                  {isTestingIntegration ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Testing Integration...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Test Full Integration
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sync Status & History</CardTitle>
                <CardDescription>Last synchronization times and status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Services:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={servicesError ? "destructive" : "default"}>
                        {servicesError ? "Error" : "Synced"}
                      </Badge>
                      <span className="text-gray-500">Auto-refresh: 30s</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Locations:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={locationsError ? "destructive" : "default"}>
                        {locationsError ? "Error" : "Synced"}
                      </Badge>
                      <span className="text-gray-500">Auto-refresh: 60s</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Payment Types:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={paymentError ? "destructive" : "default"}>
                        {paymentError ? "Error" : "Synced"}
                      </Badge>
                      <span className="text-gray-500">Auto-refresh: 60s</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span>API Health:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={apiHealthError ? "destructive" : "default"}>
                        {apiHealthError ? "Error" : "Monitoring"}
                      </Badge>
                      <span className="text-gray-500">Auto-refresh: 2m</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Required Data for Orders
                </CardTitle>
                <CardDescription>
                  Customer information needed to complete NailIt POS orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {apiHealth?.requiredCustomerData?.forOrders ? (
                    apiHealth.requiredCustomerData.forOrders.map((field: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span className="text-sm">{field}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">Loading requirements...</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Required Data for Appointments
                </CardTitle>
                <CardDescription>
                  Information needed to book service appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {apiHealth?.requiredCustomerData?.forAppointments ? (
                    apiHealth.requiredCustomerData.forAppointments.map((field: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span className="text-sm">{field}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">Loading requirements...</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Integration Data Flow</CardTitle>
              <CardDescription>How customer data flows through the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">1. Customer Contact</div>
                    <div className="text-sm text-gray-600">WhatsApp message initiates conversation</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="bg-green-100 p-2 rounded-full">
                    <Zap className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">2. AI Processing</div>
                    <div className="text-sm text-gray-600">AI collects required information through conversation</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="bg-purple-100 p-2 rounded-full">
                    <Database className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">3. Data Validation</div>
                    <div className="text-sm text-gray-600">System validates all required fields are collected</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="bg-orange-100 p-2 rounded-full">
                    <Wifi className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">4. NailIt POS Sync</div>
                    <div className="text-sm text-gray-600">Order/appointment created in NailIt POS system</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="bg-teal-100 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">5. Confirmation</div>
                    <div className="text-sm text-gray-600">Customer receives confirmation with booking details</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="troubleshooting" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Common Integration Issues</CardTitle>
                <CardDescription>Quick solutions to frequent problems</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div className="space-y-2">
                      <div className="font-medium">Services Not Syncing</div>
                      <div className="text-sm text-gray-600">
                        <p className="mb-2">If services are not syncing from NailIt:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Click "Test Full Integration" to verify API connection</li>
                          <li>Check if device registration is successful</li>
                          <li>Try "Sync Now" button in Data Sync tab</li>
                          <li>Verify NailIt API credentials are correct</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="space-y-2">
                      <div className="font-medium">Order Creation Failing</div>
                      <div className="text-sm text-gray-600">
                        <p className="mb-2">Orders may fail if:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Customer mobile number format is incorrect (needs country code)</li>
                          <li>Service ID doesn't match NailIt database</li>
                          <li>Location is not selected</li>
                          <li>Payment type is not available</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div className="space-y-2">
                      <div className="font-medium">Staff Not Available</div>
                      <div className="text-sm text-gray-600">
                        <p className="mb-2">If GetServiceStaff returns empty:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Verify service exists at selected location</li>
                          <li>Check date format (should be DD-MM-YYYY)</li>
                          <li>Some services may not require staff assignment</li>
                          <li>Staff may be fully booked for selected date</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Status Reference</CardTitle>
                <CardDescription>Understanding NailIt API endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {apiHealth?.details && Object.entries(apiHealth.details).map(([endpoint, result]: [string, any]) => (
                    <div key={endpoint} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <div className="font-medium text-sm">{endpoint}</div>
                          {result.error && (
                            <div className="text-xs text-red-600">{result.error}</div>
                          )}
                          {result.data && (
                            <div className="text-xs text-gray-600">
                              {result.data.count !== undefined ? `${result.data.count} items` : 'Connected'}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant={result.success ? 'default' : 'destructive'}>
                        {result.success ? 'Working' : 'Failed'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integration Recovery</CardTitle>
                <CardDescription>Steps to restore full functionality</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleRunDiagnostics}
                  disabled={isRunningDiagnostics}
                  className="w-full"
                  variant="outline"
                >
                  <Activity className={`mr-2 h-4 w-4 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
                  Run Full System Diagnostics
                </Button>
                
                <div className="text-sm text-gray-600 space-y-2">
                  <p className="font-medium">If integration issues persist:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Restart the application server</li>
                    <li>Verify NailIt API credentials in Settings</li>
                    <li>Check network connectivity to NailIt servers</li>
                    <li>Contact NailIt support for API access issues</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Integration Health Analysis</CardTitle>
                <CardDescription>Detailed breakdown of system integration status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className={`text-2xl font-bold ${getHealthColor('healthy')}`}>
                        {systemComponents.filter(c => c.status === 'healthy').length}
                      </div>
                      <div className="text-sm text-gray-600">Healthy Components</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className={`text-2xl font-bold ${getHealthColor('degraded')}`}>
                        {systemComponents.filter(c => c.status === 'warning').length}
                      </div>
                      <div className="text-sm text-gray-600">Warning Components</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className={`text-2xl font-bold ${getHealthColor('critical')}`}>
                        {systemComponents.filter(c => c.status === 'error').length}
                      </div>
                      <div className="text-sm text-gray-600">Failed Components</div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-3">Resolution Steps</h4>
                    <div className="space-y-3">
                      {integrationHealth.overall === 'critical' && (
                        <div className="border-l-4 border-red-500 pl-4">
                          <div className="font-medium text-red-800">Immediate Action Required</div>
                          <div className="text-sm text-red-700 mt-1">
                            1. Check network connectivity<br/>
                            2. Verify API credentials<br/>
                            3. Run full system diagnostics
                          </div>
                        </div>
                      )}
                      
                      {integrationHealth.issues.length > 0 && (
                        <div className="border-l-4 border-yellow-500 pl-4">
                          <div className="font-medium text-yellow-800">Recommended Actions</div>
                          <div className="text-sm text-yellow-700 mt-1">
                            1. Review error logs in the console<br/>
                            2. Manually sync affected data sources<br/>
                            3. Monitor for recurring issues
                          </div>
                        </div>
                      )}
                      
                      {integrationHealth.overall === 'healthy' && (
                        <div className="border-l-4 border-green-500 pl-4">
                          <div className="font-medium text-green-800">System Optimal</div>
                          <div className="text-sm text-green-700 mt-1">
                            All integration components are functioning normally. 
                            Continue monitoring for any changes.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Common Issues & Solutions</CardTitle>
                <CardDescription>Troubleshooting guide for integration problems</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded p-3">
                    <div className="font-medium">Connection Timeouts</div>
                    <div className="text-sm text-gray-600 mt-1">
                      If API calls are timing out, check network connectivity and try running diagnostics again.
                    </div>
                  </div>
                  
                  <div className="border rounded p-3">
                    <div className="font-medium">Data Sync Failures</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Use manual sync buttons to force refresh specific data sources. Check console for detailed error messages.
                    </div>
                  </div>
                  
                  <div className="border rounded p-3">
                    <div className="font-medium">API Endpoint Errors</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Some endpoints may return 404 errors but system continues working with fallback mechanisms.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}