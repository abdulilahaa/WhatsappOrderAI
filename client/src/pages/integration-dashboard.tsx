import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle, Activity, Zap, Users, ShoppingCart, Clock, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TestResult {
  endpoint: string;
  success: boolean;
  responseTime?: number;
  error?: string;
  data?: any;
}

interface OrderTestData {
  customerId: number;
  serviceId: number;
  serviceName: string;
  locationId: number;
  appointmentDate: string;
  paymentTypeId: number;
  customerInfo: {
    name: string;
    mobile: string;
    email: string;
  };
}

export default function IntegrationDashboard() {
  const queryClient = useQueryClient();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [orderTestData, setOrderTestData] = useState<OrderTestData>({
    customerId: 110732,
    serviceId: 318,
    serviceName: "Ginger Scalp Scrub Treatment",
    locationId: 1,
    appointmentDate: "13/07/2025",
    paymentTypeId: 1,
    customerInfo: {
      name: "Sarah Ahmed",
      mobile: "96512345678",
      email: "sarah.test@example.com"
    }
  });
  const [conversationTest, setConversationTest] = useState({
    message: "I want to book a scalp treatment for tomorrow at Al-Plaza Mall",
    customerPhone: "+96512345678",
    customerName: "Sarah Ahmed",
    customerEmail: "sarah.test@example.com"
  });

  // Real-time stats
  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"]
  });

  const { data: locations } = useQuery({
    queryKey: ["/api/nailit/locations"]
  });

  const { data: paymentTypes } = useQuery({
    queryKey: ["/api/nailit/payment-types"]
  });

  const { data: conversations } = useQuery({
    queryKey: ["/api/conversations/active"]
  });

  // Test all API endpoints
  const testEndpointsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/nailit/test-all-endpoints");
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Test endpoints response:", data);
      if (data.details) {
        const results = Object.entries(data.details).map(([endpoint, result]: [string, any]) => ({
          endpoint,
          success: result.success,
          responseTime: result.responseTime,
          error: result.error,
          data: result.data
        }));
        setTestResults(results);
      }
    },
    onError: (error) => {
      console.error("Test endpoints error:", error);
      setTestResults([]);
    }
  });

  // Test order creation
  const testOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/nailit/save-order", orderData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error) => {
      console.error("Test order error:", error);
    }
  });

  // Test AI conversation
  const testConversationMutation = useMutation({
    mutationFn: async (testData: any) => {
      const response = await apiRequest("POST", "/api/ai/test", testData);
      return await response.json();
    },
    onError: (error) => {
      console.error("Test conversation error:", error);
    }
  });

  // Register new user
  const registerUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/nailit/register-user", userData);
      return await response.json();
    },
    onError: (error) => {
      console.error("Register user error:", error);
    }
  });

  // Test register user with sample data
  const testRegisterUserMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/nailit/test-register-user");
      return await response.json();
    },
    onError: (error) => {
      console.error("Test register user error:", error);
    }
  });

  const handleTestAllEndpoints = () => {
    testEndpointsMutation.mutate();
  };

  const handleTestOrder = () => {
    const orderPayload = {
      Gross_Amount: 15.0,
      Payment_Type_Id: orderTestData.paymentTypeId,
      Order_Type: 2, // Services
      UserId: orderTestData.customerId,
      FirstName: orderTestData.customerInfo.name,
      Mobile: orderTestData.customerInfo.mobile,
      Email: orderTestData.customerInfo.email,
      Discount_Amount: 0,
      Net_Amount: 15.0,
      POS_Location_Id: orderTestData.locationId,
      OrderDetails: [{
        Prod_Id: orderTestData.serviceId,
        Prod_Name: orderTestData.serviceName,
        Qty: 1,
        Rate: 15.0,
        Amount: 15.0,
        Size_Id: null,
        Size_Name: "",
        Promotion_Id: 0,
        Promo_Code: "",
        Discount_Amount: 0,
        Net_Amount: 15.0,
        Staff_Id: 17, // Monica from API docs
        TimeFrame_Ids: [2, 6], // 10:30 AM, 12:30 PM from API docs
        Appointment_Date: orderTestData.appointmentDate
      }]
    };

    testOrderMutation.mutate(orderPayload);
  };

  const handleTestConversation = () => {
    const testPayload = {
      message: conversationTest.message,
      customer: {
        phoneNumber: conversationTest.customerPhone,
        name: conversationTest.customerName,
        email: conversationTest.customerEmail
      }
    };

    testConversationMutation.mutate(testPayload);
  };

  const handleRegisterUser = () => {
    const userData = {
      Address: "Test Address Kuwait",
      Email_Id: orderTestData.customerInfo.email,
      Name: orderTestData.customerInfo.name,
      Mobile: orderTestData.customerInfo.mobile,
      Login_Type: 1
    };

    registerUserMutation.mutate(userData);
  };

  const getStatusColor = (success: boolean) => success ? "text-green-600" : "text-red-600";
  const getStatusIcon = (success: boolean) => success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />;

  const successfulEndpoints = testResults.filter(r => r.success).length;
  const totalEndpoints = testResults.length;
  const successRate = totalEndpoints > 0 ? (successfulEndpoints / totalEndpoints) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">NailIt POS Integration Dashboard</h2>
        <p className="text-muted-foreground">
          Complete end-to-end testing and monitoring for the NailIt POS system integration
        </p>
      </div>

      {/* Real-time System Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Synced from NailIt API
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeConversations || 0}</div>
            <p className="text-xs text-muted-foreground">
              AI Response Rate: {stats?.aiResponseRate || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Revenue: {stats?.revenueToday || 0} KWD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(successRate)}%</div>
            <p className="text-xs text-muted-foreground">
              {successfulEndpoints}/{totalEndpoints} endpoints working
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">API Testing</TabsTrigger>
          <TabsTrigger value="orders">Order Testing</TabsTrigger>
          <TabsTrigger value="conversation">AI Testing</TabsTrigger>
          <TabsTrigger value="monitoring">Live Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>NailIt API Endpoint Testing</CardTitle>
              <CardDescription>
                Test all NailIt POS API endpoints for connectivity and response
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleTestAllEndpoints}
                  disabled={testEndpointsMutation.isPending}
                >
                  {testEndpointsMutation.isPending ? "Testing..." : "Test All Endpoints"}
                </Button>
                {totalEndpoints > 0 && (
                  <div className="flex items-center gap-2">
                    <Progress value={successRate} className="w-32" />
                    <span className="text-sm">{successfulEndpoints}/{totalEndpoints}</span>
                  </div>
                )}
              </div>

              {testResults.length > 0 && (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {testResults.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className={getStatusColor(result.success)}>
                            {getStatusIcon(result.success)}
                          </span>
                          <span className="font-mono text-sm">{result.endpoint}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.responseTime && (
                            <Badge variant="outline">{result.responseTime}ms</Badge>
                          )}
                          <Badge variant={result.success ? "default" : "destructive"}>
                            {result.success ? "Success" : "Failed"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complete Order Testing</CardTitle>
              <CardDescription>
                Test end-to-end order creation through NailIt POS system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer ID</label>
                  <Input
                    value={orderTestData.customerId}
                    onChange={(e) => setOrderTestData({...orderTestData, customerId: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Service</label>
                  <Select
                    value={orderTestData.serviceId.toString()}
                    onValueChange={(value) => {
                      const service = products?.find(p => p.id === Number(value));
                      setOrderTestData({
                        ...orderTestData,
                        serviceId: Number(value),
                        serviceName: service?.name || ""
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.slice(0, 10).map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name} - {product.price} KWD
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Select
                    value={orderTestData.locationId.toString()}
                    onValueChange={(value) => setOrderTestData({...orderTestData, locationId: Number(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locations?.map((location: any) => (
                        <SelectItem key={location.Location_Id} value={location.Location_Id.toString()}>
                          {location.Location_Name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <Select
                    value={orderTestData.paymentTypeId.toString()}
                    onValueChange={(value) => setOrderTestData({...orderTestData, paymentTypeId: Number(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTypes?.map((payment: any) => (
                        <SelectItem key={payment.id} value={payment.id.toString()}>
                          {payment.name} ({payment.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  placeholder="Customer Name"
                  value={orderTestData.customerInfo.name}
                  onChange={(e) => setOrderTestData({
                    ...orderTestData,
                    customerInfo: {...orderTestData.customerInfo, name: e.target.value}
                  })}
                />
                <Input
                  placeholder="Mobile Number"
                  value={orderTestData.customerInfo.mobile}
                  onChange={(e) => setOrderTestData({
                    ...orderTestData,
                    customerInfo: {...orderTestData.customerInfo, mobile: e.target.value}
                  })}
                />
                <Input
                  placeholder="Email"
                  value={orderTestData.customerInfo.email}
                  onChange={(e) => setOrderTestData({
                    ...orderTestData,
                    customerInfo: {...orderTestData.customerInfo, email: e.target.value}
                  })}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleRegisterUser}
                  disabled={registerUserMutation.isPending}
                  variant="outline"
                >
                  {registerUserMutation.isPending ? "Registering..." : "Register User"}
                </Button>
                <Button 
                  onClick={() => testRegisterUserMutation.mutate()}
                  disabled={testRegisterUserMutation.isPending}
                  variant="outline"
                >
                  {testRegisterUserMutation.isPending ? "Testing..." : "Test Register User API"}
                </Button>
                <Button 
                  onClick={handleTestOrder}
                  disabled={testOrderMutation.isPending}
                >
                  {testOrderMutation.isPending ? "Creating Order..." : "Test Order Creation"}
                </Button>
              </div>

              {/* Test Results */}
              {testOrderMutation.data && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800">Order Created Successfully!</h4>
                  <pre className="text-sm text-green-700 mt-2 overflow-x-auto">
                    {JSON.stringify(testOrderMutation.data, null, 2)}
                  </pre>
                </div>
              )}

              {testOrderMutation.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-800">Order Creation Failed</h4>
                  <p className="text-sm text-red-700 mt-2">{testOrderMutation.error.message}</p>
                </div>
              )}

              {registerUserMutation.data && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800">User Registration Result</h4>
                  <pre className="text-sm text-blue-700 mt-2 overflow-x-auto">
                    {JSON.stringify(registerUserMutation.data, null, 2)}
                  </pre>
                </div>
              )}

              {registerUserMutation.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-800">User Registration Failed</h4>
                  <p className="text-sm text-red-700 mt-2">{registerUserMutation.error.message}</p>
                </div>
              )}

              {testRegisterUserMutation.data && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800">Test Register User API Result</h4>
                  <pre className="text-sm text-green-700 mt-2 overflow-x-auto">
                    {JSON.stringify(testRegisterUserMutation.data, null, 2)}
                  </pre>
                </div>
              )}

              {testRegisterUserMutation.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-800">Test Register User API Failed</h4>
                  <p className="text-sm text-red-700 mt-2">{testRegisterUserMutation.error.message}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Conversation Testing</CardTitle>
              <CardDescription>
                Test the complete AI conversation flow with NailIt integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  placeholder="Customer Phone"
                  value={conversationTest.customerPhone}
                  onChange={(e) => setConversationTest({...conversationTest, customerPhone: e.target.value})}
                />
                <Input
                  placeholder="Customer Name"
                  value={conversationTest.customerName}
                  onChange={(e) => setConversationTest({...conversationTest, customerName: e.target.value})}
                />
                <Input
                  placeholder="Customer Email"
                  value={conversationTest.customerEmail}
                  onChange={(e) => setConversationTest({...conversationTest, customerEmail: e.target.value})}
                />
              </div>

              <Textarea
                placeholder="Enter customer message to test AI response..."
                value={conversationTest.message}
                onChange={(e) => setConversationTest({...conversationTest, message: e.target.value})}
                rows={3}
              />

              <Button 
                onClick={handleTestConversation}
                disabled={testConversationMutation.isPending}
              >
                {testConversationMutation.isPending ? "Processing..." : "Test AI Conversation"}
              </Button>

              {testConversationMutation.data && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800">AI Response</h4>
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-blue-700">{testConversationMutation.data.message}</p>
                    {testConversationMutation.data.suggestedProducts?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-blue-800">Suggested Services:</p>
                        <ul className="text-sm text-blue-700 list-disc list-inside">
                          {testConversationMutation.data.suggestedProducts.map((product: any, index: number) => (
                            <li key={index}>{product.name} - {product.price} KWD</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Active Conversations</CardTitle>
                <CardDescription>Real-time customer interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {conversations?.map((conv: any) => (
                    <div key={conv.id} className="flex items-center gap-3 p-3 border-b">
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                      <div className="flex-1">
                        <p className="font-medium">{conv.customer.name}</p>
                        <p className="text-sm text-muted-foreground">{conv.customer.phoneNumber}</p>
                      </div>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Locations</CardTitle>
                <CardDescription>NailIt POS locations</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {locations?.map((location: any) => (
                    <div key={location.Location_Id} className="flex items-center gap-3 p-3 border-b">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{location.Location_Name}</p>
                        <p className="text-sm text-muted-foreground">{location.Address}</p>
                        <p className="text-xs text-muted-foreground">
                          {location.From_Time} - {location.To_Time}
                        </p>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}