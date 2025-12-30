import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

export default function Communications() {
  const { data: communications } = trpc.communications.recent.useQuery({ limit: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Communications</h1>
        <p className="text-muted-foreground mt-2">View all communication history across channels</p>
      </div>
      {communications && communications.length > 0 ? (
        <div className="space-y-3">
          {communications.map((comm) => (
            <Card key={comm.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{comm.channel.toUpperCase()} - {comm.direction}</CardTitle>
                  <Badge variant="outline">{new Date(comm.createdAt).toLocaleDateString()}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {comm.subject && <p className="font-medium mb-2">{comm.subject}</p>}
                <p className="text-sm text-muted-foreground line-clamp-3">{comm.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="py-12 text-center"><MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">No communications yet</p></CardContent></Card>
      )}
    </div>
  );
}
