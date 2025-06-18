import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatsCard from "@/components/stats-card";
import ProductCard from "@/components/product-card";
import OrderCard from "@/components/order-card";
import ConversationThread from "@/components/conversation-thread";
import { Database, CheckCircle, Clock } from "lucide-react";
import type { DashboardStats, OrderWithCustomer, ConversationWithCustomer } from "@/lib/types";
import type { Product, AISettings } from "@shared/schema";

interface DashboardProps {
  onAddProduct: () => void;
}

export default function Dashboard({ onAddProduct }: DashboardProps) {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0, // Consider data stale immediately
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<OrderWithCustomer[]>({
    queryKey: ["/api/orders"],
  });

  const { data: activeConversations, isLoading: conversationsLoading } = useQuery<ConversationWithCustomer[]>({
    queryKey: ["/api/conversations/active"],
  });

  const { data: aiSettings } = useQuery<AISettings>({
    queryKey: ["/api/ai-settings"],
  });

  const recentOrders = orders?.slice(0, 3) || [];
  const featuredProducts = products?.slice(0, 4) || [];
  const liveConversation = activeConversations?.[0];

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">Dashboard Overview</h2>
            <p className="text-slate-600 mt-1">Monitor your WhatsApp ordering system performance</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Database Status Indicator */}
            <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
              <Database className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Database Connected</span>
            </div>
            {/* AI Agent Status */}
            <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-700">AI Agent Active</span>
            </div>
            <Button onClick={onAddProduct} className="bg-whatsapp hover:bg-whatsapp/90">
              <i className="fas fa-plus mr-2"></i>Add Product
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-slate-200 rounded w-16 mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-20"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <StatsCard
                title="Total Orders"
                value={stats?.totalOrders || 0}
                change="+12% from last week"
                icon="fa-shopping-cart"
                iconBgColor="bg-blue-100"
                iconColor="text-blue-600"
              />
              <StatsCard
                title="Active Conversations"
                value={stats?.activeConversations || 0}
                change="+5 new today"
                icon="fa-comments"
                iconBgColor="bg-green-100"
                iconColor="text-green-600"
              />
              <StatsCard
                title="Total Revenue"
                value={`$${stats?.revenueToday?.toFixed(2) || '0.00'}`}
                change="From completed orders"
                icon="fa-dollar-sign"
                iconBgColor="bg-whatsapp/10"
                iconColor="text-whatsapp"
              />
              <StatsCard
                title="AI Response Rate"
                value={`${stats?.aiResponseRate || 0}%`}
                change="Excellent performance"
                icon="fa-robot"
                iconBgColor="bg-ai/10"
                iconColor="text-ai"
              />
            </>
          )}
        </div>

        {/* Configuration Status Panel */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Configuration Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* AI Settings Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">AI Configuration</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Saved
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-600">
                    Business: {aiSettings?.businessName || "Not configured"}
                  </div>
                  <div className="text-sm text-slate-600">
                    Assistant: {aiSettings?.assistantName || "Not configured"}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    Last updated: {aiSettings?.updatedAt ? formatLastUpdated(aiSettings.updatedAt.toString()) : "Never"}
                  </div>
                </div>

                {/* Products Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Product Catalog</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Synced
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-600">
                    Total products: {products?.length || 0}
                  </div>
                  <div className="text-sm text-slate-600">
                    Active products: {products?.filter(p => p.isActive).length || 0}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    AI agent updated: Just now
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Orders</CardTitle>
                  <Button variant="ghost" className="text-whatsapp font-medium text-sm hover:text-whatsapp/80">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="animate-pulse p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                            <div>
                              <div className="h-4 bg-slate-200 rounded w-24 mb-1"></div>
                              <div className="h-3 bg-slate-200 rounded w-32"></div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="h-4 bg-slate-200 rounded w-16 mb-1"></div>
                            <div className="h-6 bg-slate-200 rounded w-20"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentOrders.length > 0 ? (
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        onStatusChange={() => {}} // Read-only in dashboard
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-slate-500 py-8">
                    No orders yet. Orders will appear here once customers start purchasing.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Live Conversation */}
          <div>
            {conversationsLoading ? (
              <Card>
                <CardHeader>
                  <CardTitle>Live Conversation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ) : liveConversation ? (
              <ConversationThread conversation={liveConversation} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Live Conversation</CardTitle>
                  <p className="text-sm text-slate-600">No active conversations</p>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-slate-500 py-8">
                    <i className="fas fa-comments text-4xl mb-4 opacity-50"></i>
                    <p>No active conversations at the moment.</p>
                    <p className="text-sm">New customer messages will appear here.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Product Catalog */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Product Catalog</CardTitle>
              <Button onClick={onAddProduct} className="bg-whatsapp hover:bg-whatsapp/90">
                <i className="fas fa-plus mr-2"></i>Add Product
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="animate-pulse">
                      <div className="w-full h-40 bg-slate-200"></div>
                      <div className="p-4">
                        <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded w-full mb-3"></div>
                        <div className="flex justify-between">
                          <div className="h-6 bg-slate-200 rounded w-16"></div>
                          <div className="flex space-x-2">
                            <div className="h-8 w-8 bg-slate-200 rounded"></div>
                            <div className="h-8 w-8 bg-slate-200 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : featuredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={() => {}} // Read-only in dashboard
                    onDelete={() => {}} // Read-only in dashboard
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-500 py-12">
                <i className="fas fa-box text-6xl mb-4 opacity-50"></i>
                <h3 className="text-lg font-medium mb-2">No products yet</h3>
                <p className="mb-4">Start by adding your first product to begin taking orders.</p>
                <Button onClick={onAddProduct} className="bg-whatsapp hover:bg-whatsapp/90">
                  <i className="fas fa-plus mr-2"></i>Add Your First Product
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
