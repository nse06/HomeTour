"use client";

import { Maximize2, Minus, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos; gl_Position = vec4(aPos, 0.0, 1.0); }`;

// Casts a ray per pixel from the camera (yaw/pitch/fov) and samples the equirectangular texture.
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uYaw, uPitch, uFov, uAspect;
const float PI = 3.141592653589793;
void main() {
  float t = tan(uFov * 0.5);
  vec3 dir = normalize(vec3(vUv.x * t * uAspect, vUv.y * t, -1.0));
  float cp = cos(uPitch), sp = sin(uPitch);
  dir = vec3(dir.x, dir.y * cp + dir.z * sp, -dir.y * sp + dir.z * cp);
  float cy = cos(uYaw), sy = sin(uYaw);
  dir = vec3(dir.x * cy - dir.z * sy, dir.y, dir.x * sy + dir.z * cy);
  float lon = atan(dir.x, -dir.z);
  float lat = asin(clamp(dir.y, -1.0, 1.0));
  gl_FragColor = texture2D(uTex, vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI));
}`;

/** Lightweight 360° panorama viewer (no three.js): one full-screen quad + a fragment shader. */
export function PanoViewer({ src, title, onClose }: { src: string; title?: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const view = useRef({ yaw: 0, pitch: 0, fov: 1.5, auto: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl", { antialias: true, preserveDrawingBuffer: false });
    if (!gl) {
      setError(true);
      return;
    }
    const compile = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {
      yaw: gl.getUniformLocation(prog, "uYaw"),
      pitch: gl.getUniformLocation(prog, "uPitch"),
      fov: gl.getUniformLocation(prog, "uFov"),
      aspect: gl.getUniformLocation(prog, "uAspect"),
    };

    const tex = gl.createTexture();
    let ready = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      ready = true;
      setLoading(false);
    };
    img.onerror = () => setError(true);
    img.src = src;

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      if (view.current.auto) view.current.yaw += dt * 0.00006;
      if (ready) {
        gl.viewport(0, 0, w, h);
        gl.uniform1f(u.yaw, view.current.yaw);
        gl.uniform1f(u.pitch, view.current.pitch);
        gl.uniform1f(u.fov, view.current.fov);
        gl.uniform1f(u.aspect, w / Math.max(1, h));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [src]);

  // Pointer drag + pinch zoom.
  useEffect(() => {
    const el = canvasRef.current!;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const down = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      view.current.auto = false;
    };
    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) zoom((pinch - d) * 0.004);
        pinch = d;
        return;
      }
      const scale = view.current.fov / el.clientHeight;
      view.current.yaw -= (e.clientX - prev.x) * scale;
      view.current.pitch = Math.max(-1.45, Math.min(1.45, view.current.pitch + (e.clientY - prev.y) * scale));
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      view.current.auto = false;
      zoom(e.deltaY * 0.0015);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") view.current.yaw -= 0.1;
      if (e.key === "ArrowRight") view.current.yaw += 0.1;
    };
    window.addEventListener("keydown", key);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);

  function zoom(delta: number) {
    view.current.fov = Math.max(0.6, Math.min(1.9, view.current.fov + delta));
  }

  return (
    <div ref={wrapRef} className="fixed inset-0 z-[70] bg-black animate-fade-in" role="dialog" aria-modal="true" aria-label={`360° view${title ? ` of ${title}` : ""}`}>
      <canvas ref={canvasRef} className="h-full w-full cursor-grab touch-none active:cursor-grabbing" />
      {loading && !error ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/70">Loading 360° view…</div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">This device can&apos;t display 360° photos.</div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-4">
        <p className="pointer-events-auto rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur">
          360° · {title}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
          aria-label="Close 360° view"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="absolute bottom-5 right-5 flex gap-2">
        {[
          { icon: Minus, label: "Zoom out", fn: () => zoom(0.2) },
          { icon: Plus, label: "Zoom in", fn: () => zoom(-0.2) },
          { icon: Maximize2, label: "Full screen", fn: () => void wrapRef.current?.requestFullscreen?.().catch(() => {}) },
        ].map(({ icon: Icon, label, fn }) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              view.current.auto = false;
              fn();
            }}
            className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25")}
            aria-label={label}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <p className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1.5 text-xs text-white/80 backdrop-blur">
        Drag to look around
      </p>
    </div>
  );
}
