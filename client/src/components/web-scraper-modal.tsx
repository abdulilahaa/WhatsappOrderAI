import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Globe, Loader2, Check, X, AlertTriangle } from "lucide-react";

interface ScrapedProduct {
  name: string;
  description: string;
  price: string;
  category?: string;
}

interface WebScraperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WebScraperModal({ isOpen, onClose }: WebScraperModalProps) {
  const [url, setUrl] = useState("");
  const [scrapedProducts, setScrapedProducts] = useState<ScrapedProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [isScrapingStep, setIsScrapingStep] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const scrapeMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/products/scrape", { url });
      return response.json();
    },
    onSuccess: (data: any) => {
      setScrapedProducts(data.products);
      setSelectedProducts(new Set(data.products.map((_: any, index: number) => index)));
      setIsScrapingStep(false);
      toast({
        title: "Scraping Successful!",
        description: `Found ${data.products.length} products from the website.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Scraping Failed",
        description: error.message || "Failed to extract products from the website.",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (products: ScrapedProduct[]) => {
      const response = await apiRequest("POST", "/api/products/import", { products });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Import Successful!",
        description: `Successfully imported ${data.created} products. ${data.errors > 0 ? `${data.errors} items had errors.` : ''}`,
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import products.",
        variant: "destructive",
      });
    },
  });

  const handleScrape = () => {
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a valid website URL.",
        variant: "destructive",
      });
      return;
    }
    scrapeMutation.mutate(url.trim());
  };

  const handleImport = () => {
    const productsToImport = scrapedProducts.filter((_, index) => selectedProducts.has(index));
    if (productsToImport.length === 0) {
      toast({
        title: "No Products Selected",
        description: "Please select at least one product to import.",
        variant: "destructive",
      });
      return;
    }
    importMutation.mutate(productsToImport);
  };

  const toggleProduct = (index: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProducts(newSelected);
  };

  const selectAll = () => {
    setSelectedProducts(new Set(scrapedProducts.map((_, index) => index)));
  };

  const selectNone = () => {
    setSelectedProducts(new Set());
  };

  const handleClose = () => {
    setUrl("");
    setScrapedProducts([]);
    setSelectedProducts(new Set());
    setIsScrapingStep(true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Import Products from Website
          </DialogTitle>
          <DialogDescription>
            {isScrapingStep 
              ? "Enter a website URL to automatically extract product information"
              : "Review and select products to import into your catalog"
            }
          </DialogDescription>
        </DialogHeader>

        {isScrapingStep ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="website-url">Website URL</Label>
              <Input
                id="website-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example-salon.com/services"
                disabled={scrapeMutation.isPending}
              />
              <p className="text-sm text-muted-foreground">
                Enter the URL of a nail salon or beauty website to extract their services and pricing.
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium text-blue-900">How it works:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• AI analyzes the webpage content for nail salon services</li>
                    <li>• Extracts service names, descriptions, and pricing</li>
                    <li>• Converts prices to KWD automatically</li>
                    <li>• You can review and select which services to import</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleScrape}
                disabled={scrapeMutation.isPending || !url.trim()}
              >
                {scrapeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Extract Products
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Found {scrapedProducts.length} Products</h3>
                <Badge variant="secondary">{selectedProducts.size} selected</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={selectNone}>
                  Select None
                </Button>
              </div>
            </div>

            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {scrapedProducts.map((product, index) => (
                <Card key={index} className={`transition-colors ${selectedProducts.has(index) ? 'border-green-500 bg-green-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedProducts.has(index)}
                        onCheckedChange={() => toggleProduct(index)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{product.name}</h4>
                          <div className="flex items-center gap-2">
                            {product.category && (
                              <Badge variant="outline">{product.category}</Badge>
                            )}
                            <span className="font-bold text-green-600">{product.price} KWD</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsScrapingStep(true)}>
                Back
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport}
                disabled={importMutation.isPending || selectedProducts.size === 0}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Import Selected ({selectedProducts.size})
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}