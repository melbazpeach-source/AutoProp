import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [addSlotOpen, setAddSlotOpen] = useState(false);
  const [newSlot, setNewSlot] = useState({
    slotType: "viewing" as "viewing" | "maintenance" | "inspection",
    date: "",
    startTime: "",
    endTime: "",
    propertyId: "none",
    notes: ""
  });

  // Get week start (Monday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  const weekStart = getWeekStart(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return day;
  });

  // Format week range for display
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekRange = `${weekStart.toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-NZ', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // Get slots for the week
  const startOfWeek = new Date(weekStart);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(weekEnd);
  endOfWeek.setHours(23, 59, 59, 999);

  const { data: slots, refetch } = trpc.calendar.getSlots.useQuery({
    startDate: startOfWeek.toISOString(),
    endDate: endOfWeek.toISOString()
  });

  const { data: properties } = trpc.properties.list.useQuery();

  const createSlotMutation = trpc.calendar.createSlot.useMutation({
    onSuccess: () => {
      toast.success("Viewing slot created");
      setAddSlotOpen(false);
      setNewSlot({ slotType: "viewing", date: "", startTime: "", endTime: "", propertyId: "none", notes: "" });
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to create slot: ${error.message}`);
    }
  });

  const deleteSlotMutation = trpc.calendar.deleteSlot.useMutation({
    onSuccess: () => {
      toast.success("Slot deleted");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to delete: ${error.message}`);
    }
  });

  const handleCreateSlot = () => {
    if (!newSlot.date || !newSlot.startTime || !newSlot.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    const startTime = new Date(`${newSlot.date}T${newSlot.startTime}`);
    const endTime = new Date(`${newSlot.date}T${newSlot.endTime}`);

    createSlotMutation.mutate({
      slotType: newSlot.slotType,
      startTime: startTime,
      endTime: endTime,
      propertyId: newSlot.propertyId && newSlot.propertyId !== 'none' ? parseInt(newSlot.propertyId) : undefined,
      notes: newSlot.notes || undefined
    });
  };

  const handleDeleteSlot = (slotId: number) => {
    if (confirm("Are you sure you want to delete this slot?")) {
      deleteSlotMutation.mutate({ id: slotId });
    }
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Group slots by day
  const slotsByDay = weekDays.map(day => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    return {
      date: day,
      slots: (slots || []).filter((slot: any) => {
        const slotDate = new Date(slot.startTime);
        return slotDate >= dayStart && slotDate <= dayEnd;
      }).sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    };
  });

  const getSlotStatusBadge = (slot: any) => {
    if (!slot.available) {
      return <Badge variant="secondary">Booked</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Available</Badge>;
  };

  const getSlotTypeBadge = (type: string) => {
    const colors = {
      viewing: "bg-blue-100 text-blue-800",
      maintenance: "bg-orange-100 text-orange-800",
      inspection: "bg-purple-100 text-purple-800"
    };
    return <Badge className={colors[type as keyof typeof colors] || ""}>{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-2">Manage viewing slots and bookings</p>
        </div>
        <Dialog open={addSlotOpen} onOpenChange={setAddSlotOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Viewing Slot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Viewing Slot</DialogTitle>
              <DialogDescription>
                Create a new time slot that prospects can book for property viewings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slot-type">Slot Type</Label>
                <Select value={newSlot.slotType} onValueChange={(value: any) => setNewSlot({ ...newSlot, slotType: value })}>
                  <SelectTrigger id="slot-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewing">Viewing</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot-date">Date</Label>
                <Input
                  id="slot-date"
                  type="date"
                  value={newSlot.date}
                  onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={newSlot.startTime}
                    onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={newSlot.endTime}
                    onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="property">Property (Optional)</Label>
                <Select value={newSlot.propertyId} onValueChange={(value) => setNewSlot({ ...newSlot, propertyId: value })}>
                  <SelectTrigger id="property">
                    <SelectValue placeholder="Any property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any property</SelectItem>
                    {properties?.map(property => (
                      <SelectItem key={property.id} value={property.id.toString()}>
                        {property.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="e.g., Meet at property entrance"
                  value={newSlot.notes}
                  onChange={(e) => setNewSlot({ ...newSlot, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddSlotOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateSlot} disabled={createSlotMutation.isPending}>
                {createSlotMutation.isPending ? "Creating..." : "Create Slot"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <CardTitle>{weekRange}</CardTitle>
              <Button variant="link" size="sm" onClick={goToToday} className="text-xs">
                Today
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {slotsByDay.map(({ date, slots: daySlots }, index) => {
              const isToday = date.toDateString() === new Date().toDateString();
              const isPast = date < new Date() && !isToday;
              
              return (
                <div
                  key={index}
                  className={`border rounded-lg p-3 min-h-[200px] ${
                    isToday ? 'border-blue-500 bg-blue-50' : isPast ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="text-center mb-3">
                    <div className="text-xs text-muted-foreground">
                      {date.toLocaleDateString('en-NZ', { weekday: 'short' })}
                    </div>
                    <div className={`text-lg font-semibold ${isToday ? 'text-blue-600' : ''}`}>
                      {date.getDate()}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {daySlots.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center">No slots</p>
                    ) : (
                      daySlots.map((slot: any) => (
                        <div
                          key={slot.id}
                          className="bg-white border rounded p-2 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            {getSlotTypeBadge(slot.slotType)}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() => handleDeleteSlot(slot.id)}
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                          <div className="font-medium">
                            {new Date(slot.startTime).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(slot.endTime).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {getSlotStatusBadge(slot)}
                          {slot.notes && (
                            <p className="text-muted-foreground truncate">{slot.notes}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Available Slots</CardDescription>
            <CardTitle className="text-3xl">
              {slots?.filter((s: any) => s.available).length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Booked Slots</CardDescription>
            <CardTitle className="text-3xl">
              {slots?.filter((s: any) => !s.available).length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Slots</CardDescription>
            <CardTitle className="text-3xl">
              {slots?.length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
