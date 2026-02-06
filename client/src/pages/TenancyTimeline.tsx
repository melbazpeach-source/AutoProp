import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, AlertCircle, MessageSquare, Wrench, FileText, DollarSign } from "lucide-react";
import { useLocation } from "wouter";

export default function TenancyTimeline() {
  const params = useParams();
  const tenancyId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();

  const { data: events, isLoading } = trpc.tenancies.getTimeline.useQuery({ tenancyId });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'lease_start':
      case 'lease_end':
        return <FileText className="w-5 h-5" />;
      case 'rent_change':
        return <DollarSign className="w-5 h-5" />;
      case 'alert':
        return <AlertCircle className="w-5 h-5" />;
      case 'communication':
        return <MessageSquare className="w-5 h-5" />;
      case 'maintenance':
        return <Wrench className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'lease_start':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'lease_end':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'rent_change':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'alert':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'communication':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatEventType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/tenancies')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Tenancy Timeline</h1>
            <p className="text-muted-foreground">Loading timeline...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/tenancies')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Tenancy Timeline</h1>
            <p className="text-muted-foreground">Complete history of this tenancy</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No timeline events found for this tenancy
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/tenancies')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Tenancy Timeline</h1>
          <p className="text-muted-foreground">Complete history of this tenancy</p>
        </div>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

        {/* Timeline events */}
        <div className="space-y-6">
          {events.map((event, index) => (
            <div key={event.id} className="relative flex gap-6">
              {/* Timeline dot */}
              <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 border-background ${getEventColor(event.type)}`}>
                {getEventIcon(event.type)}
              </div>

              {/* Event card */}
              <Card className="flex-1">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{event.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(event.timestamp).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{formatEventType(event.type)}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{event.description}</p>
                  
                  {/* Metadata */}
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      {Object.entries(event.metadata).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p className="text-sm font-medium">
                            {value instanceof Date ? value.toLocaleDateString() : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
