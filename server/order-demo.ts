import { NailItSaveOrderRequest } from './nailit-api.js';

/**
 * Demonstrate all SaveOrder API parameters with example data
 */
export function demonstrateSaveOrderParameters(): any {
  console.log('\n🔥 SAVE ORDER API - ALL PARAMETERS DEMONSTRATION');
  console.log('=============================================');
  
  // Format date for SaveOrder API (MM/dd/yyyy format required)
  const formatDateForSaveOrder = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };
  
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  
  // Complete SaveOrder request with all parameters
  const saveOrderRequest: NailItSaveOrderRequest = {
    // =================
    // MAIN ORDER DATA
    // =================
    Gross_Amount: 20.0,                    // Total amount before discounts
    Payment_Type_Id: 1,                    // 1=Cash on Arrival, 2=Knet, 7=Apple Pay
    Order_Type: 2,                         // 1=Product, 2=Service appointment
    UserId: 17,                            // Customer ID from Register API
    FirstName: "Test Customer",            // Customer's first name
    Mobile: "+96551234567",                // Customer's mobile number
    Email: "test@example.com",             // Customer's email
    Discount_Amount: 0.0,                  // Any discount applied
    Net_Amount: 20.0,                      // Final amount after discounts
    POS_Location_Id: 1,                    // Location ID (1=Al-Plaza Mall)
    
    // =================
    // ORDER DETAILS ARRAY
    // =================
    OrderDetails: [
      {
        Prod_Id: 279,                      // Service ID (279=French Manicure)
        Prod_Name: "French Manicure",      // Service name
        Qty: 1,                            // Quantity
        Rate: 15.0,                        // Unit price
        Amount: 15.0,                      // Total for this item (Rate × Qty)
        Size_Id: null,                     // Size ID (null for services)
        Size_Name: "",                     // Size name (empty for services)
        Promotion_Id: 0,                   // Promotion ID (0=no promotion)
        Promo_Code: "",                    // Promotion code (empty if none)
        Discount_Amount: 0.0,              // Discount on this item
        Net_Amount: 15.0,                  // Final amount for this item
        Staff_Id: 48,                      // Assigned staff member ID
        TimeFrame_Ids: [5, 6],             // Time slot IDs (array of integers)
        Appointment_Date: formatDateForSaveOrder(tomorrowDate) // MM/dd/yyyy format
      },
      {
        // Example: Second service in same order
        Prod_Id: 258,
        Prod_Name: "Gelish Hand Polish",
        Qty: 1,
        Rate: 5.0,
        Amount: 5.0,
        Size_Id: null,
        Size_Name: "",
        Promotion_Id: 0,
        Promo_Code: "",
        Discount_Amount: 0.0,
        Net_Amount: 5.0,
        Staff_Id: 48,                      // Same staff can do multiple services
        TimeFrame_Ids: [7, 8],             // Different time slots
        Appointment_Date: formatDateForSaveOrder(tomorrowDate)
      }
    ]
  };
  
  console.log('\n📤 COMPLETE SAVE ORDER REQUEST:');
  console.log('===============================');
  console.log(JSON.stringify(saveOrderRequest, null, 2));
  
  console.log('\n📋 PARAMETER EXPLANATIONS:');
  console.log('==========================');
  console.log('Main Order Fields:');
  console.log('  • Gross_Amount: Total before discounts');
  console.log('  • Payment_Type_Id: 1=Cash, 2=Knet, 7=Apple Pay');
  console.log('  • Order_Type: 1=Product, 2=Service');
  console.log('  • UserId: Customer ID from Register API');
  console.log('  • POS_Location_Id: 1=Al-Plaza, 52=Zahra, 53=Arraya');
  console.log('');
  console.log('Order Details Array (per service):');
  console.log('  • Prod_Id: Service ID from GetItemsByDate');
  console.log('  • Staff_Id: From GetServiceStaff API');
  console.log('  • TimeFrame_Ids: From GetAvailableSlots API');
  console.log('  • Appointment_Date: MM/dd/yyyy format REQUIRED');
  console.log('');
  console.log('📊 EXPECTED RESPONSE:');
  console.log('===================');
  console.log('{');
  console.log('  "Status": 0,');
  console.log('  "Message": "Success",');
  console.log('  "OrderId": 176374,');
  console.log('  "CustomerId": 116');
  console.log('}');
  
  return {
    success: true,
    message: "SaveOrder API parameters demonstrated successfully",
    saveOrderRequest,
    totalAmount: saveOrderRequest.Net_Amount,
    serviceCount: saveOrderRequest.OrderDetails.length,
    location: "Al-Plaza Mall",
    paymentMethod: "Cash on Arrival",
    appointmentDate: formatDateForSaveOrder(tomorrowDate)
  };
}