import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
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

function Router() {
  return (
    <Switch>
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
      
      <Route path={"/integrations"}>
        <DashboardLayout>
          <Integrations />
        </DashboardLayout>
      </Route>
      
      <Route path={"/404"} component={NotFound} />
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
