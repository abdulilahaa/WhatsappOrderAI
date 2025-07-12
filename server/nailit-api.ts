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

    // Test 3: Get Locations
    try {
      const locations = await this.getLocations('E');
      results['GetLocations'] = { 
        success: true,
        data: `Found ${locations.length} locations`
      };
    } catch (error) {
      results['GetLocations'] = { success: false, error: error.message };
    }

    // Test 4: Get Items by Date
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

    // Test 5: Get Payment Types
    try {
      const paymentTypes = await this.getPaymentTypes('E', 2, 2);
      results['GetPaymentTypes'] = { 
        success: true,
        data: `Found ${paymentTypes.length} payment types`
      };
    } catch (error) {
      results['GetPaymentTypes'] = { success: false, error: error.message };
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
      const response = await this.client.get(
        `/GetServiceStaff1/${itemId}/${locationId}/${lang}/${selectedDate}`
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
      const response = await this.client.post('/SaveOrder', orderData);
      
      if (response.data.Status === 0) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to save order:', error);
      return null;
    }
  }

  // Helper method to format date for API calls
  formatDateForAPI(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
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