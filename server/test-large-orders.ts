/**
 * Create Large Test Orders with Authentic NailIt API Data
 * Tests multiple services booking with real pricing and staff
 */

import { NailItAPIService } from './nailit-api';

const nailItAPI = new NailItAPIService();

export class LargeOrderTester {
  
  /**
   * Create large order for NEW customer with multiple premium services
   */
  async createNewCustomerLargeOrder(): Promise<any> {
    try {
      console.log('🆕 Creating large order for NEW customer...');
      
      // Step 1: Register new customer
      const newCustomer = await nailItAPI.registerUser({
        Name: "Zara Al-Khalifa",
        Email_Id: "zara.alkhalifa@example.com", 
        Mobile: "99887799", // Kuwait format
        Address: "Kuwait City, Kuwait",
        Login_Type: 1,
        Image_Name: ""
      });
      
      console.log('✅ New customer registered:', newCustomer);
      
      if (!newCustomer?.App_User_Id) {
        throw new Error('Failed to register new customer');
      }
      
      // Step 2: Get authentic services from NailIt API
      const servicesData = await nailItAPI.getItemsByDate({
        locationId: 1, // Al-Plaza Mall
        selectedDate: nailItAPI.formatDateForAPI(new Date()),
        lang: 'E',
        pageNo: 1,
        itemTypeId: 1
      });
      
      // Select services with valid pricing only
      let premiumServices = servicesData.items.filter(service => 
        service.Item_Price && service.Item_Price > 10 && // Ensure pricing exists
        service.Item_Name && service.Item_Name.length > 0 // Ensure name exists
      ).slice(0, 4); // Take 4 services with pricing
      
      if (premiumServices.length === 0) {
        console.log('❌ No services with pricing found');
        throw new Error('No services with valid pricing available');
      }
      
      console.log(`💎 Selected ${premiumServices.length} premium services:`, 
        premiumServices.map(s => `${s.Item_Name} - ${s.Item_Price} KWD`));
      
      // Step 3: Create large order with multiple services
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const totalAmount = premiumServices.reduce((sum, service) => sum + service.Item_Price, 0);
      
      const largeOrder = {
        Gross_Amount: totalAmount,
        Payment_Type_Id: 2, // KNet
        Order_Type: 2, // Service booking
        UserId: newCustomer.App_User_Id,
        FirstName: "Zara Al-Khalifa",
        Mobile: "99887799",
        Email: "zara.alkhalifa@example.com",
        Discount_Amount: 0.0,
        Net_Amount: totalAmount,
        POS_Location_Id: 1, // Al-Plaza Mall
        ChannelId: 4, // WhatsApp channel
        OrderDetails: await Promise.all(premiumServices.map(async (service, index) => {
          // Get actual available staff for this service at Al-Plaza Mall
          let availableStaff;
          try {
            availableStaff = await nailItAPI.getServiceStaff(
              service.Item_Id,
              1, // Al-Plaza Mall
              'E',
              nailItAPI.formatDateForAPI(tomorrow)
            );
          } catch (error) {
            console.log(`⚠️ Could not get staff for service ${service.Item_Name}, using default`);
            availableStaff = [{ Id: 1 }]; // Default fallback
          }
          
          const staffId = availableStaff && availableStaff.length > 0 ? availableStaff[0].Id : 1;
          
          return {
            Prod_Id: service.Item_Id,
            Prod_Name: service.Item_Name,
            Qty: 1,
            Rate: service.Item_Price,
            Amount: service.Item_Price,
            Size_Id: null,
            Size_Name: "",
            Promotion_Id: 0,
            Promo_Code: "",
            Discount_Amount: 0.0,
            Net_Amount: service.Item_Price,
            Staff_Id: staffId, // Use actual available staff
            TimeFrame_Ids: [9 + (index * 2), 10 + (index * 2)], // Sequential time slots
            Appointment_Date: nailItAPI.formatDateForSaveOrder(tomorrow)
          };
        }))
      };
      
      console.log(`💰 Creating large order: ${totalAmount} KWD total`);
      
      // Step 4: Submit order to NailIt POS
      const orderResult = await nailItAPI.saveOrder(largeOrder);
      
      if (orderResult?.Status === 0) {
        console.log(`🎉 NEW CUSTOMER LARGE ORDER SUCCESS!`);
        console.log(`📋 Order ID: ${orderResult.OrderId}`);
        console.log(`👤 Customer: ${newCustomer.App_User_Id}`);
        console.log(`💎 Services: ${premiumServices.length}`);
        console.log(`💰 Total: ${totalAmount} KWD`);
        console.log(`💳 Payment Link: http://nailit.innovasolution.net/knet.aspx?orderId=${orderResult.OrderId}`);
        
        return {
          success: true,
          orderType: 'NEW_CUSTOMER_LARGE_ORDER',
          orderId: orderResult.OrderId,
          customerId: newCustomer.App_User_Id,
          customerName: "Zara Al-Khalifa",
          servicesCount: premiumServices.length,
          totalAmount: totalAmount,
          paymentLink: `http://nailit.innovasolution.net/knet.aspx?orderId=${orderResult.OrderId}`,
          services: premiumServices.map(s => ({ name: s.Item_Name, price: s.Item_Price }))
        };
      } else {
        throw new Error(`Order failed: ${orderResult?.Message || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('❌ New customer large order failed:', error);
      return {
        success: false,
        orderType: 'NEW_CUSTOMER_LARGE_ORDER',
        error: (error as Error).message
      };
    }
  }
  
  /**
   * Create large order for EXISTING customer with different services
   */
  async createExistingCustomerLargeOrder(): Promise<any> {
    try {
      console.log('🔄 Creating large order for EXISTING customer...');
      
      // Use existing customer from previous orders (User ID from our successful tests)
      const existingUserId = 110745; // Known working customer ID from previous tests
      const existingCustomerInfo = {
        name: "Emma Thompson",
        mobile: "99776655",
        email: "emma.thompson@example.com"
      };
      
      console.log(`✅ Using existing customer ID: ${existingUserId}`);
      
      // Step 1: Get different services for existing customer (different location)
      const servicesData = await nailItAPI.getItemsByDate({
        locationId: 52, // Zahra Complex (different location)
        selectedDate: nailItAPI.formatDateForAPI(new Date()),
        lang: 'E',
        pageNo: 1,
        itemTypeId: 1
      });
      
      // Select services with valid pricing only
      let highValueServices = servicesData.items
        .filter(service => service.Item_Price && service.Item_Price > 10) // Ensure pricing exists
        .sort((a, b) => b.Item_Price - a.Item_Price) // Sort by price descending
        .slice(0, 5); // Take top 5 most expensive services
      
      if (highValueServices.length === 0) {
        console.log('❌ No services with pricing found at this location');
        throw new Error('No services with valid pricing available at Zahra Complex');
      }
      
      console.log(`💎 Selected ${highValueServices.length} high-value services:`, 
        highValueServices.map(s => `${s.Item_Name} - ${s.Item_Price} KWD`));
      
      // Step 2: Create large order for existing customer
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2); // Day after new customer
      
      const totalAmount = highValueServices.reduce((sum, service) => sum + service.Item_Price, 0);
      
      const existingCustomerOrder = {
        Gross_Amount: totalAmount,
        Payment_Type_Id: 2, // KNet
        Order_Type: 2, // Service booking
        UserId: existingUserId,
        FirstName: existingCustomerInfo.name,
        Mobile: existingCustomerInfo.mobile,
        Email: existingCustomerInfo.email,
        Discount_Amount: 5.0, // VIP discount for existing customer
        Net_Amount: totalAmount - 5.0,
        POS_Location_Id: 52, // Zahra Complex
        ChannelId: 4, // WhatsApp channel
        OrderDetails: await Promise.all(highValueServices.map(async (service, index) => {
          // Get actual available staff for this service at Zahra Complex
          let availableStaff;
          try {
            availableStaff = await nailItAPI.getServiceStaff(
              service.Item_Id,
              52, // Zahra Complex
              'E',
              nailItAPI.formatDateForAPI(tomorrow)
            );
          } catch (error) {
            console.log(`⚠️ Could not get staff for service ${service.Item_Name}, using default`);
            availableStaff = [{ Id: 1 }]; // Default fallback
          }
          
          const staffId = availableStaff && availableStaff.length > 0 ? availableStaff[0].Id : 1;
          
          return {
            Prod_Id: service.Item_Id,
            Prod_Name: service.Item_Name,
            Qty: 1,
            Rate: service.Item_Price,
            Amount: service.Item_Price,
            Size_Id: null,
            Size_Name: "",
            Promotion_Id: 0,
            Promo_Code: "VIP5", // VIP promo code
            Discount_Amount: index === 0 ? 5.0 : 0.0, // Apply discount to first service
            Net_Amount: index === 0 ? service.Item_Price - 5.0 : service.Item_Price,
            Staff_Id: staffId, // Use actual available staff
            TimeFrame_Ids: [11 + (index * 2), 12 + (index * 2)], // Different time slots
            Appointment_Date: nailItAPI.formatDateForSaveOrder(tomorrow)
          };
        }))
      };
      
      console.log(`💰 Creating existing customer large order: ${totalAmount - 5.0} KWD total (after VIP discount)`);
      
      // Step 3: Submit order to NailIt POS
      const orderResult = await nailItAPI.saveOrder(existingCustomerOrder);
      
      if (orderResult?.Status === 0) {
        console.log(`🎉 EXISTING CUSTOMER LARGE ORDER SUCCESS!`);
        console.log(`📋 Order ID: ${orderResult.OrderId}`);
        console.log(`👤 Customer ID: ${existingUserId}`);
        console.log(`💎 Services: ${highValueServices.length}`);
        console.log(`💰 Total: ${totalAmount - 5.0} KWD (VIP discount applied)`);
        console.log(`💳 Payment Link: http://nailit.innovasolution.net/knet.aspx?orderId=${orderResult.OrderId}`);
        
        return {
          success: true,
          orderType: 'EXISTING_CUSTOMER_LARGE_ORDER',
          orderId: orderResult.OrderId,
          customerId: existingUserId,
          customerName: existingCustomerInfo.name,
          servicesCount: highValueServices.length,
          totalAmount: totalAmount,
          discountApplied: 5.0,
          finalAmount: totalAmount - 5.0,
          paymentLink: `http://nailit.innovasolution.net/knet.aspx?orderId=${orderResult.OrderId}`,
          services: highValueServices.map(s => ({ name: s.Item_Name, price: s.Item_Price })),
          location: "Zahra Complex"
        };
      } else {
        throw new Error(`Order failed: ${orderResult?.Message || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('❌ Existing customer large order failed:', error);
      return {
        success: false,
        orderType: 'EXISTING_CUSTOMER_LARGE_ORDER', 
        error: (error as Error).message
      };
    }
  }
  
  /**
   * Run both large order tests
   */
  async runLargeOrderTests(): Promise<any> {
    console.log('🚀 Starting Large Order Tests with Authentic NailIt Data...\n');
    
    const results = {
      newCustomerOrder: await this.createNewCustomerLargeOrder(),
      existingCustomerOrder: await this.createExistingCustomerLargeOrder()
    };
    
    console.log('\n📊 LARGE ORDER TEST RESULTS:');
    console.log('================================');
    
    if (results.newCustomerOrder.success) {
      console.log(`✅ NEW Customer: Order ${results.newCustomerOrder.orderId} - ${results.newCustomerOrder.totalAmount} KWD`);
    } else {
      console.log(`❌ NEW Customer: Failed - ${results.newCustomerOrder.error}`);
    }
    
    if (results.existingCustomerOrder.success) {
      console.log(`✅ EXISTING Customer: Order ${results.existingCustomerOrder.orderId} - ${results.existingCustomerOrder.finalAmount} KWD`);
    } else {
      console.log(`❌ EXISTING Customer: Failed - ${results.existingCustomerOrder.error}`);
    }
    
    return results;
  }
}

// Export for testing
export const largeOrderTester = new LargeOrderTester();