export interface APITestIssue {
  endpoint: string;
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  businessImpact: string;
  currentStatus: string;
  recommendedFix: string;
}

export function analyzeCurrentAPITestingIssues(): {
  issues: APITestIssue[];
  overallHealth: 'healthy' | 'warning' | 'critical';
  businessImpactSummary: string;
} {
  
  const issues: APITestIssue[] = [
    {
      endpoint: "GetGroups",
      issue: "Returns 404 HTML error page instead of JSON",
      severity: "high",
      businessImpact: "Service categorization broken - customers can't browse services properly",
      currentStatus: "False positive: Reported as 'success' with '0 groups found'",
      recommendedFix: "Proper HTTP status code validation and HTML response detection"
    },
    {
      endpoint: "GetPaymentTypes", 
      issue: "Returns 0 payment types when should return at least 3 (Cash, KNet, Apple Pay)",
      severity: "critical",
      businessImpact: "Payment processing broken - customers cannot complete bookings",
      currentStatus: "False positive: Reported as 'success' with '0 payment types found'",
      recommendedFix: "Validate minimum expected data and flag empty critical datasets as failures"
    },
    {
      endpoint: "SaveOrder",
      issue: "No actual order creation testing in current test suite",
      severity: "critical", 
      businessImpact: "Core booking functionality untested - orders may fail silently",
      currentStatus: "Not tested in main test suite",
      recommendedFix: "Add end-to-end order creation with real data validation"
    },
    {
      endpoint: "GetAvailableSlots",
      issue: "No validation that returned slots are actually bookable",
      severity: "medium",
      businessImpact: "Customers may select unavailable time slots causing booking failures",
      currentStatus: "Reports 19 slots found but doesn't validate slot validity",
      recommendedFix: "Cross-reference slots with business hours and staff availability"
    },
    {
      endpoint: "All Endpoints",
      issue: "No response time monitoring affecting user experience",
      severity: "medium", 
      businessImpact: "Slow API responses create poor customer experience in WhatsApp chats",
      currentStatus: "Response times not tracked or alerted on",
      recommendedFix: "Add performance monitoring with SLA alerts"
    },
    {
      endpoint: "Error Handling",
      issue: "Catch-all error handling masks real failures",
      severity: "high",
      businessImpact: "Critical system failures reported as successes, hiding business risks", 
      currentStatus: "try/catch blocks report everything as success with error messages",
      recommendedFix: "Implement proper error classification and failure escalation"
    }
  ];

  // Calculate overall health
  const criticalIssues = issues.filter(i => i.severity === 'critical').length;
  const highIssues = issues.filter(i => i.severity === 'high').length;
  
  let overallHealth: 'healthy' | 'warning' | 'critical';
  if (criticalIssues > 0) {
    overallHealth = 'critical';
  } else if (highIssues > 0) {
    overallHealth = 'warning';
  } else {
    overallHealth = 'healthy';
  }

  const businessImpactSummary = `
CRITICAL BUSINESS RISKS IDENTIFIED:
• Payment processing potentially broken (0 payment types detected)
• Service categorization failing (404 errors on groups)
• Order creation workflow not properly tested
• False confidence from misleading test results (9/9 success rate is incorrect)

RECOMMENDED ACTIONS:
1. Fix GetPaymentTypes API connectivity
2. Implement proper error detection for HTML responses  
3. Add end-to-end booking flow validation
4. Replace false positive reporting with accurate failure detection
5. Add performance monitoring for customer experience
`;

  return {
    issues,
    overallHealth,
    businessImpactSummary
  };
}