import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek } from "date-fns";
import { useRole } from "@/hooks/use-role";
import { api } from "@/lib/api";
import { TimeEntryForm } from "@/components/time-entry-form";
import { TimeEntriesTable } from "@/components/time-entries-table";
import { WeeklySummary } from "@/components/weekly-summary";
import { ProjectsOverview } from "@/components/projects-overview";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3, Briefcase } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { currentUser, currentRole } = useRole();
  
  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date()), "yyyy-MM-dd");
  
  const { data: todayHours } = useQuery({
    queryKey: ["/api/dashboard/daily-hours", currentUser?.id, today],
    queryFn: () => api.getDailyHours(currentUser?.id || 1, today),
    enabled: !!currentUser,
  });

  const { data: weekHours } = useQuery({
    queryKey: ["/api/dashboard/weekly-hours", currentUser?.id, weekStart],
    queryFn: () => api.getWeeklyHours(currentUser?.id || 1, weekStart),
    enabled: !!currentUser,
  });

  const { data: teamHours } = useQuery({
    queryKey: ["/api/dashboard/team-hours", currentUser?.id, weekStart],
    queryFn: () => api.getTeamHours(currentUser?.id || 1, weekStart),
    enabled: !!currentUser && (currentRole === "manager" || currentRole === "admin"),
  });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <Card className="shadow-material mb-8 fade-in">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-medium text-foreground mb-2">
                Welcome back, {currentUser?.name?.split(" ")[0] || "User"}!
              </h2>
              <p className="text-muted-foreground">
                Today is {format(new Date(), "EEEE, MMMM dd, yyyy")}
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {todayHours?.hours?.toFixed(1) || "0.0"}
                </div>
                <div className="text-sm text-muted-foreground">Hours Today</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {weekHours?.hours?.toFixed(1) || "0.0"}
                </div>
                <div className="text-sm text-muted-foreground">This Week</div>
              </div>
              {(currentRole === "manager" || currentRole === "admin") && (
                <div>
                  <div className="text-2xl font-bold text-orange-500">
                    {teamHours?.hours?.toFixed(1) || "0.0"}
                  </div>
                  <div className="text-sm text-muted-foreground">Team Hours</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Button
          asChild
          className="bg-primary text-white h-auto p-6 shadow-material material-ripple hover:bg-blue-700"
        >
          <div className="flex items-center space-x-4 cursor-pointer">
            <Plus className="text-3xl" />
            <div className="text-left">
              <div className="font-medium">Log Time</div>
              <div className="text-sm opacity-90">Add new time entry</div>
            </div>
          </div>
        </Button>
        
        <Button
          asChild
          variant="outline"
          className="bg-card border-border h-auto p-6 shadow-material material-ripple hover:bg-muted/50"
        >
          <Link href="/reports">
            <div className="flex items-center space-x-4">
              <BarChart3 className="text-3xl text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium text-foreground">Reports</div>
                <div className="text-sm text-muted-foreground">View summaries</div>
              </div>
            </div>
          </Link>
        </Button>
        
        <Button
          asChild
          variant="outline"
          className="bg-card border-border h-auto p-6 shadow-material material-ripple hover:bg-muted/50"
        >
          <Link href="/projects">
            <div className="flex items-center space-x-4">
              <Briefcase className="text-3xl text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium text-foreground">Projects</div>
                <div className="text-sm text-muted-foreground">Manage projects</div>
              </div>
            </div>
          </Link>
        </Button>
      </div>

      {/* Time Entry Form */}
      <div className="mb-8">
        <TimeEntryForm />
      </div>

      {/* Recent Entries Table */}
      <div className="mb-8">
        <TimeEntriesTable />
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <WeeklySummary />
        <ProjectsOverview />
      </div>

      {/* Manager/Admin Features */}
      {(currentRole === "manager" || currentRole === "admin") && (
        <Card className="shadow-material">
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium text-foreground mb-6 flex items-center">
              <Briefcase className="mr-2" />
              Management Dashboard
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {teamHours?.hours?.toFixed(0) || "0"}
                </div>
                <div className="text-sm text-muted-foreground">Team Hours This Week</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">8</div>
                <div className="text-sm text-muted-foreground">Active Projects</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">12</div>
                <div className="text-sm text-muted-foreground">Pending Approvals</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Button className="bg-primary text-white material-ripple hover:bg-blue-700">
                <BarChart3 className="mr-2 w-4 h-4" />
                Export Team Reports
              </Button>
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                <Plus className="mr-2 w-4 h-4" />
                Review Entries
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
