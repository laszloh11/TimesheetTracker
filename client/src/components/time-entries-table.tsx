import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useRole } from "@/hooks/use-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, ArrowRight, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TimeEntryWithProject } from "@shared/schema";

export function TimeEntriesTable() {
  const { currentUser, currentRole } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);

  const { data: timeEntries, isLoading } = useQuery({
    queryKey: ["/api/time-entries", { userId: currentUser?.id }],
    queryFn: () => api.getTimeEntries({ userId: currentUser?.id }),
    enabled: !!currentUser,
  });

  const deleteTimeEntryMutation = useMutation({
    mutationFn: api.deleteTimeEntry,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Time entry deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete time entry",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this time entry?")) {
      deleteTimeEntryMutation.mutate(id);
    }
  };

  const canEdit = (entry: TimeEntryWithProject) => {
    if (currentRole === "admin") return true;
    if (entry.userId === currentUser?.id) return true;
    
    // Managers can edit entries older than 48 hours
    if (currentRole === "manager") {
      const hoursSinceUpdate = (Date.now() - new Date(entry.updatedAt).getTime()) / (1000 * 60 * 60);
      return hoursSinceUpdate > 48;
    }
    
    return false;
  };

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

  const displayedEntries = showAll ? timeEntries : timeEntries?.slice(0, 5);

  if (isLoading) {
    return (
      <Card className="shadow-material">
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="mr-2" />
            Recent Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-material">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <History className="mr-2" />
          Recent Entries
        </CardTitle>
        {timeEntries && timeEntries.length > 5 && (
          <Button
            variant="ghost"
            onClick={() => setShowAll(!showAll)}
            className="text-primary hover:text-primary-dark"
          >
            <span>{showAll ? "Show Less" : "View All"}</span>
            <ArrowRight className="ml-1 w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedEntries?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No time entries found. Start by logging your first entry!
                  </TableCell>
                </TableRow>
              ) : (
                displayedEntries?.map((entry: TimeEntryWithProject) => (
                  <TableRow key={entry.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      {format(new Date(entry.date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-3 ${
                          entry.project.status === "active" ? "bg-green-600" :
                          entry.project.status === "pending" ? "bg-orange-500" :
                          "bg-gray-500"
                        }`} />
                        <span>{entry.project.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{parseFloat(entry.hours).toFixed(1)}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(entry.project.status)} text-white`}>
                        {entry.project.status.charAt(0).toUpperCase() + entry.project.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {canEdit(entry) ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary-dark"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(entry.id)}
                              className="text-destructive hover:text-red-700"
                              disabled={deleteTimeEntryMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">Locked</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
