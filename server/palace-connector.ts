/**
 * Palace.com CRM Connector
 * 
 * This module provides integration with the Palace.com property management system.
 * Since Palace.com doesn't have a public API documented, this connector implements
 * a flexible architecture that can be adapted based on the actual API structure.
 * 
 * The connector supports:
 * - Property data synchronization
 * - Tenant information sync
 * - Rent arrears status monitoring
 * - Maintenance records integration
 */

import axios, { AxiosInstance } from 'axios';

export interface PalaceConfig {
  apiUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface PalaceProperty {
  id: string;
  address: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  weeklyRent?: number;
  status: 'vacant' | 'occupied' | 'maintenance' | 'advertising';
  managerId?: string;
}

export interface PalaceTenant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  propertyId?: string;
  leaseStartDate?: Date;
  leaseEndDate?: Date;
  rentAmount?: number;
  rentFrequency?: 'weekly' | 'fortnightly' | 'monthly';
  bondAmount?: number;
  status: 'active' | 'pending' | 'ended' | 'breached';
}

export interface PalaceRentArrear {
  tenantId: string;
  propertyId: string;
  amountOwed: number;
  daysOverdue: number;
  lastPaymentDate?: Date;
  paymentArrangementBroken: boolean;
}

export interface PalaceMaintenanceRecord {
  id: string;
  propertyId: string;
  tenantId?: string;
  title: string;
  description?: string;
  category?: string;
  urgency?: 'routine' | 'urgent' | 'emergency';
  status: string;
  estimatedCost?: number;
  actualCost?: number;
  scheduledDate?: Date;
  completedDate?: Date;
  contractorName?: string;
  contractorContact?: string;
}

export class PalaceConnector {
  private client: AxiosInstance;
  private config: PalaceConfig;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: PalaceConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(async (config) => {
      await this.ensureAuthenticated();
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      } else if (this.config.apiKey) {
        config.headers['X-API-Key'] = this.config.apiKey;
      }
      return config;
    });
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureAuthenticated(): Promise<void> {
    // If token exists and hasn't expired, we're good
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return;
    }

    // Attempt to authenticate based on available credentials
    if (this.config.clientId && this.config.clientSecret) {
      await this.authenticateOAuth();
    } else if (this.config.username && this.config.password) {
      await this.authenticateBasic();
    }
    // If only API key is provided, it will be added via interceptor
  }

  /**
   * OAuth authentication flow
   */
  private async authenticateOAuth(): Promise<void> {
    try {
      const response = await axios.post(`${this.config.apiUrl}/oauth/token`, {
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      });

      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);
    } catch (error) {
      console.error('[Palace] OAuth authentication failed:', error);
      throw new Error('Failed to authenticate with Palace.com');
    }
  }

  /**
   * Basic username/password authentication
   */
  private async authenticateBasic(): Promise<void> {
    try {
      const response = await axios.post(`${this.config.apiUrl}/auth/login`, {
        username: this.config.username,
        password: this.config.password,
      });

      this.accessToken = response.data.token || response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);
    } catch (error) {
      console.error('[Palace] Basic authentication failed:', error);
      throw new Error('Failed to authenticate with Palace.com');
    }
  }

  /**
   * Test connection to Palace.com API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      console.error('[Palace] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Fetch all properties from Palace.com
   */
  async fetchProperties(): Promise<PalaceProperty[]> {
    try {
      const response = await this.client.get('/properties');
      return this.normalizeProperties(response.data);
    } catch (error) {
      console.error('[Palace] Failed to fetch properties:', error);
      throw new Error('Failed to fetch properties from Palace.com');
    }
  }

  /**
   * Fetch a single property by ID
   */
  async fetchProperty(propertyId: string): Promise<PalaceProperty | null> {
    try {
      const response = await this.client.get(`/properties/${propertyId}`);
      return this.normalizeProperty(response.data);
    } catch (error) {
      console.error(`[Palace] Failed to fetch property ${propertyId}:`, error);
      return null;
    }
  }

  /**
   * Fetch all tenants from Palace.com
   */
  async fetchTenants(): Promise<PalaceTenant[]> {
    try {
      const response = await this.client.get('/tenants');
      return this.normalizeTenants(response.data);
    } catch (error) {
      console.error('[Palace] Failed to fetch tenants:', error);
      throw new Error('Failed to fetch tenants from Palace.com');
    }
  }

  /**
   * Fetch tenants for a specific property
   */
  async fetchPropertyTenants(propertyId: string): Promise<PalaceTenant[]> {
    try {
      const response = await this.client.get(`/properties/${propertyId}/tenants`);
      return this.normalizeTenants(response.data);
    } catch (error) {
      console.error(`[Palace] Failed to fetch tenants for property ${propertyId}:`, error);
      return [];
    }
  }

  /**
   * Fetch rent arrears data
   */
  async fetchRentArrears(): Promise<PalaceRentArrear[]> {
    try {
      const response = await this.client.get('/rent-arrears');
      return this.normalizeRentArrears(response.data);
    } catch (error) {
      console.error('[Palace] Failed to fetch rent arrears:', error);
      throw new Error('Failed to fetch rent arrears from Palace.com');
    }
  }

  /**
   * Fetch maintenance records
   */
  async fetchMaintenanceRecords(): Promise<PalaceMaintenanceRecord[]> {
    try {
      const response = await this.client.get('/maintenance');
      return this.normalizeMaintenanceRecords(response.data);
    } catch (error) {
      console.error('[Palace] Failed to fetch maintenance records:', error);
      throw new Error('Failed to fetch maintenance records from Palace.com');
    }
  }

  /**
   * Fetch maintenance records for a specific property
   */
  async fetchPropertyMaintenance(propertyId: string): Promise<PalaceMaintenanceRecord[]> {
    try {
      const response = await this.client.get(`/properties/${propertyId}/maintenance`);
      return this.normalizeMaintenanceRecords(response.data);
    } catch (error) {
      console.error(`[Palace] Failed to fetch maintenance for property ${propertyId}:`, error);
      return [];
    }
  }

  /**
   * Normalize property data from Palace.com API response
   */
  private normalizeProperties(data: any): PalaceProperty[] {
    const properties = Array.isArray(data) ? data : data.properties || data.data || [];
    return properties.map((p: any) => this.normalizeProperty(p));
  }

  private normalizeProperty(p: any): PalaceProperty {
    return {
      id: p.id || p.propertyId || p.property_id,
      address: p.address || p.fullAddress || p.street_address || '',
      suburb: p.suburb || p.city,
      state: p.state || p.region,
      postcode: p.postcode || p.postalCode || p.zip,
      propertyType: p.propertyType || p.type || p.property_type,
      bedrooms: p.bedrooms || p.beds,
      bathrooms: p.bathrooms || p.baths,
      parkingSpaces: p.parkingSpaces || p.parking || p.carSpaces,
      weeklyRent: p.weeklyRent || p.rent || p.rental_amount,
      status: this.normalizePropertyStatus(p.status),
      managerId: p.managerId || p.manager_id || p.propertyManager,
    };
  }

  private normalizePropertyStatus(status: any): 'vacant' | 'occupied' | 'maintenance' | 'advertising' {
    const statusStr = String(status || '').toLowerCase();
    if (statusStr.includes('vacant')) return 'vacant';
    if (statusStr.includes('occupied') || statusStr.includes('leased')) return 'occupied';
    if (statusStr.includes('maintenance')) return 'maintenance';
    if (statusStr.includes('advertising') || statusStr.includes('marketing')) return 'advertising';
    return 'vacant';
  }

  /**
   * Normalize tenant data from Palace.com API response
   */
  private normalizeTenants(data: any): PalaceTenant[] {
    const tenants = Array.isArray(data) ? data : data.tenants || data.data || [];
    return tenants.map((t: any) => this.normalizeTenant(t));
  }

  private normalizeTenant(t: any): PalaceTenant {
    return {
      id: t.id || t.tenantId || t.tenant_id,
      firstName: t.firstName || t.first_name || t.given_name || '',
      lastName: t.lastName || t.last_name || t.family_name || '',
      email: t.email || t.emailAddress,
      phone: t.phone || t.phoneNumber || t.home_phone,
      mobilePhone: t.mobilePhone || t.mobile || t.cell_phone,
      propertyId: t.propertyId || t.property_id,
      leaseStartDate: t.leaseStartDate ? new Date(t.leaseStartDate) : undefined,
      leaseEndDate: t.leaseEndDate ? new Date(t.leaseEndDate) : undefined,
      rentAmount: t.rentAmount || t.rent,
      rentFrequency: this.normalizeRentFrequency(t.rentFrequency || t.rent_frequency),
      bondAmount: t.bondAmount || t.bond || t.security_deposit,
      status: this.normalizeTenantStatus(t.status),
    };
  }

  private normalizeRentFrequency(freq: any): 'weekly' | 'fortnightly' | 'monthly' | undefined {
    const freqStr = String(freq || '').toLowerCase();
    if (freqStr.includes('week') && !freqStr.includes('fortnight')) return 'weekly';
    if (freqStr.includes('fortnight') || freqStr.includes('biweek')) return 'fortnightly';
    if (freqStr.includes('month')) return 'monthly';
    return undefined;
  }

  private normalizeTenantStatus(status: any): 'active' | 'pending' | 'ended' | 'breached' {
    const statusStr = String(status || '').toLowerCase();
    if (statusStr.includes('active') || statusStr.includes('current')) return 'active';
    if (statusStr.includes('pending')) return 'pending';
    if (statusStr.includes('breach')) return 'breached';
    if (statusStr.includes('end') || statusStr.includes('terminated')) return 'ended';
    return 'active';
  }

  /**
   * Normalize rent arrears data
   */
  private normalizeRentArrears(data: any): PalaceRentArrear[] {
    const arrears = Array.isArray(data) ? data : data.arrears || data.data || [];
    return arrears.map((a: any) => ({
      tenantId: a.tenantId || a.tenant_id,
      propertyId: a.propertyId || a.property_id,
      amountOwed: a.amountOwed || a.amount_owed || a.balance || 0,
      daysOverdue: a.daysOverdue || a.days_overdue || a.days_late || 0,
      lastPaymentDate: a.lastPaymentDate ? new Date(a.lastPaymentDate) : undefined,
      paymentArrangementBroken: a.paymentArrangementBroken || a.arrangement_broken || false,
    }));
  }

  /**
   * Normalize maintenance records
   */
  private normalizeMaintenanceRecords(data: any): PalaceMaintenanceRecord[] {
    const records = Array.isArray(data) ? data : data.maintenance || data.data || [];
    return records.map((m: any) => ({
      id: m.id || m.maintenanceId || m.maintenance_id,
      propertyId: m.propertyId || m.property_id,
      tenantId: m.tenantId || m.tenant_id,
      title: m.title || m.subject || m.description || '',
      description: m.description || m.details,
      category: m.category || m.type,
      urgency: this.normalizeUrgency(m.urgency || m.priority),
      status: m.status || 'pending',
      estimatedCost: m.estimatedCost || m.estimated_cost,
      actualCost: m.actualCost || m.actual_cost || m.final_cost,
      scheduledDate: m.scheduledDate ? new Date(m.scheduledDate) : undefined,
      completedDate: m.completedDate ? new Date(m.completedDate) : undefined,
      contractorName: m.contractorName || m.contractor_name || m.contractor,
      contractorContact: m.contractorContact || m.contractor_contact,
    }));
  }

  private normalizeUrgency(urgency: any): 'routine' | 'urgent' | 'emergency' | undefined {
    const urgencyStr = String(urgency || '').toLowerCase();
    if (urgencyStr.includes('emergency')) return 'emergency';
    if (urgencyStr.includes('urgent') || urgencyStr.includes('high')) return 'urgent';
    if (urgencyStr.includes('routine') || urgencyStr.includes('normal')) return 'routine';
    return undefined;
  }
}

/**
 * Create a Palace connector instance from integration settings
 */
export function createPalaceConnector(configData: string): PalaceConnector {
  try {
    const config: PalaceConfig = JSON.parse(configData);
    return new PalaceConnector(config);
  } catch (error) {
    console.error('[Palace] Failed to create connector:', error);
    throw new Error('Invalid Palace.com configuration');
  }
}
