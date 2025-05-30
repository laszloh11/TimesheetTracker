import { 
  users, 
  projects, 
  timeEntries, 
  projectAssignments,
  type User, 
  type InsertUser,
  type Project,
  type InsertProject,
  type TimeEntry,
  type InsertTimeEntry,
  type ProjectAssignment,
  type InsertProjectAssignment,
  type TimeEntryWithProject,
  type ProjectWithAssignments
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Projects
  getProject(id: number): Promise<Project | undefined>;
  getProjectsForUser(userId: number): Promise<Project[]>;
  getProjectsForManager(managerId: number): Promise<Project[]>;
  getAllProjects(): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;

  // Time Entries
  getTimeEntry(id: number): Promise<TimeEntry | undefined>;
  getTimeEntriesForUser(userId: number): Promise<TimeEntryWithProject[]>;
  getTimeEntriesForProject(projectId: number): Promise<TimeEntryWithProject[]>;
  getTimeEntriesForDate(userId: number, date: string): Promise<TimeEntryWithProject[]>;
  getTimeEntriesForWeek(userId: number, startDate: string): Promise<TimeEntryWithProject[]>;
  getTimeEntriesForMonth(userId: number, year: number, month: number): Promise<TimeEntryWithProject[]>;
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: number, timeEntry: Partial<TimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: number): Promise<boolean>;

  // Project Assignments
  assignUserToProject(assignment: InsertProjectAssignment): Promise<ProjectAssignment>;
  getUserProjectAssignments(userId: number): Promise<ProjectAssignment[]>;
  getProjectAssignments(projectId: number): Promise<ProjectAssignment[]>;
  removeUserFromProject(userId: number, projectId: number): Promise<boolean>;

  // Dashboard data
  getDailyHours(userId: number, date: string): Promise<number>;
  getWeeklyHours(userId: number, startDate: string): Promise<number>;
  getTeamHours(managerId: number, startDate: string): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private timeEntries: Map<number, TimeEntry>;
  private projectAssignments: Map<number, ProjectAssignment>;
  private currentUserId: number;
  private currentProjectId: number;
  private currentTimeEntryId: number;
  private currentAssignmentId: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.timeEntries = new Map();
    this.projectAssignments = new Map();
    this.currentUserId = 1;
    this.currentProjectId = 1;
    this.currentTimeEntryId = 1;
    this.currentAssignmentId = 1;

    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create users
    const johnDoe: User = { id: 1, username: "john.doe", name: "John Doe", role: "employee" };
    const janeSmith: User = { id: 2, username: "jane.smith", name: "Jane Smith", role: "manager" };
    const adminUser: User = { id: 3, username: "admin", name: "Admin User", role: "admin" };
    
    this.users.set(1, johnDoe);
    this.users.set(2, janeSmith);
    this.users.set(3, adminUser);
    this.currentUserId = 4;

    // Create projects
    const websiteProject: Project = {
      id: 1,
      name: "Website Redesign",
      description: "Complete redesign of company website",
      startDate: "2024-11-01",
      endDate: "2025-01-15",
      status: "active",
      isPriority: true,
      managerId: 2
    };

    const mobileProject: Project = {
      id: 2,
      name: "Mobile App Development",
      description: "Native mobile application development",
      startDate: "2024-12-01",
      endDate: "2025-03-01",
      status: "pending",
      isPriority: false,
      managerId: 2
    };

    const dbProject: Project = {
      id: 3,
      name: "Database Migration",
      description: "Legacy database migration to cloud",
      startDate: "2024-10-01",
      endDate: "2024-12-15",
      status: "closed",
      isPriority: false,
      managerId: 2
    };

    this.projects.set(1, websiteProject);
    this.projects.set(2, mobileProject);
    this.projects.set(3, dbProject);
    this.currentProjectId = 4;

    // Assign users to projects
    this.projectAssignments.set(1, { id: 1, userId: 1, projectId: 1 });
    this.projectAssignments.set(2, { id: 2, userId: 1, projectId: 2 });
    this.projectAssignments.set(3, { id: 3, userId: 1, projectId: 3 });
    this.currentAssignmentId = 4;

    // Create sample time entries
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);

    const timeEntry1: TimeEntry = {
      id: 1,
      userId: 1,
      projectId: 1,
      date: today.toISOString().split('T')[0],
      hours: "4.0",
      description: "Frontend development work",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const timeEntry2: TimeEntry = {
      id: 2,
      userId: 1,
      projectId: 2,
      date: yesterday.toISOString().split('T')[0],
      hours: "6.5",
      description: "Mobile UI implementation",
      createdAt: yesterday,
      updatedAt: yesterday
    };

    const timeEntry3: TimeEntry = {
      id: 3,
      userId: 1,
      projectId: 3,
      date: dayBefore.toISOString().split('T')[0],
      hours: "8.0",
      description: "Database schema migration",
      createdAt: dayBefore,
      updatedAt: dayBefore
    };

    this.timeEntries.set(1, timeEntry1);
    this.timeEntries.set(2, timeEntry2);
    this.timeEntries.set(3, timeEntry3);
    this.currentTimeEntryId = 4;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsForUser(userId: number): Promise<Project[]> {
    const assignments = Array.from(this.projectAssignments.values())
      .filter(assignment => assignment.userId === userId);
    
    const projects: Project[] = [];
    for (const assignment of assignments) {
      const project = this.projects.get(assignment.projectId);
      if (project) {
        projects.push(project);
      }
    }
    return projects;
  }

  async getProjectsForManager(managerId: number): Promise<Project[]> {
    return Array.from(this.projects.values())
      .filter(project => project.managerId === managerId);
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const project: Project = { ...insertProject, id };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: number, updateData: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { ...project, ...updateData };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    return this.timeEntries.get(id);
  }

  async getTimeEntriesForUser(userId: number): Promise<TimeEntryWithProject[]> {
    const entries = Array.from(this.timeEntries.values())
      .filter(entry => entry.userId === userId);
    
    const entriesWithProjects: TimeEntryWithProject[] = [];
    for (const entry of entries) {
      const project = this.projects.get(entry.projectId);
      if (project) {
        entriesWithProjects.push({ ...entry, project });
      }
    }
    
    return entriesWithProjects.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getTimeEntriesForProject(projectId: number): Promise<TimeEntryWithProject[]> {
    const entries = Array.from(this.timeEntries.values())
      .filter(entry => entry.projectId === projectId);
    
    const entriesWithProjects: TimeEntryWithProject[] = [];
    for (const entry of entries) {
      const project = this.projects.get(entry.projectId);
      if (project) {
        entriesWithProjects.push({ ...entry, project });
      }
    }
    
    return entriesWithProjects;
  }

  async getTimeEntriesForDate(userId: number, date: string): Promise<TimeEntryWithProject[]> {
    const entries = Array.from(this.timeEntries.values())
      .filter(entry => entry.userId === userId && entry.date === date);
    
    const entriesWithProjects: TimeEntryWithProject[] = [];
    for (const entry of entries) {
      const project = this.projects.get(entry.projectId);
      if (project) {
        entriesWithProjects.push({ ...entry, project });
      }
    }
    
    return entriesWithProjects;
  }

  async getTimeEntriesForWeek(userId: number, startDate: string): Promise<TimeEntryWithProject[]> {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    const entries = Array.from(this.timeEntries.values())
      .filter(entry => {
        if (entry.userId !== userId) return false;
        const entryDate = new Date(entry.date);
        return entryDate >= start && entryDate <= end;
      });
    
    const entriesWithProjects: TimeEntryWithProject[] = [];
    for (const entry of entries) {
      const project = this.projects.get(entry.projectId);
      if (project) {
        entriesWithProjects.push({ ...entry, project });
      }
    }
    
    return entriesWithProjects;
  }

  async getTimeEntriesForMonth(userId: number, year: number, month: number): Promise<TimeEntryWithProject[]> {
    const entries = Array.from(this.timeEntries.values())
      .filter(entry => {
        if (entry.userId !== userId) return false;
        const entryDate = new Date(entry.date);
        return entryDate.getFullYear() === year && entryDate.getMonth() === month - 1;
      });
    
    const entriesWithProjects: TimeEntryWithProject[] = [];
    for (const entry of entries) {
      const project = this.projects.get(entry.projectId);
      if (project) {
        entriesWithProjects.push({ ...entry, project });
      }
    }
    
    return entriesWithProjects;
  }

  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const id = this.currentTimeEntryId++;
    const now = new Date();
    const timeEntry: TimeEntry = { 
      ...insertTimeEntry, 
      id,
      hours: insertTimeEntry.hours.toString(),
      createdAt: now,
      updatedAt: now
    };
    this.timeEntries.set(id, timeEntry);
    return timeEntry;
  }

  async updateTimeEntry(id: number, updateData: Partial<TimeEntry>): Promise<TimeEntry | undefined> {
    const timeEntry = this.timeEntries.get(id);
    if (!timeEntry) return undefined;
    
    const updatedEntry = { 
      ...timeEntry, 
      ...updateData, 
      updatedAt: new Date() 
    };
    this.timeEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteTimeEntry(id: number): Promise<boolean> {
    return this.timeEntries.delete(id);
  }

  async assignUserToProject(assignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    const id = this.currentAssignmentId++;
    const projectAssignment: ProjectAssignment = { ...assignment, id };
    this.projectAssignments.set(id, projectAssignment);
    return projectAssignment;
  }

  async getUserProjectAssignments(userId: number): Promise<ProjectAssignment[]> {
    return Array.from(this.projectAssignments.values())
      .filter(assignment => assignment.userId === userId);
  }

  async getProjectAssignments(projectId: number): Promise<ProjectAssignment[]> {
    return Array.from(this.projectAssignments.values())
      .filter(assignment => assignment.projectId === projectId);
  }

  async removeUserFromProject(userId: number, projectId: number): Promise<boolean> {
    const assignment = Array.from(this.projectAssignments.entries())
      .find(([_, assignment]) => assignment.userId === userId && assignment.projectId === projectId);
    
    if (assignment) {
      return this.projectAssignments.delete(assignment[0]);
    }
    return false;
  }

  async getDailyHours(userId: number, date: string): Promise<number> {
    const entries = Array.from(this.timeEntries.values())
      .filter(entry => entry.userId === userId && entry.date === date);
    
    return entries.reduce((total, entry) => total + parseFloat(entry.hours), 0);
  }

  async getWeeklyHours(userId: number, startDate: string): Promise<number> {
    const entries = await this.getTimeEntriesForWeek(userId, startDate);
    return entries.reduce((total, entry) => total + parseFloat(entry.hours), 0);
  }

  async getTeamHours(managerId: number, startDate: string): Promise<number> {
    const projects = await this.getProjectsForManager(managerId);
    const projectIds = projects.map(p => p.id);
    
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    const entries = Array.from(this.timeEntries.values())
      .filter(entry => {
        if (!projectIds.includes(entry.projectId)) return false;
        const entryDate = new Date(entry.date);
        return entryDate >= start && entryDate <= end;
      });
    
    return entries.reduce((total, entry) => total + parseFloat(entry.hours), 0);
  }
}

export const storage = new MemStorage();
