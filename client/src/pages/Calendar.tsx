import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon } from "lucide-react";

export default function Calendar() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Calendar</h1>
        <p className="text-muted-foreground mt-2">Manage time slots for viewings and maintenance</p>
      </div>
      <Card>
        <CardContent className="py-12 text-center">
          <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Calendar integration coming soon</p>
          <p className="text-sm text-muted-foreground mt-2">Create and manage time slots for HITL approval</p>
        </CardContent>
      </Card>
    </div>
  );
}
