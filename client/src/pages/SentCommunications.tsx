import { useState } from "react";
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
import { Search, Download, Eye, Mail, MessageSquare, Phone } from "lucide-react";

export default function SentCommunications() {
  const [channel, setChannel] = useState<"all" | "email" | "sms" | "whatsapp">("all");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [previewComm, setPreviewComm] = useState<any>(null);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading } = trpc.approvals.getSent.useQuery({
    channel: channel === "all" ? undefined : channel,
    search: search || undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    limit: pageSize,
    offset: page * pageSize,
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const getChannelIcon = (ch: string) => {
    switch (ch) {
      case "email":
        return <Mail className="w-4 h-4" />;
      case "sms":
        return <MessageSquare className="w-4 h-4" />;
      case "whatsapp":
        return <Phone className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

  const exportToCSV = () => {
    if (!data?.items.length) return;

    const headers = ["Date", "Channel", "Recipient", "Subject", "Status"];
    const rows = data.items.map((item) => [
      formatDate(item.sentAt),
      item.channel,
      item.toAddress || "",
      item.subject || "",
      item.status,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sent-communications-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sent Communications</h1>
        <p className="text-muted-foreground mt-2">
          Archive of all successfully sent messages for auditing and compliance
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Recipient, subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Channel</label>
            <Select value={channel} onValueChange={(v: any) => setChannel(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Export</label>
            <Button
              onClick={exportToCSV}
              disabled={!data?.items.length}
              className="w-full"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date Sent</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No sent communications found
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {formatDate(item.sentAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {getChannelIcon(item.channel)}
                      {item.channel}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.toAddress}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {item.subject || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">sent</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPreviewComm(item)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {page * pageSize + 1} to{" "}
              {Math.min((page + 1) * pageSize, data?.total || 0)} of {data?.total || 0}{" "}
              results
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewComm} onOpenChange={() => setPreviewComm(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewComm?.subject || "Communication"}</DialogTitle>
            <DialogDescription>
              To: {previewComm?.toAddress}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-md whitespace-pre-wrap">
              {previewComm?.body}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Channel:</span> {previewComm?.channel}
              </div>
              <div>
                <span className="font-medium">Sent:</span>{" "}
                {formatDate(previewComm?.sentAt)}
              </div>
              <div>
                <span className="font-medium">Approved By:</span>{" "}
                {previewComm?.approvedBy || "N/A"}
              </div>
              <div>
                <span className="font-medium">Status:</span> {previewComm?.status}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
