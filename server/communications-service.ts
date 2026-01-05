/**
 * Multi-Channel Communications Service
 * 
 * Integrates with:
 * - Microsoft Graph API for Outlook email
 * - Vonage (formerly Nexmo) for SMS and WhatsApp Business API
 * - Slack for team notifications
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
// Vonage Integration (SMS & WhatsApp Business API)
// ============================================================================

export interface VonageConfig {
  apiKey: string;
  apiSecret: string;
  smsFrom: string; // Sender ID for SMS (e.g., "PropertyMgmt")
  whatsappNumber?: string; // WhatsApp Business number
}

export class VonageService {
  private config: VonageConfig;
  private client: AxiosInstance;

  constructor(config: VonageConfig) {
    this.config = config;
    
    this.client = axios.create({
      timeout: 30000,
    });
  }

  async sendSMS(to: string, text: string) {
    try {
      const response = await axios.post(
        'https://rest.nexmo.com/sms/json',
        {
          from: this.config.smsFrom,
          to: to.replace(/\D/g, ''), // Remove non-digits
          text,
          api_key: this.config.apiKey,
          api_secret: this.config.apiSecret,
        }
      );

      if (response.data.messages && response.data.messages[0].status === '0') {
        console.log(`[Vonage] SMS sent to ${to}`);
        return response.data.messages[0];
      } else {
        const errorText = response.data.messages?.[0]?.['error-text'] || 'Unknown error';
        console.error(`[Vonage] SMS send failed: ${errorText}`);
        throw new Error(errorText);
      }
    } catch (error) {
      console.error('[Vonage] Failed to send SMS:', error);
      throw error;
    }
  }

  async sendWhatsApp(to: string, text: string) {
    try {
      if (!this.config.whatsappNumber) {
        throw new Error('WhatsApp number not configured');
      }

      const response = await axios.post(
        'https://messages-sandbox.nexmo.com/v1/messages',
        {
          from: this.config.whatsappNumber,
          to,
          message_type: 'text',
          text,
          channel: 'whatsapp',
        },
        {
          auth: {
            username: this.config.apiKey,
            password: this.config.apiSecret,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`[Vonage] WhatsApp message sent to ${to}`);
      return response.data;
    } catch (error) {
      console.error('[Vonage] Failed to send WhatsApp message:', error);
      throw error;
    }
  }

  async fetchRecentMessages(limit: number = 50) {
    // Note: Vonage doesn't have a direct "fetch messages" API like Twilio
    // Messages are typically received via webhooks
    // This would require storing messages in your database when webhooks are received
    console.warn('[Vonage] Message fetching not directly supported - use webhooks');
    return [];
  }
}

// ============================================================================
// Slack Integration for Team Notifications
// ============================================================================

export interface SlackConfig {
  botToken: string;
  channelId: string;
  urgentChannelId?: string; // Optional separate channel for urgent notifications
}

export class SlackService {
  private config: SlackConfig;
  private client: AxiosInstance;

  constructor(config: SlackConfig) {
    this.config = config;
    
    this.client = axios.create({
      baseURL: 'https://slack.com/api',
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${config.botToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async postMessage(text: string, urgent: boolean = false) {
    try {
      const channel = urgent && this.config.urgentChannelId 
        ? this.config.urgentChannelId 
        : this.config.channelId;

      const formattedText = urgent ? `🚨 *URGENT* 🚨\n${text}` : text;

      const response = await this.client.post('/chat.postMessage', {
        channel,
        text: formattedText,
        mrkdwn: true,
      });

      if (response.data.ok) {
        console.log(`[Slack] Message posted to ${channel}`);
        return response.data;
      } else {
        throw new Error(response.data.error || 'Unknown Slack API error');
      }
    } catch (error) {
      console.error('[Slack] Failed to post message:', error);
      throw error;
    }
  }

  async postRichMessage(blocks: any[], urgent: boolean = false) {
    try {
      const channel = urgent && this.config.urgentChannelId 
        ? this.config.urgentChannelId 
        : this.config.channelId;

      const response = await this.client.post('/chat.postMessage', {
        channel,
        blocks,
      });

      if (response.data.ok) {
        console.log(`[Slack] Rich message posted to ${channel}`);
        return response.data;
      } else {
        throw new Error(response.data.error || 'Unknown Slack API error');
      }
    } catch (error) {
      console.error('[Slack] Failed to post rich message:', error);
      throw error;
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
}

export class CommunicationsService {
  private outlookService?: OutlookService;
  private vonageService?: VonageService;
  private slackService?: SlackService;
  private autoResponderConfig: AutoResponderConfig = {
    enabled: true,
    emailTemplate: 'Thank you for contacting us. We have received your message and will respond within 24 hours.',
    smsTemplate: 'Thank you for your message. We will get back to you soon.',
    whatsappTemplate: 'Thank you for your message. We will get back to you soon.',
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

    // Initialize Vonage
    try {
      const vonageSettings = await getIntegrationSetting('vonage');
      if (vonageSettings && vonageSettings.enabled && vonageSettings.configData) {
        const config: VonageConfig = JSON.parse(vonageSettings.configData);
        this.vonageService = new VonageService(config);
        console.log('[Communications] Vonage service initialized');
      }
    } catch (error) {
      console.error('[Communications] Failed to initialize Vonage:', error);
    }

    // Initialize Slack
    try {
      const slackSettings = await getIntegrationSetting('slack');
      if (slackSettings && slackSettings.enabled && slackSettings.configData) {
        const config: SlackConfig = JSON.parse(slackSettings.configData);
        this.slackService = new SlackService(config);
        console.log('[Communications] Slack service initialized');
      }
    } catch (error) {
      console.error('[Communications] Failed to initialize Slack:', error);
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
      await createCommunication({
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
      }

      // Notify team via Slack
      if (this.slackService) {
        await this.slackService.postMessage(
          `📧 New email from *${fromEmail}*\nSubject: ${subject}`,
          false
        );
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
      const from = message.msisdn || message.from;
      const text = message.text || message.body;

      // Log communication
      await createCommunication({
        channel: 'sms',
        direction: 'inbound',
        fromAddress: from,
        toAddress: message.to,
        body: text,
        externalId: message.messageId || message['message-id'],
      });

      // Create ticket
      await createTicket({
        ticketNumber: `SMS-${Date.now()}`,
        type: 'inquiry',
        status: 'open',
        subject: `SMS from ${from}`,
        description: text,
      });

      // Send auto-response
      if (this.autoResponderConfig.enabled && this.vonageService) {
        await this.vonageService.sendSMS(from, this.autoResponderConfig.smsTemplate);
      }

      // Notify team via Slack
      if (this.slackService) {
        await this.slackService.postMessage(
          `📱 New SMS from *${from}*\n${text}`,
          false
        );
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
      const from = message.from;
      const text = message.message?.content?.text || message.text;

      // Log communication
      await createCommunication({
        channel: 'whatsapp',
        direction: 'inbound',
        fromAddress: from,
        toAddress: message.to,
        body: text,
        externalId: message.message_uuid || message.messageId,
      });

      // Create ticket
      await createTicket({
        ticketNumber: `WHATSAPP-${Date.now()}`,
        type: 'inquiry',
        status: 'open',
        subject: `WhatsApp from ${from}`,
        description: text,
      });

      // Send auto-response
      if (this.autoResponderConfig.enabled && this.vonageService) {
        await this.vonageService.sendWhatsApp(from, this.autoResponderConfig.whatsappTemplate);
      }

      // Notify team via Slack
      if (this.slackService) {
        await this.slackService.postMessage(
          `💬 New WhatsApp from *${from}*\n${text}`,
          false
        );
      }

      console.log(`[Communications] Processed inbound WhatsApp from ${from}`);
    } catch (error) {
      console.error('[Communications] Failed to process inbound WhatsApp:', error);
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
      await createCommunication({
        channel: 'email',
        direction: 'outbound',
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
  async sendSMS(to: string, text: string) {
    if (!this.vonageService) {
      throw new Error('Vonage service not initialized');
    }

    const result = await this.vonageService.sendSMS(to, text);
    
    await createCommunication({
      channel: 'sms',
      direction: 'outbound',
      toAddress: to,
      body: text,
      externalId: result['message-id'],
    });

    return result;
  }

  /**
   * Send outbound WhatsApp message
   */
  async sendWhatsApp(to: string, text: string) {
    if (!this.vonageService) {
      throw new Error('Vonage service not initialized');
    }

    const result = await this.vonageService.sendWhatsApp(to, text);
    
    await createCommunication({
      channel: 'whatsapp',
      direction: 'outbound',
      toAddress: to,
      body: text,
      externalId: result.message_uuid,
    });

    return result;
  }

  /**
   * Send Slack notification to team
   */
  async notifyTeam(message: string, urgent: boolean = false) {
    if (!this.slackService) {
      console.warn('[Communications] Slack not configured, notification not sent');
      return false;
    }

    try {
      await this.slackService.postMessage(message, urgent);
      return true;
    } catch (error) {
      console.error('[Communications] Failed to send Slack notification:', error);
      return false;
    }
  }
}

// Export singleton instance
export const communicationsService = new CommunicationsService();
