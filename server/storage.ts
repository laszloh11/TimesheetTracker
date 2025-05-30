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
import { db } from "./db";
import { eq, and, gte, lte, sql } from "drizzle-orm";

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

export class DatabaseStorage implements IStorage {
  async initializeDatabase() {
    // Create sample data if database is empty
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length === 0) {
      await this.seedDatabase();
    }
  }

  private async seedDatabase() {
    // Create users
    const [johnDoe] = await db.insert(users).values({
      username: "john.doe",
      name: "John Doe",
      role: "employee"
    }).returning();

    const [janeSmith] = await db.insert(users).values({
      username: "jane.smith",
      name: "Jane Smith",
      role: "manager"
    }).returning();

    const [adminUser] = await db.insert(users).values({
      username: "admin",
      name: "Admin User",
      role: "admin"
    }).returning();

    // Create projects
    const [websiteProject] = await db.insert(projects).values({
      name: "Website Redesign",
      description: "Complete redesign of company website",
      startDate: "2024-11-01",
      endDate: "2025-01-15",
      status: "active",
      isPriority: true,
      managerId: janeSmith.id
    }).returning();

    const [mobileProject] = await db.insert(projects).values({
      name: "Mobile App Development",
      description: "Native mobile application development",
      startDate: "2024-12-01",
      endDate: "2025-03-01",
      status: "pending",
      isPriority: false,
      managerId: janeSmith.id
    }).returning();

    const [dbProject] = await db.insert(projects).values({
      name: "Database Migration",
      description: "Legacy database migration to cloud",
      startDate: "2024-10-01",
      endDate: "2024-12-15",
      status: "closed",
      isPriority: false,
      managerId: janeSmith.id
    }).returning();

    // Assign users to projects
    await db.insert(projectAssignments).values([
      { userId: johnDoe.id, projectId: websiteProject.id },
      { userId: johnDoe.id, projectId: mobileProject.id },
      { userId: johnDoe.id, projectId: dbProject.id }
    ]);

    // Create sample time entries
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date();
    dayBefore.setDate(dayBefore.getDate() - 2);

    await db.insert(timeEntries).values([
      {
        userId: johnDoe.id,
        projectId: websiteProject.id,
        date: today,
        hours: "4.0",
        description: "Frontend development work"
      },
      {
        userId: johnDoe.id,
        projectId: mobileProject.id,
        date: yesterday.toISOString().split('T')[0],
        hours: "6.5",
        description: "Mobile UI implementation"
      },
      {
        userId: johnDoe.id,
        projectId: dbProject.id,
        date: dayBefore.toISOString().split('T')[0],
        hours: "8.0",
        description: "Database schema migration"
      }
    ]);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsForUser(userId: number): Promise<Project[]> {
    const userProjects = await db
      .select({ project: projects })
      .from(projects)
      .innerJoin(projectAssignments, eq(projects.id, projectAssignments.projectId))
      .where(eq(projectAssignments.userId, userId));
    
    return userProjects.map(row => row.project);
  }

  async getProjectsForManager(managerId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.managerId, managerId));
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: number, updateData: Partial<Project>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
    return entry || undefined;
  }

  async getTimeEntriesForUser(userId: number): Promise<TimeEntryWithProject[]> {
    const entries = await db
      .select({
        id: timeEntries.id,
        userId: timeEntries.userId,
        projectId: timeEntries.projectId,
        date: timeEntries.date,
        hours: timeEntries.hours,
        description: timeEntries.description,
        createdAt: timeEntries.createdAt,
        updatedAt: timeEntries.updatedAt,
        project: projects
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(eq(timeEntries.userId, userId))
      .orderBy(sql`${timeEntries.date} DESC`);
    
    return entries;
  }

  async getTimeEntriesForProject(projectId: number): Promise<TimeEntryWithProject[]> {
    const entries = await db
      .select({
        id: timeEntries.id,
        userId: timeEntries.userId,
        projectId: timeEntries.projectId,
        date: timeEntries.date,
        hours: timeEntries.hours,
        description: timeEntries.description,
        createdAt: timeEntries.createdAt,
        updatedAt: timeEntries.updatedAt,
        project: projects
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(eq(timeEntries.projectId, projectId));
    
    return entries;
  }

  async getTimeEntriesForDate(userId: number, date: string): Promise<TimeEntryWithProject[]> {
    const entries = await db
      .select({
        id: timeEntries.id,
        userId: timeEntries.userId,
        projectId: timeEntries.projectId,
        date: timeEntries.date,
        hours: timeEntries.hours,
        description: timeEntries.description,
        createdAt: timeEntries.createdAt,
        updatedAt: timeEntries.updatedAt,
        project: projects
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(and(eq(timeEntries.userId, userId), eq(timeEntries.date, date)));
    
    return entries;
  }

  async getTimeEntriesForWeek(userId: number, startDate: string): Promise<TimeEntryWithProject[]> {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    const entries = await db
      .select({
        id: timeEntries.id,
        userId: timeEntries.userId,
        projectId: timeEntries.projectId,
        date: timeEntries.date,
        hours: timeEntries.hours,
        description: timeEntries.description,
        createdAt: timeEntries.createdAt,
        updatedAt: timeEntries.updatedAt,
        project: projects
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(and(
        eq(timeEntries.userId, userId),
        gte(timeEntries.date, startDate),
        lte(timeEntries.date, endDate.toISOString().split('T')[0])
      ));
    
    return entries;
  }

  async getTimeEntriesForMonth(userId: number, year: number, month: number): Promise<TimeEntryWithProject[]> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const entries = await db
      .select({
        id: timeEntries.id,
        userId: timeEntries.userId,
        projectId: timeEntries.projectId,
        date: timeEntries.date,
        hours: timeEntries.hours,
        description: timeEntries.description,
        createdAt: timeEntries.createdAt,
        updatedAt: timeEntries.updatedAt,
        project: projects
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(and(
        eq(timeEntries.userId, userId),
        gte(timeEntries.date, startDate),
        lte(timeEntries.date, endDate)
      ));
    
    return entries;
  }

  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const [entry] = await db.insert(timeEntries).values({
      ...insertTimeEntry,
      hours: insertTimeEntry.hours.toString()
    }).returning();
    return entry;
  }

  async updateTimeEntry(id: number, updateData: Partial<TimeEntry>): Promise<TimeEntry | undefined> {
    const [entry] = await db
      .update(timeEntries)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(timeEntries.id, id))
      .returning();
    return entry || undefined;
  }

  async deleteTimeEntry(id: number): Promise<boolean> {
    const result = await db.delete(timeEntries).where(eq(timeEntries.id, id));
    return result.rowCount > 0;
  }

  async assignUserToProject(assignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    const [result] = await db.insert(projectAssignments).values(assignment).returning();
    return result;
  }

  async getUserProjectAssignments(userId: number): Promise<ProjectAssignment[]> {
    return await db.select().from(projectAssignments).where(eq(projectAssignments.userId, userId));
  }

  async getProjectAssignments(projectId: number): Promise<ProjectAssignment[]> {
    return await db.select().from(projectAssignments).where(eq(projectAssignments.projectId, projectId));
  }

  async removeUserFromProject(userId: number, projectId: number): Promise<boolean> {
    const result = await db.delete(projectAssignments)
      .where(and(
        eq(projectAssignments.userId, userId),
        eq(projectAssignments.projectId, projectId)
      ));
    return result.rowCount > 0;
  }

  async getDailyHours(userId: number, date: string): Promise<number> {
    const result = await db
      .select({ total: sql<number>`SUM(CAST(${timeEntries.hours} AS DECIMAL))` })
      .from(timeEntries)
      .where(and(eq(timeEntries.userId, userId), eq(timeEntries.date, date)));
    
    return result[0]?.total || 0;
  }

  async getWeeklyHours(userId: number, startDate: string): Promise<number> {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    const result = await db
      .select({ total: sql<number>`SUM(CAST(${timeEntries.hours} AS DECIMAL))` })
      .from(timeEntries)
      .where(and(
        eq(timeEntries.userId, userId),
        gte(timeEntries.date, startDate),
        lte(timeEntries.date, endDate.toISOString().split('T')[0])
      ));
    
    return result[0]?.total || 0;
  }

  async getTeamHours(managerId: number, startDate: string): Promise<number> {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    const result = await db
      .select({ total: sql<number>`SUM(CAST(${timeEntries.hours} AS DECIMAL))` })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(and(
        eq(projects.managerId, managerId),
        gte(timeEntries.date, startDate),
        lte(timeEntries.date, endDate.toISOString().split('T')[0])
      ));
    
    return result[0]?.total || 0;
  }
}

export const storage = new DatabaseStorage();