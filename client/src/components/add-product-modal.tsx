import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertProductSchema } from "@shared/schema";
import { Upload, Link, Save, Loader2 } from "lucide-react";
import type { Product } from "@shared/schema";
import type { ProductFormData } from "@/lib/types";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct?: Product | null;
}

export default function AddProductModal({ isOpen, onClose, editingProduct }: AddProductModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<"url" | "upload">("url");
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(insertProductSchema.extend({
      price: insertProductSchema.shape.price.transform(String),
    })),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      imageUrl: "",
      isActive: true,
    },
  });

  // Update form when editingProduct changes
  useEffect(() => {
    if (editingProduct) {
      form.reset({
        name: editingProduct.name,
        description: editingProduct.description,
        price: editingProduct.price,
        imageUrl: editingProduct.imageUrl || "",
        isActive: editingProduct.isActive,
      });
      setUploadedImage(null);
      setImageSource(editingProduct.imageUrl ? "url" : "upload");
    } else {
      form.reset({
        name: "",
        description: "",
        price: "",
        imageUrl: "",
        isActive: true,
      });
      setUploadedImage(null);
      setImageSource("url");
    }
  }, [editingProduct, form]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 2MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setUploadedImage(base64);
        form.setValue("imageUrl", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: ProductFormData) => 
      apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ 
        title: "Product saved to database",
        description: "AI agent updated with new product catalog"
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Database save failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProductFormData) => 
      apiRequest("PUT", `/api/products/${editingProduct?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ 
        title: "Product updated in database",
        description: "AI agent refreshed with latest product information"
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Database update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingProduct ? "Edit Product" : "Add New Product"}
          </DialogTitle>
          <DialogDescription>
            Fill in the product details below. You can upload an image or provide an image URL.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Enter product name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              {...form.register("price")}
              placeholder="0.00"
            />
            {form.formState.errors.price && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.price.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              rows={3}
              placeholder="Product description"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div>
            <Label>Product Image</Label>
            <Tabs value={imageSource} onValueChange={(value) => setImageSource(value as "url" | "upload")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Image URL
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload File
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="url" className="space-y-2">
                <Input
                  {...form.register("imageUrl")}
                  placeholder="https://example.com/image.jpg"
                  onChange={(e) => {
                    form.setValue("imageUrl", e.target.value);
                    setUploadedImage(null);
                  }}
                />
                {form.formState.errors.imageUrl && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.imageUrl.message}
                  </p>
                )}
              </TabsContent>
              
              <TabsContent value="upload" className="space-y-2">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG or JPEG (MAX 2MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
                {uploadedImage && (
                  <div className="mt-2">
                    <img 
                      src={uploadedImage} 
                      alt="Preview" 
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            {/* Preview for URL images */}
            {imageSource === "url" && form.watch("imageUrl") && !uploadedImage && (
              <div className="mt-2">
                <img 
                  src={form.watch("imageUrl")} 
                  alt="Preview" 
                  className="w-full h-32 object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={form.watch("isActive")}
              onCheckedChange={(checked) => form.setValue("isActive", checked)}
            />
            <Label htmlFor="isActive">Product is active</Label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="hover:bg-whatsapp/90 bg-[#ba212a]">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingProduct ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingProduct ? "Update Product" : "Add Product"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
