import express, { Request, Response, NextFunction } from "express";
import { WebSocketServer, WebSocket, RawData } from "ws";
import { createServer } from "http";
import { IncomingMessage } from "http";

interface TelemetryData {
  timestamp: number;
  metrics: {
    cpu: number;
    memory: number;
    latency: number;
  };
  status: "OK" | "ERROR";
}

interface HealthResponse {
  status: string;
  timestamp: number;
}

interface WebSocketHistoryMessage {
  type: "history";
  data: TelemetryData[];
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT: number = parseInt(process.env.PORT || "3000", 10);

// Enable CORS for HTTP requests
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// In-memory buffer to store recent telemetry points
const telemetryBuffer: TelemetryData[] = [];
const MAX_BUFFER_SIZE = 200; // Keep last 200 samples

// Function to generate mock telemetry data (same as mockWorker.js)
function generateTelemetry(): TelemetryData {
  return {
    timestamp: Date.now(),
    metrics: {
      cpu: Math.floor(Math.random() * 100),
      memory: Math.floor(Math.random() * 100),
      latency: Math.floor(Math.random() * 500),
    },
    status: Math.random() > 0.95 ? "ERROR" : "OK",
  };
}

// Generate and broadcast telemetry every 50ms
setInterval(() => {
  const data = generateTelemetry();

  // Add to buffer
  telemetryBuffer.push(data);
  if (telemetryBuffer.length > MAX_BUFFER_SIZE) {
    telemetryBuffer.shift();
  }

  // Broadcast to all connected WebSocket clients
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      // 1 = OPEN
      client.send(JSON.stringify(data));
    }
  });
}, 50);

// WebSocket connection handler
wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
  console.log("Client connected. Total clients:", wss.clients.size);

  // Send historical data to newly connected client
  const historyMessage: WebSocketHistoryMessage = {
    type: "history",
    data: telemetryBuffer.slice(-20),
  };
  ws.send(JSON.stringify(historyMessage));

  ws.on("message", (message: RawData) => {
    try {
      const data = JSON.parse(message.toString());
      console.log("Received from client:", data);
    } catch (err) {
      console.error("Invalid message format");
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected. Total clients:", wss.clients.size);
  });

  ws.on("error", (error: Error) => {
    console.error("WebSocket error:", error);
  });
});

// REST API: Get recent telemetry (for polling alternative)
app.get("/api/telemetry/recent", (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const recent = telemetryBuffer.slice(-limit);
  res.json(recent);
});

// REST API: Get all buffered telemetry
app.get("/api/telemetry", (req: Request, res: Response) => {
  res.json(telemetryBuffer);
});

// Health check
app.get("/health", (req: Request, res: Response<HealthResponse>) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

server.listen(PORT, () => {
  console.log(`🚀 Telemetry server running at http://localhost:${PORT}`);
  console.log(`📊 WebSocket: ws://localhost:${PORT}`);
  console.log(`📡 REST API: http://localhost:${PORT}/api/telemetry/recent`);
});
