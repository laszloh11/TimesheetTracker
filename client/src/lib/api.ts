import { apiRequest } from "./queryClient";

export interface DashboardStats {
  todayHours: number;
  weekHours: number;
  teamHours?: number;
}

export interface ValidationError {
  message: string;
  currentTotal?: number;
  attemptedTotal?: number;
}

export const api = {
  // Time entries
  getTimeEntries: (params: {
    userId?: number;
    projectId?: number;
    date?: string;
    week?: string;
    month?: number;
    year?: number;
  }) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    return fetch(`/api/time-entries?${searchParams}`, {
      credentials: "include",
    }).then(res => res.json());
  },

  createTimeEntry: async (timeEntry: any) => {
    const response = await apiRequest("POST", "/api/time-entries", timeEntry);
    return response.json();
  },

  updateTimeEntry: async (id: number, timeEntry: any) => {
    const response = await apiRequest("PUT", `/api/time-entries/${id}`, timeEntry);
    return response.json();
  },

  deleteTimeEntry: async (id: number) => {
    const response = await apiRequest("DELETE", `/api/time-entries/${id}`);
    return response.json();
  },

  // Projects
  getProjects: (params?: { userId?: number; managerId?: number }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    return fetch(`/api/projects${searchParams.toString() ? `?${searchParams}` : ""}`, {
      credentials: "include",
    }).then(res => res.json());
  },

  createProject: async (project: any) => {
    const response = await apiRequest("POST", "/api/projects", project);
    return response.json();
  },

  updateProject: async (id: number, project: any) => {
    const response = await apiRequest("PUT", `/api/projects/${id}`, project);
    return response.json();
  },

  // Dashboard
  getDailyHours: (userId: number, date: string) => {
    return fetch(`/api/dashboard/daily-hours/${userId}/${date}`, {
      credentials: "include",
    }).then(res => res.json());
  },

  getWeeklyHours: (userId: number, startDate: string) => {
    return fetch(`/api/dashboard/weekly-hours/${userId}/${startDate}`, {
      credentials: "include",
    }).then(res => res.json());
  },

  getTeamHours: (managerId: number, startDate: string) => {
    return fetch(`/api/dashboard/team-hours/${managerId}/${startDate}`, {
      credentials: "include",
    }).then(res => res.json());
  },

  // Users
  getUsers: () => {
    return fetch("/api/users", {
      credentials: "include",
    }).then(res => res.json());
  },

  getUser: (id: number) => {
    return fetch(`/api/users/${id}`, {
      credentials: "include",
    }).then(res => res.json());
  },

  // Project assignments
  assignUserToProject: async (userId: number, projectId: number) => {
    const response = await apiRequest("POST", "/api/project-assignments", {
      userId,
      projectId,
    });
    return response.json();
  },

  removeUserFromProject: async (userId: number, projectId: number) => {
    const response = await apiRequest("DELETE", `/api/project-assignments/${userId}/${projectId}`);
    return response.json();
  },

  // Excel reports
  downloadExcelReport: (projectId: number) => {
    return fetch(`/api/reports/excel/${projectId}`, {
      credentials: "include",
    });
  },
};
