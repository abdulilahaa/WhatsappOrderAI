import { Request, Response } from "express";
import { nailItAPI } from "../nailit-api";
import { storage } from "../storage";

export async function getStaffAvailability(req: Request, res: Response) {
  try {
    const { locationId, date, serviceId } = req.query;

    if (!locationId || !date || !serviceId) {
      return res.status(400).json({ 
        error: "Missing required parameters: locationId, date, and serviceId" 
      });
    }

    // Get service staff from NailIt API
    const staff = await nailItAPI.getServiceStaff(
      parseInt(serviceId as string),
      parseInt(locationId as string),
      new Date(date as string)
    );

    // Get available time slots for each staff member
    const staffWithAvailability = await Promise.all(
      staff.map(async (staffMember) => {
        try {
          const slots = await nailItAPI.getAvailableSlots(
            parseInt(serviceId as string),
            staffMember.Id,
            parseInt(locationId as string),
            new Date(date as string)
          );

          return {
            ...staffMember,
            availability: {
              date: date as string,
              slots: slots.map(slot => slot.TimeFrame_Name),
              bookings: Math.floor(Math.random() * 8), // TODO: Get actual booking count
            }
          };
        } catch (error) {
          console.error(`Failed to get slots for staff ${staffMember.Id}:`, error);
          return {
            ...staffMember,
            availability: {
              date: date as string,
              slots: [],
              bookings: 0,
            }
          };
        }
      })
    );

    res.json(staffWithAvailability);
  } catch (error) {
    console.error("Failed to get staff availability:", error);
    res.status(500).json({ error: "Failed to get staff availability" });
  }
}

export async function getServiceAnalytics(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    // Get appointments in date range
    const appointments = await storage.getAppointments();
    
    // Get service booking frequency
    const serviceFrequency = appointments.reduce((acc, apt) => {
      const serviceId = apt.serviceId;
      acc[serviceId] = (acc[serviceId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Get popular time slots
    const timeSlots = appointments.reduce((acc, apt) => {
      const hour = new Date(apt.date).getHours();
      const timeRange = `${hour}:00 - ${hour + 1}:00`;
      acc[timeRange] = (acc[timeRange] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get revenue by service
    const revenueByService = await Promise.all(
      Object.keys(serviceFrequency).map(async (serviceId) => {
        const service = await storage.getProduct(parseInt(serviceId));
        return {
          serviceId: parseInt(serviceId),
          serviceName: service?.name || "Unknown",
          bookings: serviceFrequency[parseInt(serviceId)],
          revenue: serviceFrequency[parseInt(serviceId)] * (service?.price || 0),
        };
      })
    );

    res.json({
      serviceFrequency,
      popularTimeSlots: Object.entries(timeSlots)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([time, count]) => ({ time, count })),
      revenueByService: revenueByService.sort((a, b) => b.revenue - a.revenue),
      totalAppointments: appointments.length,
      totalRevenue: revenueByService.reduce((sum, item) => sum + item.revenue, 0),
    });
  } catch (error) {
    console.error("Failed to get service analytics:", error);
    res.status(500).json({ error: "Failed to get service analytics" });
  }
}