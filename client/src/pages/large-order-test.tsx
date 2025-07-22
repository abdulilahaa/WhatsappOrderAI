import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, Clock, CreditCard, RefreshCw, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrderSummary {
  success: boolean;
  orderId: number;
  paymentSuccessful?: boolean;
  customerName?: string;
  paymentAmount?: number;
  services?: any[];
  appointmentDate?: string;
  location?: string;
  orderStatus?: string;
  knetResult?: string;
  transactionId?: string;
  referenceNumber?: string;
  error?: string;
}

export default function LargeOrderTest() {
  const { toast } = useToast();
  const [orderStatuses, setOrderStatuses] = useState<OrderSummary[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Test order data
  const testOrders = [
    {
      orderId: 176396,
      customerName: "Layla Al-Rashid",
      amount: 70,
      services: ["French Manicure", "Hair Treatment"],
      paymentLink: "http://nailit.innovasolution.net/knet.aspx?orderId=176396"
    },
    {
      orderId: 176397,
      customerName: "Ahmed Al-Mutairi",
      amount: 40,
      services: ["Hair Treatment (VIP Discount)"],
      paymentLink: "http://nailit.innovasolution.net/knet.aspx?orderId=176397"
    }
  ];

  const checkPaymentStatus = async (orderId: number) => {
    try {
      const response = await fetch(`/api/nailit/check-payment/${orderId}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`Error checking payment for order ${orderId}:`, error);
      return { success: false, orderId, error: 'Network error' };
    }
  };

  const checkAllPayments = async () => {
    setIsChecking(true);
    
    try {
      const results = await Promise.all(
        testOrders.map(order => checkPaymentStatus(order.orderId))
      );
      
      setOrderStatuses(results);
      setLastChecked(new Date());
      
      const paidOrders = results.filter(r => r.success && r.paymentSuccessful);
      const pendingOrders = results.filter(r => r.success && !r.paymentSuccessful);
      
      if (paidOrders.length > 0) {
        toast({
          title: "Payment Confirmed!",
          description: `${paidOrders.length} order(s) successfully paid`,
          variant: "default"
        });
      }
      
      if (pendingOrders.length > 0) {
        toast({
          title: "Payments Pending",
          description: `${pendingOrders.length} order(s) awaiting payment`,
          variant: "default"
        });
      }
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check payment status",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (order: OrderSummary) => {
    if (!order.success) return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (order.paymentSuccessful) return <CheckCircle className="h-5 w-5 text-green-500" />;
    return <Clock className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusBadge = (order: OrderSummary) => {
    if (!order.success) return <Badge variant="destructive">Error</Badge>;
    if (order.paymentSuccessful) return <Badge variant="default" className="bg-green-500">Paid</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isChecking) {
        checkAllPayments();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isChecking]);

  // Initial check on load
  useEffect(() => {
    checkAllPayments();
  }, []);

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Large Order Payment Test</h1>
          <p className="text-muted-foreground">
            Monitor KNet payment status for test orders
          </p>
        </div>
        <Button
          onClick={checkAllPayments}
          disabled={isChecking}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Refresh Status'}
        </Button>
      </div>

      {/* Payment Links Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Links Ready for Testing
          </CardTitle>
          <CardDescription>
            Use these KNet payment links to test the payment verification system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {testOrders.map((order, index) => (
            <div key={order.orderId} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Order #{order.orderId}</h3>
                  <p className="text-sm text-muted-foreground">
                    Customer: {order.customerName} • Amount: {order.amount} KWD
                  </p>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Ready for Payment
                </Badge>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Services:</strong> {order.services.join(", ")}
                </p>
                
                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <a
                      href={order.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Pay with KNet ({order.amount} KWD)
                    </a>
                  </Button>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {order.paymentLink}
                  </code>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Payment Status Section */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Status Monitor</CardTitle>
          <CardDescription>
            {lastChecked ? (
              `Last checked: ${lastChecked.toLocaleTimeString()}`
            ) : (
              "Click Refresh Status to check payment status"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orderStatuses.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No payment status data yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orderStatuses.map((order) => (
                <div key={order.orderId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(order)}
                      <div>
                        <h3 className="font-semibold">Order #{order.orderId}</h3>
                        <p className="text-sm text-muted-foreground">
                          {order.customerName}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(order)}
                  </div>

                  {order.success ? (
                    order.paymentSuccessful ? (
                      <div className="space-y-2 text-sm">
                        <div className="bg-green-50 border border-green-200 rounded p-3">
                          <p className="font-semibold text-green-800">Payment Confirmed!</p>
                          <p className="text-green-700">Amount: {order.paymentAmount} KWD</p>
                          {order.transactionId && (
                            <p className="text-green-700">Transaction: {order.transactionId}</p>
                          )}
                          {order.referenceNumber && (
                            <p className="text-green-700">Reference: {order.referenceNumber}</p>
                          )}
                        </div>
                        <p><strong>Status:</strong> {order.orderStatus}</p>
                        <p><strong>Appointment:</strong> {order.appointmentDate}</p>
                        <p><strong>Location:</strong> {order.location}</p>
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <p className="font-semibold text-yellow-800">Payment Pending</p>
                          <p className="text-yellow-700">Order Status: {order.orderStatus}</p>
                          {order.knetResult && (
                            <p className="text-yellow-700">KNet Status: {order.knetResult}</p>
                          )}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                      <p className="font-semibold text-red-800">Error</p>
                      <p className="text-red-700">{order.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Test Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">How to Test:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click on the "Pay with KNet" button for any order above</li>
              <li>Complete the payment using KNet test credentials</li>
              <li>Return to this page and click "Refresh Status"</li>
              <li>Monitor payment confirmation and order details</li>
            </ol>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-semibold">KNet Test Credentials:</h4>
            <div className="bg-gray-50 rounded p-3 text-sm font-mono space-y-1">
              <p><strong>Card Number:</strong> 0000000001</p>
              <p><strong>Expiry Date:</strong> 09/25</p>
              <p><strong>PIN:</strong> 1234</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}