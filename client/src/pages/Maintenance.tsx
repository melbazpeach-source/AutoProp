import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, DollarSign } from "lucide-react";

export default function Maintenance() {
  const { data: pendingRequests } = trpc.maintenance.pending.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Maintenance</h1>
          <p className="text-muted-foreground mt-2">Manage maintenance requests and approvals</p>
        </div>
        <Button>Create Request</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Pending Approval</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{pendingRequests?.length || 0}</div></CardContent>
        </Card>
      </div>
      {pendingRequests && pendingRequests.length > 0 ? (
        <div className="space-y-3">
          {pendingRequests.map((req) => (
            <Card key={req.id}>
              <CardHeader>
                <CardTitle>{req.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-bold">${req.estimatedCost || '0.00'}</span>
                </div>
                <Button>Approve</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="py-12 text-center"><Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">No pending requests</p></CardContent></Card>
      )}
    </div>
  );
}
