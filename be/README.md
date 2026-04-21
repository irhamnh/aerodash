# Aerodash Backend - Mock Telemetry Server

Express + WebSocket server that broadcasts mock telemetry data to connected clients.

## Features

- **WebSocket Broadcasting**: Real-time telemetry pushed every 50ms
- **REST APIs**: Polling alternatives for the frontend
- **In-memory Buffer**: Stores last 200 telemetry samples
- **CORS Enabled**: For development across localhost

## Getting Started

### Installation

```bash
cd be
npm install
npm start
```

Server starts on `http://localhost:3000`

## Endpoints

### WebSocket

- **ws://localhost:3000** - Real-time telemetry stream
  - Automatically sends data every 50ms
  - New clients receive last 20 historical samples on connect

### REST APIs

- **GET /api/telemetry/recent?limit=20** - Get recent samples
- **GET /api/telemetry** - Get all buffered samples
- **GET /health** - Health check

## Data Format

Telemetry points have this structure:

```json
{
  "timestamp": 1710943200000,
  "metrics": {
    "cpu": 42,
    "memory": 65,
    "latency": 150
  },
  "status": "OK"
}
```

## Integrating with Frontend

### Option 1: WebSocket Connection (Real-time)

In frontend code, replace the `useTelemetry` hook to connect via WebSocket:

```javascript
const socket = new WebSocket("ws://localhost:3000");

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "history") {
    // Initial historical data
    setData(data.data);
  } else {
    // Real-time update
    setData((prev) => [...prev, data].slice(-200));
  }
};
```

### Option 2: REST Polling (Simpler)

```javascript
setInterval(() => {
  fetch("http://localhost:3000/api/telemetry/recent?limit=20")
    .then((r) => r.json())
    .then(setData);
}, 1000);
```

## Development

Watch mode with hot reload:

```bash
npm run dev
```

## Environment Variables

- `PORT` - Server port (default: 3000)

## Next Steps

- Connect frontend `useTelemetry` hook to this backend
- Optionally replace mock data generation with real metrics agent
- Add authentication/validation for production
