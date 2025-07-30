import { Switch, Route } from "wouter";
import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/sidebar";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import Conversations from "@/pages/conversations";
import IntegrationDashboard from "@/pages/integration-dashboard";
import WhatsAppSetup from "@/pages/whatsapp-setup";
import NotFound from "@/pages/not-found";
import AddProductModal from "@/components/add-product-modal";
import Checkout from "@/pages/checkout";
import StaffAvailability from "@/pages/staff-availability";
import ServiceAnalytics from "@/pages/service-analytics";
import AIAgentSettings from "@/pages/ai-agent-settings";
import LargeOrderTest from "@/pages/large-order-test";
import WhatsAppSimulator from "@/pages/whatsapp-simulator";
import SystemStatus from "@/pages/system-status";
import ComprehensiveTest from "@/pages/comprehensive-test";

function Router() {
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

  const handleAddProduct = () => {
    setIsAddProductModalOpen(true);
  };

  const handleCloseAddProductModal = () => {
    setIsAddProductModalOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <Switch>
        <Route path="/" component={() => <Dashboard onAddProduct={handleAddProduct} />} />
        <Route path="/products" component={Products} />
        <Route path="/conversations" component={Conversations} />
        <Route path="/integration-dashboard" component={IntegrationDashboard} />
        <Route path="/ai-agent-settings" component={AIAgentSettings} />
        <Route path="/whatsapp-setup" component={WhatsAppSetup} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/staff-availability" component={StaffAvailability} />
        <Route path="/service-analytics" component={ServiceAnalytics} />
        <Route path="/large-order-test" component={LargeOrderTest} />
        <Route path="/whatsapp-simulator" component={WhatsAppSimulator} />
        <Route path="/system-status" component={SystemStatus} />
        <Route path="/comprehensive-test" component={ComprehensiveTest} />
        <Route component={NotFound} />
      </Switch>
      
      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={handleCloseAddProductModal}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
