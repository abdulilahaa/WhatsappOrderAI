import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertProductSchema } from "@shared/schema";
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
    } else {
      form.reset({
        name: "",
        description: "",
        price: "",
        imageUrl: "",
        isActive: true,
      });
    }
  }, [editingProduct, form]);

  const createMutation = useMutation({
    mutationFn: (data: ProductFormData) => 
      apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product created successfully!" });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating product",
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
      toast({ title: "Product updated successfully!" });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating product",
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingProduct ? "Edit Product" : "Add New Product"}
          </DialogTitle>
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
            <Label htmlFor="imageUrl">Product Image URL</Label>
            <Input
              id="imageUrl"
              {...form.register("imageUrl")}
              placeholder="https://example.com/image.jpg"
            />
            {form.formState.errors.imageUrl && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.imageUrl.message}
              </p>
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
            <Button type="submit" disabled={isLoading} className="bg-whatsapp hover:bg-whatsapp/90">
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  {editingProduct ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
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
