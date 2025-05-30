import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertTimeEntrySchema } from "@shared/schema";
import { api } from "@/lib/api";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";

type TimeEntryFormData = z.infer<typeof insertTimeEntrySchema>;

export function TimeEntryForm() {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [validationMessage, setValidationMessage] = useState<{
    type: "warning" | "success" | "error";
    message: string;
  } | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const form = useForm<TimeEntryFormData>({
    resolver: zodResolver(insertTimeEntrySchema),
    defaultValues: {
      userId: currentUser?.id || 1,
      date: today,
      hours: 0,
      description: "",
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["/api/projects", { userId: currentUser?.id }],
    queryFn: () => api.getProjects({ userId: currentUser?.id }),
    enabled: !!currentUser,
  });

  const { data: dailyHoursData } = useQuery({
    queryKey: ["/api/dashboard/daily-hours", currentUser?.id, form.watch("date")],
    queryFn: () => api.getDailyHours(currentUser?.id || 1, form.watch("date")),
    enabled: !!currentUser && !!form.watch("date"),
  });

  const createTimeEntryMutation = useMutation({
    mutationFn: api.createTimeEntry,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Time entry added successfully!",
      });
      form.reset({
        userId: currentUser?.id || 1,
        date: today,
        hours: 0,
        description: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setValidationMessage(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create time entry",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TimeEntryFormData) => {
    createTimeEntryMutation.mutate(data);
  };

  // Watch for hours change to show validation
  const watchedHours = form.watch("hours");
  const currentDailyHours = dailyHoursData?.hours || 0;
  const projectedTotal = currentDailyHours + watchedHours;

  // Update validation message when hours change
  useState(() => {
    if (watchedHours > 0) {
      const selectedProject = projects?.find((p: any) => p.id === form.watch("projectId"));
      
      if (projectedTotal > 8 && !selectedProject?.isPriority) {
        setValidationMessage({
          type: "error",
          message: `This entry would exceed the 8-hour daily limit (Total: ${projectedTotal}h). Only priority projects can exceed 8 hours.`
        });
      } else if (projectedTotal < 6) {
        setValidationMessage({
          type: "warning",
          message: `Current daily total: ${projectedTotal} hours. Consider logging more time to reach recommended 8 hours.`
        });
      } else {
        setValidationMessage({
          type: "success",
          message: `Good! Daily total: ${projectedTotal} hours.`
        });
      }
    } else {
      setValidationMessage(null);
    }
  }, [watchedHours, projectedTotal, projects, form.watch("projectId")]);

  const activeProjects = projects?.filter((p: any) => p.status === "active") || [];

  return (
    <Card className="shadow-material">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Plus className="mr-2" />
          Log Time Entry
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              {...form.register("date")}
              className="mt-2"
            />
            {form.formState.errors.date && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="project">Project</Label>
            <Select
              value={form.watch("projectId")?.toString()}
              onValueChange={(value) => form.setValue("projectId", parseInt(value))}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                {activeProjects.map((project: any) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.projectId && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.projectId.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="hours">Hours</Label>
            <Input
              id="hours"
              type="number"
              step="0.5"
              min="0"
              max="24"
              placeholder="0.0"
              {...form.register("hours", { valueAsNumber: true })}
              className="mt-2"
            />
            {form.formState.errors.hours && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.hours.message}</p>
            )}
          </div>

          <div className="flex items-end">
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary-dark material-ripple"
              disabled={createTimeEntryMutation.isPending}
            >
              {createTimeEntryMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 w-4 h-4" />
                  Add Entry
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Validation Messages */}
        {validationMessage && (
          <div className="mt-4">
            <Alert className={
              validationMessage.type === "error" ? "border-destructive" :
              validationMessage.type === "warning" ? "border-orange-500" :
              "border-green-500"
            }>
              {validationMessage.type === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
              {validationMessage.type === "warning" && <AlertTriangle className="h-4 w-4 text-orange-500" />}
              {validationMessage.type === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
              <AlertDescription className={
                validationMessage.type === "error" ? "text-destructive" :
                validationMessage.type === "warning" ? "text-orange-600" :
                "text-green-600"
              }>
                {validationMessage.message}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
