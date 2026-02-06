import { getDb } from './db';
import { rentArrears, tenants, properties } from '../drizzle/schema';
import { eq, gte, sql } from 'drizzle-orm';
import { invokeLLM } from './_core/llm';

export class ArrearsService {
  static async checkOverdueArrears() {
    const db = await getDb();
    if (!db) return [];

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const overdue = await db
      .select({
        arrears: rentArrears,
        tenant: tenants,
        property: properties,
      })
      .from(rentArrears)
      .leftJoin(tenants, eq(rentArrears.tenantId, tenants.id))
      .leftJoin(properties, eq(rentArrears.propertyId, properties.id))
      .where(gte(rentArrears.daysOverdue, 10));

    return overdue;
  }

  static async generateBreachLetter(arrears: any) {
    const prompt = `Generate a professional rent arrears breach letter for:
Tenant: ${arrears.tenant.name}
Property: ${arrears.property.address}
Amount Owed: $${arrears.arrears.amountOwed}
Days Overdue: ${arrears.arrears.daysOverdue}

Include:
- Formal tone
- Clear statement of arrears
- Payment deadline (7 days)
- Consequences of non-payment
- Contact information for payment arrangements`;

    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a property management legal assistant.' },
        { role: 'user', content: prompt },
      ],
    });

    return response.choices[0]?.message?.content || '';
  }

  static async getDailySummary() {
    const overdue = await this.checkOverdueArrears();
    
    const summary = {
      totalOverdue: overdue.length,
      totalAmountOwed: overdue.reduce((sum, item) => sum + parseFloat(item.arrears.amountOwed), 0),
      critical: overdue.filter(item => item.arrears.daysOverdue >= 30),
      warning: overdue.filter(item => item.arrears.daysOverdue >= 10 && item.arrears.daysOverdue < 30),
    };

    return summary;
  }
}
