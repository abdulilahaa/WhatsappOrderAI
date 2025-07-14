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

interface NailItLocation {
  Location_Id: number;
  Location_Name: string;
  Address: string;
  Phone: string;
}

export default function Products() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScraperOpen, setIsScraperOpen] = useState(false);
  const [isPDFUploadOpen, setIsPDFUploadOpen] = useState(false);
  const [isNailItSyncOpen, setIsNailItSyncOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: locations = [] } = useQuery<NailItLocation[]>({
    queryKey: ["/api/nailit/locations"],
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

  // Parse location IDs from product descriptions
  const getProductLocations = (product: Product): number[] => {
    // Look for "Location IDs:" in description
    const locationMatch = product.description.match(/Location IDs:\s*(\[[\d,\s]+\])/);
    if (locationMatch) {
      try {
        return JSON.parse(locationMatch[1]);
      } catch {
        return [];
      }
    }
    // If no location IDs found, assume available at all locations
    return locations.map(loc => loc.Location_Id);
  };

  // Group products by location
  const productsByLocation = products?.reduce((acc, product) => {
    const productLocations = getProductLocations(product);
    productLocations.forEach(locationId => {
      if (!acc[locationId]) acc[locationId] = [];
      acc[locationId].push(product);
    });
    return acc;
  }, {} as Record<number, Product[]>) || {};

  const filteredProducts = (locationId: string) => {
    let productsToFilter: Product[] = [];
    
    if (locationId === 'all') {
      productsToFilter = products || [];
    } else {
      const locId = parseInt(locationId);
      productsToFilter = productsByLocation[locId] || [];
    }
    
    return productsToFilter.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getLocationIcon = () => {
    return <Settings className="h-4 w-4" />;
  };

  const getLocationName = (locationId: string) => {
    if (locationId === 'all') return 'All Locations';
    const location = locations.find(loc => loc.Location_Id === parseInt(locationId));
    return location?.Location_Name || `Location ${locationId}`;
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
          <TabsList className="flex w-full overflow-x-auto">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              All
              <Badge variant="secondary">{products?.length || 0}</Badge>
            </TabsTrigger>
            {locations.map((location) => (
              <TabsTrigger key={location.Location_Id} value={location.Location_Id.toString()} className="flex items-center gap-2">
                {getLocationIcon()}
                {location.Location_Name}
                <Badge variant="secondary">{productsByLocation[location.Location_Id]?.length || 0}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {['all', ...locations.map(loc => loc.Location_Id.toString())].map((locationId) => (
            <TabsContent key={locationId} value={locationId} className="mt-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  {locationId === 'all' ? <Package className="h-4 w-4" /> : getLocationIcon()}
                  {getLocationName(locationId)}
                  <Badge variant="outline">{filteredProducts(locationId).length} services</Badge>
                  {locationId !== 'all' && (
                    <span className="text-sm text-gray-600 ml-2">
                      {locations.find(loc => loc.Location_Id === parseInt(locationId))?.Address}
                    </span>
                  )}
                </h2>
              </div>
              
              {filteredProducts(locationId).length === 0 ? (
                <Card className="text-center py-8">
                  <CardContent>
                    <Package className="h-12 w-12 mx-auto text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2 mt-4">No services found at this location</h3>
                    <p className="text-gray-600 mb-4">
                      {searchQuery ? "No services match your search at this location." : "This location has no services available."}
                    </p>
                    <Button onClick={handleAddNew}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Service
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredProducts(locationId).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      locationInfo={locationId !== 'all' ? locations.find(loc => loc.Location_Id === parseInt(locationId)) : undefined}
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
