import { nailItAPI } from './nailit-api';

export interface ImprovedTestResult {
  endpoint: string;
  success: boolean;
  responseTime: number;
  dataQuality: 'excellent' | 'good' | 'poor' | 'failed';
  businessImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  errorDetails?: string;
  dataValidation: {
    expectedMinimum: number;
    actualCount: number;
    meetsRequirements: boolean;
  };
  recommendations: string[];
}

export class ImprovedAPITesting {
  
  async runComprehensiveTests(): Promise<{
    results: ImprovedTestResult[];
    overallStatus: 'healthy' | 'degraded' | 'critical';
    businessReadiness: number; // Percentage
    actionItems: string[];
  }> {
    const results: ImprovedTestResult[] = [];
    
    // Test 1: Payment Types (CRITICAL for business)
    const paymentTest = await this.testPaymentTypesWithValidation();
    results.push(paymentTest);
    
    // Test 2: Locations (CRITICAL for business)
    const locationsTest = await this.testLocationsWithValidation();
    results.push(locationsTest);
    
    // Test 3: Service Catalog (CRITICAL for business) 
    const servicesTest = await this.testServiceCatalogWithValidation();
    results.push(servicesTest);
    
    // Test 4: Groups (IMPORTANT for categorization)
    const groupsTest = await this.testGroupsWithProperErrorDetection();
    results.push(groupsTest);
    
    // Test 5: End-to-End Order Creation (CRITICAL)
    const orderTest = await this.testOrderCreationFlow();
    results.push(orderTest);
    
    // Test 6: Staff Availability (IMPORTANT for booking)
    const staffTest = await this.testStaffAvailabilityWithValidation();
    results.push(staffTest);
    
    // Calculate overall status
    const criticalFailures = results.filter(r => 
      !r.success && r.businessImpact === 'critical'
    ).length;
    
    const highImpactFailures = results.filter(r => 
      !r.success && r.businessImpact === 'high'
    ).length;
    
    let overallStatus: 'healthy' | 'degraded' | 'critical';
    if (criticalFailures > 0) {
      overallStatus = 'critical';
    } else if (highImpactFailures > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }
    
    // Calculate business readiness percentage
    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const businessReadiness = Math.round((passedTests / totalTests) * 100);
    
    // Generate action items
    const actionItems = this.generateActionItems(results);
    
    return {
      results,
      overallStatus,
      businessReadiness,
      actionItems
    };
  }
  
  private async testPaymentTypesWithValidation(): Promise<ImprovedTestResult> {
    const startTime = Date.now();
    
    try {
      const paymentTypes = await nailItAPI.getPaymentTypes('E');
      const responseTime = Date.now() - startTime;
      
      // Validate payment types
      const expectedMinimum = 3; // Cash, KNet, Apple Pay
      const actualCount = paymentTypes ? paymentTypes.length : 0;
      const meetsRequirements = actualCount >= expectedMinimum;
      
      // Check for required payment types
      const hasKNet = paymentTypes?.some(p => 
        p.Type_Name?.toLowerCase().includes('knet') || p.Type_Id === 2
      );
      const hasCash = paymentTypes?.some(p => 
        p.Type_Name?.toLowerCase().includes('cash') || p.Type_Id === 1
      );
      
      let dataQuality: 'excellent' | 'good' | 'poor' | 'failed';
      let recommendations: string[] = [];
      
      if (actualCount === 0) {
        dataQuality = 'failed';
        recommendations.push('URGENT: Payment types API returning empty results');
        recommendations.push('Verify NailIt API connectivity and authentication');
        recommendations.push('Test payment processing manually');
      } else if (!hasKNet || !hasCash) {
        dataQuality = 'poor';
        recommendations.push('Missing critical payment types (KNet or Cash)');
        recommendations.push('Verify payment gateway configuration');
      } else if (actualCount < expectedMinimum) {
        dataQuality = 'good';
        recommendations.push('Consider adding more payment options for better UX');
      } else {
        dataQuality = 'excellent';
      }
      
      return {
        endpoint: 'GetPaymentTypes',
        success: meetsRequirements,
        responseTime,
        dataQuality,
        businessImpact: 'critical',
        dataValidation: {
          expectedMinimum,
          actualCount,
          meetsRequirements
        },
        recommendations,
        ...(actualCount === 0 && {
          errorDetails: 'Payment types API returned empty array - booking payments will fail'
        })
      };
      
    } catch (error) {
      return {
        endpoint: 'GetPaymentTypes',
        success: false,
        responseTime: Date.now() - startTime,
        dataQuality: 'failed',
        businessImpact: 'critical',
        errorDetails: error.message,
        dataValidation: {
          expectedMinimum: 3,
          actualCount: 0,
          meetsRequirements: false
        },
        recommendations: [
          'CRITICAL: Payment types API completely failed',
          'Check NailIt server status and API authentication',
          'Implement fallback payment options'
        ]
      };
    }
  }
  
  private async testGroupsWithProperErrorDetection(): Promise<ImprovedTestResult> {
    const startTime = Date.now();
    
    try {
      const groups = await nailItAPI.getGroups(2);
      const responseTime = Date.now() - startTime;
      
      // Check if we got HTML instead of JSON (common 404 error)
      const isHTMLResponse = groups && typeof groups === 'string' && 
        groups.includes('<!DOCTYPE html>');
      
      if (isHTMLResponse) {
        return {
          endpoint: 'GetGroups',
          success: false,
          responseTime,
          dataQuality: 'failed',
          businessImpact: 'high',
          errorDetails: 'API returning HTML error page instead of JSON data',
          dataValidation: {
            expectedMinimum: 1,
            actualCount: 0,
            meetsRequirements: false
          },
          recommendations: [
            'FIX: GetGroups endpoint returning 404 HTML page',
            'Verify correct API endpoint URL structure',
            'Check if service grouping is configured in NailIt system'
          ]
        };
      }
      
      const actualCount = Array.isArray(groups) ? groups.length : 0;
      const expectedMinimum = 1;
      const meetsRequirements = actualCount >= expectedMinimum;
      
      return {
        endpoint: 'GetGroups',
        success: meetsRequirements,
        responseTime,
        dataQuality: actualCount > 0 ? 'good' : 'poor',
        businessImpact: 'high',
        dataValidation: {
          expectedMinimum,
          actualCount,
          meetsRequirements
        },
        recommendations: actualCount === 0 ? [
          'Service groups not configured in NailIt system',
          'Manual service browsing will be required'
        ] : []
      };
      
    } catch (error) {
      return {
        endpoint: 'GetGroups',
        success: false,
        responseTime: Date.now() - startTime,
        dataQuality: 'failed',
        businessImpact: 'high',
        errorDetails: error.message,
        dataValidation: {
          expectedMinimum: 1,
          actualCount: 0,
          meetsRequirements: false
        },
        recommendations: [
          'Service categorization completely broken',
          'Implement alternative service discovery method'
        ]
      };
    }
  }
  
  private async testOrderCreationFlow(): Promise<ImprovedTestResult> {
    const startTime = Date.now();
    
    try {
      // Test with realistic order data
      const testCustomer = await nailItAPI.registerUser({
        Address: 'Kuwait City',
        Email_Id: 'test.booking@example.com',
        Name: 'Test Booking Customer',
        Mobile: '+96599887766',
        Login_Type: 1
      });
      
      if (!testCustomer || testCustomer.Status !== 0) {
        throw new Error('Customer registration failed');
      }
      
      // Try to create a simple test order
      const orderData = {
        Gross_Amount: 15.0,
        Payment_Type_Id: 1, // Cash
        Order_Type: 2,
        UserId: testCustomer.App_User_Id,
        FirstName: 'Test Booking Customer',
        Mobile: '+96599887766',
        Email: 'test.booking@example.com',
        Discount_Amount: 0,
        Net_Amount: 15.0,
        POS_Location_Id: 1,
        OrderDetails: [{
          Prod_Id: 203, // Known working service
          Prod_Name: 'Test Service',
          Qty: 1,
          Rate: 15.0,
          Amount: 15.0,
          Size_Id: null,
          Size_Name: '',
          Promotion_Id: 0,
          Promo_Code: '',
          Discount_Amount: 0,
          Net_Amount: 15.0,
          Staff_Id: 48,
          TimeFrame_Ids: [1, 2],
          Appointment_Date: nailItAPI.formatDateForAPI(new Date(Date.now() + 86400000))
        }]
      };
      
      const orderResult = await nailItAPI.saveOrder(orderData);
      const responseTime = Date.now() - startTime;
      
      const success = orderResult && orderResult.Status === 0 && orderResult.OrderId > 0;
      
      return {
        endpoint: 'SaveOrder (End-to-End)',
        success,
        responseTime,
        dataQuality: success ? 'excellent' : 'failed',
        businessImpact: 'critical',
        dataValidation: {
          expectedMinimum: 1,
          actualCount: success ? 1 : 0,
          meetsRequirements: success
        },
        recommendations: success ? [
          'Order creation working correctly',
          'Monitor order success rates in production'
        ] : [
          'CRITICAL: Order creation failing - bookings broken',
          'Check service availability and staff assignments',
          'Verify appointment date formatting'
        ],
        ...(orderResult && {
          errorDetails: `Order Status: ${orderResult.Status}, Message: ${orderResult.Message}`
        })
      };
      
    } catch (error) {
      return {
        endpoint: 'SaveOrder (End-to-End)',
        success: false,
        responseTime: Date.now() - startTime,
        dataQuality: 'failed',
        businessImpact: 'critical',
        errorDetails: error.message,
        dataValidation: {
          expectedMinimum: 1,
          actualCount: 0,
          meetsRequirements: false
        },
        recommendations: [
          'CRITICAL: Complete order creation failure',
          'Immediate investigation required',
          'Implement order creation monitoring and alerts'
        ]
      };
    }
  }
  
  private async testLocationsWithValidation(): Promise<ImprovedTestResult> {
    const startTime = Date.now();
    
    try {
      const locations = await nailItAPI.getLocations('E');
      const responseTime = Date.now() - startTime;
      
      const expectedMinimum = 3; // Al-Plaza, Zahra, Arraya
      const actualCount = locations ? locations.length : 0;
      const meetsRequirements = actualCount >= expectedMinimum;
      
      // Check location data quality
      const hasAddresses = locations?.every(loc => loc.Address && loc.Address.trim().length > 0);
      const hasPhones = locations?.every(loc => loc.Phone && loc.Phone.trim().length > 0);
      const hasHours = locations?.every(loc => loc.From_Time && loc.To_Time);
      
      let dataQuality: 'excellent' | 'good' | 'poor' | 'failed';
      if (actualCount === 0) {
        dataQuality = 'failed';
      } else if (hasAddresses && hasPhones && hasHours) {
        dataQuality = 'excellent';
      } else if (actualCount >= expectedMinimum) {
        dataQuality = 'good';
      } else {
        dataQuality = 'poor';
      }
      
      return {
        endpoint: 'GetLocations',
        success: meetsRequirements,
        responseTime,
        dataQuality,
        businessImpact: 'critical',
        dataValidation: {
          expectedMinimum,
          actualCount,
          meetsRequirements
        },
        recommendations: [
          ...(actualCount < expectedMinimum ? ['Missing expected locations'] : []),
          ...(!hasAddresses ? ['Some locations missing addresses'] : []),
          ...(!hasPhones ? ['Some locations missing phone numbers'] : []),
          ...(!hasHours ? ['Some locations missing business hours'] : [])
        ]
      };
      
    } catch (error) {
      return {
        endpoint: 'GetLocations',
        success: false,
        responseTime: Date.now() - startTime,
        dataQuality: 'failed',
        businessImpact: 'critical',
        errorDetails: error.message,
        dataValidation: {
          expectedMinimum: 3,
          actualCount: 0,
          meetsRequirements: false
        },
        recommendations: [
          'CRITICAL: Cannot retrieve salon locations',
          'Location-based booking will fail completely'
        ]
      };
    }
  }
  
  private async testServiceCatalogWithValidation(): Promise<ImprovedTestResult> {
    const startTime = Date.now();
    
    try {
      const services = await nailItAPI.getItemsByDate({
        Lang: 'E',
        Like: '',
        Page_No: 1,
        Item_Type_Id: 2,
        Group_Id: 0,
        Location_Ids: [1, 52, 53],
        Is_Home_Service: false,
        Selected_Date: nailItAPI.formatDateForAPI(new Date())
      });
      
      const responseTime = Date.now() - startTime;
      
      const expectedMinimum = 50; // Should have significant service catalog
      const actualCount = services?.totalItems || 0;
      const meetsRequirements = actualCount >= expectedMinimum;
      
      // Check service data quality
      const hasValidPrices = services?.items?.every(service => 
        (service.Primary_Price && service.Primary_Price > 0) || 
        (service.Special_Price && service.Special_Price > 0)
      );
      
      let dataQuality: 'excellent' | 'good' | 'poor' | 'failed';
      if (actualCount === 0) {
        dataQuality = 'failed';
      } else if (actualCount >= 200 && hasValidPrices) {
        dataQuality = 'excellent';
      } else if (actualCount >= expectedMinimum) {
        dataQuality = 'good';
      } else {
        dataQuality = 'poor';
      }
      
      return {
        endpoint: 'GetItemsByDate',
        success: meetsRequirements,
        responseTime,
        dataQuality,
        businessImpact: 'critical',
        dataValidation: {
          expectedMinimum,
          actualCount,
          meetsRequirements
        },
        recommendations: [
          ...(actualCount < expectedMinimum ? ['Service catalog appears limited'] : []),
          ...(!hasValidPrices ? ['Some services missing valid pricing'] : []),
          ...(actualCount > 300 ? ['Excellent service variety available'] : [])
        ]
      };
      
    } catch (error) {
      return {
        endpoint: 'GetItemsByDate',
        success: false,
        responseTime: Date.now() - startTime,
        dataQuality: 'failed',
        businessImpact: 'critical',
        errorDetails: error.message,
        dataValidation: {
          expectedMinimum: 50,
          actualCount: 0,
          meetsRequirements: false
        },
        recommendations: [
          'CRITICAL: Service catalog unavailable',
          'Customers cannot browse or book services'
        ]
      };
    }
  }
  
  private async testStaffAvailabilityWithValidation(): Promise<ImprovedTestResult> {
    const startTime = Date.now();
    
    try {
      const staff = await nailItAPI.getServiceStaff(203, 1, 'E', nailItAPI.formatDateForAPI(new Date()));
      const responseTime = Date.now() - startTime;
      
      const expectedMinimum = 1;
      const actualCount = staff ? staff.length : 0;
      const meetsRequirements = actualCount >= expectedMinimum;
      
      return {
        endpoint: 'GetServiceStaff',
        success: meetsRequirements,
        responseTime,
        dataQuality: actualCount > 0 ? 'good' : 'poor',
        businessImpact: 'high',
        dataValidation: {
          expectedMinimum,
          actualCount,
          meetsRequirements
        },
        recommendations: actualCount === 0 ? [
          'No staff available for service - check staff scheduling',
          'Verify service-staff assignments in NailIt system'
        ] : [
          'Staff availability working correctly'
        ]
      };
      
    } catch (error) {
      return {
        endpoint: 'GetServiceStaff',
        success: false,
        responseTime: Date.now() - startTime,
        dataQuality: 'failed',
        businessImpact: 'high',
        errorDetails: error.message,
        dataValidation: {
          expectedMinimum: 1,
          actualCount: 0,
          meetsRequirements: false
        },
        recommendations: [
          'Staff assignment system broken',
          'Manual staff assignment may be required'
        ]
      };
    }
  }
  
  private generateActionItems(results: ImprovedTestResult[]): string[] {
    const actionItems: string[] = [];
    
    // Critical failures first
    const criticalFailures = results.filter(r => 
      !r.success && r.businessImpact === 'critical'
    );
    
    if (criticalFailures.length > 0) {
      actionItems.push('IMMEDIATE ACTION REQUIRED:');
      criticalFailures.forEach(failure => {
        actionItems.push(`• Fix ${failure.endpoint}: ${failure.errorDetails || 'Critical system failure'}`);
      });
    }
    
    // Performance issues
    const slowEndpoints = results.filter(r => r.responseTime > 3000);
    if (slowEndpoints.length > 0) {
      actionItems.push('PERFORMANCE OPTIMIZATION:');
      slowEndpoints.forEach(slow => {
        actionItems.push(`• Optimize ${slow.endpoint}: ${slow.responseTime}ms response time`);
      });
    }
    
    // Data quality issues
    const dataQualityIssues = results.filter(r => 
      r.dataQuality === 'poor' && r.success
    );
    if (dataQualityIssues.length > 0) {
      actionItems.push('DATA QUALITY IMPROVEMENTS:');
      dataQualityIssues.forEach(issue => {
        actionItems.push(`• Improve ${issue.endpoint}: ${issue.recommendations[0] || 'Data quality needs attention'}`);
      });
    }
    
    return actionItems;
  }
}

export const improvedAPITesting = new ImprovedAPITesting();