// mockWorker.js
const ws = new WebSocket("ws://localhost:3000");
self.onmessage = (e) => {
  if (e.data === "START") {
    ws.onopen = () => {
      console.log("WebSocket connection established with server.");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Forward the telemetry data to the Main Thread
      self.postMessage(data);
    };

    ws.onclose = () => console.log("WebSocket closed");
    ws.onerror = (error) => console.error("WebSocket error", error);
  }
};
