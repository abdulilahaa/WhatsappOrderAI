import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, Clock, DollarSign, Users, Package } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface OrderResult {
  success: boolean;
  orderType: string;
  orderId?: number;
  customerId?: number;
  customerName?: string;
  servicesCount?: number;
  totalAmount?: number;
  discountApplied?: number;
  finalAmount?: number;
  paymentLink?: string;
  services?: Array<{name: string; price: number}>;
  location?: string;
  error?: string;
}

export default function LargeOrderTest() {
  const [results, setResults] = useState<{
    newCustomerOrder?: OrderResult;
    existingCustomerOrder?: OrderResult;
  }>({});
  
  const newCustomerMutation = useMutation({
    mutationFn: () => apiRequest('/api/nailit/test/new-customer-order', {
      method: 'POST'
    }),
    onSuccess: (data) => {
      setResults(prev => ({...prev, newCustomerOrder: data}));
    }
  });

  const existingCustomerMutation = useMutation({
    mutationFn: () => apiRequest('/api/nailit/test/existing-customer-order', {
      method: 'POST'
    }),
    onSuccess: (data) => {
      setResults(prev => ({...prev, existingCustomerOrder: data}));
    }
  });

  const bothOrdersMutation = useMutation({
    mutationFn: () => apiRequest('/api/nailit/test/large-orders', {
      method: 'POST'
    }),
    onSuccess: (data) => {
      if (data.results) {
        setResults(data.results);
      }
    }
  });

  const formatKWD = (amount?: number) => {
    return amount ? `${amount.toFixed(3)} KWD` : 'N/A';
  };

  const OrderResultCard = ({ result, title, icon: Icon }: { 
    result?: OrderResult; 
    title: string; 
    icon: React.ElementType;
  }) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
          {result && (
            result.success ? 
            <Check className="h-4 w-4 text-green-500 ml-auto" /> :
            <AlertCircle className="h-4 w-4 text-red-500 ml-auto" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!result ? (
          <p className="text-muted-foreground">Not tested yet</p>
        ) : result.success ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Order ID</p>
                <p className="text-lg text-blue-600">#{result.orderId}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Customer</p>
                <p className="text-sm">{result.customerName}</p>
                <p className="text-xs text-muted-foreground">ID: {result.customerId}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Services
                </p>
                <p className="text-lg">{result.servicesCount}</p>
              </div>
              <div>
                <p className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Total Amount
                </p>
                <p className="text-lg">{formatKWD(result.totalAmount)}</p>
                {result.discountApplied && (
                  <p className="text-xs text-green-600">
                    -{formatKWD(result.discountApplied)} discount
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm">{result.location || 'Al-Plaza Mall'}</p>
              </div>
            </div>

            {result.services && (
              <div>
                <p className="text-sm font-medium mb-2">Services Booked:</p>
                <div className="space-y-1">
                  {result.services.map((service, index) => (
                    <div key={index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                      <span>{service.name}</span>
                      <span className="font-medium">{formatKWD(service.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.paymentLink && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium mb-1">KNet Payment Link:</p>
                <p className="text-xs font-mono bg-white p-2 rounded border break-all">
                  {result.paymentLink}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-red-600">
            <p className="font-medium">Test Failed</p>
            <p className="text-sm">{result.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Large Order Testing</h1>
        <p className="text-muted-foreground mt-2">
          Test authentic NailIt API integration with comprehensive multi-service orders
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Button
          onClick={() => newCustomerMutation.mutate()}
          disabled={newCustomerMutation.isPending}
          className="h-20 flex flex-col items-center justify-center space-y-2"
        >
          <Users className="h-5 w-5" />
          <span>Test New Customer Order</span>
          {newCustomerMutation.isPending && <Clock className="h-4 w-4 animate-spin" />}
        </Button>

        <Button
          onClick={() => existingCustomerMutation.mutate()}
          disabled={existingCustomerMutation.isPending}
          className="h-20 flex flex-col items-center justify-center space-y-2"
          variant="outline"
        >
          <Users className="h-5 w-5" />
          <span>Test Existing Customer Order</span>
          {existingCustomerMutation.isPending && <Clock className="h-4 w-4 animate-spin" />}
        </Button>

        <Button
          onClick={() => bothOrdersMutation.mutate()}
          disabled={bothOrdersMutation.isPending}
          className="h-20 flex flex-col items-center justify-center space-y-2"
          variant="secondary"
        >
          <Package className="h-5 w-5" />
          <span>Test Both Orders</span>
          {bothOrdersMutation.isPending && <Clock className="h-4 w-4 animate-spin" />}
        </Button>
      </div>

      <div className="space-y-6">
        <OrderResultCard
          result={results.newCustomerOrder}
          title="New Customer Large Order"
          icon={Users}
        />

        <OrderResultCard
          result={results.existingCustomerOrder}
          title="Existing Customer Large Order"
          icon={Users}
        />

        {(results.newCustomerOrder?.success && results.existingCustomerOrder?.success) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600 flex items-center gap-2">
                <Check className="h-5 w-5" />
                Large Order Tests Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Test Results</h4>
                  <ul className="space-y-1 text-sm">
                    <li className="flex justify-between">
                      <span>New Customer Order:</span>
                      <span className="text-green-600 font-medium">Success</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Existing Customer Order:</span>
                      <span className="text-green-600 font-medium">Success</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Total Services Booked:</span>
                      <span className="font-medium">
                        {(results.newCustomerOrder?.servicesCount || 0) + 
                         (results.existingCustomerOrder?.servicesCount || 0)}
                      </span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Revenue Generated</h4>
                  <ul className="space-y-1 text-sm">
                    <li className="flex justify-between">
                      <span>New Customer:</span>
                      <span className="font-medium">{formatKWD(results.newCustomerOrder?.totalAmount)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Existing Customer:</span>
                      <span className="font-medium">{formatKWD(results.existingCustomerOrder?.finalAmount || results.existingCustomerOrder?.totalAmount)}</span>
                    </li>
                    <li className="flex justify-between border-t pt-1 font-medium">
                      <span>Total Revenue:</span>
                      <span className="text-green-600">
                        {formatKWD((results.newCustomerOrder?.totalAmount || 0) + 
                                  (results.existingCustomerOrder?.finalAmount || results.existingCustomerOrder?.totalAmount || 0))}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}