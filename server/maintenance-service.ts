import { getDb } from './db';
import { maintenanceRequests } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

export class MaintenanceService {
  static async getPendingApprovals() {
    const db = await getDb();
    if (!db) return [];
    
    return await db
      .select()
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.status, 'pending_approval'));
  }

  static async approve(id: number, approvedBy: number) {
    const db = await getDb();
    if (!db) return null;
    
    await db
      .update(maintenanceRequests)
      .set({ 
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
      })
      .where(eq(maintenanceRequests.id, id));
    
    return { success: true };
  }

  static async reject(id: number, rejectedBy: number, reason: string) {
    const db = await getDb();
    if (!db) return null;
    
    await db
      .update(maintenanceRequests)
      .set({ 
        status: 'cancelled',
        notes: reason,
      })
      .where(eq(maintenanceRequests.id, id));
    
    return { success: true };
  }

  static async getCostSummary(filters?: { propertyId?: number; tenancyId?: number; startDate?: string; endDate?: string; category?: string }) {
    const db = await getDb();
    if (!db) return { total: 0, byMonth: [], byStatus: {}, byProperty: [], byCategory: [] };
    
    let query = db.select().from(maintenanceRequests);
    
    // Apply filters
    if (filters?.propertyId) {
      query = query.where(eq(maintenanceRequests.propertyId, filters.propertyId)) as any;
    }
    if (filters?.category) {
      query = query.where(eq(maintenanceRequests.category, filters.category as any)) as any;
    }
    
    const requests = await query;
    
    // Filter by date range in memory (simpler than SQL date comparison)
    let filteredRequests = requests;
    if (filters?.startDate || filters?.endDate) {
      filteredRequests = requests.filter(r => {
        const reqDate = new Date(r.createdAt);
        if (filters.startDate && reqDate < new Date(filters.startDate)) return false;
        if (filters.endDate && reqDate > new Date(filters.endDate)) return false;
        return true;
      });
    }
    
    const total = requests.reduce((sum, r) => sum + parseFloat(r.estimatedCost || '0'), 0);
    
    const byStatus = requests.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + parseFloat(r.estimatedCost || '0');
      return acc;
    }, {} as Record<string, number>);
    
    const byMonth = requests.reduce((acc, r) => {
      const month = new Date(r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      const existing = acc.find(m => m.month === month);
      if (existing) {
        existing.cost += parseFloat(r.estimatedCost || '0');
      } else {
        acc.push({ month, cost: parseFloat(r.estimatedCost || '0') });
      }
      return acc;
    }, [] as Array<{ month: string; cost: number }>);
    
    return { total, byMonth, byStatus };
  }
}
