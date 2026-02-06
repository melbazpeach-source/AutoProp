import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Clock, CheckCircle, X, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Alerts() {
  const [statusFilter, setStatusFilter] = useState<'active' | 'resolved' | 'dismissed' | 'all'>('active');
  const [priorityFilter, setPriorityFilter] = useState<'low' | 'medium' | 'high' | 'urgent' | 'all'>('all');
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  const { data: alerts, isLoading, refetch } = trpc.tenancies.getAllAlerts.useQuery({
    status: statusFilter,
    priority: priorityFilter,
  });

  const updateAlert = trpc.tenancies.updateAlert.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedAlert(null);
    },
  });

  const getCountdown = (dueDate: Date | null) => {
    if (!dueDate) return null;
    
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    
    if (diff < 0) return "Overdue";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getAlertTypeLabel = (type: string | undefined) => {
    if (!type) return 'Unknown';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleResolve = (alertId: number) => {
    updateAlert.mutate({ id: alertId, status: 'resolved' });
  };

  const handleDismiss = (alertId: number) => {
    updateAlert.mutate({ id: alertId, status: 'dismissed' });
  };

  const groupedAlerts = {
    urgent: alerts?.filter(a => a.alert.priority === 'urgent') || [],
    high: alerts?.filter(a => a.alert.priority === 'high') || [],
    medium: alerts?.filter(a => a.alert.priority === 'medium') || [],
    low: alerts?.filter(a => a.alert.priority === 'low') || [],
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alert Notifications</h1>
          <p className="text-muted-foreground">All active alerts across tenancies with countdown timers</p>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="text-2xl font-bold">{alerts?.length || 0}</span>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(v: any) => setPriorityFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading alerts...</div>
      ) : !alerts || alerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No alerts found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Urgent Alerts */}
          {groupedAlerts.urgent.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Urgent ({groupedAlerts.urgent.length})
              </h2>
              <div className="grid gap-4">
                {groupedAlerts.urgent.map((item) => (
                  <Card key={item.alert.id} className="border-destructive">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={getPriorityColor(item.alert.priority)}>
                              {item.alert.priority}
                            </Badge>
                            <Badge variant="outline">{getAlertTypeLabel(item.alert.alertType)}</Badge>
                            {item.alert.dueDate && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {getCountdown(item.alert.dueDate)}
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg">{item.alert.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {item.property?.address} • {item.tenant?.firstName} {item.tenant?.lastName}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAlert(item)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleResolve(item.alert.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDismiss(item.alert.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {item.alert.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{item.alert.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* High Priority Alerts */}
          {groupedAlerts.high.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">High Priority ({groupedAlerts.high.length})</h2>
              <div className="grid gap-4">
                {groupedAlerts.high.map((item) => (
                  <Card key={item.alert.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={getPriorityColor(item.alert.priority)}>
                              {item.alert.priority}
                            </Badge>
                            <Badge variant="outline">{getAlertTypeLabel(item.alert.alertType)}</Badge>
                            {item.alert.dueDate && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {getCountdown(item.alert.dueDate)}
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg">{item.alert.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {item.property?.address} • {item.tenant?.firstName} {item.tenant?.lastName}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAlert(item)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleResolve(item.alert.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDismiss(item.alert.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {item.alert.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{item.alert.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Medium and Low Priority Alerts (collapsed view) */}
          {(groupedAlerts.medium.length > 0 || groupedAlerts.low.length > 0) && (
            <div>
              <h2 className="text-xl font-semibold mb-3">
                Other Alerts ({groupedAlerts.medium.length + groupedAlerts.low.length})
              </h2>
              <div className="grid gap-3">
                {[...groupedAlerts.medium, ...groupedAlerts.low].map((item) => (
                  <Card key={item.alert.id}>
                    <CardHeader className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Badge variant={getPriorityColor(item.alert.priority)}>
                            {item.alert.priority}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-medium">{item.alert.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.property?.address} • {getAlertTypeLabel(item.alert.alertType)}
                            </p>
                          </div>
                          {item.alert.dueDate && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {getCountdown(item.alert.dueDate)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAlert(item)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleResolve(item.alert.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDismiss(item.alert.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alert Detail Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAlert?.alert.title}</DialogTitle>
            <DialogDescription>
              {selectedAlert?.property?.address} • {selectedAlert?.tenant?.firstName} {selectedAlert?.tenant?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={getPriorityColor(selectedAlert?.alert.priority)}>
                {selectedAlert?.alert.priority}
              </Badge>
              <Badge variant="outline">{getAlertTypeLabel(selectedAlert?.alert.alertType)}</Badge>
              {selectedAlert?.alert.dueDate && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Due: {new Date(selectedAlert.alert.dueDate).toLocaleDateString()}
                </Badge>
              )}
            </div>
            {selectedAlert?.alert.description && (
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedAlert.alert.description}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => handleResolve(selectedAlert?.alert.id)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Resolved
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDismiss(selectedAlert?.alert.id)}
              >
                <X className="h-4 w-4 mr-2" />
                Dismiss
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
