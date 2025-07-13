import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { CalendarIcon, Clock, Users, MapPin, Activity, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StaffMember {
  Id: number;
  Name: string;
  Image_URL: string;
  Location_Id: number;
  Extra_Time: number;
  availability?: {
    date: string;
    slots: string[];
    bookings: number;
  };
}

interface Location {
  Location_Id: number;
  Location_Name: string;
  Address: string;
  Working_Days: string;
  From_Time: string;
  To_Time: string;
}

interface Service {
  id: number;
  name: string;
  duration: string;
  price: number;
}

export default function StaffAvailabilityPage() {
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedService, setSelectedService] = useState<string>("");

  // Fetch locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/nailit/locations"],
  });

  // Fetch services
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/products"],
  });

  // Fetch staff availability
  const { data: staffData, isLoading: isLoadingStaff } = useQuery({
    queryKey: ["/api/nailit/staff-availability", selectedLocation, format(selectedDate, "yyyy-MM-dd"), selectedService],
    enabled: !!selectedService && selectedLocation !== "all",
  });

  // Calculate staff utilization
  const calculateUtilization = (bookings: number, totalSlots: number) => {
    return totalSlots > 0 ? (bookings / totalSlots) * 100 : 0;
  };

  // Get location details
  const getLocationDetails = (locationId: number) => {
    return locations.find(loc => loc.Location_Id === locationId);
  };

  // Mock data for demonstration (replace with actual API data)
  const mockStaffByLocation = {
    "1": [
      { Id: 1, Name: "Sarah Johnson", Location_Id: 1, availability: { slots: ["9:00 AM", "10:00 AM", "2:00 PM"], bookings: 5 } },
      { Id: 2, Name: "Maria Garcia", Location_Id: 1, availability: { slots: ["11:00 AM", "3:00 PM", "4:00 PM"], bookings: 3 } },
      { Id: 3, Name: "Fatima Al-Rashid", Location_Id: 1, availability: { slots: ["9:00 AM", "1:00 PM"], bookings: 4 } },
    ],
    "2": [
      { Id: 4, Name: "Aisha Kumar", Location_Id: 2, availability: { slots: ["10:00 AM", "11:00 AM", "3:00 PM", "5:00 PM"], bookings: 2 } },
      { Id: 5, Name: "Noor Hassan", Location_Id: 2, availability: { slots: ["9:00 AM", "2:00 PM", "4:00 PM"], bookings: 6 } },
    ]
  };

  const displayStaff = selectedLocation === "all" 
    ? Object.values(mockStaffByLocation).flat()
    : mockStaffByLocation[selectedLocation] || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Availability Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Real-time staff scheduling and availability across all locations
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Activity className="h-3 w-3" />
          Live Updates
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.Location_Id} value={location.Location_Id.toString()}>
                      {location.Location_Name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Service</label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Services</SelectItem>
                  {services.slice(0, 10).map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end">
              <Button className="w-full" variant="secondary">
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayStaff.length}</div>
            <p className="text-xs text-muted-foreground">
              Across {selectedLocation === "all" ? locations.length : 1} location{selectedLocation === "all" ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Now</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {displayStaff.filter(s => s.availability?.slots.length > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready to take appointments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68%</div>
            <Progress value={68} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Hours</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2-5 PM</div>
            <p className="text-xs text-muted-foreground">
              Highest demand period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Availability Tabs */}
      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          {selectedLocation === "all" ? (
            // Show by location when "All Locations" is selected
            locations.map((location) => {
              const locationStaff = mockStaffByLocation[location.Location_Id.toString()] || [];
              
              return (
                <Card key={location.Location_Id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {location.Location_Name}
                        </CardTitle>
                        <CardDescription>
                          {location.Address} • {location.Working_Days}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {locationStaff.length} Staff Members
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {locationStaff.map((staff) => (
                        <Card key={staff.Id} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium">{staff.Name}</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {staff.availability?.slots.length || 0} slots available
                                </p>
                              </div>
                              <Badge variant={staff.availability?.slots.length > 2 ? "default" : "secondary"}>
                                {staff.availability?.slots.length > 2 ? "Available" : "Limited"}
                              </Badge>
                            </div>
                            
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Utilization</span>
                                <span className="font-medium">
                                  {calculateUtilization(staff.availability?.bookings || 0, 8).toFixed(0)}%
                                </span>
                              </div>
                              <Progress 
                                value={calculateUtilization(staff.availability?.bookings || 0, 8)} 
                                className="h-2"
                              />
                            </div>

                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-600 mb-1">Available Slots</p>
                              <div className="flex flex-wrap gap-1">
                                {staff.availability?.slots.slice(0, 3).map((slot, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {slot}
                                  </Badge>
                                ))}
                                {staff.availability?.slots.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{staff.availability.slots.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            // Show individual staff when specific location is selected
            <Card>
              <CardHeader>
                <CardTitle>Staff Members</CardTitle>
                <CardDescription>
                  {displayStaff.length} staff members at this location
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayStaff.map((staff) => (
                    <Card key={staff.Id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{staff.Name}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {staff.availability?.slots.length || 0} slots available
                            </p>
                          </div>
                          <Badge variant={staff.availability?.slots.length > 2 ? "default" : "secondary"}>
                            {staff.availability?.slots.length > 2 ? "Available" : "Limited"}
                          </Badge>
                        </div>
                        
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Utilization</span>
                            <span className="font-medium">
                              {calculateUtilization(staff.availability?.bookings || 0, 8).toFixed(0)}%
                            </span>
                          </div>
                          <Progress 
                            value={calculateUtilization(staff.availability?.bookings || 0, 8)} 
                            className="h-2"
                          />
                        </div>

                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-600 mb-1">Available Slots</p>
                          <div className="flex flex-wrap gap-1">
                            {staff.availability?.slots.slice(0, 3).map((slot, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {slot}
                              </Badge>
                            ))}
                            {staff.availability?.slots.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{staff.availability.slots.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Timeline</CardTitle>
              <CardDescription>Staff schedule for {format(selectedDate, "PPPP")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Timeline view coming soon - will show hourly staff availability
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Staff utilization and booking patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Top Performing Staff</h4>
                    <div className="space-y-2">
                      {displayStaff.slice(0, 5).map((staff) => (
                        <div key={staff.Id} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{staff.Name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              {staff.availability?.bookings || 0} bookings
                            </span>
                            <Badge variant="outline">
                              {calculateUtilization(staff.availability?.bookings || 0, 8).toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}