// Comprehensive order creation system - try multiple approaches until success
import axios from 'axios';

class LiveOrderCreator {
  constructor() {
    this.API_URL = 'http://nailit.innovasolution.net/SaveOrder';
    this.headers = {
      'Content-Type': 'application/json',
      'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh'
    };
    this.userId = 110741; // Our registered user
    this.attempts = [];
  }

  // Format date for SaveOrder API (MM/dd/yyyy)
  formatDate(date) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  // Get available staff for a service
  async getAvailableStaff(serviceId, locationId, date) {
    try {
      const dateFormatted = date.toLocaleDateString('en-GB').replace(/\//g, '-');
      const response = await axios.get(`http://localhost:5000/api/nailit/get-service-staff/${serviceId}/${locationId}/E/${dateFormatted}`);
      return response.data || [];
    } catch (error) {
      console.log(`⚠️ Could not get staff for service ${serviceId}: ${error.message}`);
      return [];
    }
  }

  // Try creating order with specific parameters
  async attemptOrder(params) {
    try {
      console.log(`\n🎯 Attempting order with: ${params.description}`);
      console.log(`📅 Date: ${params.date}, Service: ${params.serviceName}, Staff: ${params.staffId}, TimeFrames: [${params.timeFrameIds.join(', ')}]`);
      
      const orderData = {
        "Gross_Amount": params.amount,
        "Payment_Type_Id": 1,
        "Order_Type": 2,
        "UserId": this.userId,
        "FirstName": "Live Test Customer",
        "Mobile": "+96588888889",
        "Email": "livetest@example.com",
        "Discount_Amount": 0.0,
        "Net_Amount": params.amount,
        "POS_Location_Id": params.locationId,
        "OrderDetails": [
          {
            "Prod_Id": params.serviceId,
            "Prod_Name": params.serviceName,
            "Qty": 1,
            "Rate": params.amount,
            "Amount": params.amount,
            "Size_Id": null,
            "Size_Name": "",
            "Promotion_Id": 0,
            "Promo_Code": "",
            "Discount_Amount": 0.0,
            "Net_Amount": params.amount,
            "Staff_Id": params.staffId,
            "TimeFrame_Ids": params.timeFrameIds,
            "Appointment_Date": params.date
          }
        ]
      };

      const response = await axios.post(this.API_URL, orderData, { headers: this.headers });
      
      this.attempts.push({
        params: params,
        response: response.data,
        success: response.data.Status === 0
      });

      if (response.data.Status === 0) {
        console.log(`🎉 SUCCESS! Order created!`);
        console.log(`📋 Order ID: ${response.data.OrderId}`);
        console.log(`👤 Customer ID: ${response.data.CustomerId}`);
        return {
          success: true,
          orderId: response.data.OrderId,
          customerId: response.data.CustomerId,
          message: response.data.Message,
          params: params
        };
      } else {
        console.log(`❌ Failed - Status: ${response.data.Status}, Message: ${response.data.Message}`);
        return {
          success: false,
          status: response.data.Status,
          message: response.data.Message,
          params: params
        };
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        params: params
      };
    }
  }

  // Try multiple order creation strategies
  async createOrderMultipleWays() {
    console.log('🔥 COMPREHENSIVE ORDER CREATION SYSTEM');
    console.log('=====================================');
    
    // Strategy 1: Try with July 18th, 2025 (future date as requested)
    const targetDate = new Date('2025-07-18');
    const dateFormatted = this.formatDate(targetDate);
    
    const strategies = [
      // Popular services with different staff and time slots
      {
        description: "French Manicure with early morning slot",
        serviceId: 279,
        serviceName: "French Manicure",
        locationId: 1,
        staffId: 48,
        timeFrameIds: [1, 2],
        amount: 15.0,
        date: dateFormatted
      },
      {
        description: "Dry Manicure with mid-morning slot",
        serviceId: 203,
        serviceName: "Dry manicure without polish",
        locationId: 1,
        staffId: 48,
        timeFrameIds: [3, 4],
        amount: 12.0,
        date: dateFormatted
      },
      {
        description: "Gelish Polish with afternoon slot",
        serviceId: 258,
        serviceName: "Gelish hand polish",
        locationId: 1,
        staffId: 48,
        timeFrameIds: [9, 10],
        amount: 8.0,
        date: dateFormatted
      },
      {
        description: "Basic Manicure with evening slot",
        serviceId: 203,
        serviceName: "Dry manicure without polish",
        locationId: 1,
        staffId: 48,
        timeFrameIds: [15, 16],
        amount: 10.0,
        date: dateFormatted
      },
      // Try different staff IDs
      {
        description: "French Manicure with different staff",
        serviceId: 279,
        serviceName: "French Manicure",
        locationId: 1,
        staffId: 49,
        timeFrameIds: [5, 6],
        amount: 15.0,
        date: dateFormatted
      },
      {
        description: "Service with staff ID 50",
        serviceId: 203,
        serviceName: "Dry manicure without polish",
        locationId: 1,
        staffId: 50,
        timeFrameIds: [7, 8],
        amount: 12.0,
        date: dateFormatted
      },
      // Try different locations
      {
        description: "Service at location 52",
        serviceId: 279,
        serviceName: "French Manicure",
        locationId: 52,
        staffId: 48,
        timeFrameIds: [1, 2],
        amount: 15.0,
        date: dateFormatted
      },
      {
        description: "Service at location 53",
        serviceId: 203,
        serviceName: "Dry manicure without polish",
        locationId: 53,
        staffId: 48,
        timeFrameIds: [3, 4],
        amount: 12.0,
        date: dateFormatted
      }
    ];

    // Strategy 2: Try multiple future dates
    const futureDates = [
      new Date('2025-07-18'),
      new Date('2025-07-19'),
      new Date('2025-07-20'),
      new Date('2025-07-21'),
      new Date('2025-07-22')
    ];

    // Add more strategies with different dates
    futureDates.forEach((date, index) => {
      if (index > 0) { // Skip first date as it's already covered
        const dateFormatted = this.formatDate(date);
        strategies.push({
          description: `French Manicure on ${dateFormatted}`,
          serviceId: 279,
          serviceName: "French Manicure",
          locationId: 1,
          staffId: 48,
          timeFrameIds: [1, 2],
          amount: 15.0,
          date: dateFormatted
        });
      }
    });

    // Try each strategy
    for (const strategy of strategies) {
      const result = await this.attemptOrder(strategy);
      if (result.success) {
        console.log('\n🎉 SUCCESS! Order created with strategy:', strategy.description);
        return result;
      }
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // If all strategies failed, try with real-time staff availability
    console.log('\n🔄 All basic strategies failed, trying with real-time staff availability...');
    return await this.tryWithRealTimeAvailability();
  }

  // Try with real-time staff availability
  async tryWithRealTimeAvailability() {
    const targetDate = new Date('2025-07-18');
    const services = [279, 203, 258, 277, 280, 282]; // Popular service IDs
    const locations = [1, 52, 53];
    
    for (const locationId of locations) {
      for (const serviceId of services) {
        try {
          const staff = await this.getAvailableStaff(serviceId, locationId, targetDate);
          
          if (staff && staff.length > 0) {
            // Try with each available staff member
            for (const staffMember of staff.slice(0, 3)) { // Try first 3 staff members
              const timeFrameIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
              
              // Try different time slot combinations
              for (let i = 0; i < timeFrameIds.length - 1; i += 2) {
                const result = await this.attemptOrder({
                  description: `Real-time availability: Service ${serviceId}, Staff ${staffMember.Staff_Id || staffMember.id}`,
                  serviceId: serviceId,
                  serviceName: `Service ${serviceId}`,
                  locationId: locationId,
                  staffId: staffMember.Staff_Id || staffMember.id,
                  timeFrameIds: [timeFrameIds[i], timeFrameIds[i + 1]],
                  amount: 15.0,
                  date: this.formatDate(targetDate)
                });
                
                if (result.success) {
                  return result;
                }
              }
            }
          }
        } catch (error) {
          console.log(`⚠️ Could not check availability for service ${serviceId}: ${error.message}`);
        }
      }
    }

    console.log('\n❌ All strategies exhausted. No successful order created.');
    return { success: false, message: 'All strategies failed' };
  }

  // Show summary of all attempts
  showAttemptSummary() {
    console.log('\n📊 ATTEMPT SUMMARY:');
    console.log('===================');
    
    const successful = this.attempts.filter(a => a.success);
    const failed = this.attempts.filter(a => !a.success);
    
    console.log(`Total attempts: ${this.attempts.length}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);
    
    if (failed.length > 0) {
      console.log('\nFailure reasons:');
      const reasons = {};
      failed.forEach(f => {
        const reason = f.response?.Message || f.error || 'Unknown';
        reasons[reason] = (reasons[reason] || 0) + 1;
      });
      
      Object.entries(reasons).forEach(([reason, count]) => {
        console.log(`- ${reason}: ${count} times`);
      });
    }
  }
}

// Execute the comprehensive order creation
async function runLiveOrderCreation() {
  const creator = new LiveOrderCreator();
  const result = await creator.createOrderMultipleWays();
  
  creator.showAttemptSummary();
  
  if (result.success) {
    console.log('\n🎉 FINAL SUCCESS!');
    console.log('================');
    console.log(`Order ID: ${result.orderId}`);
    console.log(`Customer ID: ${result.customerId}`);
    console.log(`Strategy: ${result.params.description}`);
    console.log(`Service: ${result.params.serviceName}`);
    console.log(`Date: ${result.params.date}`);
    console.log(`Staff: ${result.params.staffId}`);
    console.log(`Amount: ${result.params.amount} KWD`);
  } else {
    console.log('\n❌ FINAL RESULT: No successful order created');
    console.log('All strategies attempted but none succeeded');
  }
  
  return result;
}

// Run the comprehensive system
runLiveOrderCreation().catch(console.error);