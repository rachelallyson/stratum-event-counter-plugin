#!/usr/bin/env node
import cors from "cors";
import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration with defaults
const DEFAULT_PORT = 41321;
const DEFAULT_MAX_RUNS = 25;

// Get configuration from environment variables or use defaults
const port = parseInt(process.env.EVENT_COUNTER_PORT || DEFAULT_PORT.toString(), 10);
const maxRuns = parseInt(process.env.EVENT_COUNTER_MAX_RUNS || DEFAULT_MAX_RUNS.toString(), 10);

// Active run ID state - this coordinates between Cypress and the app
let activeRunId: string | null = null;
let activeRunIdSetTime: number | null = null;
const ACTIVE_RUN_ID_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// Validate configuration
if (isNaN(port) || port < 1 || port > 65535) {
  console.error("[ERROR] Invalid port number. Must be between 1 and 65535.");
  process.exit(1);
}

if (isNaN(maxRuns) || maxRuns < 1) {
  console.error("[ERROR] Invalid max runs number. Must be greater than 0.");
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function getStatsFile(statsId?: string) {
  if (statsId && statsId !== "default") {
    return path.join(dataDir, `event-stats-${statsId}.json`);
  }

  return path.join(dataDir, "event-stats.json");
}

function getCatalogFile(statsId?: string) {
  if (statsId && statsId !== "default") {
    return path.join(dataDir, `event-catalog-${statsId}.json`);
  }

  return path.join(dataDir, "event-catalog.json");
}

// Helper functions for active run ID management
function setActiveRunId(runId: string): void {
  activeRunId = runId;
  activeRunIdSetTime = Date.now();
  console.log(`[INFO] 🎯 Active run ID set to: ${runId}`);
}

function getActiveRunId(): string | null {
  // Check if active run ID has expired
  if (activeRunId && activeRunIdSetTime) {
    const now = Date.now();
    if (now - activeRunIdSetTime > ACTIVE_RUN_ID_TIMEOUT) {
      console.log(`[INFO] ⏰ Active run ID expired, clearing: ${activeRunId}`);
      clearActiveRunId();
      return null;
    }
  }
  return activeRunId;
}

function clearActiveRunId(): void {
  if (activeRunId) {
    console.log(`[INFO] 🗑️ Clearing active run ID: ${activeRunId}`);
  }
  activeRunId = null;
  activeRunIdSetTime = null;
}

function generateRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface EventCount {
  count: number;
  lastUsed?: string;
  firstUsed?: string;
}
interface EventStats {
  events: Record<string, EventCount>;
  totalEvents: number;
  startTime: string;
}

// Function to clean up old runs
function cleanupOldRuns() {
  try {
    const files = fs.readdirSync(dataDir);
    const statsFiles = files.filter(
      (file) => file.startsWith("event-stats-") && file.endsWith(".json") && file !== "event-stats.json",
    );

    console.log(`[INFO] Cleanup check: ${statsFiles.length} run files found, max allowed: ${maxRuns}`);

    if (statsFiles.length <= maxRuns) {
      console.log(`[INFO] No cleanup needed: ${statsFiles.length} files within limit of ${maxRuns}`);
      return { removed: 0, total: statsFiles.length }; // No cleanup needed
    }

    // Get file info for sorting
    const fileInfos = statsFiles.map((file) => {
      const match = /event-stats-(.+)\.json$/.exec(file);
      if (match) {
        const runId = match[1];
        // Try to extract timestamp from various run ID patterns
        let timestamp = 0;
        if (runId.startsWith("run-")) {
          // Handle "run-1234567890" pattern
          const numMatch = runId.replace("run-", "").match(/^\d+$/);
          if (numMatch) {
            timestamp = parseInt(numMatch[0]);
          }
        } else if (runId.includes("-")) {
          // Handle "test-run-api-1753018179632" pattern - extract last number
          const parts = runId.split("-");
          const lastPart = parts[parts.length - 1];
          if (/^\d+$/.test(lastPart)) {
            timestamp = parseInt(lastPart);
          }
        }
        return { file, timestamp, runId };
      }
      return { file, timestamp: 0, runId: null };
    });

    // Sort by timestamp (oldest first), with files without timestamps at the end
    fileInfos.sort((a, b) => {
      if (a.timestamp === 0 && b.timestamp === 0) return 0;
      if (a.timestamp === 0) return 1;
      if (b.timestamp === 0) return -1;
      return a.timestamp - b.timestamp;
    });

    // Remove oldest files beyond the limit
    const filesToRemove = fileInfos.slice(0, fileInfos.length - maxRuns);
    let removedCount = 0;

    console.log(`[INFO] Cleanup required: removing ${filesToRemove.length} oldest files to stay within limit of ${maxRuns}`);

    filesToRemove.forEach(({ file, runId }) => {
      try {
        // Remove stats file
        fs.unlinkSync(path.join(dataDir, file));
        console.log(`[INFO] Removed old run file: ${file}`);
        removedCount++;

        // Also remove corresponding catalog file if it exists
        if (runId) {
          const catalogFile = path.join(dataDir, `event-catalog-${runId}.json`);
          if (fs.existsSync(catalogFile)) {
            fs.unlinkSync(catalogFile);
            console.log(`[INFO] Removed old catalog file: event-catalog-${runId}.json`);
            removedCount++;
          }
        }
      } catch (error) {
        console.warn(`[WARN] Failed to remove old run file ${file}:`, error);
      }
    });

    console.log(`[INFO] Cleanup completed: removed ${removedCount} files, keeping ${statsFiles.length - filesToRemove.length} runs`);
    return { removed: removedCount, total: statsFiles.length };
  } catch (error) {
    console.warn("[WARN] Failed to cleanup old runs:", error);
    return { removed: 0, total: 0 };
  }
}

// Clean up on server startup
console.log("[INFO] 🚀 Server starting up...");
console.log(`[INFO] 📁 Data directory: ${dataDir}`);
console.log(`[INFO] 🔢 Max runs to keep: ${maxRuns}`);
console.log("[INFO] 🧹 Checking for old run files on startup...");
const startupCleanup = cleanupOldRuns();
if (startupCleanup.removed > 0) {
  console.log(`[INFO] ✅ Startup cleanup: removed ${startupCleanup.removed} files, keeping ${startupCleanup.total - startupCleanup.removed} runs`);
} else {
  console.log(`[INFO] ✅ No startup cleanup needed: ${startupCleanup.total} files within limit`);
}

// Serve the dashboard HTML
app.get("/", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

// API: Get event stats
app.get("/api/events-stats", (req: Request, res: Response) => {
  const explicitStatsId = req.query.statsId as string | undefined;
  const effectiveStatsId = explicitStatsId || getActiveRunId() || undefined;
  const statsFile = getStatsFile(effectiveStatsId);

  console.log(`[INFO] 📖 Get stats request - explicit: ${explicitStatsId || 'none'}, effective: ${effectiveStatsId || 'default'}`);

  if (!fs.existsSync(statsFile)) {
    return res.json({
      events: {},
      startTime: new Date().toISOString(),
      totalEvents: 0,
    });
  }
  const data = fs.readFileSync(statsFile, "utf-8");

  res.type("json").send(data);
});

// API: Update event stats (POST)
app.post("/api/events-stats", (req: Request, res: Response) => {
  try {
    const explicitStatsId = req.query.statsId as string | undefined;
    const effectiveStatsId = explicitStatsId || getActiveRunId() || undefined;
    const statsFile = getStatsFile(effectiveStatsId);
    const { eventKey, timestamp } = req.body;

    console.log(`[INFO] 📊 Event received: ${eventKey} - explicit: ${explicitStatsId || 'none'}, effective: ${effectiveStatsId || 'default'}`);

    // Validate required fields
    if (!eventKey || typeof eventKey !== 'string') {
      console.warn(`[WARN] Invalid event key received: ${eventKey}`);
      return res.status(400).json({ error: "eventKey is required and must be a string" });
    }

    let stats: EventStats = {
      events: {},
      startTime: new Date().toISOString(),
      totalEvents: 0,
    };

    if (fs.existsSync(statsFile)) {
      stats = JSON.parse(fs.readFileSync(statsFile, "utf-8"));
    }
    if (!stats.events[eventKey]) {
      stats.events[eventKey] = { count: 0 };
    }
    stats.events[eventKey].count++;
    stats.events[eventKey].lastUsed = timestamp || new Date().toISOString();
    stats.events[eventKey].firstUsed =
      stats.events[eventKey].firstUsed || timestamp || new Date().toISOString();
    stats.totalEvents++;

    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
    console.log(`[INFO] 💾 Stats updated: ${stats.totalEvents} total events for run: ${effectiveStatsId || 'default'}`);

    // Check if cleanup is needed after updating stats
    // Skip auto-cleanup during testing to prevent interference, unless explicitly enabled
    if (process.env.NODE_ENV !== 'test' || process.env.ENABLE_CLEANUP === 'true') {
      const files = fs.readdirSync(dataDir);
      const statsFiles = files.filter(
        (file) => file.startsWith("event-stats-") && file.endsWith(".json") && file !== "event-stats.json",
      );

      if (statsFiles.length > maxRuns) {
        console.log(`[INFO] 🧹 Auto-cleanup triggered: ${statsFiles.length} files exceed limit of ${maxRuns}`);
        const cleanupResult = cleanupOldRuns();
        console.log(`[INFO] 🧹 Auto-cleanup completed: removed ${cleanupResult.removed} files`);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[ERROR] Failed to update event stats:", error);
    res.status(500).json({ error: "Failed to update event stats" });
  }
});

// API: Reset stats
app.put("/api/events-stats", (req: Request, res: Response) => {
  const statsId = req.query.statsId as string | undefined;
  const statsFile = getStatsFile(statsId);
  const stats: EventStats = {
    events: {},
    startTime: new Date().toISOString(),
    totalEvents: 0,
  };

  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
  console.log(`[INFO] 🔄 Stats reset for run: ${statsId || 'default'}`);
  res.json({ success: true });
});

// API: Reset event stats for a specific run
app.post("/api/events-stats/reset", (req: Request, res: Response) => {
  try {
    const explicitStatsId = req.query.statsId as string | undefined;
    const effectiveStatsId = explicitStatsId || getActiveRunId() || undefined;
    const statsFile = getStatsFile(effectiveStatsId);

    console.log(`[INFO] 🔄 Stats reset for run: ${effectiveStatsId}`);

    // Create empty stats
    const emptyStats = {
      events: {},
      startTime: new Date().toISOString(),
      totalEvents: 0,
    };

    // Write empty stats to file
    fs.writeFileSync(statsFile, JSON.stringify(emptyStats, null, 2));

    res.json({ success: true, runId: effectiveStatsId });
  } catch (error) {
    console.error("[ERROR] Failed to reset stats:", error);
    res.status(500).json({ error: "Failed to reset stats" });
  }
});

// API: Manual cleanup endpoint
app.post("/api/cleanup", (req: Request, res: Response) => {
  try {
    console.log("[INFO] 🧹 Manual cleanup requested");
    const result = cleanupOldRuns();
    console.log(`[INFO] 🧹 Manual cleanup completed: removed ${result.removed} files, keeping ${result.total - result.removed} runs`);
    res.json({
      success: true,
      removed: result.removed,
      total: result.total,
      maxRuns,
      message: `Cleanup completed. Removed ${result.removed} files, keeping ${result.total - result.removed} runs.`
    });
  } catch (error) {
    console.error("[ERROR] Manual cleanup failed:", error);
    res.status(500).json({ error: "Failed to cleanup old runs" });
  }
});

// API: Get cleanup status
app.get("/api/cleanup", (req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(dataDir);
    const statsFiles = files.filter(
      (file) => file.startsWith("event-stats-") && file.endsWith(".json") && file !== "event-stats.json",
    );

    const needsCleanup = statsFiles.length > maxRuns;
    if (needsCleanup) {
      console.log(`[INFO] 📊 Cleanup status: ${statsFiles.length} files exceed limit of ${maxRuns}`);
    }

    res.json({
      currentRuns: statsFiles.length,
      maxRuns,
      needsCleanup,
      files: statsFiles,
      totalFiles: files.filter(file => file.startsWith("event-stats") && file.endsWith(".json")).length
    });
  } catch (error) {
    console.error("[ERROR] Failed to get cleanup status:", error);
    res.status(500).json({ error: "Failed to get cleanup status" });
  }
});

// API: List available runs
app.get("/api/runs", (_req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(dataDir);
    const statsFiles = files.filter(
      (file) => file.startsWith("event-stats") && file.endsWith(".json"),
    );

    const runs = statsFiles
      .map((file) => {
        if (file === "event-stats.json") {
          return { file, id: "default", name: "Default Run" };
        }

        const match = /event-stats-(.+)\.json$/.exec(file);

        if (match) {
          const runId = match[1];
          let displayName = runId;

          // Try to make a nicer display name
          if (runId.startsWith("run-")) {
            const timestamp = runId.replace("run-", "");
            const date = new Date(parseInt(timestamp));

            if (!isNaN(date.getTime())) {
              displayName = `Run ${date.toLocaleString()}`;
            }
          }

          return { file, id: runId, name: displayName };
        }

        return null;
      })
      .filter(Boolean);

    // Sort by most recent first
    runs.sort((a, b) => {
      if (!a || !b) return 0;
      if (a.id === "default") return 1;
      if (b.id === "default") return -1;

      // Extract timestamps from various run ID patterns
      const getTimestamp = (id: string): number => {
        if (id.startsWith("run-")) {
          // Handle "run-1234567890" pattern
          const numMatch = id.replace("run-", "").match(/^\d+$/);
          if (numMatch) {
            return parseInt(numMatch[0]);
          }
        } else if (id.includes("-")) {
          // Handle "test-run-api-1753018179632" pattern - extract last number
          const parts = id.split("-");
          const lastPart = parts[parts.length - 1];
          if (/^\d+$/.test(lastPart)) {
            return parseInt(lastPart);
          }
        }
        return 0;
      };

      const aTimestamp = getTimestamp(a.id);
      const bTimestamp = getTimestamp(b.id);

      // If both have valid timestamps, sort by timestamp
      if (aTimestamp > 0 && bTimestamp > 0) {
        return bTimestamp - aTimestamp; // Most recent first
      }

      // Fallback to string comparison for other cases
      return b.id.localeCompare(a.id);
    });

    res.json(runs);
  } catch (error: unknown) {
    console.error("Error listing runs:", error);
    res.status(500).json({ error: "Failed to list runs" });
  }
});

// API: Get catalog for a specific run
app.get("/api/catalog", (req: Request, res: Response) => {
  const explicitStatsId = req.query.statsId as string | undefined;
  const effectiveStatsId = explicitStatsId || getActiveRunId() || undefined;
  const catalogPath = getCatalogFile(effectiveStatsId);

  console.log(`[INFO] 📖 Get catalog request - explicit: ${explicitStatsId || 'none'}, effective: ${effectiveStatsId || 'default'}`);

  if (!fs.existsSync(catalogPath)) {
    return res.status(404).json({ error: "event-catalog.json not found" });
  }

  const data = fs.readFileSync(catalogPath, "utf-8");

  // Check if file is empty
  if (!data.trim()) {
    return res.status(404).json({ error: "event-catalog.json is empty" });
  }

  res.type("json").send(data);
});

// API: Update catalog for a specific run
app.post("/api/catalog", (req: Request, res: Response) => {
  try {
    const explicitStatsId = req.query.statsId as string | undefined;
    const effectiveStatsId = explicitStatsId || getActiveRunId() || undefined;
    const catalogPath = getCatalogFile(effectiveStatsId);
    const catalog = req.body;

    console.log(`[INFO] 📚 Catalog update - explicit: ${explicitStatsId || 'none'}, effective: ${effectiveStatsId || 'default'} with ${Object.keys(catalog).length} events`);

    // Validate that catalog is an object
    if (!catalog || typeof catalog !== 'object') {
      console.warn(`[WARN] Invalid catalog received for run: ${effectiveStatsId || 'default'}`);
      return res.status(400).json({ error: "Catalog must be an object" });
    }

    // Write catalog to file
    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
    console.log(`[INFO] 💾 Catalog saved: ${catalogPath}`);

    res.json({ success: true });
  } catch (error) {
    console.error("[ERROR] Failed to update catalog:", error);
    res.status(500).json({ error: "Failed to update catalog" });
  }
});

// API: Get active run ID
app.get("/api/active-run-id", (req: Request, res: Response) => {
  const currentActiveRunId = getActiveRunId();

  if (currentActiveRunId) {
    console.log(`[INFO] 📖 Active run ID requested: ${currentActiveRunId}`);
    res.json({ runId: currentActiveRunId });
  } else {
    console.log("[INFO] 📖 No active run ID set");
    res.json({ runId: null });
  }
});

// API: Set active run ID (for Cypress to call)
app.post("/api/active-run-id", (req: Request, res: Response) => {
  try {
    const { runId } = req.body;

    if (!runId) {
      // Generate a new run ID if none provided
      const newRunId = generateRunId();
      setActiveRunId(newRunId);
      console.log(`[INFO] 🆔 Generated new run ID: ${newRunId}`);
      return res.json({ runId: newRunId, generated: true });
    }

    if (typeof runId !== 'string') {
      return res.status(400).json({ error: "runId must be a string" });
    }

    setActiveRunId(runId);
    res.json({ runId, generated: false });
  } catch (error) {
    console.error("[ERROR] Failed to set active run ID:", error);
    res.status(500).json({ error: "Failed to set active run ID" });
  }
});

// API: Clear active run ID (for cleanup)
app.delete("/api/active-run-id", (req: Request, res: Response) => {
  const wasActive = activeRunId;
  clearActiveRunId();

  res.json({
    success: true,
    wasActive: wasActive !== null,
    clearedRunId: wasActive
  });
});

// Global error handler for JSON parsing errors
app.use((error: any, req: Request, res: Response, next: any) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  next();
});

app.listen(port, () => {
  console.log(`[INFO] 🌐 Dashboard server started at http://localhost:${port}`);
  console.log(`[INFO] 📁 Data directory: ${dataDir}`);
  console.log(`[INFO] 🔢 Max runs to keep: ${maxRuns}`);
  console.log(`[INFO] ✅ Server ready to receive events and manage data`);
});
