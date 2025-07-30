import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Database, 
  MessageSquare, 
  Bot, 
  Globe,
  Settings,
  RefreshCw,
  TestTube,
  Activity
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface SystemStatus {
  component: string;
  status: 'operational' | 'degraded' | 'down' | 'testing';
  message: string;
  lastChecked: string;
  responseTime?: number;
  details?: any;
}

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  duration: number;
  details?: any;
}

export default function SystemStatus() {
  const [activeTests, setActiveTests] = useState<string[]>([]);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch system status
  const { data: systemStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/system/status'],
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });
  
  const statusData = systemStatus as any || {};

  // Run comprehensive system tests
  const runTestsMutation = useMutation({
    mutationFn: async (testSuite: string) => {
      setActiveTests(prev => [...prev, testSuite]);
      setTestLogs(prev => [...prev, `Starting ${testSuite} tests...`]);
      
      const response = await fetch(`/api/system/test/${testSuite}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await response.json();
    },
    onSuccess: (data: any, testSuite: string) => {
      setActiveTests(prev => prev.filter(t => t !== testSuite));
      setTestLogs(prev => [...prev, `✅ ${testSuite} tests completed`, ...(data.logs || [])]);
      queryClient.invalidateQueries({ queryKey: ['/api/system/status'] });
    },
    onError: (error: any, testSuite: string) => {
      setActiveTests(prev => prev.filter(t => t !== testSuite));
      setTestLogs(prev => [...prev, `❌ ${testSuite} tests failed: ${error.message}`]);
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'down': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'testing': return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default: return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'down': return 'text-red-600 bg-red-100';
      case 'testing': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const systemComponents = statusData.components || [];
  const overallStatus = systemComponents.length > 0 
    ? systemComponents.every((c: SystemStatus) => c.status === 'operational') 
      ? 'operational' 
      : systemComponents.some((c: SystemStatus) => c.status === 'down') 
        ? 'down' 
        : 'degraded'
    : 'down';

  const operationalCount = systemComponents.filter((c: SystemStatus) => c.status === 'operational').length;
  const totalComponents = systemComponents.length;
  const healthPercentage = totalComponents > 0 ? (operationalCount / totalComponents) * 100 : 0;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">System Status Dashboard</h1>
          <p className="text-gray-600 mt-2">Real-time monitoring of all system components</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => refetchStatus()} 
            variant="outline" 
            disabled={statusLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${statusLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(overallStatus)}
              <div>
                <h2 className="text-2xl font-bold">
                  System {overallStatus === 'operational' ? 'Operational' : 
                         overallStatus === 'degraded' ? 'Degraded' : 'Down'}
                </h2>
                <p className="text-gray-600">
                  {operationalCount} of {totalComponents} components operational
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">{healthPercentage.toFixed(0)}%</div>
              <div className="text-sm text-gray-600">System Health</div>
              <Progress value={healthPercentage} className="w-32 mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="status" className="space-y-6">
        <TabsList>
          <TabsTrigger value="status">Component Status</TabsTrigger>
          <TabsTrigger value="tests">System Tests</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systemComponents.map((component: SystemStatus) => (
              <Card key={component.component}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {component.component === 'database' && <Database className="h-4 w-4" />}
                      {component.component === 'whatsapp' && <MessageSquare className="h-4 w-4" />}
                      {component.component === 'ai-agent' && <Bot className="h-4 w-4" />}
                      {component.component === 'nailit-api' && <Globe className="h-4 w-4" />}
                      {component.component === 'system' && <Settings className="h-4 w-4" />}
                      {component.component.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <Badge className={getStatusColor(component.status)}>
                      {component.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-2">{component.message}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Last checked: {new Date(component.lastChecked).toLocaleTimeString()}</span>
                    {component.responseTime && (
                      <span>{component.responseTime}ms</span>
                    )}
                  </div>
                  {component.details && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                      <pre>{JSON.stringify(component.details, null, 2)}</pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tests">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Test Suites
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => runTestsMutation.mutate('booking-flow')}
                  disabled={activeTests.includes('booking-flow')}
                  className="w-full justify-start"
                >
                  {activeTests.includes('booking-flow') ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Activity className="h-4 w-4 mr-2" />
                  )}
                  Test Complete Booking Flow
                </Button>
                
                <Button
                  onClick={() => runTestsMutation.mutate('nailit-api')}
                  disabled={activeTests.includes('nailit-api')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  {activeTests.includes('nailit-api') ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4 mr-2" />
                  )}
                  Test NailIt API Integration
                </Button>
                
                <Button
                  onClick={() => runTestsMutation.mutate('whatsapp-ai')}
                  disabled={activeTests.includes('whatsapp-ai')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  {activeTests.includes('whatsapp-ai') ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Bot className="h-4 w-4 mr-2" />
                  )}
                  Test WhatsApp AI Agent
                </Button>
                
                <Button
                  onClick={() => runTestsMutation.mutate('database')}
                  disabled={activeTests.includes('database')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  {activeTests.includes('database') ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4 mr-2" />
                  )}
                  Test Database Operations
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Test Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {testLogs.length === 0 ? (
                    <p className="text-gray-500 text-sm">No tests run yet</p>
                  ) : (
                    <div className="space-y-1">
                      {testLogs.map((log, idx) => (
                        <div key={idx} className="text-xs font-mono bg-gray-50 p-2 rounded">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {statusData.logs?.length > 0 ? (
                  <div className="space-y-2">
                    {statusData.logs.map((log: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-2 border-l-2 border-gray-200">
                        <Badge variant="outline" className="text-xs">
                          {log.level}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm">{log.message}</p>
                          <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No logs available</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Response Time</p>
                    <p className="text-2xl font-bold">{statusData.metrics?.avgResponseTime || 0}ms</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold">{statusData.metrics?.successRate || 0}%</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Conversations</p>
                    <p className="text-2xl font-bold">{statusData.metrics?.activeConversations || 0}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Orders Today</p>
                    <p className="text-2xl font-bold">{statusData.metrics?.ordersToday || 0}</p>
                  </div>
                  <Database className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}