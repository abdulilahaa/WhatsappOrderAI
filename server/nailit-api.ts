import axios, { AxiosInstance } from 'axios';

export interface NailItLocation {
  Location_Id: number;
  Location_Name: string;
  Latitude: string;
  Longitude: string;
  Address: string;
  Website: string;
  Phone: string;
  From_Time: string;
  To_Time: string;
  Working_Days: string;
}

export interface NailItGroup {
  Id: number;
  Name: string;
  Image_URL: string;
  Is_Has_Sub_Category: boolean;
  Is_Corporate_Event: boolean;
  Website_Image_URL: string;
  Group_Name: string | null;
}

export interface NailItItem {
  Item_Id: number;
  Item_Name: string;
  Item_Desc: string;
  Image_Url: string;
  Primary_Price: number;
  Dis_Percent: number;
  Dis_Amount: number;
  Special_Price: number;
  Is_Favorite: boolean;
  Promotion_Id: number;
  Promotion_Type_Id: number;
  Item_Type_Id: number;
  Available_Qty: number;
  Duration: string;
  Parent_Group_Id: number;
  Sub_Group_Id: number;
  Event_Type: number;
  Is_Gift: boolean;
  Location_Ids: number[];
  Media: any[];
  Sizes: any[];
}

export interface NailItStaff {
  Id: number;
  Name: string;
  Image_URL: string;
  Location_Id: number;
  Extra_Time: number;
  Staff_Groups: any[];
}

export interface NailItTimeSlot {
  TimeFrame_Id: number;
  TimeFrame_Name: string;
}

export interface NailItPaymentType {
  Type_Id: number;
  Type_Name: string;
  Type_Code: string;
  Is_Enabled: boolean;
  Image_URL: string;
}

export interface NailItOrderDetail {
  Prod_Id: number;
  Prod_Name: string;
  Qty: number;
  Rate: number;
  Amount: number;
  Size_Id: number | null;
  Size_Name: string;
  Promotion_Id: number;
  Promo_Code: string;
  Discount_Amount: number;
  Net_Amount: number;
  Staff_Id: number;
  TimeFrame_Ids: number[];
  Appointment_Date: string;
}

export interface NailItSaveOrderRequest {
  Gross_Amount: number;
  Payment_Type_Id: number;
  Order_Type: number;
  UserId: number;
  FirstName: string;
  Mobile: string;
  Email: string;
  Discount_Amount: number;
  Net_Amount: number;
  POS_Location_Id: number;
  OrderDetails: NailItOrderDetail[];
}

export interface NailItSaveOrderResponse {
  Status: number;
  Message: string;
  OrderId: number;
  CustomerId: number;
}

export interface NailItRegisterRequest {
  Address: string;
  Email_Id: string;
  Name: string;
  Mobile: string;
  Login_Type: number;
  Image_Name?: string;
}

export interface NailItRegisterResponse {
  App_User_Id: number;
  Message: string;
  Status: number;
}

export class NailItAPIService {
  private client: AxiosInstance;
  private securityToken: string;
  private baseURL: string;

  constructor() {
    this.baseURL = 'http://nailit.innovasolution.net';
    this.securityToken = 'OTRlNmEzMjAtOTA4MS0xY2NiLWJhYjQtNzMwOTA4NzdkZThh';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-NailItMobile-SecurityToken': this.securityToken,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  async registerDevice(): Promise<boolean> {
    try {
      const response = await this.client.post('/RegisterDevice', {
        DeviceType: "2", // Android
        UniqueDeviceId: "whatsapp-bot-device-id",
        NotificationToken: "whatsapp-bot-token",
        ClientKey: this.securityToken
      });
      
      return response.data.Status === 0;
    } catch (error) {
      console.error('Failed to register device:', error);
      return false;
    }
  }

  async registerUser(userData: NailItRegisterRequest): Promise<NailItRegisterResponse | null> {
    try {
      const response = await this.client.post('/Register', userData);
      
      if (response.data.Status === 0) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to register user:', error);
      return null;
    }
  }

  // Method to get or create user and return their App_User_Id
  async getOrCreateUser(userData: NailItRegisterRequest): Promise<number | null> {
    try {
      console.log('🔍 Getting or creating user in NailIt POS:', userData.Email_Id);
      
      // Try to register the user
      const registerResult = await this.registerUser(userData);
      
      if (registerResult && registerResult.Status === 0) {
        console.log('✅ User registered/found with App_User_Id:', registerResult.App_User_Id);
        return registerResult.App_User_Id;
      } else if (registerResult) {
        console.log('⚠️ User registration response:', registerResult);
        // If Status is not 0, user might already exist or other issue
        // You could add logic here to handle specific error codes
        return null;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get or create user:', error);
      return null;
    }
  }

  async testAllEndpoints(): Promise<{ [key: string]: { success: boolean; error?: string; data?: any } }> {
    const results: { [key: string]: { success: boolean; error?: string; data?: any } } = {};
    
    // Test 1: Register Device
    try {
      const deviceResult = await this.registerDevice();
      results['RegisterDevice'] = { 
        success: deviceResult,
        data: deviceResult ? 'Device registered successfully' : 'Device registration failed'
      };
    } catch (error) {
      results['RegisterDevice'] = { success: false, error: error.message };
    }

    // Test 2: Get Groups  
    try {
      const groups = await this.getGroups(2);
      results['GetGroups'] = { 
        success: true,
        data: `Found ${groups.length} groups`
      };
    } catch (error) {
      results['GetGroups'] = { success: false, error: error.message };
    }

    // Test 3: Get SubGroups (if we have groups)
    try {
      const subGroups = await this.getSubGroups('E', 42); // Test with known group ID
      results['GetSubGroups'] = { 
        success: true,
        data: `Found ${subGroups.length} sub-groups for group 42`
      };
    } catch (error) {
      results['GetSubGroups'] = { success: false, error: error.message };
    }

    // Test 4: Get Locations
    try {
      const locations = await this.getLocations('E');
      results['GetLocations'] = { 
        success: true,
        data: `Found ${locations.length} locations`
      };
    } catch (error) {
      results['GetLocations'] = { success: false, error: error.message };
    }

    // Test 5: Get Items by Date
    try {
      const currentDate = this.formatDateForAPI(new Date());
      const items = await this.getItemsByDate({
        selectedDate: currentDate,
        pageNo: 1,
        itemTypeId: 2
      });
      results['GetItemsByDate'] = { 
        success: true,
        data: `Found ${items.totalItems} total items, ${items.items.length} on page 1`
      };
    } catch (error) {
      results['GetItemsByDate'] = { success: false, error: error.message };
    }

    // Test 6: Get Service Staff
    try {
      const currentDate = this.formatDateForURL(new Date());
      const staff = await this.getServiceStaff(203, 1, 'E', currentDate); // Test with item 203, location 1
      results['GetServiceStaff'] = { 
        success: true,
        data: `Found ${staff.length} staff members for service 203, location 1`
      };
    } catch (error) {
      results['GetServiceStaff'] = { success: false, error: error.message };
    }

    // Test 7: Get Available Slots
    try {
      const currentDate = this.formatDateForAPI(new Date());
      const slots = await this.getAvailableSlots('E', 1, currentDate); // Test with staff 1
      results['GetAvailableSlots'] = { 
        success: true,
        data: `Found ${slots.length} available time slots for today`
      };
    } catch (error) {
      results['GetAvailableSlots'] = { success: false, error: error.message };
    }

    // Test 8: Get Payment Types
    try {
      const paymentTypes = await this.getPaymentTypes('E');
      results['GetPaymentTypes'] = { 
        success: true,
        data: `Found ${paymentTypes.length} payment types`
      };
    } catch (error) {
      results['GetPaymentTypes'] = { success: false, error: error.message };
    }

    // Test 9: User Registration (test data)
    try {
      const testUser = {
        Address: "Test Address 123",
        Email_Id: "test@example.com",
        Name: "Test User",
        Mobile: "12345678",
        Login_Type: 1
      };
      const registerResult = await this.registerUser(testUser);
      results['RegisterUser'] = { 
        success: registerResult !== null,
        data: registerResult ? `User registered with ID ${registerResult.App_User_Id}` : 'Registration failed'
      };
    } catch (error) {
      results['RegisterUser'] = { success: false, error: error.message };
    }

    return results;
  }

  async getGroups(groupType: number = 2): Promise<NailItGroup[]> {
    try {
      const response = await this.client.get(`/GetGroups/${groupType}`);
      
      if (response.data.Status === 0) {
        return response.data.Groups || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get groups:', error);
      return [];
    }
  }

  async getSubGroups(lang: string = 'E', parentGroupId: number): Promise<NailItGroup[]> {
    try {
      const response = await this.client.get(`/GetSubGroups/${lang}/${parentGroupId}`);
      
      if (response.data.Status === 0) {
        return response.data.Groups || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get sub groups:', error);
      return [];
    }
  }

  async getLocations(lang: string = 'E'): Promise<NailItLocation[]> {
    try {
      const response = await this.client.get(`/GetLocations/${lang}`);
      
      if (response.data.Status === 0) {
        return response.data.Locations || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get locations:', error);
      return [];
    }
  }

  async getItemsByDate(params: {
    lang?: string;
    like?: string;
    pageNo?: number;
    itemTypeId?: number;
    groupId?: number;
    locationIds?: number[];
    isHomeService?: boolean;
    selectedDate: string;
  }): Promise<{ items: NailItItem[]; totalItems: number }> {
    try {
      const requestBody = {
        Lang: params.lang || 'E',
        Like: params.like || '',
        Page_No: params.pageNo || 1,
        Item_Type_Id: params.itemTypeId || 2,
        Group_Id: params.groupId || 0,
        Location_Ids: params.locationIds || [],
        Is_Home_Service: params.isHomeService || false,
        Selected_Date: params.selectedDate
      };

      const response = await this.client.post('/GetItemsByDate', requestBody);
      
      if (response.data.Status === 0) {
        return {
          items: response.data.Items || [],
          totalItems: response.data.Total_Items || 0
        };
      }
      return { items: [], totalItems: 0 };
    } catch (error) {
      console.error('Failed to get items by date:', error);
      return { items: [], totalItems: 0 };
    }
  }

  async getServiceStaff(
    itemId: number,
    locationId: number,
    lang: string = 'E',
    selectedDate: string
  ): Promise<NailItStaff[]> {
    try {
      // Handle undefined or empty selectedDate
      if (!selectedDate) {
        const today = new Date();
        const day = today.getDate().toString().padStart(2, '0');
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const year = today.getFullYear();
        selectedDate = `${day}-${month}-${year}`;
      }
      
      // Convert date to DD-MM-YYYY format as required by NailIt API
      let urlDate = selectedDate;
      if (selectedDate.includes('/')) {
        // Convert MM/dd/yyyy to dd-MM-yyyy
        const [month, day, year] = selectedDate.split('/');
        urlDate = `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
      } else if (!selectedDate.includes('-')) {
        // If no format detected, use current date in DD-MM-YYYY
        const today = new Date();
        const day = today.getDate().toString().padStart(2, '0');
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const year = today.getFullYear();
        urlDate = `${day}-${month}-${year}`;
      }
      
      console.log(`🔍 GetServiceStaff API call: itemId=${itemId}, locationId=${locationId}, lang=${lang}, date=${urlDate}`);
      
      // Correct parameter order from API documentation: ItemId, LocationId, Language, SelectedDate
      const response = await this.client.get(
        `/GetServiceStaff1/${itemId}/${locationId}/${lang}/${urlDate}`
      );
      
      if (response.data.Status === 0) {
        return response.data.Specialists || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get service staff:', error);
      return [];
    }
  }

  async getAvailableSlots(
    lang: string = 'E',
    staffId: number,
    bookingDate: string
  ): Promise<NailItTimeSlot[]> {
    try {
      const response = await this.client.get(
        `/GetAvailableSlots/${lang}/${staffId}/${bookingDate}`
      );
      
      if (response.data.Status === 0) {
        return response.data.TimeFrames || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get available slots:', error);
      return [];
    }
  }

  async getPaymentTypes(
    lang: string = 'E',
    orderType: number = 2,
    deviceType: number = 2
  ): Promise<NailItPaymentType[]> {
    try {
      const response = await this.client.get(
        `/GetPaymentTypesByDevice/${lang}/${orderType}/${deviceType}`
      );
      
      if (response.data.Status === 0) {
        return response.data.PaymentTypes || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get payment types:', error);
      return [];
    }
  }

  async saveOrder(orderData: NailItSaveOrderRequest): Promise<NailItSaveOrderResponse | null> {
    try {
      console.log('📋 Sending order to NailIt POS:', JSON.stringify(orderData, null, 2));
      const response = await this.client.post('/SaveOrder', orderData);
      console.log('✅ NailIt Save Order Response:', response.data);
      
      if (response.data.Status === 0) {
        return response.data;
      } else {
        console.error('❌ Order rejected by NailIt:', response.data);
        return null;
      }
    } catch (error: any) {
      console.error('❌ Save Order failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      return null;
    }
  }

  // Helper method to format date for API calls (NailIt expects MM/dd/yyyy format)
  formatDateForAPI(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  // Helper method to format date for URL paths (DD-MM-YYYY format as per NailIt API documentation)
  formatDateForURL(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // Helper method to create a test order for API validation
  createTestOrder(): NailItSaveOrderRequest {
    return {
      Gross_Amount: 10.0,
      Payment_Type_Id: 1,
      Order_Type: 2,
      UserId: 128, // This will be replaced by proper App_User_Id
      FirstName: "Test Customer",
      Mobile: "+96588888889",
      Email: "test@example.com",
      Discount_Amount: 0.0,
      Net_Amount: 10.0,
      POS_Location_Id: 1,
      OrderDetails: [
        {
          Prod_Id: 203,
          Prod_Name: "Test Service",
          Qty: 1,
          Rate: 10.0,
          Amount: 10.0,
          Size_Id: null,
          Size_Name: "",
          Promotion_Id: 0,
          Promo_Code: "",
          Discount_Amount: 0.0,
          Net_Amount: 10.0,
          Staff_Id: 48,
          TimeFrame_Ids: [5, 6],
          Appointment_Date: this.formatDateForAPI(new Date())
        }
      ]
    };
  }

  // Method to create order with proper user integration
  async createOrderWithUser(orderData: {
    customerInfo: {
      name: string;
      mobile: string;
      email: string;
      address?: string;
    };
    orderDetails: {
      serviceId: number;
      serviceName: string;
      price: number;
      locationId: number;
      appointmentDate: string;
      paymentTypeId: number;
      staffId?: number;
      timeFrameIds?: number[];
    };
  }): Promise<NailItSaveOrderResponse | null> {
    try {
      console.log('🛒 Creating integrated order with user registration...');
      
      // Step 1: Get or create user
      const userData: NailItRegisterRequest = {
        Address: orderData.customerInfo.address || "Kuwait",
        Email_Id: orderData.customerInfo.email,
        Name: orderData.customerInfo.name,
        Mobile: orderData.customerInfo.mobile,
        Login_Type: 1
      };
      
      const appUserId = await this.getOrCreateUser(userData);
      
      if (!appUserId) {
        console.error('❌ Failed to get or create user');
        return null;
      }
      
      // Step 2: Create order with the correct App_User_Id
      const nailItOrder: NailItSaveOrderRequest = {
        Gross_Amount: orderData.orderDetails.price,
        Payment_Type_Id: orderData.orderDetails.paymentTypeId,
        Order_Type: 2, // Service booking
        UserId: appUserId, // Use the App_User_Id from registration
        FirstName: orderData.customerInfo.name,
        Mobile: orderData.customerInfo.mobile,
        Email: orderData.customerInfo.email,
        Discount_Amount: 0,
        Net_Amount: orderData.orderDetails.price,
        POS_Location_Id: orderData.orderDetails.locationId,
        OrderDetails: [{
          Prod_Id: orderData.orderDetails.serviceId,
          Prod_Name: orderData.orderDetails.serviceName,
          Qty: 1,
          Rate: orderData.orderDetails.price,
          Amount: orderData.orderDetails.price,
          Size_Id: null,
          Size_Name: "",
          Promotion_Id: 0,
          Promo_Code: "",
          Discount_Amount: 0,
          Net_Amount: orderData.orderDetails.price,
          Staff_Id: orderData.orderDetails.staffId || 48, // Default staff
          TimeFrame_Ids: orderData.orderDetails.timeFrameIds || [5, 6], // Default time slots
          Appointment_Date: orderData.orderDetails.appointmentDate
        }]
      };
      
      console.log('📋 Creating order with App_User_Id:', appUserId);
      return await this.saveOrder(nailItOrder);
      
    } catch (error) {
      console.error('Failed to create integrated order:', error);
      return null;
    }
  }

  // Helper method to search for services by name
  async searchServices(
    query: string,
    selectedDate: string,
    locationIds?: number[]
  ): Promise<NailItItem[]> {
    try {
      const { items } = await this.getItemsByDate({
        like: query,
        selectedDate,
        locationIds
      });
      
      return items.filter(item => 
        item.Item_Name.toLowerCase().includes(query.toLowerCase()) ||
        item.Item_Desc.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Failed to search services:', error);
      return [];
    }
  }
}

export const nailItAPI = new NailItAPIService();