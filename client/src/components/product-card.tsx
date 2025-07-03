import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import type { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: number) => void;
}

export default function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  return (
    <Card className="border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      {product.imageUrl && (
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className="w-full h-40 object-cover"
        />
      )}
      <CardContent className="p-4">
        <h4 className="font-semibold text-slate-800 mb-2">{product.name}</h4>
        <p className="text-sm text-slate-600 mb-3">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-whatsapp">{product.price} KWD</span>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(product)}
              className="text-slate-400 hover:text-slate-600"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(product.id)}
              className="text-red-400 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
