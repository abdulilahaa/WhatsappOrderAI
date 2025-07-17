// Debug NailIt system to find available services and create working order
import axios from 'axios';

class NailItDebugger {
  constructor() {
    this.baseURL = 'http://localhost:5000/api/nailit';
    this.saveOrderURL = 'http://nailit.innovasolution.net/SaveOrder';
    this.headers = {
      'Content-Type': 'application/json',
      'X-NailItMobile-SecurityToken': 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh'
    };
    this.userId = 128; // Use working example user ID
  }

  formatDate(date) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatDateForAPI(date) {
    return date.toLocaleDateString('en-GB').replace(/\//g, '-');
  }

  async getAvailableServices() {
    console.log('🔍 Getting available services...');
    try {
      const response = await axios.get(`${this.baseURL}/get-items-by-date/E/18-07-2025`);
      console.log(`Found ${response.data.length} services available for July 18th, 2025`);
      return response.data.slice(0, 10); // First 10 services
    } catch (error) {
      console.log(`Error getting services: ${error.message}`);
      return [];
    }
  }

  async getStaffForService(serviceId, locationId = 1) {
    console.log(`🔍 Getting staff for service ${serviceId} at location ${locationId}...`);
    try {
      const response = await axios.get(`${this.baseURL}/get-service-staff/${serviceId}/${locationId}/E/18-07-2025`);
      console.log(`Found ${response.data.length} staff members for service ${serviceId}`);
      return response.data;
    } catch (error) {
      console.log(`Error getting staff for service ${serviceId}: ${error.message}`);
      return [];
    }
  }

  async getAvailableTimeSlots(language = 'E', staffId = 48) {
    console.log(`🔍 Getting available time slots for staff ${staffId}...`);
    try {
      const response = await axios.get(`${this.baseURL}/get-available-slots/${language}/${staffId}/18-07-2025`);
      console.log(`Found ${response.data.length} time slots for staff ${staffId}`);
      return response.data;
    } catch (error) {
      console.log(`Error getting time slots for staff ${staffId}: ${error.message}`);
      return [];
    }
  }

  async createOrderWithAvailableResources() {
    console.log('🎯 CREATING ORDER WITH AVAILABLE RESOURCES');
    console.log('==========================================');

    // Step 1: Get available services
    const services = await this.getAvailableServices();
    if (services.length === 0) {
      console.log('❌ No services available');
      return { success: false, reason: 'No services available' };
    }

    // Step 2: Try each service until we find one with available staff
    for (const service of services.slice(0, 5)) {
      console.log(`\n🔄 Trying service: ${service.Item_Name} (ID: ${service.Item_Id})`);
      
      const staff = await this.getStaffForService(service.Item_Id, 1);
      if (staff.length === 0) {
        console.log(`   No staff available for service ${service.Item_Id}`);
        continue;
      }

      // Step 3: Try each staff member
      for (const staffMember of staff.slice(0, 3)) {
        const staffId = staffMember.Staff_Id || staffMember.id;
        console.log(`   🔄 Trying staff: ${staffMember.Staff_Name || staffMember.name} (ID: ${staffId})`);
        
        const timeSlots = await this.getAvailableTimeSlots('E', staffId);
        if (timeSlots.length === 0) {
          console.log(`      No time slots available for staff ${staffId}`);
          continue;
        }

        // Step 4: Create order with available resources
        const timeSlotIds = timeSlots.slice(0, 2).map(slot => slot.TimeFrame_Id || slot.id || 1);
        
        console.log(`      ✅ Creating order with time slots: [${timeSlotIds.join(', ')}]`);
        
        const orderData = {
          "Gross_Amount": parseFloat(service.Item_Price || 15.0),
          "Payment_Type_Id": 1,
          "Order_Type": 2,
          "UserId": this.userId,
          "FirstName": "Available Resource Test",
          "Mobile": "+96588888889",
          "Email": "available@test.com",
          "Discount_Amount": 0.0,
          "Net_Amount": parseFloat(service.Item_Price || 15.0),
          "POS_Location_Id": 1,
          "OrderDetails": [
            {
              "Prod_Id": service.Item_Id,
              "Prod_Name": service.Item_Name,
              "Qty": 1,
              "Rate": parseFloat(service.Item_Price || 15.0),
              "Amount": parseFloat(service.Item_Price || 15.0),
              "Size_Id": null,
              "Size_Name": "",
              "Promotion_Id": 0,
              "Promo_Code": "",
              "Discount_Amount": 0.0,
              "Net_Amount": parseFloat(service.Item_Price || 15.0),
              "Staff_Id": staffId,
              "TimeFrame_Ids": timeSlotIds,
              "Appointment_Date": "07/18/2025"
            }
          ]
        };

        try {
          const response = await axios.post(this.saveOrderURL, orderData, { headers: this.headers });
          
          console.log(`      Response: Status ${response.data.Status}, Message: ${response.data.Message}`);
          
          if (response.data.Status === 0) {
            console.log(`\n🎉 SUCCESS! Order created with available resources!`);
            console.log(`📋 Order ID: ${response.data.OrderId}`);
            console.log(`👤 Customer ID: ${response.data.CustomerId}`);
            console.log(`🔧 Service: ${service.Item_Name}`);
            console.log(`👨‍💼 Staff: ${staffMember.Staff_Name || staffMember.name}`);
            console.log(`⏰ Time Slots: [${timeSlotIds.join(', ')}]`);
            console.log(`💰 Amount: ${service.Item_Price || 15.0} KWD`);
            
            return {
              success: true,
              orderId: response.data.OrderId,
              customerId: response.data.CustomerId,
              service: service.Item_Name,
              staff: staffMember.Staff_Name || staffMember.name,
              timeSlots: timeSlotIds,
              amount: service.Item_Price || 15.0
            };
          } else if (response.data.Status === 102) {
            console.log(`      ⚠️ Still not available (Status: 102)`);
          } else {
            console.log(`      ❌ Failed with Status: ${response.data.Status}`);
          }
        } catch (error) {
          console.log(`      💥 Error creating order: ${error.message}`);
        }
      }
    }

    console.log('\n❌ Could not create order with any available resources');
    return { success: false, reason: 'All combinations failed' };
  }

  async tryMultipleDates() {
    console.log('\n🗓️ TRYING MULTIPLE DATES');
    console.log('=========================');
    
    const dates = [
      { date: '07/18/2025', apiDate: '18-07-2025' },
      { date: '07/19/2025', apiDate: '19-07-2025' },
      { date: '07/20/2025', apiDate: '20-07-2025' },
      { date: '07/21/2025', apiDate: '21-07-2025' },
      { date: '07/22/2025', apiDate: '22-07-2025' }
    ];

    for (const dateInfo of dates) {
      console.log(`\n🔄 Trying date: ${dateInfo.date}`);
      
      try {
        // Get services for this date
        const services = await axios.get(`${this.baseURL}/get-items-by-date/E/${dateInfo.apiDate}`);
        
        if (services.data.length === 0) {
          console.log(`   No services available for ${dateInfo.date}`);
          continue;
        }

        // Try creating order with basic service
        const service = services.data[0]; // First available service
        
        const orderData = {
          "Gross_Amount": 15.0,
          "Payment_Type_Id": 1,
          "Order_Type": 2,
          "UserId": this.userId,
          "FirstName": "Multi Date Test",
          "Mobile": "+96588888889",
          "Email": "multidate@test.com",
          "Discount_Amount": 0.0,
          "Net_Amount": 15.0,
          "POS_Location_Id": 1,
          "OrderDetails": [
            {
              "Prod_Id": service.Item_Id,
              "Prod_Name": service.Item_Name,
              "Qty": 1,
              "Rate": 15.0,
              "Amount": 15.0,
              "Size_Id": null,
              "Size_Name": "",
              "Promotion_Id": 0,
              "Promo_Code": "",
              "Discount_Amount": 0.0,
              "Net_Amount": 15.0,
              "Staff_Id": 48,
              "TimeFrame_Ids": [1, 2],
              "Appointment_Date": dateInfo.date
            }
          ]
        };

        const response = await axios.post(this.saveOrderURL, orderData, { headers: this.headers });
        
        console.log(`   Response: Status ${response.data.Status}, Message: ${response.data.Message}`);
        
        if (response.data.Status === 0) {
          console.log(`\n🎉 SUCCESS! Order created for ${dateInfo.date}!`);
          console.log(`📋 Order ID: ${response.data.OrderId}`);
          console.log(`👤 Customer ID: ${response.data.CustomerId}`);
          return {
            success: true,
            orderId: response.data.OrderId,
            customerId: response.data.CustomerId,
            date: dateInfo.date
          };
        }
      } catch (error) {
        console.log(`   Error for ${dateInfo.date}: ${error.message}`);
      }
    }

    return { success: false };
  }

  async runFullDebug() {
    console.log('🔬 NAILIT FULL DEBUG SESSION');
    console.log('============================');
    
    // Method 1: Try with available resources
    let result = await this.createOrderWithAvailableResources();
    
    if (result.success) {
      console.log('\n✅ SUCCESS WITH AVAILABLE RESOURCES!');
      return result;
    }
    
    // Method 2: Try multiple dates
    result = await this.tryMultipleDates();
    
    if (result.success) {
      console.log('\n✅ SUCCESS WITH MULTIPLE DATES!');
      return result;
    }
    
    console.log('\n❌ ALL DEBUG METHODS FAILED');
    return { success: false };
  }
}

// Execute the debug session
const nailItDebugger = new NailItDebugger();
nailItDebugger.runFullDebug().then(result => {
  if (result.success) {
    console.log('\n🎯 FINAL SUCCESS SUMMARY:');
    console.log('========================');
    console.log(`Order ID: ${result.orderId}`);
    console.log(`Customer ID: ${result.customerId}`);
    if (result.service) console.log(`Service: ${result.service}`);
    if (result.staff) console.log(`Staff: ${result.staff}`);
    if (result.timeSlots) console.log(`Time Slots: [${result.timeSlots.join(', ')}]`);
    if (result.amount) console.log(`Amount: ${result.amount} KWD`);
    if (result.date) console.log(`Date: ${result.date}`);
  } else {
    console.log('\n❌ FINAL RESULT: Could not create order');
  }
}).catch(console.error);