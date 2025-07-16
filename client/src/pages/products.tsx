import React, { useState } from "react";
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
import { Plus, Search, Package, Globe, FileText, Settings, MapPin, RefreshCw, Store } from "lucide-react";
import type { Product } from "@shared/schema";

interface NailItLocation {
  Location_Id: number;
  Location_Name: string;
  Address: string;
  Phone: string;
  From_Time: string;
  To_Time: string;
  Working_Days: string;
}

interface LocationProducts {
  success: boolean;
  locationId: number;
  products: any[];
  totalFound: number;
  strategies: string[];
}

// Separate component to handle location queries with hooks
function LocationProductsManager({ location }: { location: NailItLocation }) {
  const query = useQuery<LocationProducts>({
    queryKey: ["/api/nailit/products-by-location", location.Location_Id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/nailit/products-by-location/${location.Location_Id}`);
      return await response.json();
    },
    enabled: !!location.Location_Id,
  });
  
  return { location, query };
}

export default function Products() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScraperOpen, setIsScraperOpen] = useState(false);
  const [isPDFUploadOpen, setIsPDFUploadOpen] = useState(false);
  const [isNailItSyncOpen, setIsNailItSyncOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshingLocation, setRefreshingLocation] = useState<number | null>(null);
  const [locationData, setLocationData] = useState<Record<number, LocationProducts>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch NailIt locations
  const { data: locations, isLoading: locationsLoading } = useQuery<NailItLocation[]>({
    queryKey: ["/api/nailit/locations"],
  });

  // Prefetch data for all locations when locations are loaded
  React.useEffect(() => {
    if (locations && locations.length > 0) {
      locations.forEach(location => {
        queryClient.prefetchQuery({
          queryKey: ["/api/nailit/products-by-location", location.Location_Id],
          queryFn: async () => {
            const response = await apiRequest("GET", `/api/nailit/products-by-location/${location.Location_Id}`);
            return await response.json();
          },
        });
      });
    }
  }, [locations, queryClient]);

  // Refresh location products
  const refreshLocationMutation = useMutation({
    mutationFn: async (locationId: number) => {
      setRefreshingLocation(locationId);
      const response = await apiRequest("GET", `/api/nailit/products-by-location/${locationId}`);
      return await response.json();
    },
    onSuccess: (data, locationId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nailit/products-by-location", locationId] });
      toast({ 
        title: "Location services refreshed",
        description: `Found ${data.totalFound} services for this location`
      });
      setRefreshingLocation(null);
    },
    onError: (error: any, locationId) => {
      toast({
        title: "Refresh failed",
        description: error.message,
        variant: "destructive",
      });
      setRefreshingLocation(null);
    },
  });

  // Fetch products for active location
  const activeLocationId = activeTab !== "overview" ? parseInt(activeTab) : null;
  const { data: activeLocationProducts, isLoading: productsLoading, error: productsError } = useQuery<LocationProducts>({
    queryKey: ["/api/nailit/products-by-location", activeLocationId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/nailit/products-by-location/${activeLocationId}`);
      return await response.json();
    },
    enabled: !!activeLocationId,
  });

  // Calculate total products from cached data
  const getTotalProducts = () => {
    if (!locations) return 0;
    let total = 0;
    locations.forEach(location => {
      const cachedData = queryClient.getQueryData<LocationProducts>(["/api/nailit/products-by-location", location.Location_Id]);
      if (cachedData?.totalFound) {
        total += cachedData.totalFound;
      }
    });
    return total;
  };

  // Filter products by search query for a specific location
  const filterLocationProducts = (products: any[]) => {
    if (!searchQuery) return products;
    return products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Get location data consistently
  const getLocationData = (locationId: number): LocationProducts | undefined => {
    return locationData[locationId] || queryClient.getQueryData<LocationProducts>(["/api/nailit/products-by-location", locationId]);
  };

  // Get location status based on cached data
  const getLocationStatus = (locationId: number) => {
    const data = getLocationData(locationId);
    if (!data) return { status: 'loading', color: 'text-blue-600' };
    if (data.totalFound > 0) return { status: 'success', color: 'text-green-600' };
    return { status: 'empty', color: 'text-gray-600' };
  };

  // Update location data when fetched
  React.useEffect(() => {
    if (activeLocationProducts && activeLocationId) {
      setLocationData(prev => ({
        ...prev,
        [activeLocationId]: activeLocationProducts
      }));
    }
  }, [activeLocationProducts, activeLocationId]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleRefreshLocation = (locationId: number) => {
    refreshLocationMutation.mutate(locationId);
  };

  // Set first location as default tab when locations are loaded
  React.useEffect(() => {
    if (locations && locations.length > 0 && activeTab === "overview") {
      setActiveTab(locations[0].Location_Id.toString());
    }
  }, [locations, activeTab]);

  // Preload data for all locations to show service counts
  React.useEffect(() => {
    if (locations) {
      locations.forEach(location => {
        // Trigger data loading for each location
        queryClient.prefetchQuery({
          queryKey: ["/api/nailit/products-by-location", location.Location_Id],
          queryFn: async () => {
            const response = await apiRequest("GET", `/api/nailit/products-by-location/${location.Location_Id}`);
            return await response.json();
          },
        });
      });
    }
  }, [locations, queryClient]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">NailIt Service Catalog by Location</h1>
          <p className="text-gray-600 mt-2">
            Live services from NailIt POS - {getTotalProducts()} authentic services across {locations?.length || 0} locations 
            {getTotalProducts() > 0 && (
              <span className="text-green-600 font-semibold"> ✓ Connected</span>
            )}
            <br />
            <Button 
              variant="link" 
              className="p-0 h-auto text-blue-600"
              onClick={() => {
                locations?.forEach(location => {
                  queryClient.invalidateQueries({ queryKey: ["/api/nailit/products-by-location", location.Location_Id] });
                });
              }}
            >
              🔄 Refresh all locations
            </Button>
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
            placeholder="Search services across all locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {locationsLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading NailIt locations...</p>
        </div>
      ) : !locations || locations.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No locations found</h3>
            <p className="text-gray-600 mb-4">
              Unable to fetch NailIt locations. Please check the API connection.
            </p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/nailit/locations"] })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(locations.length + 1, 6)}, 1fr)` }}>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Overview
              <Badge variant="secondary">{getTotalProducts()}</Badge>
            </TabsTrigger>
            {locations.slice(0, 5).map(location => {
              const status = getLocationStatus(location.Location_Id);
              return (
                <TabsTrigger 
                  key={location.Location_Id} 
                  value={location.Location_Id.toString()} 
                  className="flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{location.Location_Name}</span>
                  <Badge variant="secondary" className={status.color}>
                    {locationData[location.Location_Id]?.totalFound || 
                     queryClient.getQueryData<LocationProducts>(["/api/nailit/products-by-location", location.Location_Id])?.totalFound || 0}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Store className="h-4 w-4" />
                All Locations Overview
                <Badge variant="outline">{getTotalProducts()} total services</Badge>
              </h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {locations.map(location => {
                const status = getLocationStatus(location.Location_Id);
                const data = getLocationData(location.Location_Id);
                
                return (
                  <Card key={location.Location_Id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5" />
                          {location.Location_Name}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRefreshLocation(location.Location_Id)}
                          disabled={refreshingLocation === location.Location_Id}
                        >
                          <RefreshCw className={`h-4 w-4 ${refreshingLocation === location.Location_Id ? 'animate-spin' : ''}`} />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">{location.Address}</p>
                        <p className="text-sm text-gray-600">Phone: {location.Phone}</p>
                        <p className="text-sm text-gray-600">Hours: {location.From_Time} - {location.To_Time}</p>
                        <div className="flex items-center justify-between pt-2">
                          <span className={`text-sm font-medium ${status.color}`}>
                            {!data ? 'Loading...' : 
                             `${data.totalFound || 0} services`}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => setActiveTab(location.Location_Id.toString())}
                          >
                            View Services
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Location-specific tabs */}
          {locations.map(location => {
            const isActive = activeTab === location.Location_Id.toString();
            const locationProducts = isActive && activeLocationProducts ? activeLocationProducts : 
              locationData[location.Location_Id] || 
              queryClient.getQueryData<LocationProducts>(["/api/nailit/products-by-location", location.Location_Id]);
            
            const filteredProducts = filterLocationProducts(locationProducts?.products || []);
            
            return (
              <TabsContent key={location.Location_Id} value={location.Location_Id.toString()} className="mt-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {location.Location_Name}
                      <Badge variant="outline">{filteredProducts.length} services</Badge>
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">{location.Address}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleRefreshLocation(location.Location_Id)}
                    disabled={refreshingLocation === location.Location_Id}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshingLocation === location.Location_Id ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                
                {isActive && productsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading services for {location.Location_Name}...</p>
                  </div>
                ) : isActive && productsError ? (
                  <Card className="text-center py-8">
                    <CardContent>
                      <div className="text-red-500 mb-4">
                        <Package className="h-16 w-16 mx-auto mb-2" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Error loading services</h3>
                      <p className="text-gray-600 mb-4">
                        Failed to load services for this location. Please try refreshing.
                      </p>
                      <Button onClick={() => handleRefreshLocation(location.Location_Id)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                    </CardContent>
                  </Card>
                ) : filteredProducts.length === 0 ? (
                  <Card className="text-center py-8">
                    <CardContent>
                      <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        {searchQuery ? "No services match your search" : "No services available"}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {searchQuery 
                          ? `No services at ${location.Location_Name} match "${searchQuery}"`
                          : `${location.Location_Name} currently has no services available`
                        }
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={() => handleRefreshLocation(location.Location_Id)}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh Location
                        </Button>
                        <Button onClick={handleAddNew} variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Service
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onEdit={handleEdit}
                        onDelete={() => {}} // Remove delete functionality for NailIt products
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
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
