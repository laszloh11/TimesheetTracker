import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema } from "@shared/schema";
import { api } from "@/lib/api";
import { useRole } from "@/hooks/use-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Briefcase, Plus, Download, Edit, Users, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { z } from "zod";
import type { Project, User } from "@shared/schema";

type ProjectFormData = z.infer<typeof insertProjectSchema>;

export default function Projects() {
  const { currentUser, currentRole } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      status: "pending",
      isPriority: false,
      managerId: currentUser?.id,
    },
  });

  const editForm = useForm<ProjectFormData>({
    resolver: zodResolver(insertProjectSchema),
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects", 
      currentRole === "employee" ? { userId: currentUser?.id } :
      currentRole === "manager" ? { managerId: currentUser?.id } :
      {}
    ],
    queryFn: () => 
      currentRole === "employee" ? api.getProjects({ userId: currentUser?.id }) :
      currentRole === "manager" ? api.getProjects({ managerId: currentUser?.id }) :
      api.getProjects(),
    enabled: !!currentUser,
  });

  const { data: allUsers } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => api.getUsers(),
    enabled: currentRole === "admin" || currentRole === "manager",
  });

  const { data: projectAssignments } = useQuery({
    queryKey: ["/api/project-assignments", selectedProject?.id],
    queryFn: () => fetch(`/api/project-assignments?projectId=${selectedProject?.id}`).then(res => res.json()),
    enabled: !!selectedProject && isMembersDialogOpen,
  });

  const createProjectMutation = useMutation({
    mutationFn: api.createProject,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Project created successfully!",
      });
      form.reset();
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateProject(id, data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Project updated successfully!",
      });
      setIsEditDialogOpen(false);
      setSelectedProject(null);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: ({ userId, projectId }: { userId: number; projectId: number }) => 
      api.assignUserToProject(userId, projectId),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User assigned to project successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/project-assignments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign user",
        variant: "destructive",
      });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: ({ userId, projectId }: { userId: number; projectId: number }) => 
      api.removeUserFromProject(userId, projectId),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User removed from project successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/project-assignments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    createProjectMutation.mutate(data);
  };

  const onEditSubmit = (data: ProjectFormData) => {
    if (selectedProject) {
      updateProjectMutation.mutate({ id: selectedProject.id, data });
    }
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    editForm.reset({
      name: project.name,
      description: project.description || "",
      startDate: project.startDate,
      endDate: project.endDate,
      status: project.status as any,
      isPriority: project.isPriority,
      managerId: project.managerId || currentUser?.id,
    });
    setIsEditDialogOpen(true);
  };

  const handleManageMembers = (project: Project) => {
    setSelectedProject(project);
    setIsMembersDialogOpen(true);
  };

  const handleAssignUser = (userId: number) => {
    if (selectedProject) {
      assignUserMutation.mutate({ userId, projectId: selectedProject.id });
    }
  };

  const handleRemoveUser = (userId: number) => {
    if (selectedProject) {
      removeUserMutation.mutate({ userId, projectId: selectedProject.id });
    }
  };

  const handleDownloadReport = async (projectId: number) => {
    try {
      const response = await api.downloadExcelReport(projectId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `project_report_${projectId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Excel report downloaded successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download report",
        variant: "destructive",
      });
    }
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

  const canCreateProject = currentRole === "manager" || currentRole === "admin";
  const canDownloadReports = currentRole === "manager" || currentRole === "admin";

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
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-2">
            {currentRole === "employee" ? "Your assigned projects" :
             currentRole === "manager" ? "Projects you manage" :
             "All projects in the system"}
          </p>
        </div>
        
        {canCreateProject && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white hover:bg-blue-700">
                <Plus className="mr-2 w-4 h-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Create a new project for time tracking and management.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="Enter project name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder="Enter project description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      {...form.register("startDate")}
                    />
                    {form.formState.errors.startDate && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.startDate.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      {...form.register("endDate")}
                    />
                    {form.formState.errors.endDate && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.endDate.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.watch("status")}
                    onValueChange={(value) => form.setValue("status", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPriority"
                    {...form.register("isPriority")}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isPriority" className="text-sm">
                    Priority Project (allows {'>'} 8 hours/day)
                  </Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createProjectMutation.isPending}
                    className="bg-primary text-white hover:bg-blue-700"
                  >
                    {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="shadow-material">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Briefcase className="mr-2" />
            Projects Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Project Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Priority</TableHead>
                  {canDownloadReports && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canDownloadReports ? 6 : 5} className="text-center py-8 text-muted-foreground">
                      No projects found.
                    </TableCell>
                  </TableRow>
                ) : (
                  projects?.map((project: any) => (
                    <TableRow key={project.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div>
                          <div className="font-medium">{project.name}</div>
                          {project.description && (
                            <div className="text-sm text-muted-foreground">{project.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(project.status)} text-white`}>
                          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(project.startDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(project.endDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        {project.isPriority ? (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            Priority
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Standard</span>
                        )}
                      </TableCell>
                      {canDownloadReports && (
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadReport(project.id)}
                              className="text-primary hover:text-blue-700"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProject(project)}
                              className="text-primary hover:text-blue-700"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleManageMembers(project)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Users className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project details and settings.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Project Name</Label>
              <Input
                id="edit-name"
                {...editForm.register("name")}
                placeholder="Enter project name"
              />
              {editForm.formState.errors.name && (
                <p className="text-sm text-destructive mt-1">{editForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                {...editForm.register("description")}
                placeholder="Enter project description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-startDate">Start Date</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  {...editForm.register("startDate")}
                />
                {editForm.formState.errors.startDate && (
                  <p className="text-sm text-destructive mt-1">{editForm.formState.errors.startDate.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="edit-endDate">End Date</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  {...editForm.register("endDate")}
                />
                {editForm.formState.errors.endDate && (
                  <p className="text-sm text-destructive mt-1">{editForm.formState.errors.endDate.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editForm.watch("status")}
                onValueChange={(value) => editForm.setValue("status", value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isPriority"
                {...editForm.register("isPriority")}
                className="rounded border-gray-300"
              />
              <Label htmlFor="edit-isPriority" className="text-sm">
                Priority Project (allows {'>'} 8 hours/day)
              </Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateProjectMutation.isPending}
                className="bg-primary text-white hover:bg-blue-700"
              >
                {updateProjectMutation.isPending ? "Updating..." : "Update Project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Project Members</DialogTitle>
            <DialogDescription>
              Add or remove team members from {selectedProject?.name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Current Members */}
            <div>
              <h3 className="text-lg font-medium mb-3">Current Members</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {projectAssignments?.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No members assigned to this project.</p>
                ) : (
                  projectAssignments?.map((assignment: any) => (
                    <div key={assignment.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{assignment.user?.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">({assignment.user?.role})</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(assignment.userId)}
                        disabled={removeUserMutation.isPending}
                        className="text-destructive hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add Members */}
            <div>
              <h3 className="text-lg font-medium mb-3">Add Members</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {allUsers?.filter((user: User) => 
                  !projectAssignments?.some((assignment: any) => assignment.userId === user.id)
                ).map((user: User) => (
                  <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{user.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">({user.role})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAssignUser(user.id)}
                      disabled={assignUserMutation.isPending}
                      className="text-primary hover:text-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setIsMembersDialogOpen(false)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
