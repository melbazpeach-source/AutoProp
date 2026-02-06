import { useState, useEffect } from 'react';
import { trpc } from '../lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Eye, X, Clock, Mail, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export default function Scheduled() {
  const [showPreview, setShowPreview] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [selectedComm, setSelectedComm] = useState<any>(null);
  const [newScheduledDate, setNewScheduledDate] = useState('');
  const [newScheduledTime, setNewScheduledTime] = useState('');
  const [now, setNow] = useState(Date.now());

  const { data: scheduled, refetch } = trpc.approvals.getScheduled.useQuery();

  const cancelMutation = trpc.approvals.cancelScheduled.useMutation({
    onSuccess: () => {
      toast.success('Scheduled communication cancelled');
      refetch();
    },
  });

  const rescheduleMutation = trpc.approvals.reschedule.useMutation({
    onSuccess: () => {
      toast.success('Communication rescheduled successfully');
      refetch();
      setShowReschedule(false);
      setNewScheduledDate('');
      setNewScheduledTime('');
    },
  });

  // Update current time every second for countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (scheduledFor: Date) => {
    const diff = new Date(scheduledFor).getTime() - now;
    if (diff <= 0) return 'Sending now...';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const handleReschedule = () => {
    if (!selectedComm || !newScheduledDate || !newScheduledTime) return;
    
    const scheduledFor = new Date(`${newScheduledDate}T${newScheduledTime}`);
    rescheduleMutation.mutate({
      id: selectedComm.id,
      scheduledFor,
    });
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Scheduled Communications</h1>
        <p className="text-muted-foreground mt-2">
          View and manage communications scheduled for future sending
        </p>
      </div>

      {!scheduled || scheduled.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No scheduled communications</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {scheduled.map((comm: any) => (
            <Card key={comm.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={comm.channel === 'email' ? 'default' : comm.channel === 'sms' ? 'secondary' : 'outline'}>
                        {comm.channel === 'email' ? <Mail className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                        {comm.channel}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {formatCountdown(comm.scheduledFor)}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">
                      {comm.channel === 'email' && comm.subject ? comm.subject : 'SMS Message'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      To: {comm.toAddress}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Scheduled for: {new Date(comm.scheduledFor).toLocaleString()}
                    </p>
                  </div>
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
                      const scheduled = new Date(comm.scheduledFor);
                      setNewScheduledDate(scheduled.toISOString().split('T')[0]);
                      setNewScheduledTime(scheduled.toTimeString().slice(0, 5));
                      setShowReschedule(true);
                    }}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Reschedule
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel this scheduled communication?')) {
                        cancelMutation.mutate({ id: comm.id });
                      }
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedComm?.channel === 'email' && selectedComm?.subject
                ? selectedComm.subject
                : 'SMS Message'}
            </DialogTitle>
            <DialogDescription>
              To: {selectedComm?.toAddress}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-md whitespace-pre-wrap max-h-96 overflow-y-auto">
            {selectedComm?.body}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showReschedule} onOpenChange={setShowReschedule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Communication</DialogTitle>
            <DialogDescription>
              Choose a new date and time to send this communication
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">Date</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={newScheduledDate}
                onChange={(e) => setNewScheduledDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-time">Time</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={newScheduledTime}
                onChange={(e) => setNewScheduledTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReschedule(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={!newScheduledDate || !newScheduledTime || rescheduleMutation.isPending}
            >
              <Clock className="h-4 w-4 mr-2" />
              Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
