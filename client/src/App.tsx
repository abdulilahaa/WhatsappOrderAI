import { Switch, Route } from "wouter";
import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/sidebar";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import Orders from "@/pages/orders";
import Appointments from "@/pages/appointments";
import Conversations from "@/pages/conversations";
import Integrations from "@/pages/integrations";
import APIDataDashboard from "@/pages/api-data-dashboard";
import APITestingPage from "@/pages/api-testing";
import IntegrationDashboard from "@/pages/integration-dashboard";
import FreshAISettingsPage from "@/pages/fresh-ai-settings";
import WhatsAppSetup from "@/pages/whatsapp-setup";
import FreshAITest from "@/pages/fresh-ai-test";
import NotFound from "@/pages/not-found";
import AddProductModal from "@/components/add-product-modal";
import Checkout from "@/pages/checkout";
import StaffAvailability from "@/pages/staff-availability";
import ServiceAnalytics from "@/pages/service-analytics";
import QuickBookingInsights from "@/pages/quick-booking-insights";

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
        <Route path="/orders" component={Orders} />
        <Route path="/appointments" component={Appointments} />
        <Route path="/conversations" component={Conversations} />
        <Route path="/api-data" component={APIDataDashboard} />
        <Route path="/api-testing" component={APITestingPage} />
        <Route path="/integration-dashboard" component={IntegrationDashboard} />
        <Route path="/integrations" component={Integrations} />
        <Route path="/ai-settings" component={FreshAISettingsPage} />
        <Route path="/whatsapp-setup" component={WhatsAppSetup} />
        <Route path="/fresh-ai-test" component={FreshAITest} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/staff-availability" component={StaffAvailability} />
        <Route path="/service-analytics" component={ServiceAnalytics} />
        <Route path="/quick-insights" component={QuickBookingInsights} />
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
