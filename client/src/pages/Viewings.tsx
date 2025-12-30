import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export default function Viewings() {
  const { data: viewings } = trpc.viewings.list.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Viewings</h1>
          <p className="text-muted-foreground mt-2">Manage property viewing bookings</p>
        </div>
        <Button>Schedule Viewing</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Pending Approval</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{viewings?.length || 0}</div></CardContent>
        </Card>
      </div>
      {viewings && viewings.length > 0 ? (
        <div className="space-y-3">
          {viewings.map((viewing) => (
            <Card key={viewing.id}>
              <CardHeader>
                <CardTitle>{viewing.prospectName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(viewing.scheduledDate).toLocaleString()}</span>
                </div>
                <Button>Approve Viewing</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="py-12 text-center"><Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">No pending viewings</p></CardContent></Card>
      )}
    </div>
  );
}
