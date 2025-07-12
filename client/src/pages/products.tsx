import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ProductCard from "@/components/product-card";
import AddProductModal from "@/components/add-product-modal";
import WebScraperModal from "@/components/web-scraper-modal";
import PDFUploadModal from "@/components/pdf-upload-modal";
import NailItSyncControls from "@/components/nailit-sync-controls";
import { Plus, Search, Package, Globe, FileText, Settings, Scissors, Sparkles, Palette, Hand, Zap } from "lucide-react";
import type { Product } from "@shared/schema";

export default function Products() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScraperOpen, setIsScraperOpen] = useState(false);
  const [isPDFUploadOpen, setIsPDFUploadOpen] = useState(false);
  const [isNailItSyncOpen, setIsNailItSyncOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: number) => 
      apiRequest("DELETE", `/api/products/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ 
        title: "Product removed from database",
        description: "AI agent updated with latest product catalog"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Database deletion failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Categorize services based on their content and NailIt groups
  const categorizeService = (product: Product) => {
    const name = product.name.toLowerCase();
    const description = product.description.toLowerCase();

    if (name.includes('hair') || name.includes('blowout') || name.includes('straightening') || name.includes('extension')) {
      return 'hair';
    }
    if (name.includes('nail') || name.includes('manicure') || name.includes('pedicure') || name.includes('polish') || name.includes('gel')) {
      return 'nails';
    }
    if (name.includes('facial') || name.includes('skin') || name.includes('massage') || name.includes('treatment')) {
      return 'skincare';
    }
    if (name.includes('makeup') || name.includes('lash') || name.includes('brow') || name.includes('eyebrow')) {
      return 'beauty';
    }
    if (name.includes('wax') || name.includes('laser') || name.includes('removal')) {
      return 'waxing';
    }
    
    return 'other';
  };

  const categorizedProducts = products?.reduce((acc, product) => {
    const category = categorizeService(product);
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {} as Record<string, Product[]>) || {};

  const filteredProducts = (category: string) => {
    const categoryProducts = category === 'all' ? products || [] : categorizedProducts[category] || [];
    return categoryProducts.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'hair': return <Scissors className="h-4 w-4" />;
      case 'nails': return <Hand className="h-4 w-4" />;
      case 'skincare': return <Sparkles className="h-4 w-4" />;
      case 'beauty': return <Palette className="h-4 w-4" />;
      case 'waxing': return <Zap className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'hair': return 'Hair Services';
      case 'nails': return 'Nail Services';
      case 'skincare': return 'Skincare';
      case 'beauty': return 'Beauty & Makeup';
      case 'waxing': return 'Waxing & Removal';
      case 'other': return 'Other Services';
      default: return 'All Services';
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = (productId: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteMutation.mutate(productId);
    }
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Service Catalog</h1>
          <p className="text-gray-600 mt-2">
            Complete NailIt POS integration - {products?.length || 0} authentic services
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsNailItSyncOpen(true)} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            NailIt Sync
          </Button>
          <Button onClick={() => setIsPDFUploadOpen(true)} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Upload PDF
          </Button>
          <Button onClick={() => setIsScraperOpen(true)} variant="outline">
            <Globe className="h-4 w-4 mr-2" />
            Web Scraper
          </Button>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading services...</p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              All
              <Badge variant="secondary">{products?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="hair" className="flex items-center gap-2">
              {getCategoryIcon('hair')}
              Hair
              <Badge variant="secondary">{categorizedProducts.hair?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="nails" className="flex items-center gap-2">
              {getCategoryIcon('nails')}
              Nails
              <Badge variant="secondary">{categorizedProducts.nails?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="skincare" className="flex items-center gap-2">
              {getCategoryIcon('skincare')}
              Skincare
              <Badge variant="secondary">{categorizedProducts.skincare?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="beauty" className="flex items-center gap-2">
              {getCategoryIcon('beauty')}
              Beauty
              <Badge variant="secondary">{categorizedProducts.beauty?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="waxing" className="flex items-center gap-2">
              {getCategoryIcon('waxing')}
              Waxing
              <Badge variant="secondary">{categorizedProducts.waxing?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="other" className="flex items-center gap-2">
              {getCategoryIcon('other')}
              Other
              <Badge variant="secondary">{categorizedProducts.other?.length || 0}</Badge>
            </TabsTrigger>
          </TabsList>

          {(['all', 'hair', 'nails', 'skincare', 'beauty', 'waxing', 'other'] as const).map((category) => (
            <TabsContent key={category} value={category} className="mt-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  {getCategoryIcon(category)}
                  {getCategoryName(category)}
                  <Badge variant="outline">{filteredProducts(category).length} services</Badge>
                </h2>
              </div>
              
              {filteredProducts(category).length === 0 ? (
                <Card className="text-center py-8">
                  <CardContent>
                    {getCategoryIcon(category)}
                    <h3 className="text-lg font-semibold mb-2 mt-4">No services found in this category</h3>
                    <p className="text-gray-600 mb-4">
                      {searchQuery ? "No services match your search in this category." : "This category is empty."}
                    </p>
                    <Button onClick={handleAddNew}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Service
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredProducts(category).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <AddProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editingProduct={editingProduct}
      />

      <WebScraperModal
        isOpen={isScraperOpen}
        onClose={() => setIsScraperOpen(false)}
      />

      <PDFUploadModal
        isOpen={isPDFUploadOpen}
        onClose={() => setIsPDFUploadOpen(false)}
      />

      <NailItSyncControls
        isOpen={isNailItSyncOpen}
        onClose={() => setIsNailItSyncOpen(false)}
      />
    </div>
  );
}
