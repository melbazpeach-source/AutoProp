// [trio] Stream 3 — document upload/view UI
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Upload, Download } from "lucide-react";
import { toast } from "sonner";

const DOCUMENT_TYPES = [
  "application",
  "lease",
  "breach_letter",
  "maintenance_report",
  "inspection",
  "communication_attachment",
  "other",
] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number];

function formatType(type: string) {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatSize(bytes: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documents() {
  const [documentType, setDocumentType] = useState<DocumentType>("other");
  const [propertyId, setPropertyId] = useState<string>("none");
  const [uploading, setUploading] = useState(false);

  const { data: documents, isLoading, refetch } = trpc.documents.list.useQuery();
  const { data: properties } = trpc.properties.list.useQuery();
  const utils = trpc.useUtils();

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded");
      refetch();
    },
    onError: (err) => {
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        // Strip the "data:*;base64," prefix.
        const fileBase64 = dataUrl.split(",")[1] ?? "";
        await uploadMutation.mutateAsync({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileBase64,
          documentType,
          propertyId: propertyId !== "none" ? Number(propertyId) : undefined,
        });
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = async (fileKey: string) => {
    try {
      // The stored fileUrl is short-lived; mint a fresh signed URL on demand.
      const result = await utils.documents.getDownloadUrl.fetch({ fileKey });
      if (result?.url) {
        window.open(result.url, "_blank");
      } else {
        toast.error("Could not generate download link");
      }
    } catch (err) {
      toast.error("Could not generate download link");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage property and tenancy documents
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>Select a type, optional property, then choose a file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Document Type</label>
              <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatType(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Property (optional)</label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No property</SelectItem>
                  {properties?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              id="document-input"
              disabled={uploading}
            />
            <label htmlFor="document-input" className="cursor-pointer">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">
                {uploading ? "Uploading..." : "Click to upload a document"}
              </p>
              <p className="text-xs text-muted-foreground">Any file type</p>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading documents...</div>
          ) : !documents || documents.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <FileText className="mx-auto mb-2 h-10 w-10 opacity-40" />
              No documents yet
            </div>
          ) : (
            <div className="divide-y">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString()} • {formatSize(doc.fileSize)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline">{formatType(doc.documentType)}</Badge>
                    <Button size="sm" variant="outline" onClick={() => handleDownload(doc.fileKey)}>
                      <Download className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
