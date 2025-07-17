import { NailItAPIService, NailItSaveOrderRequest } from './nailit-api.js';

export class LiveOrderTester {
  private nailItAPI: NailItAPIService;

  constructor() {
    this.nailItAPI = new NailItAPIService();
  }

  /**
   * Format date for SaveOrder API (MM/dd/yyyy format required)
   */
  private formatDateForSaveOrder(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Create a comprehensive live order with all required parameters
   */
  async createLiveOrder(): Promise<any> {
    const testDate = new Date(); // Use today's date for better staff availability

    console.log('\n🔥 LIVE ORDER CREATION TEST - ALL PARAMETERS');
    console.log('=============================================');

    try {
      // Step 1: Get locations to use a real location ID
      console.log('\n📍 Step 1: Getting available locations...');
      const locations = await this.nailItAPI.getLocations();
      if (!locations || locations.length === 0) {
        throw new Error('No locations available');
      }
      
      const selectedLocation = locations[0]; // Use Al-Plaza Mall
      console.log(`✅ Selected Location: ${selectedLocation.Location_Name} (ID: ${selectedLocation.Location_Id})`);

      // Step 2: Get staff availability for multiple services until we find one with available staff
      console.log('\n👥 Step 2: Getting available staff...');
      const popularServices = [279, 203, 245, 189, 156]; // Try multiple popular services
      const formattedDate = testDate.toLocaleDateString('en-GB').replace(/\//g, '-');
      console.log(`🗓️ Using date: ${formattedDate} (today)`);
      
      let serviceId: number;
      let staffResponse: any = null;
      
      for (const testServiceId of popularServices) {
        console.log(`🔍 Checking staff availability for service ${testServiceId}...`);
        const testStaffResponse = await this.nailItAPI.getServiceStaff(testServiceId, selectedLocation.Location_Id, 'E', formattedDate);
        
        if (testStaffResponse && testStaffResponse.length > 0) {
          serviceId = testServiceId;
          staffResponse = testStaffResponse;
          console.log(`✅ Found available staff for service ${testServiceId}`);
          break;
        }
      }
      
      if (!staffResponse || staffResponse.length === 0) {
        throw new Error('No staff available for any of the popular services');
      }
      
      const selectedStaff = staffResponse[0];
      console.log(`✅ Selected Staff: ${selectedStaff.Name} (ID: ${selectedStaff.Id})`);

      // Step 3: Get available time slots for the staff
      console.log('\n⏰ Step 3: Getting available time slots...');
      const timeSlots = await this.nailItAPI.getAvailableSlots('E', selectedStaff.Id, formattedDate);
      
      if (!timeSlots || timeSlots.length === 0) {
        throw new Error('No time slots available');
      }
      
      const selectedTimeSlots = timeSlots.slice(0, 2); // Take first 2 slots
      console.log(`✅ Selected Time Slots: ${selectedTimeSlots.map(slot => `${slot.TimeFrame_Name} (ID: ${slot.TimeFrame_Id})`).join(', ')}`);

      // Step 4: Get service details
      console.log('\n🛍️ Step 4: Getting service details...');
      const serviceNameMap: { [key: number]: { name: string; price: number } } = {
        279: { name: 'French Manicure', price: 15.0 },
        203: { name: 'Dry Manicure Without Polish', price: 5.0 },
        245: { name: 'Nail Art Service', price: 8.0 },
        189: { name: 'Basic Manicure', price: 7.0 },
        156: { name: 'Gel Polish', price: 6.0 }
      };
      
      const serviceDetails = {
        id: serviceId!,
        name: serviceNameMap[serviceId!]?.name || `Service ${serviceId}`,
        price: serviceNameMap[serviceId!]?.price || 10.0
      };
      console.log(`✅ Service: ${serviceDetails.name} - ${serviceDetails.price} KWD`);

      // Step 5: Register test customer
      console.log('\n👤 Step 5: Registering test customer...');
      const testCustomer = {
        Address: "Test Address, Kuwait City",
        Email_Id: "test.customer@example.com",
        Name: "Test Customer",
        Mobile: "+96551234567",
        Login_Type: 1,
        Image_Name: ""
      };
      
      const customerResponse = await this.nailItAPI.registerUser(testCustomer);
      if (!customerResponse) {
        throw new Error('Failed to register customer');
      }
      
      console.log(`✅ Customer Registered: ${testCustomer.Name} (ID: ${customerResponse.App_User_Id})`);

      // Step 6: Prepare complete order parameters
      console.log('\n📋 Step 6: Preparing complete order parameters...');
      
      const orderData: NailItSaveOrderRequest = {
        // Main order parameters
        Gross_Amount: serviceDetails.price,
        Payment_Type_Id: 1, // Cash on Arrival
        Order_Type: 2, // Service appointment
        UserId: customerResponse.App_User_Id,
        FirstName: testCustomer.Name,
        Mobile: testCustomer.Mobile,
        Email: testCustomer.Email_Id,
        Discount_Amount: 0.0,
        Net_Amount: serviceDetails.price,
        POS_Location_Id: selectedLocation.Location_Id,
        
        // Order details array
        OrderDetails: [
          {
            Prod_Id: serviceDetails.id,
            Prod_Name: serviceDetails.name,
            Qty: 1,
            Rate: serviceDetails.price,
            Amount: serviceDetails.price,
            Size_Id: null,
            Size_Name: "",
            Promotion_Id: 0,
            Promo_Code: "",
            Discount_Amount: 0.0,
            Net_Amount: serviceDetails.price,
            Staff_Id: selectedStaff.Id,
            TimeFrame_Ids: selectedTimeSlots.map(slot => slot.TimeFrame_Id),
            Appointment_Date: this.formatDateForSaveOrder(testDate) // MM/dd/yyyy format
          }
        ]
      };

      console.log('\n📤 COMPLETE ORDER PARAMETERS BEING SENT:');
      console.log('==========================================');
      console.log(JSON.stringify(orderData, null, 2));

      // Step 7: Send order to NailIt POS system
      console.log('\n🚀 Step 7: Sending order to NailIt POS system...');
      const orderResponse = await this.nailItAPI.saveOrder(orderData);
      
      if (!orderResponse) {
        throw new Error('Order creation failed');
      }

      console.log('\n✅ ORDER SUCCESSFULLY CREATED!');
      console.log('==============================');
      console.log(`Order ID: ${orderResponse.OrderId}`);
      console.log(`Customer ID: ${orderResponse.CustomerId}`);
      console.log(`Status: ${orderResponse.Status}`);
      console.log(`Message: ${orderResponse.Message}`);

      // Step 8: Get order payment details for verification
      console.log('\n🔍 Step 8: Verifying order in NailIt system...');
      const orderDetails = await this.nailItAPI.getOrderPaymentDetail(orderResponse.OrderId);
      
      if (orderDetails) {
        console.log('\n📊 ORDER VERIFICATION SUCCESSFUL:');
        console.log('=================================');
        console.log(`Order Date: ${orderDetails.Date}`);
        console.log(`Location: ${orderDetails.Location_Name}`);
        console.log(`Customer: ${orderDetails.Customer_Name}`);
        console.log(`Order Status: ${orderDetails.OrderStatus}`);
        console.log(`Total Amount: ${orderDetails.PayAmount} KWD`);
        console.log(`Services: ${orderDetails.Services.length} service(s)`);
        
        orderDetails.Services.forEach((service, index) => {
          console.log(`  ${index + 1}. ${service.Service_Name} - ${service.Price} KWD`);
          console.log(`     Staff: ${service.Staff_Name}`);
          console.log(`     Date: ${service.Service_Date}`);
          console.log(`     Time: ${service.Service_Time_Slots}`);
        });
      }

      return {
        success: true,
        orderData,
        orderResponse,
        orderDetails,
        summary: {
          orderId: orderResponse.OrderId,
          customerId: orderResponse.CustomerId,
          location: selectedLocation.Location_Name,
          staff: selectedStaff.Name,
          service: serviceDetails.name,
          price: serviceDetails.price,
          date: this.formatDateForSaveOrder(testDate),
          timeSlots: selectedTimeSlots.map(slot => slot.TimeFrame_Name)
        }
      };

    } catch (error: any) {
      console.error('\n❌ LIVE ORDER TEST FAILED:', error.message);
      console.error('Error details:', error);
      
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
  }
}