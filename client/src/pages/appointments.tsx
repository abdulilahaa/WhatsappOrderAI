import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, User, Phone, Mail, DollarSign, CreditCard, Banknote, CheckCircle2, XCircle, Filter } from "lucide-react";
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
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["/api/appointments"],
    queryFn: () => apiRequest("GET", "/api/appointments").then(res => res.json()) as Promise<AppointmentWithDetails[]>,
  });

  // Filter appointments based on payment method
  const filteredAppointments = appointments.filter(appointment => 
    paymentFilter === "all" || appointment.paymentMethod === paymentFilter
  );

  // Group appointments by status for kanban columns
  const appointmentsByStatus = {
    pending: filteredAppointments.filter(a => a.status === "pending"),
    confirmed: filteredAppointments.filter(a => a.status === "confirmed"),
    completed: filteredAppointments.filter(a => a.status === "completed"),
    cancelled: filteredAppointments.filter(a => a.status === "cancelled"),
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/appointments/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Status Updated",
        description: "Appointment status has been updated successfully.",
      });
    },
  });

  const handleStatusChange = (appointmentId: number, newStatus: string) => {
    updateStatusMutation.mutate({ id: appointmentId, status: newStatus });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800" };
      case "confirmed":
        return { bg: "bg-green-50", border: "border-green-200", text: "text-green-800" };
      case "completed":
        return { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800" };
      case "cancelled":
        return { bg: "bg-red-50", border: "border-red-200", text: "text-red-800" };
      default:
        return { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-800" };
    }
  };

  const getPaymentIcon = (paymentMethod?: string) => {
    switch (paymentMethod) {
      case "card":
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case "cash":
        return <Banknote className="h-4 w-4 text-green-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const AppointmentCard = ({ appointment }: { appointment: AppointmentWithDetails }) => (
    <Card className="mb-4 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight">{appointment.service.name}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{appointment.customer.name || "Unknown"}</p>
          </div>
          {appointment.paymentMethod && (
            <div className="flex items-center space-x-1 ml-2">
              {getPaymentIcon(appointment.paymentMethod)}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>{formatDate(appointment.appointmentDate)}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>{formatTime(appointment.appointmentTime)}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="truncate">{appointment.customer.phoneNumber}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <span>${appointment.service.price}</span>
          </div>
        </div>

        {appointment.notes && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
            <p className="text-gray-600 line-clamp-2">{appointment.notes}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {appointment.status === "pending" && (
            <Button
              size="sm"
              onClick={() => handleStatusChange(appointment.id, "confirmed")}
              disabled={updateStatusMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-xs"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Confirm
            </Button>
          )}
          {(appointment.status === "pending" || appointment.status === "confirmed") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange(appointment.id, "completed")}
              disabled={updateStatusMutation.isPending}
              className="text-xs"
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
              className="text-xs text-red-600 hover:text-red-700"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const KanbanColumn = ({ title, appointments, status }: { 
    title: string; 
    appointments: AppointmentWithDetails[]; 
    status: string;
  }) => {
    const colors = getStatusColor(status);
    
    return (
      <div className="flex-1 min-w-0">
        <div className={`${colors.bg} ${colors.border} border-2 rounded-lg p-4 h-full`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold ${colors.text}`}>{title}</h3>
            <Badge variant="secondary" className="text-xs">
              {appointments.length}
            </Badge>
          </div>
          
          <div className="space-y-0 max-h-[calc(100vh-300px)] overflow-y-auto">
            {appointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No appointments</p>
              </div>
            ) : (
              appointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
              <p className="text-gray-600 mt-2">Manage customer appointments and bookings</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
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
              <div className="text-sm text-gray-500 bg-white px-3 py-2 rounded-lg border shadow-sm">
                Total: {filteredAppointments.length} appointments
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
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
      </div>
    </div>
  );
}