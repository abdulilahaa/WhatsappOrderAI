import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Timer,
  Grid3X3,
  List,
  Eye
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
  const [viewMode, setViewMode] = useState<"table" | "cards" | "board">("table");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

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

  // Sort appointments by date and time
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const dateA = new Date(`${a.appointmentDate}T${a.appointmentTime}`);
    const dateB = new Date(`${b.appointmentDate}T${b.appointmentTime}`);
    return dateA.getTime() - dateB.getTime();
  });

  // Group appointments by status for board view
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
          color: "bg-amber-100 text-amber-800", 
          dot: "bg-amber-400",
          bg: "bg-amber-50"
        };
      case "confirmed":
        return { 
          color: "bg-emerald-100 text-emerald-800", 
          dot: "bg-emerald-400",
          bg: "bg-emerald-50"
        };
      case "completed":
        return { 
          color: "bg-blue-100 text-blue-800", 
          dot: "bg-blue-400",
          bg: "bg-blue-50"
        };
      case "cancelled":
        return { 
          color: "bg-red-100 text-red-800", 
          dot: "bg-red-400",
          bg: "bg-red-50"
        };
      default:
        return { 
          color: "bg-gray-100 text-gray-800", 
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
      weekday: "short",
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

  const toggleCardExpansion = (appointmentId: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(appointmentId)) {
      newExpanded.delete(appointmentId);
    } else {
      newExpanded.add(appointmentId);
    }
    setExpandedCards(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded w-1/3"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  const TableView = () => (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Customer</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Service</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Date & Time</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Contact</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Payment</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Status</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedAppointments.map((appointment) => {
              const statusConfig = getStatusConfig(appointment.status);
              return (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                          {getCustomerInitials(appointment.customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">{appointment.customer.name || "Unknown"}</p>
                        <p className="text-sm text-gray-500">ID: {appointment.customer.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{appointment.service.name}</p>
                      <p className="text-sm text-gray-500">${appointment.service.price} • {appointment.duration}min</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{formatDate(appointment.appointmentDate)}</p>
                      <p className="text-sm text-gray-500">{formatTime(appointment.appointmentTime)} (Kuwait)</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-900">{appointment.customer.phoneNumber}</p>
                      {appointment.customer.email && (
                        <p className="text-sm text-gray-500">{appointment.customer.email}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {appointment.paymentMethod ? (
                      <div className="flex items-center space-x-2">
                        {appointment.paymentMethod === 'card' ? 
                          <CreditCard className="w-4 h-4 text-blue-600" /> : 
                          <Banknote className="w-4 h-4 text-green-600" />
                        }
                        <span className="text-sm text-gray-900 capitalize">{appointment.paymentMethod}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={`${statusConfig.color} text-xs`}>
                      {appointment.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {appointment.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(appointment.id, "confirmed")}
                          disabled={updateStatusMutation.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 text-xs px-2 py-1"
                        >
                          Confirm
                        </Button>
                      )}
                      {(appointment.status === "pending" || appointment.status === "confirmed") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(appointment.id, "completed")}
                          disabled={updateStatusMutation.isPending}
                          className="text-xs px-2 py-1"
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
                          className="text-xs px-2 py-1 text-red-600 hover:bg-red-50"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sortedAppointments.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
          <p className="text-gray-500">Try adjusting your filters or check back later.</p>
        </div>
      )}
    </div>
  );

  const CardsView = () => (
    <div className="space-y-4">
      {sortedAppointments.map((appointment) => {
        const statusConfig = getStatusConfig(appointment.status);
        const isExpanded = expandedCards.has(appointment.id);
        
        return (
          <Collapsible key={appointment.id} open={isExpanded} onOpenChange={() => toggleCardExpansion(appointment.id)}>
            <Card className={`border-l-4 ${
              appointment.status === 'pending' ? 'border-l-amber-400' :
              appointment.status === 'confirmed' ? 'border-l-emerald-400' :
              appointment.status === 'completed' ? 'border-l-blue-400' :
              'border-l-red-400'
            } hover:shadow-md transition-shadow`}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
                          {getCustomerInitials(appointment.customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">{appointment.service.name}</h3>
                        <p className="text-gray-600">{appointment.customer.name || "Unknown Customer"}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center space-x-1">
                            <CalendarDays className="w-4 h-4" />
                            <span>{formatDate(appointment.appointmentDate)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Timer className="w-4 h-4" />
                            <span>{formatTime(appointment.appointmentTime)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <DollarSign className="w-4 h-4" />
                            <span>${appointment.service.price}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {appointment.paymentMethod && (
                        <div className="p-2 rounded-full bg-gray-100">
                          {appointment.paymentMethod === 'card' ? 
                            <CreditCard className="w-5 h-5 text-blue-600" /> : 
                            <Banknote className="w-5 h-5 text-green-600" />
                          }
                        </div>
                      )}
                      <Badge className={`${statusConfig.color}`}>
                        {appointment.status}
                      </Badge>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Customer Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{appointment.customer.phoneNumber}</span>
                        </div>
                        {appointment.customer.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{appointment.customer.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Appointment Details</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500">Duration:</span> {appointment.duration} minutes</p>
                        <p><span className="text-gray-500">Service:</span> {appointment.service.description}</p>
                        <p><span className="text-gray-500">Total Price:</span> ${appointment.service.price}</p>
                      </div>
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                      <p className="text-sm text-gray-600">{appointment.notes}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {appointment.status === "pending" && (
                      <Button
                        onClick={() => handleStatusChange(appointment.id, "confirmed")}
                        disabled={updateStatusMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Confirm Appointment
                      </Button>
                    )}
                    {(appointment.status === "pending" || appointment.status === "confirmed") && (
                      <Button
                        variant="outline"
                        onClick={() => handleStatusChange(appointment.id, "completed")}
                        disabled={updateStatusMutation.isPending}
                      >
                        Mark as Complete
                      </Button>
                    )}
                    {appointment.status !== "cancelled" && appointment.status !== "completed" && (
                      <Button
                        variant="outline"
                        onClick={() => handleStatusChange(appointment.id, "cancelled")}
                        disabled={updateStatusMutation.isPending}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Appointment
                      </Button>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
      {sortedAppointments.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
          <p className="text-gray-500">Try adjusting your filters or check back later.</p>
        </div>
      )}
    </div>
  );

  const BoardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {Object.entries(appointmentsByStatus).map(([status, appointments]) => {
        const statusConfig = getStatusConfig(status);
        return (
          <div key={status} className="flex-1 min-w-0">
            <div className={`${statusConfig.bg} border-2 border-opacity-20 rounded-xl p-4 h-[calc(100vh-250px)]`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${statusConfig.dot}`}></div>
                  <h3 className="font-semibold text-gray-800 capitalize">{status}</h3>
                </div>
                <Badge variant="secondary" className="text-xs font-medium">
                  {appointments.length}
                </Badge>
              </div>
              
              <div className="overflow-y-auto h-full pb-4 space-y-3">
                {appointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-sm text-gray-500">No {status} appointments</p>
                  </div>
                ) : (
                  appointments.map((appointment) => (
                    <Card key={appointment.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow mb-3">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 text-sm leading-tight">{appointment.service.name}</h4>
                            <p className="text-xs text-gray-600 mt-1">{appointment.customer.name || "Unknown"}</p>
                          </div>
                          {appointment.paymentMethod && (
                            <div className="ml-2">
                              {appointment.paymentMethod === 'card' ? 
                                <CreditCard className="w-4 h-4 text-blue-600" /> : 
                                <Banknote className="w-4 h-4 text-green-600" />
                              }
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center space-x-1">
                            <CalendarDays className="w-3 h-3 text-gray-400" />
                            <span>{formatDate(appointment.appointmentDate)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Timer className="w-3 h-3 text-gray-400" />
                            <span>{formatTime(appointment.appointmentTime)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-3 h-3 text-gray-400" />
                            <span>${appointment.service.price}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}
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
                <Select value={viewMode} onValueChange={(value: "table" | "cards" | "board") => setViewMode(value)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">
                      <div className="flex items-center space-x-2">
                        <Grid3X3 className="w-4 h-4" />
                        <span>Table View</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="cards">
                      <div className="flex items-center space-x-2">
                        <List className="w-4 h-4" />
                        <span>Card View</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="board">
                      <div className="flex items-center space-x-2">
                        <Eye className="w-4 h-4" />
                        <span>Board View</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
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
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border shadow-sm">
                <span className="font-medium">{filteredAppointments.length}</span> appointments
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === "table" && <TableView />}
        {viewMode === "cards" && <CardsView />}
        {viewMode === "board" && <BoardView />}
      </div>
    </div>
  );
}