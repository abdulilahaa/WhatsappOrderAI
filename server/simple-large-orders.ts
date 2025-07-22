/**
 * Simple Large Order Test with Known Working Services
 * Tests large orders with authentic NailIt API data using proven service IDs
 */

import { NailItAPIService } from './nailit-api';

const nailItAPI = new NailItAPIService();

export class SimpleLargeOrderTester {
  
  /**
   * Create large order for NEW customer with multiple proven services
   */
  async createNewCustomerLargeOrder(): Promise<any> {
    try {
      console.log('🆕 Creating simple large order for NEW customer...');
      
      // Step 1: Register new customer
      const newCustomer = await nailItAPI.registerUser({
        Name: "Fatima Al-Salem",
        Email_Id: "fatima.salem@example.com", 
        Mobile: "99554433", // Kuwait format
        Address: "Kuwait City, Kuwait",
        Login_Type: 1,
        Image_Name: ""
      });
      
      console.log('✅ New customer registered:', newCustomer);
      
      if (!newCustomer?.App_User_Id) {
        throw new Error('Failed to register new customer');
      }
      
      // Step 2: Use known working services (based on previous successful orders)
      const knownServices = [
        { Item_Id: 279, Item_Name: "French Manicure", Item_Price: 25.000 },
        { Item_Id: 801, Item_Name: "Nail Art Design", Item_Price: 30.000 },
        { Item_Id: 1058, Item_Name: "Classic Pedicure", Item_Price: 20.000 },
        { Item_Id: 203, Item_Name: "Hair Treatment", Item_Price: 45.000 }
      ];
      
      const totalAmount = knownServices.reduce((sum, service) => sum + service.Item_Price, 0);
      
      console.log(`💎 Using ${knownServices.length} known working services:`, 
        knownServices.map(s => `${s.Item_Name} - ${s.Item_Price} KWD`));
      
      // Step 3: Create large order with multiple services
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const largeOrder = {
        Gross_Amount: totalAmount,
        Payment_Type_Id: 2, // KNet
        Order_Type: 2, // Service booking
        UserId: newCustomer.App_User_Id,
        FirstName: "Fatima Al-Salem",
        Mobile: "99554433",
        Email: "fatima.salem@example.com",
        Discount_Amount: 0.0,
        Net_Amount: totalAmount,
        POS_Location_Id: 1, // Al-Plaza Mall (known working location)
        ChannelId: 4, // WhatsApp channel
        OrderDetails: knownServices.map((service, index) => ({
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
          Staff_Id: 1, // Default working staff ID
          TimeFrame_Ids: [9 + (index * 2), 10 + (index * 2)], // Sequential time slots
          Appointment_Date: nailItAPI.formatDateForSaveOrder(tomorrow)
        }))
      };
      
      console.log(`💰 Creating large order: ${totalAmount} KWD total`);
      console.log('📋 Order details:', JSON.stringify(largeOrder, null, 2));
      
      // Step 4: Submit order to NailIt POS
      const orderResult = await nailItAPI.saveOrder(largeOrder);
      
      console.log('📥 Order result:', orderResult);
      
      if (orderResult?.Status === 0) {
        console.log(`🎉 NEW CUSTOMER LARGE ORDER SUCCESS!`);
        console.log(`📋 Order ID: ${orderResult.OrderId}`);
        console.log(`👤 Customer: ${newCustomer.App_User_Id}`);
        console.log(`💎 Services: ${knownServices.length}`);
        console.log(`💰 Total: ${totalAmount} KWD`);
        console.log(`💳 Payment Link: http://nailit.innovasolution.net/knet.aspx?orderId=${orderResult.OrderId}`);
        
        return {
          success: true,
          orderType: 'NEW_CUSTOMER_LARGE_ORDER',
          orderId: orderResult.OrderId,
          customerId: newCustomer.App_User_Id,
          customerName: "Fatima Al-Salem",
          servicesCount: knownServices.length,
          totalAmount: totalAmount,
          paymentLink: `http://nailit.innovasolution.net/knet.aspx?orderId=${orderResult.OrderId}`,
          services: knownServices.map(s => ({ name: s.Item_Name, price: s.Item_Price }))
        };
      } else {
        console.error('❌ Order failed with details:', orderResult);
        throw new Error(`Order failed: Status ${orderResult?.Status}, Message: ${orderResult?.Message || 'Unknown error'}`);
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
      console.log('🔄 Creating simple large order for EXISTING customer...');
      
      // Use existing customer from previous successful orders
      const existingUserId = 110745; // Known working customer ID
      const existingCustomerInfo = {
        name: "Ahmed Al-Mutairi",
        mobile: "99887766",
        email: "ahmed.mutairi@example.com"
      };
      
      console.log(`✅ Using existing customer ID: ${existingUserId}`);
      
      // Step 1: Use different known working services for existing customer
      const knownServices = [
        { Item_Id: 279, Item_Name: "French Manicure", Item_Price: 25.000 },
        { Item_Id: 1058, Item_Name: "Classic Pedicure", Item_Price: 20.000 },
        { Item_Id: 203, Item_Name: "Hair Treatment", Item_Price: 45.000 }
      ];
      
      const totalAmount = knownServices.reduce((sum, service) => sum + service.Item_Price, 0);
      const vipDiscount = 10.0; // VIP discount for existing customer
      
      console.log(`💎 Using ${knownServices.length} premium services for VIP customer:`, 
        knownServices.map(s => `${s.Item_Name} - ${s.Item_Price} KWD`));
      
      // Step 2: Create large order for existing customer
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2); // Day after new customer
      
      const existingCustomerOrder = {
        Gross_Amount: totalAmount,
        Payment_Type_Id: 2, // KNet
        Order_Type: 2, // Service booking
        UserId: existingUserId,
        FirstName: existingCustomerInfo.name,
        Mobile: existingCustomerInfo.mobile,
        Email: existingCustomerInfo.email,
        Discount_Amount: vipDiscount, // VIP discount for existing customer
        Net_Amount: totalAmount - vipDiscount,
        POS_Location_Id: 1, // Al-Plaza Mall (same working location)
        ChannelId: 4, // WhatsApp channel
        OrderDetails: knownServices.map((service, index) => ({
          Prod_Id: service.Item_Id,
          Prod_Name: service.Item_Name,
          Qty: 1,
          Rate: service.Item_Price,
          Amount: service.Item_Price,
          Size_Id: null,
          Size_Name: "",
          Promotion_Id: 0,
          Promo_Code: "VIP10", // VIP promo code
          Discount_Amount: index === 0 ? vipDiscount : 0.0, // Apply discount to first service
          Net_Amount: index === 0 ? service.Item_Price - vipDiscount : service.Item_Price,
          Staff_Id: 1, // Default working staff ID
          TimeFrame_Ids: [13 + (index * 2), 14 + (index * 2)], // Different time slots
          Appointment_Date: nailItAPI.formatDateForSaveOrder(tomorrow)
        }))
      };
      
      console.log(`💰 Creating existing customer large order: ${totalAmount - vipDiscount} KWD total (after VIP discount)`);
      console.log('📋 Order details:', JSON.stringify(existingCustomerOrder, null, 2));
      
      // Step 3: Submit order to NailIt POS
      const orderResult = await nailItAPI.saveOrder(existingCustomerOrder);
      
      console.log('📥 Order result:', orderResult);
      
      if (orderResult?.Status === 0) {
        console.log(`🎉 EXISTING CUSTOMER LARGE ORDER SUCCESS!`);
        console.log(`📋 Order ID: ${orderResult.OrderId}`);
        console.log(`👤 Customer ID: ${existingUserId}`);
        console.log(`💎 Services: ${knownServices.length}`);
        console.log(`💰 Total: ${totalAmount - vipDiscount} KWD (VIP discount applied)`);
        console.log(`💳 Payment Link: http://nailit.innovasolution.net/knet.aspx?orderId=${orderResult.OrderId}`);
        
        return {
          success: true,
          orderType: 'EXISTING_CUSTOMER_LARGE_ORDER',
          orderId: orderResult.OrderId,
          customerId: existingUserId,
          customerName: existingCustomerInfo.name,
          servicesCount: knownServices.length,
          totalAmount: totalAmount,
          discountApplied: vipDiscount,
          finalAmount: totalAmount - vipDiscount,
          paymentLink: `http://nailit.innovasolution.net/knet.aspx?orderId=${orderResult.OrderId}`,
          services: knownServices.map(s => ({ name: s.Item_Name, price: s.Item_Price })),
          location: "Al-Plaza Mall"
        };
      } else {
        console.error('❌ Order failed with details:', orderResult);
        throw new Error(`Order failed: Status ${orderResult?.Status}, Message: ${orderResult?.Message || 'Unknown error'}`);
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
   * Run both simple large order tests
   */
  async runSimpleLargeOrderTests(): Promise<any> {
    console.log('🚀 Starting Simple Large Order Tests with Known Working Services...\n');
    
    const results = {
      newCustomerOrder: await this.createNewCustomerLargeOrder(),
      existingCustomerOrder: await this.createExistingCustomerLargeOrder()
    };
    
    console.log('\n📊 SIMPLE LARGE ORDER TEST RESULTS:');
    console.log('====================================');
    
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
    
    const totalRevenue = (results.newCustomerOrder.success ? results.newCustomerOrder.totalAmount : 0) + 
                        (results.existingCustomerOrder.success ? results.existingCustomerOrder.finalAmount : 0);
    
    console.log(`💰 Total Revenue Generated: ${totalRevenue} KWD`);
    console.log(`📊 Success Rate: ${((results.newCustomerOrder.success ? 1 : 0) + (results.existingCustomerOrder.success ? 1 : 0))/2 * 100}%`);
    
    return results;
  }
}

// Export for testing
export const simpleLargeOrderTester = new SimpleLargeOrderTester();