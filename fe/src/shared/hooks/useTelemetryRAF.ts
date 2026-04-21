import { useEffect, useState, useRef } from "react";
import type { TelemetryPoint } from "./useTelemetry";

export function useTelemetryRAF({
  updateMs = 100,
}: { updateMs?: number } = {}): TelemetryPoint[] {
  const [data, setData] = useState<TelemetryPoint[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const bufferRef = useRef<TelemetryPoint[]>([]);
  const lastUpdateRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/mockWorker.js", import.meta.url),
      {
        type: "module",
      },
    );

    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<TelemetryPoint>) => {
      bufferRef.current.push(event.data);

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
    worker.postMessage("START");

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [updateMs]);

  return data;
}
