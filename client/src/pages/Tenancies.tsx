import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Download,
  Upload,
  Plus,
  Flag,
  Pin,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Tenancies() {
  const [status, setStatus] = useState<"all" | "active" | "ending" | "terminated" | "completed">("all");
  const [search, setSearch] = useState("");
  const [showFlagged, setShowFlagged] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [selectedTenancy, setSelectedTenancy] = useState<any>(null);
  const [alertsDialogOpen, setAlertsDialogOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: tenancies, isLoading, refetch } = trpc.tenancies.getAll.useQuery({
    status: status === "all" ? undefined : status,
    search: search || undefined,
    flagged: showFlagged ? true : undefined,
    pinned: showPinned ? true : undefined,
  });

  const { data: alerts } = trpc.tenancies.getAlerts.useQuery(
    { tenancyId: selectedTenancy?.tenancy.id },
    { enabled: !!selectedTenancy && alertsDialogOpen }
  );

  const toggleFlag = trpc.tenancies.toggleFlag.useMutation({
    onSuccess: () => refetch(),
  });

  const togglePin = trpc.tenancies.togglePin.useMutation({
    onSuccess: () => refetch(),
  });

  const createAlert = trpc.tenancies.createAlert.useMutation({
    onSuccess: () => {
      refetch();
      setAlertDialogOpen(false);
    },
  });

  const exportCSV = trpc.tenancies.exportCSV.useQuery(undefined, {
    enabled: false,
  });

  const handleExportCSV = async () => {
    const result = await exportCSV.refetch();
    if (!result.data?.data.length) return;

    const headers = Object.keys(result.data.data[0]);
    const rows = result.data.data.map((row: any) =>
      headers.map((h) => `"${row[h] || ""}"`)
    );

    const csvContent = [
      headers.join(","),
      ...rows.map((r: string[]) => r.join(",")),
    ].join("\\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tenancies-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
  };

  const getTags = (tagsJson: string | null) => {
    if (!tagsJson) return [];
    try {
      return JSON.parse(tagsJson);
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenancies</h1>
          <p className="text-muted-foreground mt-2">
            Manage tenant-property relationships with alerts and tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Tenancy
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Property, tenant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="ending">Ending</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Filters</label>
            <div className="flex gap-2">
              <Button
                variant={showFlagged ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFlagged(!showFlagged)}
              >
                <Flag className="w-4 h-4 mr-2" />
                Flagged
              </Button>
              <Button
                variant={showPinned ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPinned(!showPinned)}
              >
                <Pin className="w-4 h-4 mr-2" />
                Pinned
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Lease Period</TableHead>
              <TableHead>Rent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : !tenancies?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No tenancies found
                </TableCell>
              </TableRow>
            ) : (
              tenancies.map((item) => (
                <TableRow key={item.tenancy.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {item.tenancy.isPinned && (
                        <Pin className="w-4 h-4 text-primary fill-primary" />
                      )}
                      {item.tenancy.isFlagged && (
                        <Flag className="w-4 h-4 text-destructive fill-destructive" />
                      )}
                      {item.property?.address || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {item.tenant?.firstName} {item.tenant?.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.tenant?.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(item.tenancy.leaseStartDate)} -{" "}
                      {formatDate(item.tenancy.leaseEndDate)}
                    </div>
                  </TableCell>
                  <TableCell>${item.tenancy.weeklyRent}/wk</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.tenancy.status === "active"
                          ? "default"
                          : item.tenancy.status === "ending"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {item.tenancy.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getTags(item.tenancy.tags).map((tag: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePin.mutate({ id: item.tenancy.id })}
                      >
                        <Pin className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleFlag.mutate({ id: item.tenancy.id })}
                      >
                        <Flag className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTenancy(item);
                          setAlertsDialogOpen(true);
                        }}
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation(`/tenancies/${item.tenancy.id}/timeline`)}
                      >
                        Timeline
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Alerts Dialog */}
      <Dialog open={alertsDialogOpen} onOpenChange={setAlertsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Alerts - {selectedTenancy?.property?.address}</DialogTitle>
            <DialogDescription>
              Manage alerts for this tenancy
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              onClick={() => {
                setAlertsDialogOpen(false);
                setAlertDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Alert
            </Button>
            <div className="space-y-2">
              {!alerts?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No alerts for this tenancy
                </p>
              ) : (
                alerts.map((alert) => (
                  <Card key={alert.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              alert.priority === "urgent"
                                ? "destructive"
                                : alert.priority === "high"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {alert.priority}
                          </Badge>
                          <Badge variant="outline">{alert.alertType}</Badge>
                          <Badge
                            variant={
                              alert.status === "active"
                                ? "default"
                                : "outline"
                            }
                          >
                            {alert.status}
                          </Badge>
                        </div>
                        <h4 className="font-medium">{alert.title}</h4>
                        {alert.description && (
                          <p className="text-sm text-muted-foreground">
                            {alert.description}
                          </p>
                        )}
                        {alert.dueDate && (
                          <p className="text-sm text-muted-foreground">
                            Due: {formatDate(alert.dueDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Alert Dialog */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Alert</DialogTitle>
            <DialogDescription>
              Add a new alert for this tenancy
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createAlert.mutate({
                tenancyId: selectedTenancy.tenancy.id,
                alertType: formData.get("alertType") as any,
                title: formData.get("title") as string,
                description: formData.get("description") as string,
                priority: formData.get("priority") as any,
                dueDate: formData.get("dueDate")
                  ? new Date(formData.get("dueDate") as string)
                  : undefined,
              });
            }}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Alert Type</Label>
                <Select name="alertType" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="antisocial_behavior">
                      Antisocial Behavior
                    </SelectItem>
                    <SelectItem value="court_hearing">Court Hearing</SelectItem>
                    <SelectItem value="complaint">Complaint</SelectItem>
                    <SelectItem value="terminate">Terminate</SelectItem>
                    <SelectItem value="rent_arrears">Rent Arrears</SelectItem>
                    <SelectItem value="breach_notice">Breach Notice</SelectItem>
                    <SelectItem value="inspection_due">Inspection Due</SelectItem>
                    <SelectItem value="lease_expiry">Lease Expiry</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input name="title" required placeholder="Alert title" />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  name="description"
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select name="priority" defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input name="dueDate" type="date" />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAlertDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Alert</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
