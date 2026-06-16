import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function BookViewing() {
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState({
    name: "",
    email: "",
    phone: "",
    propertyInterest: "none"
  });
  const [bookingComplete, setBookingComplete] = useState(false);

  // Get available viewing slots for the next 30 days.
  // Start at the beginning of today (not the current instant) so slots earlier in
  // today still appear, and extend to the end of the final day to catch boundary slots.
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);
  endDate.setHours(23, 59, 59, 999);

  const { data: slots } = trpc.calendar.availableSlots.useQuery({
    slotType: "viewing",
    startDate: startDate,
    endDate: endDate
  });

  const { data: properties } = trpc.properties.list.useQuery();

  const bookViewingMutation = trpc.viewings.createBooking.useMutation({
    onSuccess: () => {
      setBookingComplete(true);
      toast.success("Viewing request submitted! We'll confirm shortly.");
    },
    onError: (error: any) => {
      toast.error(`Booking failed: ${error.message}`);
    }
  });

  const handleSubmitBooking = () => {
    if (!selectedSlot) {
      toast.error("Please select a time slot");
      return;
    }
    if (!bookingForm.name || !bookingForm.email || !bookingForm.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    bookViewingMutation.mutate({
      slotId: selectedSlot.id,
      prospectName: bookingForm.name,
      prospectEmail: bookingForm.email,
      prospectPhone: bookingForm.phone,
      propertyId: bookingForm.propertyInterest && bookingForm.propertyInterest !== 'none' ? parseInt(bookingForm.propertyInterest) : undefined
    });
  };

  // Group slots by date
  const slotsByDate = slots?.reduce((acc: any, slot: any) => {
    const date = new Date(slot.startTime).toLocaleDateString('en-NZ', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {});

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-12 pb-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Booking Request Received!</h2>
            <p className="text-muted-foreground mb-6">
              We've received your viewing request for <strong>{new Date(selectedSlot.startTime).toLocaleDateString('en-NZ', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}</strong> at <strong>{new Date(selectedSlot.startTime).toLocaleTimeString('en-NZ', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}</strong>.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              You'll receive a confirmation email at <strong>{bookingForm.email}</strong> once we've reviewed your request.
            </p>
            <Button onClick={() => {
              setBookingComplete(false);
              setSelectedSlot(null);
              setBookingForm({ name: "", email: "", phone: "", propertyInterest: "none" });
            }}>
              Book Another Viewing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Book a Property Viewing</h1>
          <p className="text-lg text-muted-foreground">
            Choose a time that works for you and we'll confirm your viewing
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Available Slots */}
          <Card>
            <CardHeader>
              <CardTitle>Available Times</CardTitle>
              <CardDescription>Select a time slot for your viewing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-h-[600px] overflow-y-auto">
              {!slots || slots.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No viewing slots available at the moment</p>
                  <p className="text-sm text-muted-foreground mt-2">Please check back later</p>
                </div>
              ) : (
                Object.entries(slotsByDate || {}).map(([date, dateSlots]: [string, any]) => (
                  <div key={date}>
                    <h3 className="font-semibold mb-3 text-sm text-muted-foreground">{date}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {dateSlots.map((slot: any) => (
                        <Button
                          key={slot.id}
                          variant={selectedSlot?.id === slot.id ? "default" : "outline"}
                          className="justify-start"
                          onClick={() => setSelectedSlot(slot)}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          {new Date(slot.startTime).toLocaleTimeString('en-NZ', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Booking Form */}
          <Card>
            <CardHeader>
              <CardTitle>Your Details</CardTitle>
              <CardDescription>Tell us a bit about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSlot && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">
                      {new Date(selectedSlot.startTime).toLocaleDateString('en-NZ', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span>
                      {new Date(selectedSlot.startTime).toLocaleTimeString('en-NZ', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                      {' - '}
                      {new Date(selectedSlot.endTime).toLocaleTimeString('en-NZ', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  {selectedSlot.notes && (
                    <div className="flex items-start gap-2 text-sm mt-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5" />
                      <span>{selectedSlot.notes}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  value={bookingForm.name}
                  onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={bookingForm.email}
                  onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+64 21 123 4567"
                  value={bookingForm.phone}
                  onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property">Property of Interest (Optional)</Label>
                <Select 
                  value={bookingForm.propertyInterest} 
                  onValueChange={(value) => setBookingForm({ ...bookingForm, propertyInterest: value })}
                >
                  <SelectTrigger id="property">
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not sure yet</SelectItem>
                    {properties?.map(property => (
                      <SelectItem key={property.id} value={property.id.toString()}>
                        {property.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={handleSubmitBooking}
                disabled={!selectedSlot || bookViewingMutation.isPending}
              >
                {bookViewingMutation.isPending ? "Submitting..." : "Request Viewing"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Your viewing request will be reviewed and confirmed within 24 hours
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
