import "./App.css";
import { useEffect, useMemo, useRef } from "react";
import { useTelemetryRAF } from "./shared/hooks/useTelemetryRAF";
import type { TelemetryPoint } from "./shared/hooks/useTelemetry";

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vsSource: string,
  fsSource: string,
) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function WebGLGraph({ data }: { data: TelemetryPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vsSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fsSource = `
      precision mediump float;
      uniform vec4 u_color;
      void main() {
        gl_FragColor = u_color;
      }
    `;

    const program = createProgram(gl, vsSource, fsSource);
    if (!program) return;

    const positionLoc = gl.getAttribLocation(program, "a_position");
    const colorLoc = gl.getUniformLocation(program, "u_color");
    const buf = gl.createBuffer();
    if (!buf) return;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.05, 0.08, 0.16, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const drawMetric = (
      metric: keyof TelemetryPoint["metrics"],
      color: [number, number, number, number],
    ) => {
      if (data.length < 2) return;
      const values = data.map((item) => item.metrics[metric]);
      const minY = Math.min(...values, 0);
      const maxY = Math.max(...values, 100);
      const range = maxY - minY || 1;

      const coords: number[] = [];
      data.forEach((item, idx) => {
        const x = -1 + (2 * idx) / (data.length - 1);
        const y = -0.8 + ((item.metrics[metric] - minY) / range) * 1.6;
        coords.push(x, y);
      });

      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform4fv(colorLoc, color);
      gl.drawArrays(gl.LINE_STRIP, 0, data.length);
    };

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    drawMetric("cpu", [0.13, 0.82, 0.29, 1.0]);
    drawMetric("memory", [0.15, 0.53, 0.94, 1.0]);
    drawMetric("latency", [0.98, 0.75, 0.14, 1.0]);

    return () => {
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
    };
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="telemetry-webgl-canvas"
      width={820}
      height={280}
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

export default function AppRaf() {
  const data = useTelemetryRAF({ updateMs: 100 });
  const recent = useMemo(() => data.slice(-20), [data]);

  return (
    <div className="App">
      <h1>Telemetry (RAF + WebGL)</h1>
      <p>
        Showing <strong>{recent.length}</strong> of{" "}
        <strong>{data.length}</strong> samples.
      </p>
      <Summary recent={recent} />
      <section className="graph-section">
        <h2>WebGL Live Telemetry</h2>
        <WebGLGraph data={recent} />
      </section>
      {recent.length === 0 ? (
        <p>Waiting for telemetry…</p>
      ) : (
        <TelemetryTable items={recent} />
      )}
    </div>
  );
}
