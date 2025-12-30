/**
 * Multi-Channel Communications Service
 * 
 * Integrates with:
 * - Microsoft Graph API for Outlook email
 * - Twilio for SMS, WhatsApp, and Voice/Voicemail
 * 
 * Provides auto-responder functionality across all channels
 */

import axios, { AxiosInstance } from 'axios';
import { createCommunication, createTicket, getIntegrationSetting } from './db';
import { storagePut } from './storage';

// ============================================================================
// Microsoft Graph API (Outlook) Integration
// ============================================================================

export interface OutlookConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  userEmail: string;
  refreshToken?: string;
}

export class OutlookService {
  private accessToken?: string;
  private tokenExpiry?: Date;
  private config: OutlookConfig;
  private graphClient: AxiosInstance;

  constructor(config: OutlookConfig) {
    this.config = config;
    this.graphClient = axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      timeout: 30000,
    });

    this.graphClient.interceptors.request.use(async (config) => {
      await this.ensureAuthenticated();
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return;
    }

    try {
      const tokenEndpoint = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
      
      const params = new URLSearchParams();
      params.append('client_id', this.config.clientId);
      params.append('client_secret', this.config.clientSecret);
      params.append('scope', 'https://graph.microsoft.com/.default');
      
      if (this.config.refreshToken) {
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', this.config.refreshToken);
      } else {
        params.append('grant_type', 'client_credentials');
      }

      const response = await axios.post(tokenEndpoint, params);
      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);
    } catch (error) {
      console.error('[Outlook] Authentication failed:', error);
      throw new Error('Failed to authenticate with Microsoft Graph API');
    }
  }

  async sendEmail(to: string, subject: string, body: string, attachments?: Array<{ filename: string; content: Buffer; contentType: string }>) {
    try {
      const message: any = {
        subject,
        body: {
          contentType: 'HTML',
          content: body,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
      };

      if (attachments && attachments.length > 0) {
        message.attachments = attachments.map(att => ({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: att.filename,
          contentType: att.contentType,
          contentBytes: att.content.toString('base64'),
        }));
      }

      await this.graphClient.post(`/users/${this.config.userEmail}/sendMail`, {
        message,
        saveToSentItems: true,
      });

      console.log(`[Outlook] Email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('[Outlook] Failed to send email:', error);
      return false;
    }
  }

  async fetchRecentEmails(maxResults: number = 50) {
    try {
      const response = await this.graphClient.get(`/users/${this.config.userEmail}/messages`, {
        params: {
          $top: maxResults,
          $orderby: 'receivedDateTime DESC',
          $select: 'id,subject,from,toRecipients,receivedDateTime,body,hasAttachments',
        },
      });

      return response.data.value || [];
    } catch (error) {
      console.error('[Outlook] Failed to fetch emails:', error);
      return [];
    }
  }

  async replyToEmail(messageId: string, replyBody: string) {
    try {
      await this.graphClient.post(`/users/${this.config.userEmail}/messages/${messageId}/reply`, {
        comment: replyBody,
      });
      console.log(`[Outlook] Reply sent to message ${messageId}`);
      return true;
    } catch (error) {
      console.error('[Outlook] Failed to reply to email:', error);
      return false;
    }
  }
}

// ============================================================================
// Twilio Integration (SMS, WhatsApp, Voice)
// ============================================================================

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string; // Twilio phone number
  whatsappNumber?: string; // Twilio WhatsApp number (format: whatsapp:+1234567890)
}

export class TwilioService {
  private config: TwilioConfig;
  private client: AxiosInstance;

  constructor(config: TwilioConfig) {
    this.config = config;
    
    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
    this.client = axios.create({
      baseURL: `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}`,
      timeout: 30000,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  async sendSMS(to: string, body: string) {
    try {
      const params = new URLSearchParams();
      params.append('To', to);
      params.append('From', this.config.phoneNumber);
      params.append('Body', body);

      const response = await this.client.post('/Messages.json', params);
      console.log(`[Twilio] SMS sent to ${to}`);
      return response.data;
    } catch (error) {
      console.error('[Twilio] Failed to send SMS:', error);
      throw error;
    }
  }

  async sendWhatsApp(to: string, body: string) {
    try {
      if (!this.config.whatsappNumber) {
        throw new Error('WhatsApp number not configured');
      }

      const params = new URLSearchParams();
      params.append('To', `whatsapp:${to}`);
      params.append('From', this.config.whatsappNumber);
      params.append('Body', body);

      const response = await this.client.post('/Messages.json', params);
      console.log(`[Twilio] WhatsApp message sent to ${to}`);
      return response.data;
    } catch (error) {
      console.error('[Twilio] Failed to send WhatsApp message:', error);
      throw error;
    }
  }

  async makeCall(to: string, twimlUrl: string) {
    try {
      const params = new URLSearchParams();
      params.append('To', to);
      params.append('From', this.config.phoneNumber);
      params.append('Url', twimlUrl);

      const response = await this.client.post('/Calls.json', params);
      console.log(`[Twilio] Call initiated to ${to}`);
      return response.data;
    } catch (error) {
      console.error('[Twilio] Failed to make call:', error);
      throw error;
    }
  }

  async fetchRecentMessages(limit: number = 50) {
    try {
      const response = await this.client.get('/Messages.json', {
        params: {
          PageSize: limit,
        },
      });
      return response.data.messages || [];
    } catch (error) {
      console.error('[Twilio] Failed to fetch messages:', error);
      return [];
    }
  }

  async fetchRecentCalls(limit: number = 50) {
    try {
      const response = await this.client.get('/Calls.json', {
        params: {
          PageSize: limit,
        },
      });
      return response.data.calls || [];
    } catch (error) {
      console.error('[Twilio] Failed to fetch calls:', error);
      return [];
    }
  }

  async getVoicemailRecording(recordingSid: string): Promise<Buffer | null> {
    try {
      const response = await axios.get(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Recordings/${recordingSid}.mp3`,
        {
          responseType: 'arraybuffer',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64')}`,
          },
        }
      );
      return Buffer.from(response.data);
    } catch (error) {
      console.error('[Twilio] Failed to fetch voicemail recording:', error);
      return null;
    }
  }
}

// ============================================================================
// Unified Communications Service
// ============================================================================

export interface AutoResponderConfig {
  enabled: boolean;
  emailTemplate: string;
  smsTemplate: string;
  whatsappTemplate: string;
  voiceTemplate: string;
}

export class CommunicationsService {
  private outlookService?: OutlookService;
  private twilioService?: TwilioService;
  private autoResponderConfig: AutoResponderConfig = {
    enabled: true,
    emailTemplate: 'Thank you for contacting us. We have received your message and will respond within 24 hours.',
    smsTemplate: 'Thank you for your message. We will get back to you soon.',
    whatsappTemplate: 'Thank you for your message. We will get back to you soon.',
    voiceTemplate: 'Thank you for your call. We will return your call as soon as possible.',
  };

  async initialize() {
    // Initialize Outlook
    try {
      const outlookSettings = await getIntegrationSetting('outlook');
      if (outlookSettings && outlookSettings.enabled && outlookSettings.configData) {
        const config: OutlookConfig = JSON.parse(outlookSettings.configData);
        this.outlookService = new OutlookService(config);
        console.log('[Communications] Outlook service initialized');
      }
    } catch (error) {
      console.error('[Communications] Failed to initialize Outlook:', error);
    }

    // Initialize Twilio
    try {
      const twilioSettings = await getIntegrationSetting('twilio');
      if (twilioSettings && twilioSettings.enabled && twilioSettings.configData) {
        const config: TwilioConfig = JSON.parse(twilioSettings.configData);
        this.twilioService = new TwilioService(config);
        console.log('[Communications] Twilio service initialized');
      }
    } catch (error) {
      console.error('[Communications] Failed to initialize Twilio:', error);
    }
  }

  /**
   * Process inbound email and create ticket
   */
  async processInboundEmail(email: any) {
    try {
      const fromEmail = email.from?.emailAddress?.address;
      const subject = email.subject || 'No Subject';
      const body = email.body?.content || '';

      // Log communication
      const commResult = await createCommunication({
        channel: 'email',
        direction: 'inbound',
        fromAddress: fromEmail,
        toAddress: email.toRecipients?.[0]?.emailAddress?.address,
        subject,
        body,
        externalId: email.id,
      });

      // Create ticket
      await createTicket({
        ticketNumber: `EMAIL-${Date.now()}`,
        type: 'inquiry',
        status: 'open',
        subject,
        description: body,
      });

      // Send auto-response
      if (this.autoResponderConfig.enabled && this.outlookService) {
        await this.outlookService.replyToEmail(email.id, this.autoResponderConfig.emailTemplate);
        
        // Update communication record
        // Note: In production, you'd update the communication record with auto-response info
      }

      console.log(`[Communications] Processed inbound email from ${fromEmail}`);
    } catch (error) {
      console.error('[Communications] Failed to process inbound email:', error);
    }
  }

  /**
   * Process inbound SMS and create ticket
   */
  async processInboundSMS(message: any) {
    try {
      const from = message.from || message.From;
      const body = message.body || message.Body;

      // Log communication
      await createCommunication({
        channel: 'sms',
        direction: 'inbound',
        fromAddress: from,
        toAddress: message.to || message.To,
        body,
        externalId: message.sid || message.MessageSid,
      });

      // Create ticket
      await createTicket({
        ticketNumber: `SMS-${Date.now()}`,
        type: 'inquiry',
        status: 'open',
        subject: `SMS from ${from}`,
        description: body,
      });

      // Send auto-response
      if (this.autoResponderConfig.enabled && this.twilioService) {
        await this.twilioService.sendSMS(from, this.autoResponderConfig.smsTemplate);
      }

      console.log(`[Communications] Processed inbound SMS from ${from}`);
    } catch (error) {
      console.error('[Communications] Failed to process inbound SMS:', error);
    }
  }

  /**
   * Process inbound WhatsApp message and create ticket
   */
  async processInboundWhatsApp(message: any) {
    try {
      const from = (message.from || message.From).replace('whatsapp:', '');
      const body = message.body || message.Body;

      // Log communication
      await createCommunication({
        channel: 'whatsapp',
        direction: 'inbound',
        fromAddress: from,
        toAddress: (message.to || message.To).replace('whatsapp:', ''),
        body,
        externalId: message.sid || message.MessageSid,
      });

      // Create ticket
      await createTicket({
        ticketNumber: `WHATSAPP-${Date.now()}`,
        type: 'inquiry',
        status: 'open',
        subject: `WhatsApp from ${from}`,
        description: body,
      });

      // Send auto-response
      if (this.autoResponderConfig.enabled && this.twilioService) {
        await this.twilioService.sendWhatsApp(from, this.autoResponderConfig.whatsappTemplate);
      }

      console.log(`[Communications] Processed inbound WhatsApp from ${from}`);
    } catch (error) {
      console.error('[Communications] Failed to process inbound WhatsApp:', error);
    }
  }

  /**
   * Process inbound call/voicemail and create ticket
   */
  async processInboundCall(call: any) {
    try {
      const from = call.from || call.From;
      const status = call.status || call.CallStatus;

      // Check if voicemail was left
      let voicemailUrl: string | undefined;
      if (call.recordingSid) {
        const recording = await this.twilioService?.getVoicemailRecording(call.recordingSid);
        if (recording) {
          // Upload to S3
          const { url } = await storagePut(
            `voicemails/${call.recordingSid}.mp3`,
            recording,
            'audio/mpeg'
          );
          voicemailUrl = url;
        }
      }

      // Log communication
      await createCommunication({
        channel: status === 'completed' ? 'phone' : 'voicemail',
        direction: 'inbound',
        fromAddress: from,
        toAddress: call.to || call.To,
        body: voicemailUrl ? `Voicemail recording: ${voicemailUrl}` : 'Missed call',
        externalId: call.sid || call.CallSid,
        attachmentUrls: voicemailUrl ? JSON.stringify([voicemailUrl]) : undefined,
      });

      // Create ticket
      await createTicket({
        ticketNumber: `CALL-${Date.now()}`,
        type: 'inquiry',
        status: 'open',
        subject: `${status === 'completed' ? 'Call' : 'Missed call'} from ${from}`,
        description: voicemailUrl ? `Voicemail left. Recording: ${voicemailUrl}` : 'No voicemail left',
      });

      // Note: Auto-response for calls would be handled via TwiML in the webhook
      console.log(`[Communications] Processed inbound call from ${from}`);
    } catch (error) {
      console.error('[Communications] Failed to process inbound call:', error);
    }
  }

  /**
   * Send outbound email
   */
  async sendEmail(to: string, subject: string, body: string, attachments?: Array<{ filename: string; content: Buffer; contentType: string }>) {
    if (!this.outlookService) {
      throw new Error('Outlook service not initialized');
    }

    const success = await this.outlookService.sendEmail(to, subject, body, attachments);
    
    if (success) {
      // Log communication
      await createCommunication({
        channel: 'email',
        direction: 'outbound',
        fromAddress: this.outlookService['config'].userEmail,
        toAddress: to,
        subject,
        body,
      });
    }

    return success;
  }

  /**
   * Send outbound SMS
   */
  async sendSMS(to: string, body: string) {
    if (!this.twilioService) {
      throw new Error('Twilio service not initialized');
    }

    const result = await this.twilioService.sendSMS(to, body);
    
    // Log communication
    await createCommunication({
      channel: 'sms',
      direction: 'outbound',
      fromAddress: this.twilioService['config'].phoneNumber,
      toAddress: to,
      body,
      externalId: result.sid,
    });

    return result;
  }

  /**
   * Send outbound WhatsApp message
   */
  async sendWhatsApp(to: string, body: string) {
    if (!this.twilioService) {
      throw new Error('Twilio service not initialized');
    }

    const result = await this.twilioService.sendWhatsApp(to, body);
    
    // Log communication
    await createCommunication({
      channel: 'whatsapp',
      direction: 'outbound',
      fromAddress: this.twilioService['config'].whatsappNumber || '',
      toAddress: to,
      body,
      externalId: result.sid,
    });

    return result;
  }
}

// Export singleton instance
export const communicationsService = new CommunicationsService();
