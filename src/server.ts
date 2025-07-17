#!/usr/bin/env node
import cors from "cors";
import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default to a unique port, allow override via CLI argument
const DEFAULT_PORT = 41321;
let port = DEFAULT_PORT;

// Parse --port argument
const portArgIndex = process.argv.findIndex((arg) => arg === "--port");

if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
  const parsed = parseInt(process.argv[portArgIndex + 1], 10);

  if (!isNaN(parsed)) port = parsed;
}

const app = express();

app.use(cors());
app.use(express.json());

function getStatsFile(statsId?: string) {
  if (statsId && statsId !== "default") {
    return path.join(process.cwd(), `event-stats-${statsId}.json`);
  }

  return path.join(process.cwd(), "event-stats.json");
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

// Serve the dashboard HTML
app.get("/", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

// API: Get event stats
app.get("/api/events-stats", (req: Request, res: Response) => {
  const statsId = req.query.statsId as string | undefined;
  const statsFile = getStatsFile(statsId);

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
  const statsId = req.query.statsId as string | undefined;
  const statsFile = getStatsFile(statsId);
  const { eventKey, timestamp } = req.body;
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
  res.json({ success: true });
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
  res.json({ success: true });
});

// API: List available runs
app.get("/api/runs", (_req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(process.cwd());
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

      return b.id.localeCompare(a.id);
    });

    res.json(runs);
  } catch (error: unknown) {
    console.error("Error listing runs:", error);
    res.status(500).json({ error: "Failed to list runs" });
  }
});

// Serve the catalog if present
app.get("/api/catalog", (_req: Request, res: Response) => {
  const catalogPath = path.join(process.cwd(), "event-catalog.json");

  if (!fs.existsSync(catalogPath)) {
    return res.status(404).json({ error: "event-catalog.json not found" });
  }
  const data = fs.readFileSync(catalogPath, "utf-8");

  res.type("json").send(data);
});

app.listen(port, () => {
  console.log(
    `Event Counter Plugin dashboard running at http://localhost:${port}`,
  );
});
