import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useRole } from "@/hooks/use-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";
import { Link } from "wouter";

export function ProjectsOverview() {
  const { currentUser } = useRole();
  
  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects", { userId: currentUser?.id }],
    queryFn: () => api.getProjects({ userId: currentUser?.id }),
    enabled: !!currentUser,
  });

  const activeProjects = projects?.filter((project: any) => project.status === "active") || [];

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

  if (isLoading) {
    return (
      <Card className="shadow-material">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Briefcase className="mr-2" />
            Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="border border-border rounded-lg p-4">
                <div className="space-y-2">
                  <div className="h-5 bg-muted animate-pulse rounded" />
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-material">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Briefcase className="mr-2" />
          Active Projects
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeProjects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No active projects assigned
          </div>
        ) : (
          activeProjects.map((project: any) => (
            <div key={project.id} className="border border-border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-foreground">{project.name}</h4>
                <Badge className={`${getStatusColor(project.status)} text-white`}>
                  {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                Due: {format(new Date(project.endDate), "MMM dd, yyyy")}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {project.description || "No description"}
                </span>
                {project.isPriority && (
                  <Badge variant="outline" className="text-warning border-orange-500">
                    Priority
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
        
        <Link href="/projects">
          <Button variant="outline" className="w-full mt-4">
            View All Projects
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
