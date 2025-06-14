import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  // Group appointments by status for tabs
  const appointmentsByStatus = {
    all: appointments,
    pending: appointments.filter(a => a.status === "pending"),
    confirmed: appointments.filter(a => a.status === "confirmed"),
    completed: appointments.filter(a => a.status === "completed"),
    cancelled: appointments.filter(a => a.status === "cancelled"),
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
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "confirmed":
        return "bg-green-100 text-green-800 border border-green-200";
      case "completed":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getPaymentStatusColor = (paymentStatus?: string, paymentMethod?: string) => {
    if (paymentMethod === "cash") {
      return "bg-green-50 text-green-700 border border-green-200";
    }
    switch (paymentStatus) {
      case "paid":
        return "bg-green-50 text-green-700 border border-green-200";
      case "pending":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "failed":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  const getPaymentIcon = (paymentMethod?: string) => {
    switch (paymentMethod) {
      case "card":
        return <CreditCard className="h-4 w-4" />;
      case "cash":
        return <Banknote className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
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
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const AppointmentCard = ({ appointment }: { appointment: AppointmentWithDetails }) => (
    <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{appointment.service.name}</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(appointment.status)}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </Badge>
            {appointment.paymentMethod && (
              <Badge variant="outline" className={getPaymentStatusColor(appointment.paymentStatus, appointment.paymentMethod)}>
                <div className="flex items-center space-x-1">
                  {getPaymentIcon(appointment.paymentMethod)}
                  <span>{appointment.paymentMethod === "cash" ? "Cash" : "Card"}</span>
                </div>
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium">{formatDate(appointment.appointmentDate)}</p>
                <p className="text-sm text-gray-500">Appointment Date</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium">{formatTime(appointment.appointmentTime)} (Kuwait Time)</p>
                <p className="text-sm text-gray-500">{appointment.duration} minutes</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium">${appointment.service.price}</p>
                <p className="text-sm text-gray-500">Service Price</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium">{appointment.customer.name || "Unknown"}</p>
                <p className="text-sm text-gray-500">Customer</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium">{appointment.customer.phoneNumber}</p>
                <p className="text-sm text-gray-500">Phone Number</p>
              </div>
            </div>

            {appointment.customer.email && (
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">{appointment.customer.email}</p>
                  <p className="text-sm text-gray-500">Email</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {appointment.notes && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
            <p className="text-sm text-gray-600">{appointment.notes}</p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {appointment.status === "pending" && (
            <Button
              size="sm"
              onClick={() => handleStatusChange(appointment.id, "confirmed")}
              disabled={updateStatusMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Confirm
            </Button>
          )}
          {(appointment.status === "pending" || appointment.status === "confirmed") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange(appointment.id, "completed")}
              disabled={updateStatusMutation.isPending}
            >
              Mark Complete
            </Button>
          )}
          {appointment.status !== "cancelled" && appointment.status !== "completed" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleStatusChange(appointment.id, "cancelled")}
              disabled={updateStatusMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
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
                Total: {appointments.length} appointments
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <Tabs defaultValue="all" className="p-6">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="all" className="flex items-center space-x-2">
                <span>All</span>
                <Badge variant="secondary" className="text-xs">
                  {appointmentsByStatus.all.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center space-x-2">
                <span>Pending</span>
                <Badge variant="secondary" className="text-xs">
                  {appointmentsByStatus.pending.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="confirmed" className="flex items-center space-x-2">
                <span>Confirmed</span>
                <Badge variant="secondary" className="text-xs">
                  {appointmentsByStatus.confirmed.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center space-x-2">
                <span>Completed</span>
                <Badge variant="secondary" className="text-xs">
                  {appointmentsByStatus.completed.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="flex items-center space-x-2">
                <span>Cancelled</span>
                <Badge variant="secondary" className="text-xs">
                  {appointmentsByStatus.cancelled.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {Object.entries(appointmentsByStatus).map(([status, statusAppointments]) => (
              <TabsContent key={status} value={status} className="mt-0">
                {statusAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No {status === 'all' ? '' : status} appointments
                    </h3>
                    <p className="text-gray-500 text-center">
                      When customers book appointments, they will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {statusAppointments
                      .filter(appointment => 
                        paymentFilter === "all" || appointment.paymentMethod === paymentFilter
                      )
                      .map((appointment) => (
                        <AppointmentCard key={appointment.id} appointment={appointment} />
                      ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
}