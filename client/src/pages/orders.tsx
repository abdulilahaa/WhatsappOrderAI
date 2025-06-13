import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import OrderCard from "@/components/order-card";
import { ShoppingCart, Plus, Search, Filter } from "lucide-react";
import type { OrderWithCustomer } from "@/lib/types";

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery<OrderWithCustomer[]>({
    queryKey: ["/api/orders"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) => 
      apiRequest("PUT", `/api/orders/${orderId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order status updated successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating order status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (orderId: number, status: string) => {
    updateStatusMutation.mutate({ orderId, status });
  };

  const getOrdersByStatus = (status: string) => {
    return orders?.filter(order => order.status === status) || [];
  };

  // Filter orders based on search and status
  const filteredOrders = orders?.filter(order => {
    const matchesSearch = searchQuery === "" || 
      order.customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.phoneNumber.includes(searchQuery) ||
      order.id.toString().includes(searchQuery);
    
    const matchesStatus = selectedStatus === "all" || order.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const allOrders = filteredOrders;
  const pendingOrders = getOrdersByStatus("pending");
  const confirmedOrders = getOrdersByStatus("confirmed");
  const processingOrders = getOrdersByStatus("processing");
  const completedOrders = getOrdersByStatus("completed");

  const OrdersList = ({ orders: ordersList }: { orders: OrderWithCustomer[] }) => (
    <div className="space-y-4">
      {ordersList.length > 0 ? (
        ordersList.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onStatusChange={handleStatusChange}
          />
        ))
      ) : (
        <div className="text-center text-slate-500 py-12">
          <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No orders found</h3>
          <p>Orders with this status will appear here.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">Order Management</h2>
            <p className="text-slate-600 mt-1">Track and manage customer orders from WhatsApp</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-slate-600">
              Total Orders: <span className="font-semibold">{orders?.length || 0}</span>
            </div>
            <Button 
              onClick={() => window.location.href = "/ai-test"} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Test AI Agent
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Orders</CardTitle>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search orders, customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-64"
                  />
                  <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                </div>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="animate-pulse">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                            <div>
                              <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                              <div className="h-3 bg-slate-200 rounded w-24"></div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="h-4 bg-slate-200 rounded w-16 mb-2"></div>
                            <div className="h-8 bg-slate-200 rounded w-24"></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">All ({allOrders.length})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({pendingOrders.length})</TabsTrigger>
                  <TabsTrigger value="confirmed">Confirmed ({confirmedOrders.length})</TabsTrigger>
                  <TabsTrigger value="processing">Processing ({processingOrders.length})</TabsTrigger>
                  <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-6">
                  <OrdersList orders={allOrders} />
                </TabsContent>
                
                <TabsContent value="pending" className="mt-6">
                  <OrdersList orders={pendingOrders} />
                </TabsContent>
                
                <TabsContent value="confirmed" className="mt-6">
                  <OrdersList orders={confirmedOrders} />
                </TabsContent>
                
                <TabsContent value="processing" className="mt-6">
                  <OrdersList orders={processingOrders} />
                </TabsContent>
                
                <TabsContent value="completed" className="mt-6">
                  <OrdersList orders={completedOrders} />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
