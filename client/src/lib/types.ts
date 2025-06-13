export interface DashboardStats {
  totalOrders: number;
  activeConversations: number;
  revenueToday: number;
  aiResponseRate: number;
}

export interface ProductFormData {
  name: string;
  description: string;
  price: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface OrderWithCustomer {
  id: number;
  customerId: number;
  status: string;
  items: Array<{
    productId: number;
    quantity: number;
    price: string;
  }>;
  total: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: number;
    phoneNumber: string;
    name: string | null;
    email: string | null;
  };
}

export interface ConversationWithCustomer {
  id: number;
  customerId: number;
  isActive: boolean;
  lastMessageAt: string;
  createdAt: string;
  customer: {
    id: number;
    phoneNumber: string;
    name: string | null;
    email: string | null;
  };
}

export interface Message {
  id: number;
  conversationId: number;
  content: string;
  isFromAI: boolean;
  timestamp: string;
}
