import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Eye, Mail, FileText, Wrench, Calendar } from 'lucide-react';

export default function Approvals() {
  const [selectedComm, setSelectedComm] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: pending, refetch } = trpc.approvals.getPending.useQuery();
  const approveMutation = trpc.approvals.approve.useMutation({
    onSuccess: () => {
      toast.success('Communication approved and sent');
      refetch();
      setShowPreview(false);
    },
  });
  const rejectMutation = trpc.approvals.reject.useMutation({
    onSuccess: () => {
      toast.success('Communication rejected');
      refetch();
      setShowReject(false);
      setRejectionReason('');
    },
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'breach_letter': return <FileText className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'maintenance_confirmation': return <Wrench className="h-4 w-4" />;
      case 'viewing_confirmation': return <Calendar className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      breach_letter: 'destructive',
      email: 'default',
      maintenance_confirmation: 'secondary',
      viewing_confirmation: 'outline',
    };
    return colors[type as keyof typeof colors] || 'default';
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Communication Approvals</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve communications before sending
        </p>
      </div>

      <div className="grid gap-4">
        {!pending || pending.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No pending communications
            </CardContent>
          </Card>
        ) : (
          pending.map((comm) => (
            <Card key={comm.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(comm.channel)}
                    <div>
                      <CardTitle className="text-lg">{comm.subject || `${comm.channel.toUpperCase()} Message`}</CardTitle>
                      <CardDescription className="mt-1">
                        To: {comm.toAddress}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={getTypeBadge(comm.channel) as any}>
                    {comm.channel.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedComm(comm);
                      setShowPreview(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => approveMutation.mutate({ id: comm.id })}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve & Send
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setSelectedComm(comm);
                      setShowReject(true);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedComm?.subject}</DialogTitle>
            <DialogDescription>
              To: {selectedComm?.recipientName} ({selectedComm?.recipientEmail})
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-muted/50 whitespace-pre-wrap">
            {selectedComm?.body}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedComm) {
                  approveMutation.mutate({ id: selectedComm.id });
                }
              }}
              disabled={approveMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Communication</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this communication
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedComm && rejectionReason.trim()) {
                  rejectMutation.mutate({
                    id: selectedComm.id,
                    reason: rejectionReason,
                  });
                }
              }}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
