/**
 * Payment Status Checker for Large Orders
 * Monitors KNet payment status and provides order confirmation
 */

import { NailItAPIService } from './nailit-api';

const nailItAPI = new NailItAPIService();

export class PaymentStatusChecker {
  
  /**
   * Check payment status for a specific order
   */
  async checkOrderPaymentStatus(orderId: number): Promise<any> {
    try {
      console.log(`🔍 Checking payment status for Order ID: ${orderId}`);
      
      const paymentDetails = await nailItAPI.getOrderPaymentDetail(orderId);
      
      if (!paymentDetails) {
        return {
          success: false,
          orderId,
          error: 'Order not found'
        };
      }
      
      const isPaymentSuccessful = paymentDetails.KNetResult === 'CAPTURED' || 
                                 paymentDetails.Order_Status === 'Order Paid';
      
      console.log(`💳 Payment Status for Order ${orderId}:`, {
        orderStatus: paymentDetails.Order_Status,
        knetResult: paymentDetails.KNetResult,
        paymentSuccessful: isPaymentSuccessful
      });
      
      return {
        success: true,
        orderId,
        paymentSuccessful: isPaymentSuccessful,
        orderStatus: paymentDetails.Order_Status,
        knetResult: paymentDetails.KNetResult,
        transactionId: paymentDetails.TransactionId,
        referenceNumber: paymentDetails.ReferenceNumber,
        paymentAmount: paymentDetails.Payment_Amount,
        customerName: paymentDetails.Customer_Name,
        services: paymentDetails.Order_Details || [],
        appointmentDate: paymentDetails.Appointment_Date,
        location: paymentDetails.Location_Name
      };
      
    } catch (error) {
      console.error(`❌ Error checking payment status for Order ${orderId}:`, error);
      return {
        success: false,
        orderId,
        error: (error as Error).message
      };
    }
  }
  
  /**
   * Check payment status for multiple orders
   */
  async checkMultipleOrdersPaymentStatus(orderIds: number[]): Promise<any> {
    console.log(`🔍 Checking payment status for ${orderIds.length} orders:`, orderIds);
    
    const results = await Promise.all(
      orderIds.map(orderId => this.checkOrderPaymentStatus(orderId))
    );
    
    const successful = results.filter(result => result.success && result.paymentSuccessful);
    const failed = results.filter(result => !result.success || !result.paymentSuccessful);
    
    const summary = {
      totalOrders: orderIds.length,
      successfulPayments: successful.length,
      failedPayments: failed.length,
      successRate: (successful.length / orderIds.length) * 100,
      totalRevenue: successful.reduce((sum, result) => sum + (result.paymentAmount || 0), 0)
    };
    
    console.log('📊 Payment Status Summary:', summary);
    
    return {
      success: true,
      summary,
      results,
      successful,
      failed
    };
  }
  
  /**
   * Monitor payment status with polling
   */
  async monitorOrderPayment(orderId: number, maxAttempts: number = 10): Promise<any> {
    console.log(`🔄 Starting payment monitoring for Order ${orderId} (max ${maxAttempts} attempts)`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔍 Payment check attempt ${attempt}/${maxAttempts} for Order ${orderId}`);
      
      const status = await this.checkOrderPaymentStatus(orderId);
      
      if (status.success && status.paymentSuccessful) {
        console.log(`🎉 Payment confirmed for Order ${orderId} after ${attempt} attempts!`);
        return {
          success: true,
          orderId,
          paymentConfirmed: true,
          attempts: attempt,
          paymentDetails: status
        };
      }
      
      if (attempt < maxAttempts) {
        console.log(`⏳ Payment not yet confirmed for Order ${orderId}, waiting 30 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      }
    }
    
    console.log(`⏰ Payment monitoring timeout for Order ${orderId} after ${maxAttempts} attempts`);
    return {
      success: true,
      orderId,
      paymentConfirmed: false,
      attempts: maxAttempts,
      message: 'Payment not confirmed within monitoring period'
    };
  }
  
  /**
   * Get comprehensive order summary after payment
   */
  async getOrderSummary(orderId: number): Promise<string> {
    const status = await this.checkOrderPaymentStatus(orderId);
    
    if (!status.success) {
      return `❌ Order ${orderId}: Unable to retrieve order details`;
    }
    
    if (status.paymentSuccessful) {
      return `✅ Order ${orderId} - PAYMENT CONFIRMED
👤 Customer: ${status.customerName}
💰 Amount: ${status.paymentAmount} KWD
💳 Transaction: ${status.transactionId}
📋 Reference: ${status.referenceNumber}
📅 Appointment: ${status.appointmentDate}
📍 Location: ${status.location}
🎯 Status: ${status.orderStatus}
💎 Services: ${status.services.length} booked`;
    } else {
      return `⏳ Order ${orderId} - PAYMENT PENDING
👤 Customer: ${status.customerName}
💰 Amount: ${status.paymentAmount} KWD
🎯 Status: ${status.orderStatus}
💳 KNet Status: ${status.knetResult}`;
    }
  }
}

// Export for use in routes
export const paymentStatusChecker = new PaymentStatusChecker();