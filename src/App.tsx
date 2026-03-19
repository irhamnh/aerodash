import "./App.css";
import { useEffect, useMemo, useRef } from "react";
import { useTelemetry } from "./shared/hooks/useTelemetry";

type TelemetryPoint = {
  timestamp: number;
  status: string;
  metrics: {
    cpu: number;
    memory: number;
    latency: number;
  };
};

function GraphCanvas({ data }: { data: TelemetryPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 820; // logical canvas width in CSS pixels
    const height = 280; // logical canvas height in CSS pixels
    const dpr = window.devicePixelRatio || 1; // handle high-DPI screens

    // Set actual pixel dimensions to width*devicePixelRatio for crisp drawing
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    // Keep CSS size fixed to the logical dimensions
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    // Scale the drawing context so coordinates map 1:1 to logical CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Define chart inner area with margins for axes/labels
    const margin = { top: 16, right: 14, bottom: 28, left: 42 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Clear and paint full background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = margin.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
    }

    const xAxisY = margin.top + chartHeight;
    ctx.strokeStyle = "#64748b";
    ctx.beginPath();
    ctx.moveTo(margin.left, xAxisY);
    ctx.lineTo(width - margin.right, xAxisY);
    ctx.stroke();

    if (!data.length) {
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "14px Inter, system-ui";
      ctx.fillText(
        "Waiting for telemetry to plot…",
        width / 2 - 80,
        height / 2,
      );
      return;
    }

    // Collect all metric values for the current window to make a shared y-scale
    const values = data.flatMap((item) => [
      item.metrics.cpu,
      item.metrics.memory,
      item.metrics.latency,
    ]);
    // Keep chart baseline at 0; cap max at least 100 so small values still show reasonable height
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 100);
    const yMin = Math.min(min, 0);
    const yMax = Math.max(max, 1);

    // Map each data index to an x coordinate inside chart area
    const getX = (index: number) =>
      margin.left + (index / Math.max(data.length - 1, 1)) * chartWidth;

    // Map metric value to y coordinate (inverted because canvas y grows downwards)
    const getY = (value: number) =>
      margin.top + chartHeight - ((value - yMin) / (yMax - yMin)) * chartHeight;

    // Draw a line from each point to the next for the selected metric
    const drawLine = (
      metric: keyof TelemetryPoint["metrics"],
      color: string,
    ) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((item, idx) => {
        const x = getX(idx);
        const y = getY(item.metrics[metric]);
        if (idx === 0)
          ctx.moveTo(x, y); // start path at first sample
        else ctx.lineTo(x, y); // connect path to next sample
      });
      ctx.stroke();
    };

    drawLine("cpu", "#22c55e");
    drawLine("memory", "#3b82f6");
    drawLine("latency", "#f59e0b");

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px Inter, system-ui";
    ctx.fillText(`CPU`, width - margin.right - 65, margin.top + 16);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(width - margin.right - 80, margin.top + 7, 10, 4);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(`Memory`, width - margin.right - 65, margin.top + 34);
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(width - margin.right - 80, margin.top + 25, 10, 4);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(`Latency`, width - margin.right - 65, margin.top + 52);
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(width - margin.right - 80, margin.top + 45, 10, 4);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "12px Inter, system-ui";
    ctx.fillText(`${yMax.toFixed(0)}`, 4, margin.top + 4);
    ctx.fillText(`${yMin.toFixed(0)}`, 4, margin.top + chartHeight + 4);

    ctx.fillText(
      new Date(data[0].timestamp).toLocaleTimeString(),
      margin.left,
      xAxisY + 18,
    );
    ctx.fillText(
      new Date(data[data.length - 1].timestamp).toLocaleTimeString(),
      width - margin.right - 90,
      xAxisY + 18,
    );
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="telemetry-graph-canvas"
    />
  );
}

function TelemetryTable({ items }: { items: TelemetryPoint[] }) {
  return (
    <div className="telemetry-table-wrap">
      <table className="telemetry-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>CPU</th>
            <th>Memory</th>
            <th>Latency</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.timestamp}>
              <td>{new Date(item.timestamp).toLocaleTimeString()}</td>
              <td>{item.metrics.cpu.toFixed(1)}%</td>
              <td>{item.metrics.memory.toFixed(1)}%</td>
              <td>{item.metrics.latency.toFixed(0)}ms</td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Summary({ recent }: { recent: TelemetryPoint[] }) {
  const summary = useMemo(() => {
    if (!recent.length) return null;

    const totals = recent.reduce(
      (acc, item) => {
        acc.cpu += item.metrics.cpu;
        acc.memory += item.metrics.memory;
        acc.latency = Math.max(acc.latency, item.metrics.latency);
        acc.errors += item.status === "ERROR" ? 1 : 0;
        return acc;
      },
      { cpu: 0, memory: 0, latency: 0, errors: 0 },
    );

    const count = recent.length;
    return {
      avgCpu: totals.cpu / count,
      avgMemory: totals.memory / count,
      maxLatency: totals.latency,
      errorRate: (totals.errors / count) * 100,
    };
  }, [recent]);

  if (!summary) return null;

  return (
    <div className="telemetry-summary">
      <div>
        <strong>Avg CPU:</strong> {summary.avgCpu.toFixed(1)}%
      </div>
      <div>
        <strong>Avg Mem:</strong> {summary.avgMemory.toFixed(1)}%
      </div>
      <div>
        <strong>Max Latency:</strong> {summary.maxLatency.toFixed(0)}ms
      </div>
      <div>
        <strong>Error Rate:</strong> {summary.errorRate.toFixed(1)}%
      </div>
    </div>
  );
}

function App() {
  const data = useTelemetry();
  const recent = useMemo(() => data.slice(-20), [data]);

  return (
    <div className="App">
      <h1>Telemetry</h1>
      <p>
        Showing <strong>{recent.length}</strong> of{" "}
        <strong>{data.length}</strong> samples.
      </p>

      <Summary recent={recent} />

      <section className="graph-section">
        <h2>Live Telemetry Graph</h2>
        <GraphCanvas data={recent as TelemetryPoint[]} />
      </section>

      {recent.length === 0 ? (
        <p>Waiting for telemetry…</p>
      ) : (
        <TelemetryTable items={recent as TelemetryPoint[]} />
      )}
    </div>
  );
}

export default App;
