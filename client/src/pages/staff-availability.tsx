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
  const [selectedService, setSelectedService] = useState<string>("all");

  // Fetch locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/nailit/locations"],
  });

  // Fetch services
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/products"],
  });

  // Fetch staff availability based on selected criteria
  const { data: staffData, isLoading: isLoadingStaff } = useQuery({
    queryKey: ["/api/nailit/staff-availability", selectedLocation, format(selectedDate, "yyyy-MM-dd"), selectedService],
    enabled: selectedService !== "all" && selectedLocation !== "all",
  });

  // Fetch staff by location for "all services" view
  const { data: locationStaffData, isLoading: isLoadingLocationStaff } = useQuery({
    queryKey: ["/api/nailit/staff-by-location", selectedLocation, format(selectedDate, "yyyy-MM-dd")],
    enabled: selectedLocation !== "all" && selectedService === "all",
  });

  // Calculate staff utilization
  const calculateUtilization = (bookings: number, totalSlots: number) => {
    return totalSlots > 0 ? (bookings / totalSlots) * 100 : 0;
  };

  // Get location details
  const getLocationDetails = (locationId: number) => {
    return locations.find(loc => loc.Location_Id === locationId);
  };

  // Get display staff based on current selection and real data
  const getDisplayStaff = () => {
    if (selectedLocation === "all") {
      // For "all locations", we'll show a summary message
      return [];
    } else if (selectedService === "all") {
      // Show all staff for selected location
      return locationStaffData?.data || [];
    } else {
      // Show staff for specific service and location
      return staffData?.data || [];
    }
  };

  const displayStaff = getDisplayStaff();
  const isLoading = isLoadingStaff || isLoadingLocationStaff;

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
                  <SelectItem value="all">All Services</SelectItem>
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
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading real staff data from NailIt API...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : selectedLocation === "all" ? (
            // Show instruction when "All Locations" is selected
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select Location and Service</h3>
                  <p className="text-gray-600 mb-4">
                    Choose a specific location and service to view real-time staff availability from NailIt POS system.
                  </p>
                  <Badge variant="outline" className="inline-flex items-center gap-2">
                    <Activity className="h-3 w-3" />
                    {locations.length} Locations Available
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ) : displayStaff.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Staff Available</h3>
                  <p className="text-gray-600 mb-4">
                    No staff members found for the selected criteria. Try selecting a different service or date.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Badge variant="outline">Location: {getLocationDetails(parseInt(selectedLocation))?.Location_Name}</Badge>
                    <Badge variant="outline">Date: {format(selectedDate, "PPP")}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Show real staff data from NailIt API
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Real NailIt Staff Data
                    </CardTitle>
                    <CardDescription>
                      {displayStaff.length} authenticated staff members from NailIt POS system
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {getLocationDetails(parseInt(selectedLocation))?.Location_Name}
                    </Badge>
                    <Badge variant="default" className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      Live Data
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayStaff.map((staff) => (
                    <Card key={staff.Id} className="border border-blue-200 bg-blue-50/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{staff.Name}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Staff ID: {staff.Id} • Extra Time: {staff.Extra_Time || 0}min
                            </p>
                            {staff.services && (
                              <p className="text-xs text-blue-600 mt-1">
                                {staff.services.length} service{staff.services.length > 1 ? 's' : ''} qualified
                              </p>
                            )}
                          </div>
                          <Badge variant={staff.availability?.slots.length > 2 ? "default" : "secondary"}>
                            {staff.availability?.slots.length > 2 ? "Available" : "Limited"}
                          </Badge>
                        </div>
                        
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Today's Utilization</span>
                            <span className="font-medium">
                              {staff.availability?.utilization || calculateUtilization(staff.availability?.bookings || 0, 8).toFixed(0)}%
                            </span>
                          </div>
                          <Progress 
                            value={staff.availability?.utilization || calculateUtilization(staff.availability?.bookings || 0, 8)} 
                            className="h-2"
                          />
                        </div>

                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-600 mb-1">Available Time Slots</p>
                          <div className="flex flex-wrap gap-1">
                            {staff.availability?.slots.slice(0, 3).map((slot, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
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

                        {staff.Image_URL && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-500">Profile: {staff.Image_URL}</p>
                          </div>
                        )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Real-Time NailIt Analytics</CardTitle>
                <CardDescription>Based on live staff data from NailIt POS system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {displayStaff.filter(s => s.availability?.utilization > 50).length}
                    </div>
                    <p className="text-sm text-gray-600">High-Performance Staff</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {Math.round(displayStaff.reduce((sum, s) => sum + (s.availability?.utilization || 0), 0) / Math.max(displayStaff.length, 1))}%
                    </div>
                    <p className="text-sm text-gray-600">Avg. Utilization</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Live Staff Insights</CardTitle>
                <CardDescription>Current availability data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Available Staff</span>
                    <Badge>{displayStaff.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Location</span>
                    <Badge variant="outline">
                      {selectedLocation !== "all" ? getLocationDetails(parseInt(selectedLocation))?.Location_Name : "Multiple"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Data Source</span>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      NailIt POS
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Staff</CardTitle>
              <CardDescription>Based on real NailIt staff availability data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {displayStaff.slice(0, 5).map((staff) => (
                  <div key={staff.Id} className="flex items-center justify-between p-3 border rounded bg-blue-50/30">
                    <div>
                      <span className="font-medium">{staff.Name}</span>
                      <p className="text-sm text-gray-600">ID: {staff.Id} • Extra Time: {staff.Extra_Time || 0}min</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {staff.availability?.slots.length || 0} slots
                      </span>
                      <Badge variant="outline">
                        {staff.availability?.utilization || calculateUtilization(staff.availability?.bookings || 0, 8).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                ))}
                {displayStaff.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    Select a location and service to view staff analytics
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}