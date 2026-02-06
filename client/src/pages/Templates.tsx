import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FileText, Mail, Wrench, Calendar, AlertTriangle } from 'lucide-react';

export default function Templates() {
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'general' as 'rent_reminder' | 'maintenance' | 'viewing' | 'breach_letter' | 'general',
    subject: '',
    body: '',
    description: '',
    variables: '',
  });

  const { data: templates, refetch } = trpc.templates.list.useQuery();
  
  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      toast.success('Template created successfully');
      refetch();
      setShowCreate(false);
      resetForm();
    },
  });

  const updateMutation = trpc.templates.update.useMutation({
    onSuccess: () => {
      toast.success('Template updated successfully');
      refetch();
      setShowEdit(false);
      resetForm();
    },
  });

  const deleteMutation = trpc.templates.delete.useMutation({
    onSuccess: () => {
      toast.success('Template deleted successfully');
      refetch();
      setShowDelete(false);
      setSelectedTemplate(null);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'general',
      subject: '',
      body: '',
      description: '',
      variables: '',
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleEdit = () => {
    if (!selectedTemplate) return;
    updateMutation.mutate({
      id: selectedTemplate.id,
      ...formData,
    });
  };

  const openEditDialog = (template: any) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      subject: template.subject,
      body: template.body,
      description: template.description || '',
      variables: template.variables || '',
    });
    setShowEdit(true);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'rent_reminder': return <AlertTriangle className="h-4 w-4" />;
      case 'maintenance': return <Wrench className="h-4 w-4" />;
      case 'viewing': return <Calendar className="h-4 w-4" />;
      case 'breach_letter': return <FileText className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      rent_reminder: 'destructive',
      maintenance: 'secondary',
      viewing: 'outline',
      breach_letter: 'destructive',
      general: 'default',
    };
    return colors[category as keyof typeof colors] || 'default';
  };

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage reusable email templates for common scenarios
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!templates || templates.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              No templates yet. Create your first template to get started.
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(template.category)}
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  <Badge variant={getCategoryColor(template.category) as any}>
                    {template.category.replace('_', ' ')}
                  </Badge>
                </div>
                <CardDescription className="mt-2">
                  {template.description || 'No description'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Subject:</span> {template.subject}
                  </div>
                  {template.variables && (
                    <div>
                      <span className="font-medium">Variables:</span>{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {template.variables}
                      </code>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(template)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowDelete(true);
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Template Dialog */}
      <Dialog open={showCreate || showEdit} onOpenChange={(open) => {
        if (!open) {
          setShowCreate(false);
          setShowEdit(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showCreate ? 'Create' : 'Edit'} Template</DialogTitle>
            <DialogDescription>
              {showCreate ? 'Create a new email template' : 'Update the email template'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Rent Overdue Notice"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value: any) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="rent_reminder">Rent Reminder</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="viewing">Viewing</SelectItem>
                  <SelectItem value="breach_letter">Breach Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Rent Payment Overdue - {{property_address}}"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Email Body</Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Dear {{tenant_name}},&#10;&#10;This is to inform you..."
                rows={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variables">Variables (comma-separated)</Label>
              <Input
                id="variables"
                value={formData.variables}
                onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                placeholder="tenant_name, property_address, amount_due"
              />
              <p className="text-xs text-muted-foreground">
                Use variables in subject/body like: {'{{'} variable_name {'}}'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of when to use this template"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreate(false);
              setShowEdit(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={showCreate ? handleCreate : handleEdit}
              disabled={!formData.name || !formData.subject || !formData.body || createMutation.isPending || updateMutation.isPending}
            >
              {showCreate ? 'Create' : 'Update'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedTemplate) {
                  deleteMutation.mutate({ id: selectedTemplate.id });
                }
              }}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
