import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Bed, Bath, Car, DollarSign } from "lucide-react";

export default function Properties() {
  const { data: properties, isLoading } = trpc.properties.list.useQuery();

  if (isLoading) {
    return <div>Loading properties...</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vacant': return 'bg-yellow-100 text-yellow-800';
      case 'occupied': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-red-100 text-red-800';
      case 'advertising': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
        <p className="text-muted-foreground mt-2">
          Manage your property portfolio
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {properties?.map((property) => (
          <Card key={property.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <Building2 className="h-8 w-8 text-muted-foreground" />
                <Badge className={getStatusColor(property.status)}>
                  {property.status}
                </Badge>
              </div>
              <CardTitle className="mt-4">{property.address}</CardTitle>
              <CardDescription>
                {[property.suburb, property.state, property.postcode].filter(Boolean).join(', ')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {property.propertyType && (
                  <div className="text-sm">
                    <span className="font-medium">Type:</span> {property.propertyType}
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {property.bedrooms && (
                    <div className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      <span>{property.bedrooms}</span>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      <span>{property.bathrooms}</span>
                    </div>
                  )}
                  {property.parkingSpaces && (
                    <div className="flex items-center gap-1">
                      <Car className="h-4 w-4" />
                      <span>{property.parkingSpaces}</span>
                    </div>
                  )}
                </div>

                {property.weeklyRent && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-green-600">
                      ${property.weeklyRent}/week
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {properties?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No properties found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Sync with Palace.com to import your properties
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
