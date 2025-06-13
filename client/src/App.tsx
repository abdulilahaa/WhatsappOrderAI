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
import Conversations from "@/pages/conversations";
import AISettingsPage from "@/pages/ai-settings";
import WhatsAppSetup from "@/pages/whatsapp-setup";
import AITest from "@/pages/ai-test";
import NotFound from "@/pages/not-found";
import AddProductModal from "@/components/add-product-modal";
import Checkout from "@/pages/checkout";

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
        <Route path="/conversations" component={Conversations} />
        <Route path="/ai-settings" component={AISettingsPage} />
        <Route path="/whatsapp-setup" component={WhatsAppSetup} />
        <Route path="/ai-test" component={AITest} />
        <Route path="/checkout" component={Checkout} />
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
