import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, DollarSign, Calendar, FileText } from "lucide-react";

export default function RentArrears() {
  const { data: arrearsData, isLoading } = trpc.rentArrears.requiresAction.useQuery({ minDaysOverdue: 10 });

  if (isLoading) {
    return <div>Loading rent arrears...</div>;
  }

  const getEscalationColor = (level: string) => {
    switch (level) {
      case 'legal': return 'bg-red-100 text-red-800 border-red-300';
      case 'breach': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'reminder': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rent Arrears</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage overdue rent payments
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Arrears</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {arrearsData?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tenants requiring action
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Amount Owed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${arrearsData?.reduce((sum, item) => sum + parseFloat(item.arrear.amountOwed || '0'), 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all properties
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Breach Letters Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {arrearsData?.filter(item => item.arrear.breachLetterSent).length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Tenants Requiring Action</h2>
        
        {arrearsData && arrearsData.length > 0 ? (
          arrearsData.map((item) => {
            const { arrear, tenant, property } = item;
            
            return (
              <Card key={arrear.id} className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>
                        {tenant?.firstName} {tenant?.lastName}
                      </CardTitle>
                      <CardDescription>
                        {property?.address}
                      </CardDescription>
                    </div>
                    <Badge className={getEscalationColor(arrear.escalationLevel || 'none')}>
                      {arrear.escalationLevel || 'Pending'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Amount Owed</p>
                        <p className="text-2xl font-bold text-red-600">
                          ${arrear.amountOwed}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Days Overdue</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {arrear.daysOverdue}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Last Payment</p>
                        <p className="text-sm">
                          {arrear.lastPaymentDate 
                            ? new Date(arrear.lastPaymentDate).toLocaleDateString()
                            : 'Never'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Breach Letter</p>
                        <p className="text-sm">
                          {arrear.breachLetterSent 
                            ? `Sent ${arrear.breachLetterDate ? new Date(arrear.breachLetterDate).toLocaleDateString() : ''}`
                            : 'Not sent'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {arrear.paymentArrangementBroken && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm font-medium text-red-900">
                        ⚠️ Payment arrangement broken
                      </p>
                    </div>
                  )}

                  {arrear.notes && (
                    <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-sm text-gray-700">{arrear.notes}</p>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button variant="default">
                      Generate Breach Letter
                    </Button>
                    <Button variant="outline">
                      Contact Tenant
                    </Button>
                    <Button variant="outline">
                      View History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DollarSign className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-muted-foreground">No rent arrears requiring action</p>
              <p className="text-sm text-muted-foreground mt-1">
                All tenants are up to date with rent payments
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
