import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";

export default function Integrations() {
  const { data: integrations } = trpc.integrations.list.useQuery();
  const syncPalace = trpc.palace.syncNow.useMutation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-2">Manage external service integrations</p>
      </div>
      <div className="space-y-4">
        {integrations?.map((integration) => (
          <Card key={integration.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="capitalize">{integration.service}</CardTitle>
                  <CardDescription>
                    {integration.enabled ? 'Connected' : 'Not configured'}
                  </CardDescription>
                </div>
                <Badge variant={integration.enabled ? 'default' : 'secondary'}>
                  {integration.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {integration.service === 'palace' && integration.enabled && (
                <Button onClick={() => syncPalace.mutate()} disabled={syncPalace.isPending}>
                  {syncPalace.isPending ? 'Syncing...' : 'Sync Now'}
                </Button>
              )}
              {!integration.enabled && <Button variant="outline">Configure</Button>}
            </CardContent>
          </Card>
        ))}
        {(!integrations || integrations.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No integrations configured</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
