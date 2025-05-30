import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTimeEntrySchema, insertProjectSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import ExcelJS from "exceljs";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Project routes
  app.get("/api/projects", async (req, res) => {
    try {
      const { userId, managerId } = req.query;
      
      let projects;
      if (userId) {
        projects = await storage.getProjectsForUser(parseInt(userId as string));
      } else if (managerId) {
        projects = await storage.getProjectsForManager(parseInt(managerId as string));
      } else {
        projects = await storage.getAllProjects();
      }
      
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const project = await storage.updateProject(id, updateData);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Time entry routes
  app.get("/api/time-entries", async (req, res) => {
    try {
      const { userId, projectId, date, week, month, year } = req.query;
      
      let entries;
      if (userId && date) {
        entries = await storage.getTimeEntriesForDate(parseInt(userId as string), date as string);
      } else if (userId && week) {
        entries = await storage.getTimeEntriesForWeek(parseInt(userId as string), week as string);
      } else if (userId && month && year) {
        entries = await storage.getTimeEntriesForMonth(parseInt(userId as string), parseInt(year as string), parseInt(month as string));
      } else if (userId) {
        entries = await storage.getTimeEntriesForUser(parseInt(userId as string));
      } else if (projectId) {
        entries = await storage.getTimeEntriesForProject(parseInt(projectId as string));
      } else {
        return res.status(400).json({ message: "userId or projectId parameter required" });
      }
      
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.post("/api/time-entries", async (req, res) => {
    try {
      const timeEntryData = insertTimeEntrySchema.parse(req.body);
      
      // Validation: Check if project exists and is not closed
      const project = await storage.getProject(timeEntryData.projectId);
      if (!project) {
        return res.status(400).json({ message: "Project not found" });
      }
      
      if (project.status === "closed") {
        return res.status(400).json({ message: "Cannot log time on closed projects" });
      }
      
      // Validation: Check daily hours limit
      const dailyEntries = await storage.getTimeEntriesForDate(timeEntryData.userId, timeEntryData.date);
      const currentDailyHours = dailyEntries.reduce((total, entry) => total + parseFloat(entry.hours), 0);
      const newTotal = currentDailyHours + timeEntryData.hours;
      
      if (newTotal > 8 && !project.isPriority) {
        return res.status(400).json({ 
          message: "Daily time limit exceeded. Cannot exceed 8 hours unless project is marked as priority.",
          currentTotal: currentDailyHours,
          attemptedTotal: newTotal
        });
      }
      
      const timeEntry = await storage.createTimeEntry(timeEntryData);
      res.status(201).json(timeEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid time entry data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create time entry" });
    }
  });

  app.put("/api/time-entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Check if entry exists
      const existingEntry = await storage.getTimeEntry(id);
      if (!existingEntry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      
      // Check 48-hour rule for editing
      const hoursSinceUpdate = (Date.now() - existingEntry.updatedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate <= 48) {
        // Only the owner can edit within 48 hours
        if (updateData.requestingUserId !== existingEntry.userId) {
          return res.status(403).json({ message: "Cannot edit entry within 48 hours unless you are the owner" });
        }
      }
      
      const timeEntry = await storage.updateTimeEntry(id, updateData);
      res.json(timeEntry);
    } catch (error) {
      res.status(500).json({ message: "Failed to update time entry" });
    }
  });

  app.delete("/api/time-entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTimeEntry(id);
      
      if (!success) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      
      res.json({ message: "Time entry deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete time entry" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/daily-hours/:userId/:date", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const date = req.params.date;
      
      const hours = await storage.getDailyHours(userId, date);
      res.json({ hours });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily hours" });
    }
  });

  app.get("/api/dashboard/weekly-hours/:userId/:startDate", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const startDate = req.params.startDate;
      
      const hours = await storage.getWeeklyHours(userId, startDate);
      res.json({ hours });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly hours" });
    }
  });

  app.get("/api/dashboard/team-hours/:managerId/:startDate", async (req, res) => {
    try {
      const managerId = parseInt(req.params.managerId);
      const startDate = req.params.startDate;
      
      const hours = await storage.getTeamHours(managerId, startDate);
      res.json({ hours });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team hours" });
    }
  });

  // Project assignment routes
  app.post("/api/project-assignments", async (req, res) => {
    try {
      const { userId, projectId } = req.body;
      
      if (!userId || !projectId) {
        return res.status(400).json({ message: "userId and projectId are required" });
      }
      
      const assignment = await storage.assignUserToProject({ userId, projectId });
      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to assign user to project" });
    }
  });

  app.delete("/api/project-assignments/:userId/:projectId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const projectId = parseInt(req.params.projectId);
      
      const success = await storage.removeUserFromProject(userId, projectId);
      
      if (!success) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      res.json({ message: "User removed from project successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove user from project" });
    }
  });

  // Excel report generation
  app.get("/api/reports/excel/:projectId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Get project details
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get time entries for the project
      const timeEntries = await storage.getTimeEntriesForProject(projectId);
      
      // Check if project has at least 3 entries
      if (timeEntries.length < 3) {
        return res.status(400).json({ message: "Project must have at least 3 entries to generate Excel report" });
      }
      
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`${project.name} Report`);
      
      // Add headers
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Employee', key: 'employee', width: 20 },
        { header: 'Hours', key: 'hours', width: 10 },
        { header: 'Description', key: 'description', width: 30 },
        { header: 'Created', key: 'created', width: 15 }
      ];
      
      // Add data rows
      for (const entry of timeEntries) {
        const user = await storage.getUser(entry.userId);
        worksheet.addRow({
          date: entry.date,
          employee: user?.name || 'Unknown',
          hours: parseFloat(entry.hours),
          description: entry.description || '',
          created: entry.createdAt.toLocaleDateString()
        });
      }
      
      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1976D2' }
      };
      
      // Add summary at the bottom
      const totalHours = timeEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0);
      worksheet.addRow([]);
      worksheet.addRow(['Total Hours:', '', totalHours, '', '']);
      worksheet.addRow(['Total Entries:', '', timeEntries.length, '', '']);
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${project.name}_report.xlsx"`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Excel generation error:', error);
      res.status(500).json({ message: "Failed to generate Excel report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
