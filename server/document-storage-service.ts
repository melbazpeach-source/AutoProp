import { storagePut, storageGet } from './storage';
import { getDb } from './db';
import { integrationSettings, documents } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

type StorageProvider = 's3' | 'google_drive' | 'dropbox' | 'onedrive';

export class DocumentStorageService {
  static async getActiveProvider(): Promise<StorageProvider> {
    const db = await getDb();
    if (!db) return 's3';
    
    const providers = await db.select().from(integrationSettings)
      .where(eq(integrationSettings.enabled, true));
    
    const storageProvider = providers.find(p => 
      ['s3', 'google_drive', 'dropbox', 'onedrive'].includes(p.service)
    );
    
    return (storageProvider?.service as StorageProvider) || 's3';
  }

  static async uploadDocument(
    file: Buffer,
    filename: string,
    propertyId: number,
    category: string,
    mimeType: string
  ) {
    const provider = await this.getActiveProvider();
    const folderPath = `property-${propertyId}/${category}`;
    const fileKey = `${folderPath}/${Date.now()}-${filename}`;
    
    let url: string;
    
    switch (provider) {
      case 's3':
        const result = await storagePut(fileKey, file, mimeType);
        url = result.url;
        break;
      case 'google_drive':
      case 'dropbox':
      case 'onedrive':
        // Placeholder - would integrate with respective APIs
        url = `${provider}://${fileKey}`;
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
    
    const db = await getDb();
    if (db) {
      await db.insert(documents).values({
        propertyId,
        fileName: filename,
        fileKey,
        fileUrl: url,
        mimeType,
        documentType: category as any,
        uploadedBy: 1,
      });
    }
    
    return { url, fileKey, provider };
  }

  static async getDocument(fileKey: string) {
    const provider = await this.getActiveProvider();
    
    switch (provider) {
      case 's3':
        return await storageGet(fileKey);
      default:
        return { url: `${provider}://${fileKey}` };
    }
  }
}
