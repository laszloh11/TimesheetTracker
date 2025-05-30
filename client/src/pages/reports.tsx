import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from "date-fns";
import { api } from "@/lib/api";
import { useRole } from "@/hooks/use-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Calendar, Download, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const { currentUser, currentRole } = useRole();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const getDateRange = () => {
    const date = new Date(selectedDate);
    if (selectedPeriod === "week") {
      return {
        start: format(startOfWeek(date), "yyyy-MM-dd"),
        end: format(endOfWeek(date), "yyyy-MM-dd"),
      };
    } else {
      return {
        start: format(startOfMonth(date), "yyyy-MM-dd"),
        end: format(endOfMonth(date), "yyyy-MM-dd"),
      };
    }
  };

  const { data: timeEntries, isLoading } = useQuery({
    queryKey: ["/api/time-entries", {
      userId: currentUser?.id,
      [selectedPeriod]: selectedPeriod === "week" ? getDateRange().start : undefined,
      month: selectedPeriod === "month" ? new Date(selectedDate).getMonth() + 1 : undefined,
      year: selectedPeriod === "month" ? new Date(selectedDate).getFullYear() : undefined,
    }],
    queryFn: () => 
      selectedPeriod === "week" 
        ? api.getTimeEntries({ userId: currentUser?.id, week: getDateRange().start })
        : api.getTimeEntries({ 
            userId: currentUser?.id, 
            month: new Date(selectedDate).getMonth() + 1,
            year: new Date(selectedDate).getFullYear()
          }),
    enabled: !!currentUser,
  });

  const { data: allProjects } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: () => api.getProjects(),
    enabled: currentRole === "manager" || currentRole === "admin",
  });

  const totalHours = timeEntries?.reduce((sum: number, entry: any) => sum + parseFloat(entry.hours), 0) || 0;
  
  const projectBreakdown = timeEntries?.reduce((acc: any, entry: any) => {
    const projectName = entry.project.name;
    acc[projectName] = (acc[projectName] || 0) + parseFloat(entry.hours);
    return acc;
  }, {}) || {};

  const dailyBreakdown = timeEntries?.reduce((acc: any, entry: any) => {
    const date = entry.date;
    acc[date] = (acc[date] || 0) + parseFloat(entry.hours);
    return acc;
  }, {}) || {};

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "status-active";
      case "pending":
        return "status-pending";
      case "closed":
        return "status-closed";
      default:
        return "bg-gray-500";
    }
  };

  const handleDownloadReport = () => {
    // Create CSV content
    const headers = ["Date", "Project", "Hours", "Description", "Status"];
    const rows = timeEntries?.map((entry: any) => [
      entry.date,
      entry.project.name,
      entry.hours,
      entry.description || "",
      entry.project.status
    ]) || [];

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `timesheet_report_${selectedPeriod}_${selectedDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: `${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} report downloaded successfully!`,
    });
  };

  const dateRange = getDateRange();

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-2">
            View and download time tracking summaries
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <Card className="shadow-material mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="period">Report Period</Label>
              <Select value={selectedPeriod} onValueChange={(value: "week" | "month") => setSelectedPeriod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date">
                {selectedPeriod === "week" ? "Week Starting" : "Month"}
              </Label>
              <Input
                type={selectedPeriod === "week" ? "date" : "month"}
                value={selectedPeriod === "week" ? selectedDate : selectedDate.slice(0, 7)}
                onChange={(e) => setSelectedDate(
                  selectedPeriod === "week" ? e.target.value : e.target.value + "-01"
                )}
              />
            </div>

            <Button 
              onClick={handleDownloadReport}
              className="bg-primary text-white hover:bg-blue-700"
            >
              <Download className="mr-2 w-4 h-4" />
              Download CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-material">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Hours
                </p>
                <p className="text-3xl font-bold text-primary">{totalHours.toFixed(1)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {format(new Date(dateRange.start), "MMM dd")} - {format(new Date(dateRange.end), "MMM dd")}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-material">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Projects Worked
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {Object.keys(projectBreakdown).length}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Active projects this {selectedPeriod}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-material">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Avg. Daily Hours
                </p>
                <p className="text-3xl font-bold text-orange-500">
                  {Object.keys(dailyBreakdown).length > 0 
                    ? (totalHours / Object.keys(dailyBreakdown).length).toFixed(1)
                    : "0.0"
                  }
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Per working day
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="entries" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entries">Time Entries</TabsTrigger>
          <TabsTrigger value="projects">Project Breakdown</TabsTrigger>
          <TabsTrigger value="daily">Daily Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="entries">
          <Card className="shadow-material">
            <CardHeader>
              <CardTitle>Detailed Time Entries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Date</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No time entries found for the selected period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      timeEntries?.map((entry: any) => (
                        <TableRow key={entry.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            {format(new Date(entry.date), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>{entry.project.name}</TableCell>
                          <TableCell>{parseFloat(entry.hours).toFixed(1)}</TableCell>
                          <TableCell>{entry.description || "-"}</TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(entry.project.status)} text-white`}>
                              {entry.project.status.charAt(0).toUpperCase() + entry.project.status.slice(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card className="shadow-material">
            <CardHeader>
              <CardTitle>Project Time Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(projectBreakdown).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No project data available for the selected period.
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(projectBreakdown).map(([projectName, hours]: [string, any]) => (
                    <div key={projectName} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h3 className="font-medium">{projectName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {((hours / totalHours) * 100).toFixed(1)}% of total time
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{hours.toFixed(1)}h</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily">
          <Card className="shadow-material">
            <CardHeader>
              <CardTitle>Daily Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(dailyBreakdown).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No daily data available for the selected period.
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(dailyBreakdown)
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                    .map(([date, hours]: [string, any]) => (
                    <div key={date} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <h3 className="font-medium">{format(new Date(date), "EEEE, MMM dd, yyyy")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {hours < 6 ? "⚠️ Under recommended hours" : 
                           hours > 8 ? "📈 Overtime logged" : 
                           "✅ Good work day"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${
                          hours < 6 ? "text-orange-500" :
                          hours > 8 ? "text-blue-600" :
                          "text-green-600"
                        }`}>
                          {hours.toFixed(1)}h
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
