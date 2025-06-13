import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "lucide-react";
import type { OrderWithCustomer } from "@/lib/types";

interface OrderCardProps {
  order: OrderWithCustomer;
  onStatusChange: (orderId: number, status: string) => void;
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function OrderCard({ order, onStatusChange }: OrderCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-whatsapp/10 rounded-lg flex items-center justify-center">
              <User className="h-5 w-5 text-whatsapp" />
            </div>
            <div>
              <p className="font-medium text-slate-800">
                {order.customer.name || "Unknown Customer"}
              </p>
              <p className="text-sm text-slate-600">{order.customer.phoneNumber}</p>
              <p className="text-xs text-slate-500">
                Order #{order.id} • {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="text-right space-y-2">
            <p className="font-semibold text-slate-800">${order.total}</p>
            <Select value={order.status} onValueChange={(value) => onStatusChange(order.id, value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {order.items && order.items.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-2">Items:</p>
            <div className="space-y-1">
              {order.items.map((item, index) => (
                <div key={index} className="text-sm text-slate-600">
                  Product #{item.productId} × {item.quantity} @ ${item.price}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {order.notes && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-sm font-medium text-slate-700">Notes:</p>
            <p className="text-sm text-slate-600">{order.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
