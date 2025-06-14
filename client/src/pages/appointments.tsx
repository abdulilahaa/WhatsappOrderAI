import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, User, Phone, Mail, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AppointmentWithDetails {
  id: number;
  customerId: number;
  serviceId: number;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  status: string;
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

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["/api/appointments"],
    queryFn: () => apiRequest("GET", "/api/appointments").then(res => res.json()) as Promise<AppointmentWithDetails[]>,
  });

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
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
        <p className="text-gray-600 mt-2">Manage customer appointments and bookings</p>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments yet</h3>
            <p className="text-gray-500 text-center">
              When customers book appointments, they will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {appointments.map((appointment) => (
            <Card key={appointment.id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{appointment.service.name}</CardTitle>
                  <Badge className={getStatusColor(appointment.status)}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </Badge>
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
                        <p className="font-medium">{formatTime(appointment.appointmentTime)}</p>
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
                  {appointment.status === "scheduled" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(appointment.id, "confirmed")}
                      disabled={updateStatusMutation.isPending}
                    >
                      Confirm
                    </Button>
                  )}
                  {(appointment.status === "scheduled" || appointment.status === "confirmed") && (
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
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}