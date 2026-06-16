import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Approvals from "./pages/Approvals";
import Properties from "./pages/Properties";
import Tenants from "./pages/Tenants";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import RentArrears from "./pages/RentArrears";
import Maintenance from "./pages/Maintenance";
import Viewings from "./pages/Viewings";
import Communications from "./pages/Communications";
import Calendar from "./pages/Calendar";
import Integrations from "./pages/Integrations";
import DataImport from "./pages/DataImport";
import Settings from "./pages/Settings";
import Templates from "./pages/Templates";
import Scheduled from "./pages/Scheduled";
import SentCommunications from "./pages/SentCommunications";
import Tenancies from "./pages/Tenancies";
import Alerts from "./pages/Alerts";
import TenancyTimeline from "./pages/TenancyTimeline";
import BookViewing from "./pages/BookViewing";
import Invoices from "./pages/Invoices"; // [graft] recovered invoice system

function Router() {
  return (
    <Switch>
      {/* Public booking page - no dashboard layout */}
      <Route path={"/book-viewing"}>
        <BookViewing />
      </Route>

      {/* [graft] recovered invoice system */}
      <Route path={"/invoices"}>
        <DashboardLayout>
          <Invoices />
        </DashboardLayout>
      </Route>

      <Route path={"/"}>
        <DashboardLayout>
          <Home />
        </DashboardLayout>
      </Route>
      
      <Route path={"/properties"}>
        <DashboardLayout>
          <Properties />
        </DashboardLayout>
      </Route>
      
      <Route path={"/tenancies"}>
        <DashboardLayout>
          <Tenancies />
        </DashboardLayout>
      </Route>
      
      <Route path={"/tenancies/:id/timeline"}>
        <DashboardLayout>
          <TenancyTimeline />
        </DashboardLayout>
      </Route>
      
      <Route path={"/tenants"}>
        <DashboardLayout>
          <Tenants />
        </DashboardLayout>
      </Route>
      
      <Route path={"/tickets"}>
        <DashboardLayout>
          <Tickets />
        </DashboardLayout>
      </Route>
      
      <Route path={"/tickets/:id"}>
        <DashboardLayout>
          <TicketDetail />
        </DashboardLayout>
      </Route>
      
      <Route path={"/rent-arrears"}>
        <DashboardLayout>
          <RentArrears />
        </DashboardLayout>
      </Route>
      
      <Route path={"/maintenance"}>
        <DashboardLayout>
          <Maintenance />
        </DashboardLayout>
      </Route>
      
      <Route path={"/viewings"}>
        <DashboardLayout>
          <Viewings />
        </DashboardLayout>
      </Route>
      
      <Route path={"/communications"}>
        <DashboardLayout>
          <Communications />
        </DashboardLayout>
      </Route>
      
      <Route path={"/calendar"}>
        <DashboardLayout>
          <Calendar />
        </DashboardLayout>
      </Route>
      
      <Route path={"/settings"}>
        <DashboardLayout>
          <Settings />
        </DashboardLayout>
      </Route>
      
      <Route path={"/data-import"}>
        <DashboardLayout>
          <DataImport />
        </DashboardLayout>
      </Route>
      
      <Route path={"/integrations"}>
        <DashboardLayout>
          <Integrations />
        </DashboardLayout>
      </Route>
      
      <Route path={"/alerts"}>
        <DashboardLayout>
          <Alerts />
        </DashboardLayout>
      </Route>
      
      <Route path={"/approvals"}>
        <DashboardLayout>
          <Approvals />
        </DashboardLayout>
      </Route>
      <Route path={"/scheduled"}>
        <DashboardLayout>
          <Scheduled />
        </DashboardLayout>
      </Route>
      <Route path={"/sent"}>
        <DashboardLayout>
          <SentCommunications />
        </DashboardLayout>
      </Route>
      
      <Route path={"/templates"}>
        <DashboardLayout>
          <Templates />
        </DashboardLayout>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
