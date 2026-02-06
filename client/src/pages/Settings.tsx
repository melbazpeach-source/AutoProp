import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Tag, FolderOpen } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { data: categories, refetch: refetchCategories } = trpc.tags.listCategories.useQuery({});
  const { data: tags, refetch: refetchTags } = trpc.tags.listTags.useQuery();
  
  const createCategory = trpc.tags.createCategory.useMutation({
    onSuccess: () => {
      toast.success("Category created");
      refetchCategories();
      setNewCategory({ name: "", type: "general", color: "#3b82f6" });
    },
  });
  
  const deleteCategory = trpc.tags.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("Category deleted");
      refetchCategories();
    },
  });
  
  const createTag = trpc.tags.createTag.useMutation({
    onSuccess: () => {
      toast.success("Tag created");
      refetchTags();
      setNewTagName("");
    },
  });
  
  const deleteTag = trpc.tags.deleteTag.useMutation({
    onSuccess: () => {
      toast.success("Tag deleted");
      refetchTags();
    },
  });

  const [newCategory, setNewCategory] = useState({ name: "", type: "general" as const, color: "#3b82f6" });
  const [newTagName, setNewTagName] = useState("");

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage categories and tags for organizing your data</p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories"><FolderOpen className="w-4 h-4 mr-2" />Categories</TabsTrigger>
          <TabsTrigger value="tags"><Tag className="w-4 h-4 mr-2" />Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Category</CardTitle>
              <CardDescription>Add custom categories for properties, maintenance, or tenants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="e.g., High Priority, Commercial, VIP"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={newCategory.type} onValueChange={(v: any) => setNewCategory({ ...newCategory, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="property">Property</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="tenant">Tenant</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Color</Label>
                  <Input
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  />
                </div>
                <Button onClick={() => createCategory.mutate(newCategory)} disabled={!newCategory.name}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Category
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categories?.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color || "#3b82f6" }} />
                      <span className="font-medium">{cat.name}</span>
                      <Badge variant="outline">{cat.type}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteCategory.mutate({ id: cat.id })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {!categories?.length && <p className="text-muted-foreground">No categories yet</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Tag</CardTitle>
              <CardDescription>Add flexible tags for filtering and searching</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g., urgent, water-damage, pet-friendly"
                />
                <Button onClick={() => createTag.mutate({ name: newTagName })} disabled={!newTagName}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tags?.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="px-3 py-1">
                    {tag.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-4 w-4 p-0"
                      onClick={() => deleteTag.mutate({ id: tag.id })}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
                {!tags?.length && <p className="text-muted-foreground">No tags yet</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
