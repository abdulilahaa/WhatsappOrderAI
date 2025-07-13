import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, RefreshCw, AlertTriangle, TestTube, Clock, Activity, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface APITestResult {
  success: boolean;
  error?: string;
  data?: any;
  responseTime?: number;
}

interface APITestResults {
  summary: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime?: number;
  };
  details: { [key: string]: APITestResult };
}

interface EndpointInfo {
  name: string;
  description: string;
  method: string;
  endpoint: string;
  priority: 'critical' | 'important' | 'optional';
  category: 'core' | 'data' | 'integration';
}

const NAILIT_ENDPOINTS: EndpointInfo[] = [
  {
    name: "Register Device",
    description: "Authenticates device with NailIt POS system",
    method: "POST",
    endpoint: "RegisterDevice",
    priority: "critical",
    category: "core"
  },
  {
    name: "Get Locations",
    description: "Retrieves all salon locations",
    method: "GET", 
    endpoint: "GetLocations",
    priority: "critical",
    category: "data"
  },
  {
    name: "Get Groups",
    description: "Gets service categories/groups",
    method: "GET",
    endpoint: "GetGroups",
    priority: "important",
    category: "data"
  },
  {
    name: "Get Sub Groups",
    description: "Gets service subcategories",
    method: "GET",
    endpoint: "GetSubGroups", 
    priority: "important",
    category: "data"
  },
  {
    name: "Get Service Staff",
    description: "Gets available staff for a specific service",
    method: "GET",
    endpoint: "GetServiceStaff1",
    priority: "important",
    category: "data"
  },
  {
    name: "Get Items By Date",
    description: "Retrieves services/products for specific date",
    method: "GET",
    endpoint: "GetItemsByDate",
    priority: "critical",
    category: "data"
  },
  {
    name: "Get Service Staff",
    description: "Gets available staff for services",
    method: "GET",
    endpoint: "GetServiceStaff",
    priority: "important",
    category: "integration"
  },
  {
    name: "Get Available Slots",
    description: "Retrieves time slots for appointments",
    method: "GET",
    endpoint: "GetAvailableSlots",
    priority: "critical",
    category: "integration"
  },
  {
    name: "Get Payment Types",
    description: "Gets available payment methods",
    method: "GET", 
    endpoint: "GetPaymentTypes",
    priority: "important",
    category: "data"
  },
  {
    name: "Save Order",
    description: "Creates new order in NailIt POS",
    method: "POST",
    endpoint: "SaveOrder",
    priority: "critical",
    category: "integration"
  }
];

export default function APITestingPage() {
  const [isRunningFullTest, setIsRunningFullTest] = useState(false);
  const [lastTestTime, setLastTestTime] = useState<Date | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for getting cached test results
  const { data: testResults, isLoading } = useQuery<APITestResults>({
    queryKey: ["/api/nailit/test-all-endpoints"],
    refetchInterval: false, // Only refresh on manual trigger
  });

  // Mutation for running comprehensive tests
  const runTestsMutation = useMutation({
    mutationFn: () => apiRequest("/api/nailit/test-all-endpoints"),
    onSuccess: (data) => {
      setLastTestTime(new Date());
      queryClient.setQueryData(["/api/nailit/test-all-endpoints"], data);
      toast({
        title: "API Tests Completed",
        description: `${data.summary.successful}/${data.summary.total} endpoints working`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to run API tests",
        variant: "destructive"
      });
    }
  });

  const handleRunFullTest = async () => {
    setIsRunningFullTest(true);
    try {
      await runTestsMutation.mutateAsync();
    } finally {
      setIsRunningFullTest(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getStatusBadge = (success: boolean) => {
    return (
      <Badge variant={success ? "default" : "destructive"}>
        {success ? "Working" : "Failed"}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      critical: "destructive",
      important: "default", 
      optional: "secondary"
    } as const;
    
    return (
      <Badge variant={variants[priority as keyof typeof variants] || "secondary"}>
        {priority}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'core': return <Activity className="h-4 w-4" />;
      case 'data': return <TestTube className="h-4 w-4" />;
      case 'integration': return <Zap className="h-4 w-4" />;
      default: return <TestTube className="h-4 w-4" />;
    }
  };

  const successfulEndpoints = testResults?.summary?.successful || 0;
  const totalEndpoints = testResults?.summary?.total || NAILIT_ENDPOINTS.length;
  const successRate = totalEndpoints > 0 ? (successfulEndpoints / totalEndpoints) * 100 : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">NailIt API Testing Center</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive testing and monitoring of all NailIt POS API endpoints
          </p>
          {lastTestTime && (
            <p className="text-sm text-gray-500 mt-1">
              Last tested: {lastTestTime.toLocaleString()}
            </p>
          )}
        </div>
        <Button 
          onClick={handleRunFullTest} 
          disabled={isLoading || isRunningFullTest}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${(isLoading || isRunningFullTest) ? 'animate-spin' : ''}`} />
          {isLoading || isRunningFullTest ? "Testing..." : "Run All Tests"}
        </Button>
      </div>

      {/* Test Results Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(successRate)}%</div>
            <p className="text-xs text-muted-foreground">
              {successfulEndpoints}/{totalEndpoints} endpoints working
            </p>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {testResults?.summary?.averageResponseTime ? `${testResults.summary.averageResponseTime}ms` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical APIs</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {NAILIT_ENDPOINTS.filter(e => e.priority === 'critical').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Mission-critical endpoints
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Status</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {testResults ? 'Complete' : 'Pending'}
            </div>
            <p className="text-xs text-muted-foreground">
              {testResults ? 'Tests completed' : 'Run tests to see results'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Test Results Alert */}
      {testResults && successRate < 80 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>API Health Warning:</strong> {Math.round(100 - successRate)}% of endpoints are failing. 
            Critical system functions may be impacted. Check individual endpoint details below.
          </AlertDescription>
        </Alert>
      )}

      {testResults && successRate >= 90 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Excellent API Health:</strong> All critical systems are operational. 
            NailIt POS integration is working perfectly.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Test Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Results</TabsTrigger>
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            {['critical', 'important', 'optional'].map((priority) => {
              const endpointsInPriority = NAILIT_ENDPOINTS.filter(e => e.priority === priority);
              const workingInPriority = endpointsInPriority.filter(e => 
                testResults?.details?.[e.endpoint.toLowerCase()]?.success
              ).length;
              
              return (
                <Card key={priority}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="capitalize">{priority} Endpoints</span>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(priority)}
                        <Badge variant="outline">
                          {workingInPriority}/{endpointsInPriority.length}
                        </Badge>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {priority === 'critical' && "Essential for core system functionality"}
                      {priority === 'important' && "Required for optimal user experience"}
                      {priority === 'optional' && "Enhanced features and analytics"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {endpointsInPriority.map((endpoint) => {
                        const result = testResults?.details?.[endpoint.endpoint.toLowerCase()];
                        const isWorking = result?.success || false;
                        
                        return (
                          <div key={`${endpoint.endpoint}-${endpoint.priority}`} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {getCategoryIcon(endpoint.category)}
                              <div>
                                <div className="font-medium">{endpoint.name}</div>
                                <div className="text-sm text-gray-600">{endpoint.description}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {result?.responseTime && (
                                <Badge variant="outline">{result.responseTime}ms</Badge>
                              )}
                              {getStatusIcon(isWorking)}
                              {getStatusBadge(isWorking)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Test Results</CardTitle>
              <CardDescription>Complete breakdown of all API endpoint tests</CardDescription>
            </CardHeader>
            <CardContent>
              {testResults ? (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {Object.entries(testResults.details).map(([endpoint, result]) => {
                      const endpointInfo = NAILIT_ENDPOINTS.find(e => 
                        e.endpoint.toLowerCase() === endpoint.toLowerCase()
                      );
                      
                      return (
                        <div key={endpoint} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(endpointInfo?.category || 'data')}
                              <span className="font-medium">
                                {endpointInfo?.name || endpoint}
                              </span>
                              {endpointInfo && getPriorityBadge(endpointInfo.priority)}
                            </div>
                            <div className="flex items-center gap-2">
                              {result.responseTime && (
                                <Badge variant="outline">{result.responseTime}ms</Badge>
                              )}
                              {getStatusIcon(result.success)}
                              {getStatusBadge(result.success)}
                            </div>
                          </div>
                          
                          {endpointInfo && (
                            <div className="text-sm text-gray-600">
                              {endpointInfo.description}
                            </div>
                          )}
                          
                          {result.error && (
                            <div className="bg-red-50 border border-red-200 rounded p-3">
                              <div className="text-sm font-medium text-red-800">Error Details:</div>
                              <div className="text-sm text-red-700 mt-1">{result.error}</div>
                            </div>
                          )}
                          
                          {result.success && result.data && (
                            <div className="bg-green-50 border border-green-200 rounded p-3">
                              <div className="text-sm font-medium text-green-800">Response Data:</div>
                              <div className="text-xs text-green-700 mt-1 font-mono">
                                {typeof result.data === 'string' ? result.data : JSON.stringify(result.data).substring(0, 200) + '...'}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No test results available. Run tests to see detailed information.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="troubleshooting" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Common Issues & Solutions</CardTitle>
                <CardDescription>Troubleshooting guide for failed API endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-l-4 border-red-500 pl-4">
                    <h4 className="font-medium text-red-800">Device Registration Failed</h4>
                    <p className="text-sm text-red-700 mt-1">
                      If RegisterDevice is failing, check network connectivity and verify the security token is valid.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h4 className="font-medium text-yellow-800">Groups Endpoint 404 Error</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      GetGroups endpoint returns 404 but system continues working with fallback data extraction.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium text-blue-800">Slow Response Times</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Response times over 2000ms may indicate network issues or high server load.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-medium text-green-800">Order Creation Issues</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Ensure proper date format (dd/MM/yyyy), valid staff IDs, and correct Order_Type (2 for services).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health Indicators</CardTitle>
                <CardDescription>What different test results mean for your system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-2 bg-green-50 rounded">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="font-medium text-green-800">90-100% Success Rate</div>
                      <div className="text-sm text-green-700">Excellent - All systems operational</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-2 bg-yellow-50 rounded">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className="font-medium text-yellow-800">70-89% Success Rate</div>
                      <div className="text-sm text-yellow-700">Good - Minor issues, system functional</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-2 bg-red-50 rounded">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <div className="font-medium text-red-800">Below 70% Success Rate</div>
                      <div className="text-sm text-red-700">Critical - System integration compromised</div>
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