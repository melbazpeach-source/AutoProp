import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Eye, Mail, FileText, Wrench, Calendar, Pencil, CheckSquare, Square, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function Approvals() {
  const [selectedComm, setSelectedComm] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkReject, setShowBulkReject] = useState(false);
  const [bulkRejectionReason, setBulkRejectionReason] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [newCommChannel, setNewCommChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [newCommRecipient, setNewCommRecipient] = useState('');

  const { data: pending, refetch } = trpc.approvals.getPending.useQuery();
  const { data: templates } = trpc.templates.list.useQuery();
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
  const updateMutation = trpc.approvals.update.useMutation({
    onSuccess: () => {
      toast.success('Communication updated');
      refetch();
      setShowEdit(false);
    },
  });
  const bulkApproveMutation = trpc.approvals.bulkApprove.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.successCount} communications approved and sent`);
      if (data.failCount > 0) {
        toast.error(`${data.failCount} communications failed to send`);
      }
      refetch();
      setSelectedIds([]);
    },
  });
  const bulkRejectMutation = trpc.approvals.bulkReject.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.successCount} communications rejected`);
      refetch();
      setShowBulkReject(false);
      setBulkRejectionReason('');
      setSelectedIds([]);
    },
  });
  const scheduleMutation = trpc.approvals.schedule.useMutation({
    onSuccess: () => {
      toast.success('Communication scheduled successfully');
      refetch();
      setShowSchedule(false);
      setScheduledDate('');
      setScheduledTime('');
    },
  });
  const createMutation = trpc.approvals.create.useMutation({
    onSuccess: () => {
      toast.success('Communication created and added to approval queue');
      refetch();
      setShowEdit(false);
      setEditSubject('');
      setEditBody('');
      setNewCommRecipient('');
    },
  });

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === (pending?.length || 0)) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pending?.map(c => c.id) || []);
    }
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Communication Approvals</h1>
            <p className="text-muted-foreground mt-2">
              Review and approve communications before sending
            </p>
          </div>
          {selectedIds.length === 0 && (
            <Button
              variant="default"
              onClick={() => setShowTemplateSelector(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Use Template
            </Button>
          )}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} selected
              </span>
              <Button
                variant="default"
                size="sm"
                onClick={() => bulkApproveMutation.mutate({ ids: selectedIds })}
                disabled={bulkApproveMutation.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve All ({selectedIds.length})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkReject(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject All ({selectedIds.length})
              </Button>
            </div>
          )}
        </div>
      </div>

      {pending && pending.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Checkbox
            checked={selectedIds.length === pending.length}
            onCheckedChange={toggleSelectAll}
            id="select-all"
          />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
            Select All
          </label>
        </div>
      )}

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
                    <Checkbox
                      checked={selectedIds.includes(comm.id)}
                      onCheckedChange={() => toggleSelection(comm.id)}
                    />
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
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedComm(comm);
                      setEditSubject(comm.subject || '');
                      setEditBody(comm.body || '');
                      setShowEdit(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
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
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedComm(comm);
                      setShowSchedule(true);
                    }}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Schedule
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

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedComm ? 'Edit Communication' : 'Create Communication'}</DialogTitle>
            <DialogDescription>
              {selectedComm ? 'Modify the subject and body before approving' : 'Fill in the details for the new communication'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedComm && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-channel">Channel</Label>
                  <select
                    id="new-channel"
                    value={newCommChannel}
                    onChange={(e) => setNewCommChannel(e.target.value as 'email' | 'sms' | 'whatsapp')}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-recipient">Recipient</Label>
                  <Input
                    id="new-recipient"
                    value={newCommRecipient}
                    onChange={(e) => setNewCommRecipient(e.target.value)}
                    placeholder={newCommChannel === 'email' ? 'email@example.com' : '+64 21 123 4567'}
                  />
                </div>
              </>
            )}
            {(selectedComm?.channel === 'email' || (!selectedComm && newCommChannel === 'email')) && (
              <div className="space-y-2">
                <Label htmlFor="edit-subject">Subject</Label>
                <Input
                  id="edit-subject"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-body">Message Body</Label>
              <Textarea
                id="edit-body"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="Message content"
                rows={12}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedComm) {
                  updateMutation.mutate({
                    id: selectedComm.id,
                    subject: selectedComm.channel === 'email' ? editSubject : undefined,
                    body: editBody,
                  });
                } else {
                  createMutation.mutate({
                    channel: newCommChannel,
                    toAddress: newCommRecipient,
                    subject: newCommChannel === 'email' ? editSubject : undefined,
                    body: editBody,
                  });
                }
              }}
              disabled={!editBody.trim() || (!selectedComm && !newCommRecipient.trim()) || (selectedComm ? updateMutation.isPending : createMutation.isPending)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {selectedComm ? 'Save Changes' : 'Create Communication'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Dialog */}
      <Dialog open={showBulkReject} onOpenChange={setShowBulkReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Multiple Communications</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedIds.length} communications
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={bulkRejectionReason}
            onChange={(e) => setBulkRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkReject(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (bulkRejectionReason.trim()) {
                  bulkRejectMutation.mutate({
                    ids: selectedIds,
                    reason: bulkRejectionReason,
                  });
                }
              }}
              disabled={!bulkRejectionReason.trim() || bulkRejectMutation.isPending}
            >
              Reject {selectedIds.length} Communications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Communication</DialogTitle>
            <DialogDescription>
              Choose when to send this communication
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-date">Date</Label>
              <Input
                id="schedule-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-time">Time</Label>
              <Input
                id="schedule-time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSchedule(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedComm && scheduledDate && scheduledTime) {
                  const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
                  scheduleMutation.mutate({
                    id: selectedComm.id,
                    scheduledFor,
                  });
                }
              }}
              disabled={!scheduledDate || !scheduledTime || scheduleMutation.isPending}
            >
              <Clock className="h-4 w-4 mr-2" />
              Schedule Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Selector Dialog */}
      <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select a Template</DialogTitle>
            <DialogDescription>
              Choose a template to create a new communication
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!templates || templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No templates available. Create templates in the Templates page first.
              </div>
            ) : (
              <div className="grid gap-3">
                {templates.map((template: any) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-colors hover:bg-accent ${
                      selectedTemplate?.id === template.id ? 'border-primary' : ''
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">
                              {template.category.replace('_', ' ')}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          {template.description && (
                            <CardDescription className="mt-1">
                              {template.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Subject:</span>{' '}
                          <span className="text-muted-foreground">{template.subject}</span>
                        </div>
                        <div>
                          <span className="font-medium">Body preview:</span>{' '}
                          <span className="text-muted-foreground line-clamp-2">
                            {template.body}
                          </span>
                        </div>
                        {template.variables && (
                          <div>
                            <span className="font-medium">Variables:</span>{' '}
                            <span className="text-muted-foreground">
                              {Array.isArray(template.variables) ? template.variables.join(', ') : template.variables}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowTemplateSelector(false);
              setSelectedTemplate(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTemplate) {
                  setEditSubject(selectedTemplate.subject);
                  setEditBody(selectedTemplate.body);
                  setShowTemplateSelector(false);
                  setShowEdit(true);
                  setSelectedComm(null);
                  setSelectedTemplate(null);
                }
              }}
              disabled={!selectedTemplate}
            >
              Use Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
