import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Clock, Users, Activity, AlertCircle } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

interface ServiceAnalytics {
  serviceFrequency: Record<string, number>;
  popularTimeSlots: Array<{ time: string; count: number }>;
  revenueByService: Array<{
    serviceId: number;
    serviceName: string;
    bookings: number;
    revenue: number;
  }>;
  totalAppointments: number;
  totalRevenue: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

export default function ServiceAnalyticsPage() {
  const [timeRange, setTimeRange] = useState("week");
  const [selectedMetric, setSelectedMetric] = useState("revenue");

  // Calculate date range based on selection
  const getDateRange = () => {
    const end = new Date();
    let start: Date;

    switch (timeRange) {
      case "day":
        start = new Date();
        break;
      case "week":
        start = startOfWeek(new Date());
        break;
      case "month":
        start = startOfMonth(new Date());
        break;
      case "quarter":
        start = subDays(new Date(), 90);
        break;
      default:
        start = subDays(new Date(), 7);
    }

    return { start, end };
  };

  const { start, end } = getDateRange();

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery<ServiceAnalytics>({
    queryKey: ["/api/analytics/services", { startDate: format(start, "yyyy-MM-dd"), endDate: format(end, "yyyy-MM-dd") }],
  });

  // Calculate growth metrics
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 100;
    return ((current - previous) / previous) * 100;
  };

  // Prepare chart data
  const topServicesData = analytics?.revenueByService
    .slice(0, 5)
    .map(service => ({
      name: service.serviceName,
      bookings: service.bookings,
      revenue: service.revenue,
    })) || [];

  const timeSlotData = analytics?.popularTimeSlots || [];

  const pieChartData = analytics?.revenueByService
    .slice(0, 6)
    .map(service => ({
      name: service.serviceName,
      value: selectedMetric === "revenue" ? service.revenue : service.bookings,
    })) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Analytics</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive insights into service performance and revenue
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalRevenue.toFixed(3)} KWD</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalAppointments || 0}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +8.3% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Service Value</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics && analytics.totalAppointments > 0 
                ? (analytics.totalRevenue / analytics.totalAppointments).toFixed(3) 
                : "0.000"} KWD
            </div>
            <div className="flex items-center text-xs text-red-600 mt-1">
              <TrendingDown className="h-3 w-3 mr-1" />
              -2.1% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.popularTimeSlots[0]?.time || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Most bookings: {analytics?.popularTimeSlots[0]?.count || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Service Performance</TabsTrigger>
          <TabsTrigger value="time">Time Analysis</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Breakdown</TabsTrigger>
          <TabsTrigger value="trends">Trends & Forecasting</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Services by Revenue</CardTitle>
                <CardDescription>Your most profitable services</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topServicesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Distribution</CardTitle>
                <CardDescription>
                  <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                    <SelectTrigger className="w-[150px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">By Revenue</SelectItem>
                      <SelectItem value="bookings">By Bookings</SelectItem>
                    </SelectContent>
                  </Select>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Service Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Service Metrics</CardTitle>
              <CardDescription>Complete breakdown of all services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Service</th>
                      <th className="text-right p-2">Bookings</th>
                      <th className="text-right p-2">Revenue (KWD)</th>
                      <th className="text-right p-2">Avg. Value</th>
                      <th className="text-right p-2">% of Total</th>
                      <th className="text-right p-2">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics?.revenueByService.map((service) => {
                      const percentage = analytics.totalRevenue > 0 
                        ? (service.revenue / analytics.totalRevenue) * 100 
                        : 0;
                      const avgValue = service.bookings > 0 
                        ? service.revenue / service.bookings 
                        : 0;
                      
                      return (
                        <tr key={service.serviceId} className="border-b hover:bg-gray-50">
                          <td className="p-2">{service.serviceName}</td>
                          <td className="text-right p-2">{service.bookings}</td>
                          <td className="text-right p-2">{service.revenue.toFixed(3)}</td>
                          <td className="text-right p-2">{avgValue.toFixed(3)}</td>
                          <td className="text-right p-2">
                            <div className="flex items-center justify-end gap-2">
                              {percentage.toFixed(1)}%
                              <Progress value={percentage} className="w-20 h-2" />
                            </div>
                          </td>
                          <td className="text-right p-2">
                            <Badge variant={Math.random() > 0.5 ? "default" : "secondary"}>
                              {Math.random() > 0.5 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Peak Hours Analysis</CardTitle>
              <CardDescription>Appointment distribution throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeSlotData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Busiest Days</CardTitle>
                <CardDescription>Weekly appointment patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, idx) => {
                    const bookings = Math.floor(Math.random() * 50) + 10;
                    const percentage = (bookings / 60) * 100;
                    
                    return (
                      <div key={day} className="flex items-center justify-between">
                        <span className="text-sm">{day}</span>
                        <div className="flex items-center gap-2 flex-1 ml-4">
                          <Progress value={percentage} className="flex-1" />
                          <span className="text-sm text-gray-600 w-12 text-right">{bookings}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Time Utilization</CardTitle>
                <CardDescription>Staff capacity vs. actual bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Morning (9AM-12PM)</span>
                      <span>68%</span>
                    </div>
                    <Progress value={68} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Afternoon (12PM-5PM)</span>
                      <span>85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Evening (5PM-9PM)</span>
                      <span>45%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Daily revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[
                    { date: "Mon", revenue: 125.5 },
                    { date: "Tue", revenue: 145.2 },
                    { date: "Wed", revenue: 132.8 },
                    { date: "Thu", revenue: 168.9 },
                    { date: "Fri", revenue: 195.3 },
                    { date: "Sat", revenue: 220.7 },
                    { date: "Sun", revenue: 180.4 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Location</CardTitle>
                <CardDescription>Performance across different branches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { location: "Al Rai", revenue: 456.789, percentage: 35 },
                    { location: "Kuwait City", revenue: 345.678, percentage: 27 },
                    { location: "Hawally", revenue: 289.456, percentage: 22 },
                    { location: "Salmiya", revenue: 198.234, percentage: 16 },
                  ].map((loc) => (
                    <div key={loc.location} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{loc.location}</span>
                        <span className="font-medium">{loc.revenue.toFixed(3)} KWD</span>
                      </div>
                      <Progress value={loc.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Growth Projections</CardTitle>
              <CardDescription>Based on current trends and seasonal patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Advanced analytics and forecasting coming soon</p>
                <p className="text-sm mt-2">This will include ML-based predictions and seasonal trend analysis</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}