import { useEffect, useState, useRef } from "react";

export function useTelemetryRAF({ updateMs = 100 } = {}) {
  const [data, setData] = useState([]);
  const workerRef = useRef(null);
  const bufferRef = useRef([]);
  const lastUpdateRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    // 1. Initialize Worker (bundled worker in `src/shared/workers`)
    workerRef.current = new Worker(new URL("../workers/mockWorker.js", import.meta.url), {
      type: "module",
    });

    workerRef.current.onmessage = (event) => {
      bufferRef.current.push(event.data);

      // Only keep the last 50 entries to prevent memory bloat
      if (bufferRef.current.length > 50) {
        bufferRef.current.shift();
      }
    };

    const tick = () => {
      const now = performance.now();
      const shouldUpdate = now - lastUpdateRef.current >= updateMs;

      if (shouldUpdate && bufferRef.current.length) {
        lastUpdateRef.current = now;
        setData([...bufferRef.current]);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    workerRef.current.postMessage("START");

    return () => {
      cancelAnimationFrame(rafRef.current);
      workerRef.current?.terminate();
    };
  }, [updateMs]);

  return data;
}
