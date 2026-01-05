import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, CheckCircle2, XCircle, RefreshCw, ExternalLink, Workflow, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Integrations() {
  const { data: integrations, refetch } = trpc.integrations.list.useQuery();
  const configureMutation = trpc.integrations.configure.useMutation({
    onSuccess: () => {
      toast.success("Integration configuration saved");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });
  const syncPalace = trpc.palace.syncNow.useMutation({
    onSuccess: () => {
      toast.success("Palace.com sync completed");
      refetch();
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  // Configuration states
  const [palaceConfig, setPalaceConfig] = useState({ enabled: false, apiUrl: "", apiKey: "", agencyId: "" });
  const [outlookConfig, setOutlookConfig] = useState({ enabled: false, clientId: "", clientSecret: "", tenantId: "", userEmail: "" });
  const [vonageConfig, setVonageConfig] = useState({ enabled: false, apiKey: "", apiSecret: "", smsFrom: "", whatsappNumber: "" });
  const [slackConfig, setSlackConfig] = useState({ enabled: false, botToken: "", channelId: "", urgentChannelId: "" });
  const [n8nConfig, setN8nConfig] = useState({ enabled: false, webhookUrl: "", apiKey: "" });
  const [claudeConfig, setClaudeConfig] = useState({ enabled: false, apiKey: "" });
  const [chatgptConfig, setChatgptConfig] = useState({ enabled: false, apiKey: "", model: "gpt-4" });
  const [geminiConfig, setGeminiConfig] = useState({ enabled: false, apiKey: "" });

  // Find integrations
  const palaceIntegration = integrations?.find(i => i.service === 'palace');
  const outlookIntegration = integrations?.find(i => i.service === 'outlook');
  const vonageIntegration = integrations?.find(i => i.service === 'vonage');
  const slackIntegration = integrations?.find(i => i.service === 'slack');
  const n8nIntegration = integrations?.find(i => i.service === 'n8n');
  const claudeIntegration = integrations?.find(i => i.service === 'claude');
  const chatgptIntegration = integrations?.find(i => i.service === 'chatgpt');
  const geminiIntegration = integrations?.find(i => i.service === 'gemini');

  // Load configs
  useEffect(() => {
    if (palaceIntegration?.configData) {
      try { setPalaceConfig({ enabled: palaceIntegration.enabled, ...JSON.parse(palaceIntegration.configData) }); } catch (e) {}
    }
  }, [palaceIntegration]);

  useEffect(() => {
    if (outlookIntegration?.configData) {
      try { setOutlookConfig({ enabled: outlookIntegration.enabled, ...JSON.parse(outlookIntegration.configData) }); } catch (e) {}
    }
  }, [outlookIntegration]);

  useEffect(() => {
    if (vonageIntegration?.configData) {
      try { setVonageConfig({ enabled: vonageIntegration.enabled, ...JSON.parse(vonageIntegration.configData) }); } catch (e) {}
    }
  }, [vonageIntegration]);

  useEffect(() => {
    if (slackIntegration?.configData) {
      try { setSlackConfig({ enabled: slackIntegration.enabled, ...JSON.parse(slackIntegration.configData) }); } catch (e) {}
    }
  }, [slackIntegration]);

  useEffect(() => {
    if (n8nIntegration?.configData) {
      try { setN8nConfig({ enabled: n8nIntegration.enabled, ...JSON.parse(n8nIntegration.configData) }); } catch (e) {}
    }
  }, [n8nIntegration]);

  useEffect(() => {
    if (claudeIntegration?.configData) {
      try { setClaudeConfig({ enabled: claudeIntegration.enabled, ...JSON.parse(claudeIntegration.configData) }); } catch (e) {}
    }
  }, [claudeIntegration]);

  useEffect(() => {
    if (chatgptIntegration?.configData) {
      try { setChatgptConfig({ enabled: chatgptIntegration.enabled, ...JSON.parse(chatgptIntegration.configData) }); } catch (e) {}
    }
  }, [chatgptIntegration]);

  useEffect(() => {
    if (geminiIntegration?.configData) {
      try { setGeminiConfig({ enabled: geminiIntegration.enabled, ...JSON.parse(geminiIntegration.configData) }); } catch (e) {}
    }
  }, [geminiIntegration]);

  // Save functions
  const saveConfig = (service: string, config: any) => {
    const { enabled, ...configData } = config;
    configureMutation.mutate({ service: service as any, enabled, configData: JSON.stringify(configData) });
  };

  const IntegrationBadge = ({ enabled }: { enabled?: boolean | null }) => (
    enabled ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Connected
      </Badge>
    ) : (
      <Badge variant="secondary">
        <XCircle className="h-3 w-3 mr-1" />
        Not Configured
      </Badge>
    )
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Configure external services, AI providers, and automation workflows
        </p>
      </div>

      <Tabs defaultValue="core" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="core">Core Services</TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Providers
          </TabsTrigger>
          <TabsTrigger value="automation">
            <Workflow className="h-4 w-4 mr-2" />
            Automation
          </TabsTrigger>
        </TabsList>

        {/* Core Services Tab */}
        <TabsContent value="core" className="space-y-6">
          {/* Palace.com */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    Palace.com CRM
                    <IntegrationBadge enabled={palaceIntegration?.enabled} />
                  </CardTitle>
                  <CardDescription>Sync properties, tenants, rent arrears, and maintenance data</CardDescription>
                </div>
                {palaceIntegration?.enabled && (
                  <Button onClick={() => syncPalace.mutate()} disabled={syncPalace.isPending} variant="outline" size="sm">
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncPalace.isPending ? 'animate-spin' : ''}`} />
                    {syncPalace.isPending ? 'Syncing...' : 'Sync Now'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Switch checked={!!palaceConfig.enabled} onCheckedChange={(checked) => setPalaceConfig({ ...palaceConfig, enabled: checked })} />
                <Label className="text-sm font-medium">Enable Palace.com Integration</Label>
              </div>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="palace-url">API Base URL</Label>
                  <Input id="palace-url" placeholder="https://api.getpalace.com/v1" value={palaceConfig.apiUrl} onChange={(e) => setPalaceConfig({ ...palaceConfig, apiUrl: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="palace-key">API Key</Label>
                  <Input id="palace-key" type="password" placeholder="Enter API key" value={palaceConfig.apiKey} onChange={(e) => setPalaceConfig({ ...palaceConfig, apiKey: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="palace-agency">Agency ID</Label>
                  <Input id="palace-agency" placeholder="Your agency ID" value={palaceConfig.agencyId} onChange={(e) => setPalaceConfig({ ...palaceConfig, agencyId: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => saveConfig('palace', palaceConfig)} disabled={configureMutation.isPending}>
                  {configureMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Outlook */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Microsoft Outlook
                <IntegrationBadge enabled={outlookIntegration?.enabled} />
              </CardTitle>
              <CardDescription>Send and receive emails, auto-respond to tenant inquiries</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Switch checked={!!outlookConfig.enabled} onCheckedChange={(checked) => setOutlookConfig({ ...outlookConfig, enabled: checked })} />
                <Label className="text-sm font-medium">Enable Outlook Integration</Label>
              </div>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="outlook-client-id">Client ID</Label>
                  <Input id="outlook-client-id" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={outlookConfig.clientId} onChange={(e) => setOutlookConfig({ ...outlookConfig, clientId: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outlook-secret">Client Secret</Label>
                  <Input id="outlook-secret" type="password" placeholder="Enter client secret" value={outlookConfig.clientSecret} onChange={(e) => setOutlookConfig({ ...outlookConfig, clientSecret: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outlook-tenant">Tenant ID</Label>
                  <Input id="outlook-tenant" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={outlookConfig.tenantId} onChange={(e) => setOutlookConfig({ ...outlookConfig, tenantId: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outlook-email">User Email</Label>
                  <Input id="outlook-email" type="email" placeholder="property.manager@youragency.co.nz" value={outlookConfig.userEmail} onChange={(e) => setOutlookConfig({ ...outlookConfig, userEmail: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => saveConfig('outlook', outlookConfig)} disabled={configureMutation.isPending}>
                  {configureMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Vonage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Vonage (SMS & WhatsApp)
                <IntegrationBadge enabled={vonageIntegration?.enabled} />
              </CardTitle>
              <CardDescription>Send SMS and WhatsApp messages (NZ-compatible)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Switch checked={!!vonageConfig.enabled} onCheckedChange={(checked) => setVonageConfig({ ...vonageConfig, enabled: checked })} />
                <Label className="text-sm font-medium">Enable Vonage Integration</Label>
              </div>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vonage-key">API Key</Label>
                  <Input id="vonage-key" placeholder="Enter Vonage API key" value={vonageConfig.apiKey} onChange={(e) => setVonageConfig({ ...vonageConfig, apiKey: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vonage-secret">API Secret</Label>
                  <Input id="vonage-secret" type="password" placeholder="Enter API secret" value={vonageConfig.apiSecret} onChange={(e) => setVonageConfig({ ...vonageConfig, apiSecret: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vonage-sms-from">SMS Sender ID</Label>
                  <Input id="vonage-sms-from" placeholder="PropertyMgmt" value={vonageConfig.smsFrom} onChange={(e) => setVonageConfig({ ...vonageConfig, smsFrom: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vonage-whatsapp">WhatsApp Number (Optional)</Label>
                  <Input id="vonage-whatsapp" placeholder="+64xxxxxxxxx" value={vonageConfig.whatsappNumber} onChange={(e) => setVonageConfig({ ...vonageConfig, whatsappNumber: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => saveConfig('vonage', vonageConfig)} disabled={configureMutation.isPending}>
                  {configureMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Slack */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Slack Team Notifications
                <IntegrationBadge enabled={slackIntegration?.enabled} />
              </CardTitle>
              <CardDescription>Real-time team notifications for tickets and urgent issues</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Switch checked={!!slackConfig.enabled} onCheckedChange={(checked) => setSlackConfig({ ...slackConfig, enabled: checked })} />
                <Label className="text-sm font-medium">Enable Slack Integration</Label>
              </div>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slack-token">Bot Token</Label>
                  <Input id="slack-token" type="password" placeholder="xoxb-your-bot-token" value={slackConfig.botToken} onChange={(e) => setSlackConfig({ ...slackConfig, botToken: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slack-channel">Channel ID</Label>
                  <Input id="slack-channel" placeholder="C01234567AB" value={slackConfig.channelId} onChange={(e) => setSlackConfig({ ...slackConfig, channelId: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slack-urgent">Urgent Channel ID (Optional)</Label>
                  <Input id="slack-urgent" placeholder="C01234567CD" value={slackConfig.urgentChannelId} onChange={(e) => setSlackConfig({ ...slackConfig, urgentChannelId: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => saveConfig('slack', slackConfig)} disabled={configureMutation.isPending}>
                  {configureMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Providers Tab */}
        <TabsContent value="ai" className="space-y-6">
          {/* Claude */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Claude (Anthropic)
                <IntegrationBadge enabled={claudeIntegration?.enabled} />
              </CardTitle>
              <CardDescription>AI-powered email drafting, breach letters, and document analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-md">
                <Switch checked={!!claudeConfig.enabled} onCheckedChange={(checked) => setClaudeConfig({ ...claudeConfig, enabled: checked })} />
                <Label className="text-sm font-medium">Enable Claude Integration</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="claude-key">API Key</Label>
                <Input id="claude-key" type="password" placeholder="sk-ant-..." value={claudeConfig.apiKey} onChange={(e) => setClaudeConfig({ ...claudeConfig, apiKey: e.target.value })} />
                <p className="text-xs text-muted-foreground">Get your API key from console.anthropic.com</p>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => saveConfig('claude', claudeConfig)} disabled={configureMutation.isPending}>
                  {configureMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Get API Key
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ChatGPT */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ChatGPT (OpenAI)
                <IntegrationBadge enabled={chatgptIntegration?.enabled} />
              </CardTitle>
              <CardDescription>AI text generation and tenant communication assistance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <Switch checked={!!chatgptConfig.enabled} onCheckedChange={(checked) => setChatgptConfig({ ...chatgptConfig, enabled: checked })} />
                <Label className="text-sm font-medium">Enable ChatGPT Integration</Label>
              </div>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chatgpt-key">API Key</Label>
                  <Input id="chatgpt-key" type="password" placeholder="sk-..." value={chatgptConfig.apiKey} onChange={(e) => setChatgptConfig({ ...chatgptConfig, apiKey: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Get your API key from platform.openai.com</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chatgpt-model">Model</Label>
                  <Input id="chatgpt-model" placeholder="gpt-4" value={chatgptConfig.model} onChange={(e) => setChatgptConfig({ ...chatgptConfig, model: e.target.value })} />
                  <p className="text-xs text-muted-foreground">e.g., gpt-4, gpt-4-turbo, gpt-3.5-turbo</p>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => saveConfig('chatgpt', chatgptConfig)} disabled={configureMutation.isPending}>
                  {configureMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Get API Key
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Gemini */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Gemini (Google)
                <IntegrationBadge enabled={geminiIntegration?.enabled} />
              </CardTitle>
              <CardDescription>AI document analysis and maintenance cost forecasting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Switch checked={!!geminiConfig.enabled} onCheckedChange={(checked) => setGeminiConfig({ ...geminiConfig, enabled: checked })} />
                <Label className="text-sm font-medium">Enable Gemini Integration</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gemini-key">API Key</Label>
                <Input id="gemini-key" type="password" placeholder="AIza..." value={geminiConfig.apiKey} onChange={(e) => setGeminiConfig({ ...geminiConfig, apiKey: e.target.value })} />
                <p className="text-xs text-muted-foreground">Get your API key from makersuite.google.com</p>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => saveConfig('gemini', geminiConfig)} disabled={configureMutation.isPending}>
                  {configureMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Get API Key
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-6">
          {/* n8n */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                n8n Workflow Automation
                <IntegrationBadge enabled={n8nIntegration?.enabled} />
              </CardTitle>
              <CardDescription>Connect to hundreds of services and create complex automation workflows</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
                <Switch checked={!!n8nConfig.enabled} onCheckedChange={(checked) => setN8nConfig({ ...n8nConfig, enabled: checked })} />
                <Label className="text-sm font-medium">Enable n8n Integration</Label>
              </div>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="n8n-webhook">Webhook URL</Label>
                  <Input id="n8n-webhook" placeholder="https://your-n8n-instance.com/webhook/..." value={n8nConfig.webhookUrl} onChange={(e) => setN8nConfig({ ...n8nConfig, webhookUrl: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Create a webhook trigger in n8n and paste the URL here</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="n8n-key">API Key (Optional)</Label>
                  <Input id="n8n-key" type="password" placeholder="Enter n8n API key if required" value={n8nConfig.apiKey} onChange={(e) => setN8nConfig({ ...n8nConfig, apiKey: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Only needed if your n8n instance requires authentication</p>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => saveConfig('n8n', n8nConfig)} disabled={configureMutation.isPending}>
                  {configureMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://n8n.io" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Learn More
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Workflow className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground font-medium">Workflow Automation</p>
              <p className="text-sm text-muted-foreground mt-2">
                Use n8n to create custom workflows that trigger actions across all your integrated services
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
