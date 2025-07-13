import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Zap, TrendingUp, Clock, Users, Calendar, AlertCircle, 
  CheckCircle, XCircle, Star, MessageCircle, DollarSign,
  Activity, Timer, ArrowUp, ArrowDown
} from "lucide-react";
import { format, differenceInMinutes, parseISO } from "date-fns";

interface QuickInsight {
  type: "success" | "warning" | "info" | "critical";
  title: string;
  description: string;
  action?: string;
  value?: number | string;
  trend?: "up" | "down" | "stable";
}

interface RealtimeMetric {
  label: string;
  value: number;
  change: number;
  status: "good" | "warning" | "critical";
}

export default function QuickBookingInsightsPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeAlerts, setActiveAlerts] = useState<QuickInsight[]>([]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real-time data
  const { data: conversations } = useQuery({
    queryKey: ["/api/conversations/active"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: appointments } = useQuery({
    queryKey: ["/api/appointments"],
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 30000,
  });

  // Calculate real-time insights
  const getQuickInsights = (): QuickInsight[] => {
    const insights: QuickInsight[] = [];

    // Active conversations insight
    if (conversations && conversations.length > 0) {
      const recentConversations = conversations.filter((conv: any) => {
        const lastMessage = new Date(conv.lastMessageAt);
        return differenceInMinutes(currentTime, lastMessage) < 30;
      });

      if (recentConversations.length > 0) {
        insights.push({
          type: "info",
          title: "Active Customer Engagement",
          description: `${recentConversations.length} customers are actively chatting right now`,
          action: "View Conversations",
          value: recentConversations.length,
          trend: "up"
        });
      }
    }

    // Upcoming appointments
    if (appointments && appointments.length > 0) {
      const todayAppointments = appointments.filter((apt: any) => {
        const aptDate = new Date(apt.date);
        return aptDate.toDateString() === currentTime.toDateString();
      });

      if (todayAppointments.length > 0) {
        insights.push({
          type: "success",
          title: "Today's Appointments",
          description: `${todayAppointments.length} appointments scheduled for today`,
          value: todayAppointments.length,
          trend: "stable"
        });
      }

      // Check for appointment conflicts
      const nextHour = appointments.filter((apt: any) => {
        const aptTime = new Date(apt.date);
        const diffMinutes = differenceInMinutes(aptTime, currentTime);
        return diffMinutes > 0 && diffMinutes <= 60;
      });

      if (nextHour.length >= 3) {
        insights.push({
          type: "warning",
          title: "Busy Period Ahead",
          description: `${nextHour.length} appointments in the next hour - ensure staff readiness`,
          action: "Check Staff Availability",
          trend: "up"
        });
      }
    }

    // Revenue insights
    if (stats) {
      if (stats.revenueToday > 100) {
        insights.push({
          type: "success",
          title: "Strong Revenue Day",
          description: `${stats.revenueToday.toFixed(3)} KWD in revenue today`,
          value: `${stats.revenueToday.toFixed(3)} KWD`,
          trend: "up"
        });
      }

      // AI response rate
      if (stats.aiResponseRate < 80) {
        insights.push({
          type: "warning",
          title: "AI Response Rate Low",
          description: `Only ${stats.aiResponseRate.toFixed(0)}% of messages handled by AI`,
          action: "Review AI Settings",
          value: `${stats.aiResponseRate.toFixed(0)}%`,
          trend: "down"
        });
      }
    }

    // Staff optimization insights
    const currentHour = currentTime.getHours();
    if (currentHour >= 14 && currentHour <= 17) {
      insights.push({
        type: "info",
        title: "Peak Hours Active",
        description: "Currently in peak booking hours (2-5 PM)",
        action: "Monitor Staff Capacity",
        trend: "stable"
      });
    }

    return insights;
  };

  const insights = getQuickInsights();

  // Real-time metrics
  const realtimeMetrics: RealtimeMetric[] = [
    {
      label: "Active Chats",
      value: stats?.activeConversations || 0,
      change: 12.5,
      status: stats?.activeConversations > 5 ? "warning" : "good"
    },
    {
      label: "Today's Revenue",
      value: stats?.revenueToday || 0,
      change: 8.3,
      status: "good"
    },
    {
      label: "AI Response Rate",
      value: stats?.aiResponseRate || 0,
      change: -2.1,
      status: stats?.aiResponseRate < 80 ? "warning" : "good"
    },
    {
      label: "Appointments Today",
      value: appointments?.filter((apt: any) => 
        new Date(apt.date).toDateString() === currentTime.toDateString()
      ).length || 0,
      change: 15.0,
      status: "good"
    }
  ];

  // Quick actions based on current state
  const getQuickActions = () => {
    const actions = [];

    if (stats?.activeConversations > 3) {
      actions.push({
        title: "High Chat Volume",
        description: "Consider enabling auto-responses for common questions",
        icon: MessageCircle,
        color: "text-orange-600"
      });
    }

    const hour = currentTime.getHours();
    if (hour >= 17 && hour <= 19) {
      actions.push({
        title: "Evening Rush",
        description: "Ensure evening staff are ready for increased bookings",
        icon: Clock,
        color: "text-blue-600"
      });
    }

    if (insights.some(i => i.type === "warning")) {
      actions.push({
        title: "Address Warnings",
        description: "Review and resolve warning indicators",
        icon: AlertCircle,
        color: "text-yellow-600"
      });
    }

    return actions;
  };

  const quickActions = getQuickActions();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-yellow-500" />
            Quick Booking Insights
          </h1>
          <p className="text-gray-600 mt-2">
            Real-time actionable insights for your business
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Last updated</p>
          <p className="font-medium">{format(currentTime, "h:mm a")}</p>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {realtimeMetrics.map((metric, idx) => (
          <Card key={idx} className={`border-l-4 ${
            metric.status === "good" ? "border-l-green-500" :
            metric.status === "warning" ? "border-l-yellow-500" :
            "border-l-red-500"
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                <Badge variant={metric.change > 0 ? "default" : "secondary"} className="text-xs">
                  {metric.change > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                  {Math.abs(metric.change)}%
                </Badge>
              </div>
              <p className="text-2xl font-bold mt-2">
                {metric.label.includes("Revenue") ? `${metric.value.toFixed(3)} KWD` :
                 metric.label.includes("Rate") ? `${metric.value.toFixed(0)}%` :
                 metric.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Insights */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Active Insights
              </CardTitle>
              <CardDescription>
                Real-time business intelligence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {insights.length > 0 ? insights.map((insight, idx) => (
                    <Alert key={idx} className={`border-l-4 ${
                      insight.type === "success" ? "border-l-green-500" :
                      insight.type === "warning" ? "border-l-yellow-500" :
                      insight.type === "critical" ? "border-l-red-500" :
                      "border-l-blue-500"
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {insight.type === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
                            {insight.type === "warning" && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                            {insight.type === "critical" && <XCircle className="h-4 w-4 text-red-600" />}
                            {insight.type === "info" && <Activity className="h-4 w-4 text-blue-600" />}
                            <span className="font-medium">{insight.title}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                          {insight.action && (
                            <Button variant="link" className="p-0 h-auto text-sm mt-2">
                              {insight.action} →
                            </Button>
                          )}
                        </div>
                        {insight.value && (
                          <div className="text-right ml-4">
                            <p className="text-xl font-bold">{insight.value}</p>
                            {insight.trend && (
                              <Badge variant="outline" className="mt-1">
                                {insight.trend === "up" && <TrendingUp className="h-3 w-3" />}
                                {insight.trend === "down" && <ArrowDown className="h-3 w-3" />}
                                {insight.trend === "stable" && "→"}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </Alert>
                  )) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                      <p>All systems running smoothly</p>
                      <p className="text-sm mt-1">No immediate actions required</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Recommended actions based on current state
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quickActions.map((action, idx) => (
                  <div key={idx} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex items-start gap-3">
                      <action.icon className={`h-5 w-5 mt-0.5 ${action.color}`} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{action.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Performance Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - 0.82)}`}
                      className="text-green-500 transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold">82%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  Overall business performance
                </p>
                <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                  <div>
                    <p className="font-medium">Response</p>
                    <p className="text-gray-600">95%</p>
                  </div>
                  <div>
                    <p className="font-medium">Efficiency</p>
                    <p className="text-gray-600">78%</p>
                  </div>
                  <div>
                    <p className="font-medium">Revenue</p>
                    <p className="text-gray-600">73%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Time-based Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Time-Based Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4" />
                Next Hour
              </h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Check staff readiness for appointments</li>
                <li>• Review pending customer messages</li>
                <li>• Prepare for evening rush (if applicable)</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                Today
              </h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Monitor appointment completion rate</li>
                <li>• Track daily revenue goals</li>
                <li>• Ensure customer satisfaction</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" />
                This Week
              </h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Review service performance metrics</li>
                <li>• Plan staff schedules for next week</li>
                <li>• Analyze customer feedback trends</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}