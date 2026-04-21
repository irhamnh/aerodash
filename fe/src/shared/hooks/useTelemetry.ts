import { useEffect, useState, useRef } from "react";

export type TelemetryMetrics = {
  cpu: number;
  memory: number;
  latency: number;
};

export type TelemetryPoint = {
  timestamp: number;
  metrics: TelemetryMetrics;
  status: "OK" | "ERROR";
  type?: "history" | "telemetry";
  data?: TelemetryPoint[]; // For history messages
};

export function useTelemetry(): TelemetryPoint[] {
  const [data, setData] = useState<TelemetryPoint[]>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/mockWorker.js", import.meta.url),
    );

    workerRef.current = worker;

    const buffer: TelemetryPoint[] = [];

    worker.onmessage = (event: MessageEvent<TelemetryPoint>) => {
      const newPoint = event.data;
      console.log(event.data);
      if (event.data.type === "history") {
        setData([...event.data.data]);
      } else {
        buffer.push(newPoint);

        if (buffer.length > 50) {
          buffer.shift();
        }
      }
    };

    const uiInterval = window.setInterval(() => {
      setData([...buffer]);
    }, 100);

    worker.postMessage("START");

    return () => {
      workerRef.current?.terminate();
      window.clearInterval(uiInterval);
      workerRef.current = null;
    };
  }, []);

  return data;
}
