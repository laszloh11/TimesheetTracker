import { useRole } from "@/hooks/use-role";
import { RoleSelector } from "./role-selector";
import { Clock, User } from "lucide-react";

export function Navigation() {
  const { currentUser } = useRole();

  return (
    <nav className="bg-primary text-white shadow-material-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Clock className="text-2xl" />
            <h1 className="text-xl font-medium">TimeTracker Pro</h1>
          </div>
          <div className="flex items-center space-x-4">
            <RoleSelector />
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>{currentUser?.name || "Unknown User"}</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export function BottomNavigation() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2">
      <div className="flex justify-around">
        <button className="flex flex-col items-center py-2 px-3 text-primary">
          <Clock className="w-5 h-5" />
          <span className="text-xs mt-1">Home</span>
        </button>
        <button className="flex flex-col items-center py-2 px-3 text-muted-foreground">
          <Clock className="w-5 h-5" />
          <span className="text-xs mt-1">Log Time</span>
        </button>
        <button className="flex flex-col items-center py-2 px-3 text-muted-foreground">
          <Clock className="w-5 h-5" />
          <span className="text-xs mt-1">Reports</span>
        </button>
        <button className="flex flex-col items-center py-2 px-3 text-muted-foreground">
          <Clock className="w-5 h-5" />
          <span className="text-xs mt-1">Projects</span>
        </button>
      </div>
    </nav>
  );
}
