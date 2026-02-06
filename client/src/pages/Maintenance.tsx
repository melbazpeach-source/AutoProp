import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, DollarSign, Filter } from "lucide-react";

export default function Maintenance() {
  type MaintenanceCategory = 'plumbing' | 'electrical' | 'hvac' | 'structural' | 'appliance' | 'landscaping' | 'pest_control' | 'cleaning' | 'other';
  const [filters, setFilters] = useState<{ propertyId?: number; tenancyId?: number; startDate?: string; endDate?: string; category?: MaintenanceCategory }>({});
  
  const { data: pendingRequests } = trpc.maintenance.pendingApprovals.useQuery();
  const { data: costSummary } = trpc.maintenance.getCostSummary.useQuery(filters);
  const { data: properties } = trpc.properties.list.useQuery();
  
  const approveMutation = trpc.maintenance.approve.useMutation();
  const rejectMutation = trpc.maintenance.reject.useMutation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Maintenance</h1>
          <p className="text-muted-foreground mt-2">Manage maintenance requests and approvals</p>
        </div>
        <Button>Create Request</Button>
      </div>

      {/* Cost Tracking Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Cost Tracking Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>Property Address</Label>
              <Select 
                value={filters.propertyId?.toString()} 
                onValueChange={(v) => setFilters({ ...filters, propertyId: v ? parseInt(v) : undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.address}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Maintenance Type</Label>
              <Select 
                value={filters.category} 
                onValueChange={(v) => setFilters({ ...filters, category: (v || undefined) as MaintenanceCategory | undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plumbing">Plumbing</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="hvac">HVAC</SelectItem>
                  <SelectItem value="structural">Structural</SelectItem>
                  <SelectItem value="appliance">Appliance</SelectItem>
                  <SelectItem value="landscaping">Landscaping</SelectItem>
                  <SelectItem value="pest_control">Pest Control</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Start Date</Label>
              <Input 
                type="date" 
                value={filters.startDate || ''} 
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
              />
            </div>
            
            <div>
              <Label>End Date</Label>
              <Input 
                type="date" 
                value={filters.endDate || ''} 
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
              />
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => setFilters({})}
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* Cost Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Pending Approval</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{pendingRequests?.length || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Total Cost (Filtered)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">${costSummary?.total.toFixed(2) || '0.00'}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Approved Cost</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">${((costSummary?.byStatus as any)?.approved || 0).toFixed(2)}</div></CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests && pendingRequests.length > 0 ? (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <Card key={req.id}>
                  <CardHeader>
                    <CardTitle>{req.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{req.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-bold">${req.estimatedCost || '0.00'}</span>
                      </div>
                      <Badge>{req.category}</Badge>
                      <Badge variant="outline">{req.urgency}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={async () => {
                        await approveMutation.mutateAsync({ id: req.id, approvedBy: 1 });
                        window.location.reload();
                      }}>Approve</Button>
                      <Button variant="outline" onClick={async () => {
                        const reason = prompt('Rejection reason:');
                        if (reason) {
                          await rejectMutation.mutateAsync({ id: req.id, rejectedBy: 1, reason });
                          window.location.reload();
                        }
                      }}>Reject</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No pending requests</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
