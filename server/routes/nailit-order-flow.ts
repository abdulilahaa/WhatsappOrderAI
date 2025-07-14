import { Express } from 'express';
import { nailItAPI } from '../nailit-api';

export function registerNailItOrderFlowRoutes(app: Express) {
  // Complete order flow test - checks availability, gets staff, gets slots, then creates order
  app.post("/api/nailit/test-complete-flow", async (req, res) => {
    try {
      console.log("🔄 Starting complete NailIt order flow test...");
      const { customerInfo, serviceId, locationId, appointmentDate } = req.body;

      // Step 1: Check service availability
      console.log("📅 Step 1: Checking service availability...");
      const itemsResponse = await nailItAPI.getItemsByDate({
        lang: 'E',
        like: '',
        pageNo: 1,
        itemTypeId: 2,
        groupId: 0,
        locationIds: [locationId],
        isHomeService: false,
        selectedDate: appointmentDate
      });

      if (!itemsResponse || itemsResponse.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No services available for the selected date and location",
          step: "GetItemsByDate"
        });
      }

      // Find the requested service
      const availableService = itemsResponse.find(item => item.Item_Id === serviceId);
      if (!availableService) {
        return res.status(400).json({
          success: false,
          message: `Service ID ${serviceId} is not available on ${appointmentDate}`,
          availableServices: itemsResponse.map(item => ({
            id: item.Item_Id,
            name: item.Item_Name,
            price: item.Special_Price
          })),
          step: "GetItemsByDate"
        });
      }

      console.log(`✅ Service "${availableService.Item_Name}" is available`);

      // Step 2: Get available staff
      console.log("👥 Step 2: Getting available staff...");
      const staff = await nailItAPI.getServiceStaff(
        serviceId,
        locationId,
        'E',
        appointmentDate
      );

      if (!staff || staff.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No staff available for this service on the selected date",
          step: "GetServiceStaff"
        });
      }

      console.log(`✅ Found ${staff.length} available staff members`);
      const selectedStaff = staff[0]; // Select first available staff

      // Step 3: Get available time slots
      console.log("🕒 Step 3: Getting available time slots...");
      const timeSlots = await nailItAPI.getAvailableSlots(
        'E',
        selectedStaff.Id,
        appointmentDate
      );

      if (!timeSlots || timeSlots.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No time slots available for the selected staff",
          step: "GetAvailableSlots"
        });
      }

      console.log(`✅ Found ${timeSlots.length} available time slots`);
      const selectedSlots = timeSlots.slice(0, 2); // Select first 2 slots

      // Step 4: Register/Get user
      console.log("👤 Step 4: Registering/Getting user...");
      const userData = {
        Address: "Kuwait City, Kuwait",
        Email_Id: customerInfo.email,
        Name: customerInfo.name,
        Mobile: customerInfo.mobile,
        Login_Type: 1,
        Image_Name: ""
      };

      const appUserId = await nailItAPI.getOrCreateUser(userData);
      if (!appUserId) {
        return res.status(400).json({
          success: false,
          message: "Failed to register/get user",
          step: "Register"
        });
      }

      console.log(`✅ User ready with App_User_Id: ${appUserId}`);

      // Step 5: Create order
      console.log("📝 Step 5: Creating order...");
      const orderData = {
        Gross_Amount: availableService.Special_Price,
        Payment_Type_Id: 1, // On Arrival
        Order_Type: 2, // Service booking
        UserId: appUserId,
        FirstName: customerInfo.name,
        Mobile: customerInfo.mobile,
        Email: customerInfo.email,
        Discount_Amount: 0,
        Net_Amount: availableService.Special_Price,
        POS_Location_Id: locationId,
        OrderDetails: [{
          Prod_Id: serviceId,
          Prod_Name: availableService.Item_Name,
          Qty: 1,
          Rate: availableService.Special_Price,
          Amount: availableService.Special_Price,
          Size_Id: null,
          Size_Name: "",
          Promotion_Id: 0,
          Promo_Code: "",
          Discount_Amount: 0,
          Net_Amount: availableService.Special_Price,
          Staff_Id: selectedStaff.Id,
          TimeFrame_Ids: selectedSlots.map(slot => slot.TimeFrame_Id),
          Appointment_Date: appointmentDate
        }]
      };

      const orderResult = await nailItAPI.saveOrder(orderData);

      if (orderResult && orderResult.Status === 0) {
        res.json({
          success: true,
          message: "Order created successfully through complete flow!",
          orderId: orderResult.OrderId,
          customerId: orderResult.CustomerId,
          flowSummary: {
            service: availableService.Item_Name,
            staff: selectedStaff.Name,
            timeSlots: selectedSlots.map(s => s.TimeFrame_Name),
            appUserId: appUserId
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: orderResult?.Message || "Failed to create order",
          nailItResponse: orderResult,
          step: "SaveOrder"
        });
      }

    } catch (error: any) {
      console.error("Complete flow error:", error);
      res.status(500).json({ 
        success: false,
        message: "Error in complete flow: " + error.message 
      });
    }
  });

  // Check service availability endpoint
  app.post("/api/nailit/check-availability", async (req, res) => {
    try {
      const { serviceId, locationId, date } = req.body;
      
      // Check if service is available
      const items = await nailItAPI.getItemsByDate({
        lang: 'E',
        like: '',
        pageNo: 1,
        itemTypeId: 2,
        groupId: 0,
        locationIds: [locationId],
        isHomeService: false,
        selectedDate: date
      });

      const service = items.find(item => item.Item_Id === serviceId);
      if (!service) {
        return res.json({ 
          available: false, 
          message: "Service not available on this date" 
        });
      }

      // Get staff
      const staff = await nailItAPI.getServiceStaff(serviceId, locationId, 'E', date);
      
      // Get time slots for first staff
      let timeSlots = [];
      if (staff.length > 0) {
        timeSlots = await nailItAPI.getAvailableSlots('E', staff[0].Id, date);
      }

      res.json({
        available: true,
        service: {
          id: service.Item_Id,
          name: service.Item_Name,
          price: service.Special_Price,
          duration: service.Duration
        },
        staff: staff.map(s => ({ id: s.Id, name: s.Name })),
        timeSlots: timeSlots.map(slot => ({ 
          id: slot.TimeFrame_Id, 
          time: slot.TimeFrame_Name 
        }))
      });

    } catch (error: any) {
      res.status(500).json({ 
        error: "Failed to check availability: " + error.message 
      });
    }
  });
}