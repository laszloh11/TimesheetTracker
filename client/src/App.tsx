import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "@/hooks/use-role";
import { Navigation, BottomNavigation } from "@/components/navigation";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";
import { Plus } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={Projects} />
      <Route path="/reports" component={Reports} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <Navigation />
            <Router />
            <BottomNavigation />
            
            {/* Floating Action Button (Mobile) */}
            <button className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-material-lg flex items-center justify-center material-ripple hover:bg-blue-700 z-40">
              <Plus className="w-6 h-6" />
            </button>
          </div>
          <Toaster />
        </TooltipProvider>
      </RoleProvider>
    </QueryClientProvider>
  );
}

export default App;
