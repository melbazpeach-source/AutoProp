import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, AlertCircle, Wrench, Calendar, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  
  const { data: properties } = trpc.properties.list.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const { data: tickets } = trpc.tickets.list.useQuery();
  const { data: arrears } = trpc.rentArrears.requiresAction.useQuery({ minDaysOverdue: 10 });
  const { data: maintenance } = trpc.maintenance.pendingApprovals.useQuery();
  const { data: viewings } = trpc.viewings.list.useQuery();
  const { data: communications } = trpc.communications.recent.useQuery({ limit: 10 });

  const stats = [
    {
      title: "Properties",
      value: properties?.length || 0,
      icon: Building2,
      description: "Total managed properties",
      href: "/properties",
    },
    {
      title: "Active Tenants",
      value: tenants?.length || 0,
      icon: Users,
      description: "Current tenancies",
      href: "/tenants",
    },
    {
      title: "Open Tickets",
      value: tickets?.filter(t => t.status !== 'closed' && t.status !== 'resolved').length || 0,
      icon: MessageSquare,
      description: "Requiring attention",
      href: "/tickets",
      urgent: true,
    },
    {
      title: "Rent Arrears",
      value: arrears?.length || 0,
      icon: AlertCircle,
      description: "10+ days overdue",
      href: "/rent-arrears",
      urgent: arrears && arrears.length > 0,
    },
    {
      title: "Pending Maintenance",
      value: maintenance?.length || 0,
      icon: Wrench,
      description: "Awaiting approval",
      href: "/maintenance",
    },
    {
      title: "Pending Viewings",
      value: viewings?.length || 0,
      icon: Calendar,
      description: "Awaiting approval",
      href: "/viewings",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Property Management Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your property portfolio and automation workflows
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.title} 
              className={`cursor-pointer transition-all hover:shadow-md ${stat.urgent ? 'border-orange-500 bg-orange-50' : ''}`}
              onClick={() => setLocation(stat.href)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.urgent ? 'text-orange-600' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.urgent ? 'text-orange-600' : ''}`}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Communications</CardTitle>
            <CardDescription>Latest messages across all channels</CardDescription>
          </CardHeader>
          <CardContent>
            {communications && communications.length > 0 ? (
              <div className="space-y-4">
                {communications.slice(0, 5).map((comm) => (
                  <div key={comm.id} className="flex items-start space-x-3 text-sm">
                    <div className={`mt-0.5 h-2 w-2 rounded-full ${
                      comm.channel === 'email' ? 'bg-blue-500' :
                      comm.channel === 'sms' ? 'bg-green-500' :
                      comm.channel === 'whatsapp' ? 'bg-emerald-500' :
                      'bg-gray-500'
                    }`} />
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">
                        {comm.channel.toUpperCase()} - {comm.direction}
                      </p>
                      <p className="text-muted-foreground line-clamp-2">
                        {comm.subject || comm.body}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(comm.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setLocation('/communications')}
                >
                  View All Communications
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent communications</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
            <CardDescription>Latest support and maintenance tickets</CardDescription>
          </CardHeader>
          <CardContent>
            {tickets && tickets.length > 0 ? (
              <div className="space-y-4">
                {tickets.slice(0, 5).map((ticket) => (
                  <div 
                    key={ticket.id} 
                    className="flex items-start space-x-3 text-sm cursor-pointer hover:bg-accent p-2 rounded-md -mx-2"
                    onClick={() => setLocation(`/tickets/${ticket.id}`)}
                  >
                    <div className={`mt-0.5 h-2 w-2 rounded-full ${
                      ticket.priority === 'urgent' ? 'bg-red-500' :
                      ticket.priority === 'high' ? 'bg-orange-500' :
                      ticket.priority === 'medium' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`} />
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">{ticket.ticketNumber}</p>
                      <p className="text-muted-foreground line-clamp-1">
                        {ticket.subject}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{ticket.status.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setLocation('/tickets')}
                >
                  View All Tickets
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent tickets</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Urgent Actions */}
      {arrears && arrears.length > 0 && (
        <Card className="border-orange-500 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">Urgent: Rent Arrears Requiring Action</CardTitle>
            <CardDescription className="text-orange-700">
              {arrears.length} tenant{arrears.length > 1 ? 's' : ''} with overdue rent (10+ days or broken payment arrangement)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setLocation('/rent-arrears')}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Review Rent Arrears
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
