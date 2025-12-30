/**
 * Palace.com Data Synchronization Service
 * 
 * Handles scheduled synchronization of data from Palace.com CRM to local database
 */

import { PalaceConnector, createPalaceConnector } from './palace-connector';
import {
  upsertProperty,
  upsertTenant,
  upsertRentArrear,
  createMaintenanceRequest,
  getIntegrationSetting,
  upsertIntegrationSetting,
  getPropertyByPalaceId,
  getTenantById,
} from './db';

export interface SyncResult {
  success: boolean;
  propertiesSynced: number;
  tenantsSynced: number;
  arrearsSynced: number;
  maintenanceSynced: number;
  errors: string[];
}

export class PalaceSyncService {
  private connector: PalaceConnector | null = null;
  private syncInProgress = false;

  /**
   * Initialize the Palace connector from database settings
   */
  async initialize(): Promise<boolean> {
    try {
      const settings = await getIntegrationSetting('palace');
      
      if (!settings || !settings.enabled || !settings.configData) {
        console.log('[PalaceSync] Palace.com integration not configured or disabled');
        return false;
      }

      this.connector = createPalaceConnector(settings.configData);
      
      // Test connection
      const connected = await this.connector.testConnection();
      if (!connected) {
        console.error('[PalaceSync] Failed to connect to Palace.com API');
        await upsertIntegrationSetting({
          service: 'palace',
          syncStatus: 'error',
          errorMessage: 'Failed to connect to Palace.com API',
        });
        return false;
      }

      console.log('[PalaceSync] Successfully connected to Palace.com');
      return true;
    } catch (error) {
      console.error('[PalaceSync] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Perform full data synchronization
   */
  async syncAll(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.log('[PalaceSync] Sync already in progress, skipping');
      return {
        success: false,
        propertiesSynced: 0,
        tenantsSynced: 0,
        arrearsSynced: 0,
        maintenanceSynced: 0,
        errors: ['Sync already in progress'],
      };
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      propertiesSynced: 0,
      tenantsSynced: 0,
      arrearsSynced: 0,
      maintenanceSynced: 0,
      errors: [],
    };

    try {
      // Update sync status
      await upsertIntegrationSetting({
        service: 'palace',
        syncStatus: 'syncing',
        errorMessage: null,
      });

      // Initialize if not already done
      if (!this.connector) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize Palace connector');
        }
      }

      // Sync properties
      try {
        result.propertiesSynced = await this.syncProperties();
      } catch (error) {
        const errorMsg = `Property sync failed: ${error}`;
        console.error('[PalaceSync]', errorMsg);
        result.errors.push(errorMsg);
      }

      // Sync tenants
      try {
        result.tenantsSynced = await this.syncTenants();
      } catch (error) {
        const errorMsg = `Tenant sync failed: ${error}`;
        console.error('[PalaceSync]', errorMsg);
        result.errors.push(errorMsg);
      }

      // Sync rent arrears
      try {
        result.arrearsSynced = await this.syncRentArrears();
      } catch (error) {
        const errorMsg = `Rent arrears sync failed: ${error}`;
        console.error('[PalaceSync]', errorMsg);
        result.errors.push(errorMsg);
      }

      // Sync maintenance records
      try {
        result.maintenanceSynced = await this.syncMaintenanceRecords();
      } catch (error) {
        const errorMsg = `Maintenance sync failed: ${error}`;
        console.error('[PalaceSync]', errorMsg);
        result.errors.push(errorMsg);
      }

      // Update sync status
      await upsertIntegrationSetting({
        service: 'palace',
        syncStatus: 'idle',
        lastSyncAt: new Date(),
        errorMessage: result.errors.length > 0 ? result.errors.join('; ') : null,
      });

      result.success = result.errors.length === 0;
      console.log('[PalaceSync] Sync completed:', result);

    } catch (error) {
      result.success = false;
      const errorMsg = `Sync failed: ${error}`;
      result.errors.push(errorMsg);
      console.error('[PalaceSync]', errorMsg);

      await upsertIntegrationSetting({
        service: 'palace',
        syncStatus: 'error',
        errorMessage: errorMsg,
      });
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Sync properties from Palace.com
   */
  private async syncProperties(): Promise<number> {
    if (!this.connector) throw new Error('Connector not initialized');

    const palaceProperties = await this.connector.fetchProperties();
    let syncedCount = 0;

    for (const palaceProperty of palaceProperties) {
      try {
        await upsertProperty({
          palaceId: palaceProperty.id,
          address: palaceProperty.address,
          suburb: palaceProperty.suburb,
          state: palaceProperty.state,
          postcode: palaceProperty.postcode,
          propertyType: palaceProperty.propertyType,
          bedrooms: palaceProperty.bedrooms,
          bathrooms: palaceProperty.bathrooms,
          parkingSpaces: palaceProperty.parkingSpaces,
          weeklyRent: palaceProperty.weeklyRent?.toString(),
          status: palaceProperty.status,
          managerId: null, // Will be mapped separately if needed
        });
        syncedCount++;
      } catch (error) {
        console.error(`[PalaceSync] Failed to sync property ${palaceProperty.id}:`, error);
      }
    }

    console.log(`[PalaceSync] Synced ${syncedCount} properties`);
    return syncedCount;
  }

  /**
   * Sync tenants from Palace.com
   */
  private async syncTenants(): Promise<number> {
    if (!this.connector) throw new Error('Connector not initialized');

    const palaceTenants = await this.connector.fetchTenants();
    let syncedCount = 0;

    for (const palaceTenant of palaceTenants) {
      try {
        // Find property by Palace ID if provided
        let propertyId: number | null = null;
        if (palaceTenant.propertyId) {
          const property = await getPropertyByPalaceId(palaceTenant.propertyId);
          propertyId = property?.id ?? null;
        }

        await upsertTenant({
          palaceId: palaceTenant.id,
          firstName: palaceTenant.firstName,
          lastName: palaceTenant.lastName,
          email: palaceTenant.email,
          phone: palaceTenant.phone,
          mobilePhone: palaceTenant.mobilePhone,
          propertyId,
          leaseStartDate: palaceTenant.leaseStartDate,
          leaseEndDate: palaceTenant.leaseEndDate,
          rentAmount: palaceTenant.rentAmount?.toString(),
          rentFrequency: palaceTenant.rentFrequency,
          bondAmount: palaceTenant.bondAmount?.toString(),
          status: palaceTenant.status,
        });
        syncedCount++;
      } catch (error) {
        console.error(`[PalaceSync] Failed to sync tenant ${palaceTenant.id}:`, error);
      }
    }

    console.log(`[PalaceSync] Synced ${syncedCount} tenants`);
    return syncedCount;
  }

  /**
   * Sync rent arrears from Palace.com
   */
  private async syncRentArrears(): Promise<number> {
    if (!this.connector) throw new Error('Connector not initialized');

    const palaceArrears = await this.connector.fetchRentArrears();
    let syncedCount = 0;

    for (const palaceArrear of palaceArrears) {
      try {
        // Find local tenant and property IDs
        const property = await getPropertyByPalaceId(palaceArrear.propertyId);
        if (!property) {
          console.warn(`[PalaceSync] Property not found for arrear: ${palaceArrear.propertyId}`);
          continue;
        }

        // Find tenant by palace ID (need to query tenants table)
        const tenants = await import('./db').then(m => m.getTenantsByPropertyId(property.id));
        const tenant = tenants.find(t => t.palaceId === palaceArrear.tenantId);
        
        if (!tenant) {
          console.warn(`[PalaceSync] Tenant not found for arrear: ${palaceArrear.tenantId}`);
          continue;
        }

        await upsertRentArrear({
          tenantId: tenant.id,
          propertyId: property.id,
          amountOwed: palaceArrear.amountOwed.toString(),
          daysOverdue: palaceArrear.daysOverdue,
          lastPaymentDate: palaceArrear.lastPaymentDate,
          paymentArrangementBroken: palaceArrear.paymentArrangementBroken,
        });
        syncedCount++;
      } catch (error) {
        console.error(`[PalaceSync] Failed to sync arrear:`, error);
      }
    }

    console.log(`[PalaceSync] Synced ${syncedCount} rent arrears`);
    return syncedCount;
  }

  /**
   * Sync maintenance records from Palace.com
   */
  private async syncMaintenanceRecords(): Promise<number> {
    if (!this.connector) throw new Error('Connector not initialized');

    const palaceRecords = await this.connector.fetchMaintenanceRecords();
    let syncedCount = 0;

    for (const palaceRecord of palaceRecords) {
      try {
        // Find local property ID
        const property = await getPropertyByPalaceId(palaceRecord.propertyId);
        if (!property) {
          console.warn(`[PalaceSync] Property not found for maintenance: ${palaceRecord.propertyId}`);
          continue;
        }

        // Find tenant if provided
        let tenantId: number | null = null;
        if (palaceRecord.tenantId) {
          const tenants = await import('./db').then(m => m.getTenantsByPropertyId(property.id));
          const tenant = tenants.find(t => t.palaceId === palaceRecord.tenantId);
          tenantId = tenant?.id ?? null;
        }

        // Only create if it doesn't exist (we don't have a unique identifier from Palace)
        // In a real implementation, you'd want to track Palace maintenance IDs
        await createMaintenanceRequest({
          propertyId: property.id,
          tenantId,
          title: palaceRecord.title,
          description: palaceRecord.description,
          category: palaceRecord.category as any,
          urgency: palaceRecord.urgency,
          status: 'draft', // Import as draft for review
          estimatedCost: palaceRecord.estimatedCost?.toString(),
          actualCost: palaceRecord.actualCost?.toString(),
          scheduledDate: palaceRecord.scheduledDate,
          completedDate: palaceRecord.completedDate,
          contractorName: palaceRecord.contractorName,
          contractorContact: palaceRecord.contractorContact,
        });
        syncedCount++;
      } catch (error) {
        console.error(`[PalaceSync] Failed to sync maintenance record:`, error);
      }
    }

    console.log(`[PalaceSync] Synced ${syncedCount} maintenance records`);
    return syncedCount;
  }
}

// Export singleton instance
export const palaceSyncService = new PalaceSyncService();
