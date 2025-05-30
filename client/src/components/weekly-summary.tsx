import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek } from "date-fns";
import { api } from "@/lib/api";
import { useRole } from "@/hooks/use-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, Download } from "lucide-react";

export function WeeklySummary() {
  const { currentUser } = useRole();
  
  const weekStart = format(startOfWeek(new Date()), "yyyy-MM-dd");
  
  const { data: weeklyHours, isLoading } = useQuery({
    queryKey: ["/api/dashboard/weekly-hours", currentUser?.id, weekStart],
    queryFn: () => api.getWeeklyHours(currentUser?.id || 1, weekStart),
    enabled: !!currentUser,
  });

  const { data: weeklyEntries } = useQuery({
    queryKey: ["/api/time-entries", { userId: currentUser?.id, week: weekStart }],
    queryFn: () => api.getTimeEntries({ userId: currentUser?.id, week: weekStart }),
    enabled: !!currentUser,
  });

  const hours = weeklyHours?.hours || 0;
  const targetHours = 40;
  const progressPercentage = Math.min((hours / targetHours) * 100, 100);

  // Group entries by project
  const projectHours = weeklyEntries?.reduce((acc: any, entry: any) => {
    const projectName = entry.project.name;
    acc[projectName] = (acc[projectName] || 0) + parseFloat(entry.hours);
    return acc;
  }, {}) || {};

  if (isLoading) {
    return (
      <Card className="shadow-material">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarDays className="mr-2" />
            This Week Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-2 bg-muted animate-pulse rounded" />
            <div className="space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded" />
              <div className="h-4 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-material">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CalendarDays className="mr-2" />
          This Week Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Total Hours</span>
          <span className="text-2xl font-bold text-primary">{hours.toFixed(1)}</span>
        </div>
        
        <div className="space-y-2">
          <Progress value={progressPercentage} className="h-2" />
          <div className="text-sm text-muted-foreground">
            {Math.round(progressPercentage)}% of target ({targetHours} hours)
          </div>
        </div>
        
        <div className="space-y-2">
          {Object.entries(projectHours).map(([projectName, hours]: [string, any]) => (
            <div key={projectName} className="flex justify-between">
              <span className="text-sm text-muted-foreground">{projectName}</span>
              <span className="text-sm font-medium">{hours.toFixed(1)}h</span>
            </div>
          ))}
          {Object.keys(projectHours).length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No time logged this week
            </div>
          )}
        </div>
        
        <Button 
          variant="outline" 
          className="w-full mt-4"
          onClick={() => {
            // TODO: Implement weekly report download
            console.log("Download weekly report");
          }}
        >
          <Download className="mr-2 w-4 h-4" />
          Download Weekly Report
        </Button>
      </CardContent>
    </Card>
  );
}
