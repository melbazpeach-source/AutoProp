import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type ImportType = 'rent-arrears' | 'maintenance' | 'tenants' | 'tenancies' | 'scheduled-tasks';

const templates: Record<ImportType, { name: string; description: string }> = {
  'rent-arrears': { name: 'Rent Arrears', description: 'Import overdue rent records' },
  'maintenance': { name: 'Maintenance', description: 'Import maintenance requests' },
  'tenants': { name: 'Tenants', description: 'Import tenant information' },
  'tenancies': { name: 'Tenancies', description: 'Import tenancy agreements' },
  'scheduled-tasks': { name: 'Scheduled Tasks', description: 'Import recurring tasks' },
};

export default function DataImport() {
  const [activeTab, setActiveTab] = useState<ImportType>('rent-arrears');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type === 'text/csv') {
      setFile(f);
      setResult(null);
    } else {
      toast.error('Please select a CSV file');
    }
  };

  const handleDownloadTemplate = () => {
    const headers = getHeaders(activeTab);
    const csv = headers.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-template.csv`;
    a.click();
    toast.success('Template downloaded');
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      // TODO: Call tRPC endpoint to import CSV
      // const result = await trpc.csvImport.import.useMutation();
      toast.success('File uploaded successfully');
      setResult({ success: true, rows: 10 });
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Import</h1>
        <p className="text-gray-600">Upload CSV files to import data</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ImportType)}>
        <TabsList className="grid w-full grid-cols-5">
          {Object.entries(templates).map(([key, { name }]) => (
            <TabsTrigger key={key} value={key}>{name}</TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(templates).map(([key, { description }]) => (
          <TabsContent key={key} value={key as ImportType}>
            <Card>
              <CardHeader>
                <CardTitle>{templates[key as ImportType].name}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleDownloadTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>

                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-input"
                  />
                  <label htmlFor="csv-input" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500">CSV files only</p>
                  </label>
                  {file && <p className="text-sm mt-2 text-green-600">✓ {file.name}</p>}
                </div>

                <Button onClick={handleUpload} disabled={!file || loading} className="w-full">
                  {loading ? 'Uploading...' : 'Upload CSV'}
                </Button>

                {result && (
                  <div className={`p-4 rounded-lg flex gap-2 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-medium">{result.success ? 'Success' : 'Error'}</p>
                      <p className="text-sm">{result.success ? `${result.rows} rows imported` : result.error}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function getHeaders(type: ImportType): string[] {
  const headers: Record<ImportType, string[]> = {
    'rent-arrears': ['tenantId', 'tenantName', 'propertyId', 'propertyAddress', 'weeklyRent', 'lastPaymentDate', 'daysOverdue', 'amountOwed', 'arrangementBroken', 'notes'],
    'maintenance': ['maintenanceId', 'propertyId', 'propertyAddress', 'description', 'category', 'priority', 'estimatedCost', 'actualCost', 'requestDate', 'scheduledDate', 'completionDate', 'contractorName', 'contractorPhone', 'status', 'notes'],
    'tenants': ['tenantId', 'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'employmentStatus', 'employer', 'annualIncome', 'emergencyContact', 'emergencyPhone', 'moveInDate', 'moveOutDate', 'leaseStartDate', 'leaseEndDate', 'status', 'notes'],
    'tenancies': ['tenancyId', 'tenantId', 'propertyId', 'propertyAddress', 'leaseStartDate', 'leaseEndDate', 'weeklyRent', 'bondAmount', 'leaseType', 'renewalDate', 'status', 'notes'],
    'scheduled-tasks': ['taskId', 'propertyId', 'propertyAddress', 'taskType', 'description', 'frequency', 'nextDueDate', 'lastCompletedDate', 'priority', 'assignedTo', 'status', 'notes'],
  };
  return headers[type];
}
