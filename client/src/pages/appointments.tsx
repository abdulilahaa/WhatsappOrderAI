import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  DollarSign, 
  CreditCard, 
  Banknote, 
  CheckCircle2, 
  XCircle, 
  Filter,
  MoreVertical,
  CalendarDays,
  Timer,
  MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface AppointmentWithDetails {
  id: number;
  customerId: number;
  serviceId: number;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  notes: string | null;
  totalPrice: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: number;
    phoneNumber: string;
    name: string | null;
    email: string | null;
  };
  service: {
    id: number;
    name: string;
    description: string;
    price: string;
  };
}

export default function Appointments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["/api/appointments"],
    queryFn: () => apiRequest("GET", "/api/appointments").then(res => res.json()) as Promise<AppointmentWithDetails[]>,
  });

  // Filter appointments
  const filteredAppointments = appointments.filter(appointment => {
    const statusMatch = statusFilter === "all" || appointment.status === statusFilter;
    const paymentMatch = paymentFilter === "all" || appointment.paymentMethod === paymentFilter;
    return statusMatch && paymentMatch;
  });

  // Group appointments by status
  const appointmentsByStatus = {
    pending: filteredAppointments.filter(a => a.status === "pending"),
    confirmed: filteredAppointments.filter(a => a.status === "confirmed"),
    completed: filteredAppointments.filter(a => a.status === "completed"),
    cancelled: filteredAppointments.filter(a => a.status === "cancelled"),
  };

  // Group appointments by date for list view
  const appointmentsByDate = filteredAppointments.reduce((acc, appointment) => {
    const date = appointment.appointmentDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(appointment);
    return acc;
  }, {} as Record<string, AppointmentWithDetails[]>);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/appointments/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Status Updated",
        description: "Appointment status updated successfully.",
      });
    },
  });

  const handleStatusChange = (appointmentId: number, newStatus: string) => {
    updateStatusMutation.mutate({ id: appointmentId, status: newStatus });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { 
          color: "bg-amber-100 text-amber-800 border-amber-200", 
          dot: "bg-amber-400",
          bg: "bg-amber-50"
        };
      case "confirmed":
        return { 
          color: "bg-emerald-100 text-emerald-800 border-emerald-200", 
          dot: "bg-emerald-400",
          bg: "bg-emerald-50"
        };
      case "completed":
        return { 
          color: "bg-blue-100 text-blue-800 border-blue-200", 
          dot: "bg-blue-400",
          bg: "bg-blue-50"
        };
      case "cancelled":
        return { 
          color: "bg-red-100 text-red-800 border-red-200", 
          dot: "bg-red-400",
          bg: "bg-red-50"
        };
      default:
        return { 
          color: "bg-gray-100 text-gray-800 border-gray-200", 
          dot: "bg-gray-400",
          bg: "bg-gray-50"
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getCustomerInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-80 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const AppointmentCard = ({ appointment, compact = false }: { appointment: AppointmentWithDetails; compact?: boolean }) => {
    const statusConfig = getStatusConfig(appointment.status);
    
    return (
      <Card className={`group hover:shadow-lg transition-all duration-200 border-l-4 ${
        appointment.status === 'pending' ? 'border-l-amber-400' :
        appointment.status === 'confirmed' ? 'border-l-emerald-400' :
        appointment.status === 'completed' ? 'border-l-blue-400' :
        'border-l-red-400'
      } ${compact ? 'mb-3' : 'mb-4'}`}>
        <CardHeader className={`${compact ? 'pb-2' : 'pb-3'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
                  {getCustomerInitials(appointment.customer.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{appointment.service.name}</h3>
                <p className="text-sm text-gray-600">{appointment.customer.name || "Unknown Customer"}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`}></div>
                  <span className="text-xs text-gray-500 capitalize">{appointment.status}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {appointment.paymentMethod && (
                <div className="p-1.5 rounded-full bg-gray-100">
                  {appointment.paymentMethod === 'card' ? 
                    <CreditCard className="w-4 h-4 text-blue-600" /> : 
                    <Banknote className="w-4 h-4 text-green-600" />
                  }
                </div>
              )}
              <Badge className={`${statusConfig.color} text-xs px-2 py-1`}>
                {appointment.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className={`${compact ? 'pt-0' : 'pt-2'}`}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CalendarDays className="w-4 h-4 text-gray-400" />
                <span>{formatDate(appointment.appointmentDate)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Timer className="w-4 h-4 text-gray-400" />
                <span>{formatTime(appointment.appointmentTime)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="truncate">{appointment.customer.phoneNumber}</span>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span>${appointment.service.price}</span>
              </div>
            </div>

            {appointment.notes && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 line-clamp-2">{appointment.notes}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {appointment.status === "pending" && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange(appointment.id, "confirmed")}
                  disabled={updateStatusMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-xs px-3 py-1.5"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Confirm
                </Button>
              )}
              {(appointment.status === "pending" || appointment.status === "confirmed") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange(appointment.id, "completed")}
                  disabled={updateStatusMutation.isPending}
                  className="text-xs px-3 py-1.5 border-gray-300"
                >
                  Complete
                </Button>
              )}
              {appointment.status !== "cancelled" && appointment.status !== "completed" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange(appointment.id, "cancelled")}
                  disabled={updateStatusMutation.isPending}
                  className="text-xs px-3 py-1.5 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const KanbanColumn = ({ title, appointments, status }: { 
    title: string; 
    appointments: AppointmentWithDetails[]; 
    status: string;
  }) => {
    const statusConfig = getStatusConfig(status);
    
    return (
      <div className="flex-1 min-w-0">
        <div className={`${statusConfig.bg} border-2 ${statusConfig.color.split(' ')[2]} rounded-xl p-4 h-[calc(100vh-250px)]`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${statusConfig.dot}`}></div>
              <h3 className="font-semibold text-gray-800">{title}</h3>
            </div>
            <Badge variant="secondary" className="text-xs font-medium">
              {appointments.length}
            </Badge>
          </div>
          
          <div className="overflow-y-auto h-full pb-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-300">
            {appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className={`w-16 h-16 rounded-full ${statusConfig.bg} border-2 ${statusConfig.color.split(' ')[2]} flex items-center justify-center mb-3`}>
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 font-medium">No {status} appointments</p>
                <p className="text-xs text-gray-400 mt-1">Drag appointments here</p>
              </div>
            ) : (
              appointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} compact={true} />
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const ListView = () => (
    <div className="space-y-6">
      {Object.entries(appointmentsByDate)
        .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
        .map(([date, dayAppointments]) => (
          <div key={date} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{formatDate(date)}</h3>
              <Badge variant="secondary">{dayAppointments.length} appointments</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {dayAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          </div>
        ))}
      {Object.keys(appointmentsByDate).length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
          <p className="text-gray-500">Try adjusting your filters or check back later.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
              <p className="text-gray-600 mt-2">Manage and track all customer appointments</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center space-x-3">
                <Select value={viewMode} onValueChange={(value: "board" | "list") => setViewMode(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="board">Board View</SelectItem>
                    <SelectItem value="list">List View</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Payment Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="card">Card Payment</SelectItem>
                    <SelectItem value="cash">Cash Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border shadow-sm">
                  <span className="font-medium">{filteredAppointments.length}</span> appointments
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === "board" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <KanbanColumn 
              title="Pending" 
              appointments={appointmentsByStatus.pending} 
              status="pending"
            />
            <KanbanColumn 
              title="Confirmed" 
              appointments={appointmentsByStatus.confirmed} 
              status="confirmed"
            />
            <KanbanColumn 
              title="Completed" 
              appointments={appointmentsByStatus.completed} 
              status="completed"
            />
            <KanbanColumn 
              title="Cancelled" 
              appointments={appointmentsByStatus.cancelled} 
              status="cancelled"
            />
          </div>
        ) : (
          <ListView />
        )}
      </div>
    </div>
  );
}