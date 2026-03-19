// mockWorker.js
self.onmessage = (e) => {
  if (e.data === 'START') {
    // High-frequency loop (every 50ms = 20 updates/second)
    setInterval(() => {
      const telemetryData = {
        timestamp: Date.now(),
        metrics: {
          cpu: Math.floor(Math.random() * 100),
          memory: Math.floor(Math.random() * 100),
          latency: Math.floor(Math.random() * 500),
        },
        status: Math.random() > 0.95 ? 'ERROR' : 'OK',
      };
      
      // Send data back to the Main Thread
      self.postMessage(telemetryData);
    }, 50); 
  }
};