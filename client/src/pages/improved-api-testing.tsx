import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ImprovedTestResult {
  endpoint: string;
  success: boolean;
  responseTime: number;
  dataQuality: 'excellent' | 'good' | 'poor' | 'failed';
  businessImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  errorDetails?: string;
  dataValidation: {
    expectedMinimum: number;
    actualCount: number;
    meetsRequirements: boolean;
  };
  recommendations: string[];
}

interface ComprehensiveTestResults {
  results: ImprovedTestResult[];
  overallStatus: 'healthy' | 'degraded' | 'critical';
  businessReadiness: number;
  actionItems: string[];
}

interface APITestIssue {
  endpoint: string;
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  businessImpact: string;
  currentStatus: string;
  recommendedFix: string;
}

interface AnalysisResults {
  issues: APITestIssue[];
  overallHealth: 'healthy' | 'warning' | 'critical';
  businessImpactSummary: string;
}

export default function ImprovedAPITestingPage() {
  const [lastTestTime, setLastTestTime] = useState<Date | null>(null);
  const { toast } = useToast();

  // Query for analysis results
  const { data: analysisResults, refetch: refetchAnalysis } = useQuery<AnalysisResults>({
    queryKey: ["/api/analyze-testing-issues"],
    refetchInterval: 60000, // Refresh every minute
  });

  // Mutation for comprehensive testing
  const comprehensiveTestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/comprehensive-testing");
      return await response.json();
    },
    onSuccess: (data: ComprehensiveTestResults) => {
      setLastTestTime(new Date());
      toast({
        title: "Comprehensive Tests Completed",
        description: `Business Readiness: ${data.businessReadiness}% - Status: ${data.overallStatus}`,
        variant: data.overallStatus === 'critical' ? "destructive" : "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to run comprehensive tests",
        variant: "destructive"
      });
    }
  });

  const handleRunTests = () => {
    comprehensiveTestMutation.mutate();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': case 'degraded': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800'
    };
    return <Badge className={colors[severity as keyof typeof colors]}>{severity.toUpperCase()}</Badge>;
  };

  const getDataQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'poor': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getBusinessImpactIcon = (impact: string) => {
    switch (impact) {
      case 'critical': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'high': return <TrendingDown className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Activity className="h-4 w-4 text-yellow-600" />;
      case 'low': return <TrendingUp className="h-4 w-4 text-blue-600" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-600" />;
    }
  };

  const testResults = comprehensiveTestMutation.data as ComprehensiveTestResults | undefined;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Improved NailIt API Testing Center</h1>
          <p className="text-gray-600 mt-2">
            Advanced testing with business impact analysis and data quality validation
          </p>
          {lastTestTime && (
            <p className="text-sm text-gray-500 mt-1">
              Last comprehensive test: {lastTestTime.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => refetchAnalysis()} 
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Analysis
          </Button>
          <Button 
            onClick={handleRunTests}
            disabled={comprehensiveTestMutation.isPending}
            className="flex items-center gap-2"
          >
            <Activity className={`h-4 w-4 ${comprehensiveTestMutation.isPending ? 'animate-spin' : ''}`} />
            {comprehensiveTestMutation.isPending ? "Testing..." : "Run Comprehensive Tests"}
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            {analysisResults && getStatusIcon(analysisResults.overallHealth)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analysisResults ? getStatusColor(analysisResults.overallHealth) : 'text-gray-400'}`}>
              {analysisResults ? analysisResults.overallHealth.toUpperCase() : 'UNKNOWN'}
            </div>
            <p className="text-xs text-muted-foreground">
              Current system status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Business Readiness</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {testResults ? `${testResults.businessReadiness}%` : 'Pending'}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for production
            </p>
            {testResults && (
              <Progress value={testResults.businessReadiness} className="mt-2" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analysisResults ? analysisResults.issues.filter(i => i.severity === 'critical').length : '?'}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${testResults ? getStatusColor(testResults.overallStatus) : 'text-gray-400'}`}>
              {testResults ? testResults.overallStatus.toUpperCase() : 'PENDING'}
            </div>
            <p className="text-xs text-muted-foreground">
              API integration status
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="issues" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="issues">Current Issues</TabsTrigger>
          <TabsTrigger value="comprehensive">Comprehensive Tests</TabsTrigger>
          <TabsTrigger value="actions">Action Items</TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Identified API Issues</CardTitle>
              <CardDescription>
                Problems found in the current NailIt API testing system with business impact analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysisResults?.issues ? (
                <div className="space-y-4">
                  {analysisResults.issues.map((issue, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{issue.endpoint}</h3>
                          {getSeverityBadge(issue.severity)}
                        </div>
                        {getBusinessImpactIcon(issue.severity)}
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-red-600">Issue: </span>
                          {issue.issue}
                        </div>
                        <div>
                          <span className="font-medium text-blue-600">Business Impact: </span>
                          {issue.businessImpact}
                        </div>
                        <div>
                          <span className="font-medium text-yellow-600">Current Status: </span>
                          {issue.currentStatus}
                        </div>
                        <div>
                          <span className="font-medium text-green-600">Recommended Fix: </span>
                          {issue.recommendedFix}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Click "Refresh Analysis" to load issue analysis
                </div>
              )}
            </CardContent>
          </Card>

          {analysisResults?.businessImpactSummary && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <pre className="whitespace-pre-wrap text-sm">
                  {analysisResults.businessImpactSummary}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="comprehensive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comprehensive Test Results</CardTitle>
              <CardDescription>
                Advanced testing with data quality validation and business impact assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults?.results ? (
                <div className="space-y-4">
                  {testResults.results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{result.endpoint}</h3>
                          {result.success ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {result.responseTime}ms
                          </Badge>
                          <Badge className={getDataQualityColor(result.dataQuality)}>
                            {result.dataQuality}
                          </Badge>
                          {getBusinessImpactIcon(result.businessImpact)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Data Validation:</span>
                          <div className="mt-1">
                            Expected: {result.dataValidation.expectedMinimum}+ items<br/>
                            Actual: {result.dataValidation.actualCount} items<br/>
                            Status: {result.dataValidation.meetsRequirements ? '✅ Pass' : '❌ Fail'}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Business Impact:</span>
                          <div className="mt-1 capitalize font-medium" style={{color: result.businessImpact === 'critical' ? '#dc2626' : result.businessImpact === 'high' ? '#ea580c' : '#059669'}}>
                            {result.businessImpact}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Data Quality:</span>
                          <div className={`mt-1 capitalize font-medium ${getDataQualityColor(result.dataQuality)}`}>
                            {result.dataQuality}
                          </div>
                        </div>
                      </div>

                      {result.errorDetails && (
                        <Alert className="mt-3">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Error:</strong> {result.errorDetails}
                          </AlertDescription>
                        </Alert>
                      )}

                      {result.recommendations.length > 0 && (
                        <div className="mt-3">
                          <span className="font-medium text-sm">Recommendations:</span>
                          <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                            {result.recommendations.map((rec, i) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Click "Run Comprehensive Tests" to see detailed results
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prioritized Action Items</CardTitle>
              <CardDescription>
                Recommended actions based on test results and business impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults?.actionItems ? (
                <div className="space-y-2">
                  {testResults.actionItems.map((action, index) => (
                    <div key={index} className={`p-3 rounded-lg ${action.includes('IMMEDIATE') || action.includes('CRITICAL') ? 'bg-red-50 border-red-200' : action.includes('PERFORMANCE') ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'} border`}>
                      <div className={`text-sm ${action.includes('IMMEDIATE') || action.includes('CRITICAL') ? 'text-red-800' : action.includes('PERFORMANCE') ? 'text-yellow-800' : 'text-blue-800'}`}>
                        {action}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Run comprehensive tests to generate action items
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}