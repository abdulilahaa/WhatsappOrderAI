import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, RefreshCw, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'error' | 'warning' | 'debug';
  source: string;
  message: string;
  details?: any;
}

export default function LogsMonitoring() {
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Real-time log fetching
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['/api/logs'],
    refetchInterval: autoRefresh ? 2000 : false, // Auto-refresh every 2 seconds
    placeholderData: []
  });

  // Mock logs for now since backend logs API doesn't exist yet
  const mockLogs: LogEntry[] = [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      level: 'info',
      source: 'WhatsApp Service',
      message: 'Message received from +96541144687',
      details: { messageType: 'text', content: 'French manicure at Plaza Mall' }
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 30000).toISOString(),
      level: 'info',
      source: 'AI Agent',
      message: 'Natural conversation processing completed',
      details: { processingTime: '2564ms', serviceExtracted: 'French Manicure' }
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      level: 'info',
      source: 'NailIt API',
      message: 'Service cache refresh completed',
      details: { servicesLoaded: 1073, locations: 3 }
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      level: 'error',
      source: 'Booking System',
      message: 'userResult is not defined error in booking creation',
      details: { customerId: 43, service: 'Classic Pedicure' }
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 180000).toISOString(),
      level: 'warning',
      source: 'Database',
      message: 'Slow query detected in conversations table',
      details: { queryTime: '1.2s', table: 'conversations' }
    }
  ];

  const displayLogs = logs || mockLogs;
  const filteredLogs = selectedLevel === 'all' 
    ? displayLogs 
    : displayLogs.filter((log: LogEntry) => log.level === selectedLevel);

  const getLogBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertCircle className="w-3 h-3 mr-1" />Warning</Badge>;
      case 'info':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><CheckCircle className="w-3 h-3 mr-1" />Info</Badge>;
      case 'debug':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Debug</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + ' - ' + date.toLocaleDateString();
  };

  const errorCount = filteredLogs.filter((log: LogEntry) => log.level === 'error').length;
  const warningCount = filteredLogs.filter((log: LogEntry) => log.level === 'warning').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">System Logs & Monitoring</h2>
            <p className="text-slate-600 mt-1">Real-time backend logs, API errors, and booking attempts</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh
            </Button>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Now
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {/* Log Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Logs</p>
                  <p className="text-2xl font-bold">{displayLogs.length}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Warnings</p>
                  <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">System Health</p>
                  <p className="text-lg font-bold text-green-600">Operational</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Log Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              Log Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {['all', 'error', 'warning', 'info', 'debug'].map((level) => (
                <Button
                  key={level}
                  variant={selectedLevel === level ? "default" : "outline"}
                  onClick={() => setSelectedLevel(level)}
                  size="sm"
                  className="capitalize"
                >
                  {level}
                  {level !== 'all' && (
                    <span className="ml-2 text-xs">
                      ({displayLogs.filter((log: LogEntry) => log.level === level).length})
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Log Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Live Log Stream</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : filteredLogs.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredLogs.map((log: LogEntry) => (
                  <div key={log.id} className="border rounded-lg p-4 bg-slate-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {getLogBadge(log.level)}
                        <span className="font-medium text-slate-900">{log.source}</span>
                      </div>
                      <span className="text-xs text-slate-500">{formatTimestamp(log.timestamp)}</span>
                    </div>
                    <p className="text-slate-700 mb-2">{log.message}</p>
                    {log.details && (
                      <div className="bg-slate-100 p-2 rounded text-xs">
                        <strong>Details:</strong> {JSON.stringify(log.details, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No logs found for the selected filter.</p>
                <p className="text-sm">Logs will appear here as system events occur.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Implementation Note */}
        <Card className="mt-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-1" />
              <div>
                <h3 className="font-medium text-yellow-800">Implementation Status</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  This logs interface is displaying mock data for demonstration. The backend logging API endpoint 
                  (<code>/api/logs</code>) needs to be implemented to stream real system logs, API errors, 
                  and booking attempts as required by the FIX-IT-ALL PROMPT.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}