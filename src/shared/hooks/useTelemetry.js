import { useEffect, useState, useRef } from "react";

export function useTelemetry() {
  const [data, setData] = useState([]);
  const workerRef = useRef(null);

  useEffect(() => {
    // 1. Initialize Worker
    workerRef.current = new Worker(
      new URL("../workers/mockWorker.js", import.meta.url),
    );

    // 2. Buffer Management (The "Senior" part)
    // We store incoming messages in a ref to avoid constant re-renders
    let buffer = [];

    workerRef.current.onmessage = (event) => {
      buffer.push(event.data);

      // Only keep the last 50 entries to prevent memory bloat
      if (buffer.length > 50) {
        buffer.shift();
      }
    };

    // 3. UI Sync Loop
    // We only update the React state every 100ms, regardless of how fast
    // the worker sends data. This is "Throttling for UX."
    const uiInterval = setInterval(() => {
      setData([...buffer]);
    }, 100);

    workerRef.current.postMessage("START");

    // 4. Cleanup (Crucial for avoiding memory leaks)
    return () => {
      workerRef.current.terminate();
      clearInterval(uiInterval);
    };
  }, []);

  return data;
}
