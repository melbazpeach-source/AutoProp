// [graft] RECOVERED: Invoices management UI page (Vanessa's work).
// Source: massCode fragment "Create Invoices management UI page - Invoices.tsx".
// Reproduced as faithfully as possible; adaptations marked `// [graft]`.
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
// [graft] The recovered page imported `formatCurrency`/`formatDate` from
// `@/lib/utils`, but the current utils module only exports `cn`. To stay
// additive (not editing existing working code), the two helpers are defined
// locally here, preserving the original display behaviour (NZ currency + date).
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(
    Number.isFinite(value) ? value : 0
  );
}
function formatDate(value: string | number | Date | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-NZ');
}

export default function Invoices() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<number | null>(null);

  const { data: invoices, isLoading } = trpc.invoices.getAll.useQuery({
    // [graft] Map the "__all" sentinel (see SelectItem note below) back to
    // undefined so the server-side zod enum accepts it — same approach the
    // existing Tenancies page uses for its "all" option.
    status: statusFilter && statusFilter !== '__all' ? (statusFilter as any) : undefined,
    paymentStatus: paymentFilter && paymentFilter !== '__all' ? (paymentFilter as any) : undefined,
    limit: 100
  });

  const { data: selectedInvoiceData } = trpc.invoices.getById.useQuery(
    { id: selectedInvoice! },
    { enabled: !!selectedInvoice }
  );

  const updateStatusMutation = trpc.invoices.updateStatus.useMutation();
  const recordPaymentMutation = trpc.invoices.recordPayment.useMutation();

  const handleApprove = (id: number) => {
    updateStatusMutation.mutate(
      { id, status: 'approved' },
      {
        onSuccess: () => {
          // Refetch
        }
      }
    );
  };

  const handleReject = (id: number) => {
    updateStatusMutation.mutate(
      { id, status: 'rejected', rejectionReason: 'Manual rejection' },
      {
        onSuccess: () => {
          // Refetch
        }
      }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-orange-100 text-orange-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Invoice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Invoice</DialogTitle>
            </DialogHeader>
            <InvoiceUploadForm onSuccess={() => setUploadDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices?.filter(i => i.status === 'received' || i.status === 'under_review').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices?.filter(i => i.status === 'approved').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices?.filter(i => i.paymentStatus === 'unpaid').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                invoices?.reduce((sum, i) => sum + parseFloat(i.totalAmount), 0) || 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* [graft] Radix Select disallows an empty-string SelectItem
                        value. The recovered "All" options used value="" which
                        crashes Radix; remapped to a sentinel ("__all") and the
                        filter state is cleared when it is chosen, preserving the
                        original "show everything" behaviour. */}
                    <SelectItem value="__all">All Statuses</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All Payment Status</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div>Loading...</div>
              ) : invoices && invoices.length > 0 ? (
                <div className="space-y-2">
                  {invoices.map(invoice => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedInvoice(invoice.id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                          <div className="font-medium">{invoice.invoiceNumber}</div>
                          <div className="text-sm text-gray-600">{invoice.contractorName}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(parseFloat(invoice.totalAmount))}</div>
                        <div className="text-sm text-gray-600">{formatDate(invoice.invoiceDate)}</div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(invoice.paymentStatus)}`}>
                          {invoice.paymentStatus}
                        </span>
                      </div>

                      {invoice.status === 'received' && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(invoice.id);
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(invoice.id);
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No invoices found</div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedInvoiceData && (
        <InvoiceDetailModal invoice={selectedInvoiceData} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
}

function InvoiceUploadForm({ onSuccess }: { onSuccess: () => void }) {
  const [documentUrl, setDocumentUrl] = useState('');
  const uploadMutation = trpc.invoices.uploadAndExtract.useMutation();

  const handleUpload = async () => {
    if (!documentUrl) return;

    uploadMutation.mutate(
      { documentUrl },
      {
        onSuccess: (data) => {
          // Show extracted data for review
          console.log('Extracted invoice data:', data);
          onSuccess();
        }
      }
    );
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Enter invoice document URL (PDF or image)"
        value={documentUrl}
        onChange={(e) => setDocumentUrl(e.target.value)}
      />
      <Button onClick={handleUpload} disabled={!documentUrl || uploadMutation.isPending}>
        {uploadMutation.isPending ? 'Processing...' : 'Upload & Extract'}
      </Button>
    </div>
  );
}

function InvoiceDetailModal({ invoice, onClose }: { invoice: any; onClose: () => void }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Contractor</div>
              <div className="font-medium">{invoice.contractorName}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Amount</div>
              <div className="font-medium">{formatCurrency(parseFloat(invoice.totalAmount))}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Invoice Date</div>
              <div className="font-medium">{formatDate(invoice.invoiceDate)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Status</div>
              <div className="font-medium">{invoice.status}</div>
            </div>
          </div>

          {invoice.lineItems && invoice.lineItems.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Line Items</h4>
              <div className="space-y-2">
                {invoice.lineItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.description}</span>
                    <span>{formatCurrency(parseFloat(item.lineTotal))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {invoice.discrepancies && invoice.discrepancies.length > 0 && (
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <div className="flex gap-2 items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-yellow-900 mb-1">Discrepancies Found</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {invoice.discrepancies.map((disc: string, idx: number) => (
                      <li key={idx}>• {disc}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
