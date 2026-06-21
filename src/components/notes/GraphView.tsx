import { useState, useEffect, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { noteStore } from "./noteStore";
import type { GraphData, GraphNode, GraphEdge } from "./Types";

interface GraphViewProps {
  open: boolean;
  onClose: () => void;
}

// Simple force-directed graph using Canvas
export function GraphView({ open, onClose }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const navigate = useNavigate();
  const animFrameRef = useRef<number>(0);
  const nodePositions = useRef<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map());
  const dragNode = useRef<string | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    noteStore.loadGraphData().then((data) => {
      if (data) {
        setGraphData(data);
        // Initialize positions if needed
        const positions = nodePositions.current;
        if (positions.size === 0) {
          const centerX = 400;
          const centerY = 300;
          data.nodes.forEach((node, i) => {
            const angle = (2 * Math.PI * i) / data.nodes.length;
            const radius = 150 + Math.random() * 50;
            positions.set(node.id, {
              x: centerX + Math.cos(angle) * radius,
              y: centerY + Math.sin(angle) * radius,
              vx: 0,
              vy: 0,
            });
          });
        }
        setLoading(false);
        startSimulation(data);
      } else {
        setLoading(false);
      }
    });
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [open]);

  const startSimulation = useCallback((data: GraphData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const positions = nodePositions.current;
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const REPULSION = 5000;
    const ATTRACTION = 0.005;
    const DAMPING = 0.85;
    const MIN_VELOCITY = 0.1;
    let iterations = 0;
    const MAX_ITERATIONS = 200;

    function step() {
      if (iterations >= MAX_ITERATIONS) return;
      iterations++;

      // Repulsion between all nodes
      const nodeIds = data.nodes.map((n) => n.id);
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const a = positions.get(nodeIds[i])!;
          const b = positions.get(nodeIds[j])!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = REPULSION / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // Attraction along edges
      for (const edge of data.edges) {
        const a = positions.get(edge.source);
        const b = positions.get(edge.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = ATTRACTION * dist;
        a.vx += (dx / dist) * force;
        a.vy += (dy / dist) * force;
        b.vx -= (dx / dist) * force;
        b.vy -= (dy / dist) * force;
      }

      // Center gravity
      for (const node of data.nodes) {
        const p = positions.get(node.id)!;
        p.vx += (centerX - p.x) * 0.001;
        p.vy += (centerY - p.y) * 0.001;
      }

      // Apply velocity with damping
      let totalVel = 0;
      for (const node of data.nodes) {
        const p = positions.get(node.id)!;
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x += p.vx;
        p.y += p.vy;
        totalVel += Math.abs(p.vx) + Math.abs(p.vy);
      }

// Draw
    if (ctx) draw(ctx, data, positions, width, height);

      if (totalVel > MIN_VELOCITY) {
        animFrameRef.current = requestAnimationFrame(step);
      }
    }

    step();
  }, []);

  const draw = (
    ctx: CanvasRenderingContext2D,
    data: GraphData,
    positions: Map<string, { x: number; y: number; vx: number; vy: number }>,
    width: number,
    height: number
  ) => {
    ctx.clearRect(0, 0, width, height);

    const activeNoteId = noteStore.state.activeNoteId;

    // Draw edges
    ctx.strokeStyle = "rgba(124, 92, 255, 0.2)";
    ctx.lineWidth = 1.5;
    for (const edge of data.edges) {
      const a = positions.get(edge.source);
      const b = positions.get(edge.target);
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Draw nodes
    for (const node of data.nodes) {
      const p = positions.get(node.id);
      if (!p) continue;

      const isActive = node.id === activeNoteId;
      const linkCount = data.edges.filter(
        (e) => e.source === node.id || e.target === node.id
      ).length;
      const radius = Math.max(8, Math.min(20, 6 + linkCount * 3));

      // Circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isActive
        ? "var(--color-accent-primary)"
        : "rgba(124, 92, 255, 0.6)";
      ctx.fill();
      ctx.strokeStyle = "var(--color-border-primary)";
      ctx.lineWidth = isActive ? 3 : 1;
      ctx.stroke();

      // Label
      if (radius > 10 || zoom > 0.8) {
        ctx.fillStyle = "var(--color-text-primary)";
        ctx.font = "10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(node.title, p.x, p.y + radius + 14);
      }
    }
  };

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !graphData) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      const positions = nodePositions.current;
      for (const node of graphData.nodes) {
        const p = positions.get(node.id);
        if (!p) continue;
        const dx = x - p.x;
        const dy = y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const linkCount = graphData.edges.filter(
          (e) => e.source === node.id || e.target === node.id
        ).length;
        const radius = Math.max(8, Math.min(20, 6 + linkCount * 3));
        if (dist <= radius + 5) {
          onClose();
          navigate(`/notes/${node.slug}`);
          return;
        }
      }
    },
    [graphData, navigate, onClose, zoom]
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !graphData) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      // Check if clicking a node for dragging
      const positions = nodePositions.current;
      for (const node of graphData.nodes) {
        const p = positions.get(node.id);
        if (!p) continue;
        const dx = x - p.x;
        const dy = y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const linkCount = graphData.edges.filter(
          (e) => e.source === node.id || e.target === node.id
        ).length;
        const radius = Math.max(8, Math.min(20, 6 + linkCount * 3));
        if (dist <= radius + 5) {
          dragNode.current = node.id;
          offsetRef.current = { x: x - p.x, y: y - p.y };
          return;
        }
      }
    },
    [graphData, zoom]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!dragNode.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      const p = nodePositions.current.get(dragNode.current);
      if (p) {
        p.x = x - offsetRef.current.x;
        p.y = y - offsetRef.current.y;
        p.vx = 0;
        p.vy = 0;
      }
    },
    [zoom]
  );

  const handleCanvasMouseUp = useCallback(() => {
    dragNode.current = null;
  }, []);

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.2, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.2, 0.3));
  const handleReset = () => setZoom(1);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center"
      style={{ backgroundColor: "var(--color-bg-overlay)" }}
      onClick={onClose}
    >
      <div
        className="rounded-[var(--radius-lg)] border-2 overflow-hidden animate-scaleIn"
        style={{
          backgroundColor: "var(--color-bg-primary)",
          borderColor: "var(--color-border-primary)",
          boxShadow: "var(--shadow-modal)",
          width: "90vw",
          maxWidth: "900px",
          height: "80vh",
          maxHeight: "700px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b-2"
          style={{ borderColor: "var(--color-border-primary)" }}
        >
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Note Graph
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] border-2 hover:bg-[var(--color-bg-hover)] transition-colors"
              style={{ borderColor: "var(--color-border-primary)" }}
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] border-2 hover:bg-[var(--color-bg-hover)] transition-colors"
              style={{ borderColor: "var(--color-border-primary)" }}
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] border-2 hover:bg-[var(--color-bg-hover)] transition-colors"
              style={{ borderColor: "var(--color-border-primary)" }}
              title="Reset zoom"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] border-2 hover:bg-[var(--color-bg-hover)] transition-colors ml-1"
              style={{ borderColor: "var(--color-border-primary)" }}
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 relative overflow-hidden" style={{ height: "calc(100% - 53px)" }}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-6 h-6 border-2 rounded-full animate-spin"
                style={{
                  borderColor: "var(--color-border-primary)",
                  borderTopColor: "var(--color-accent-primary)",
                }}
              />
            </div>
          ) : graphData && graphData.nodes.length > 0 ? (
            <div
              className="w-full h-full overflow-hidden"
              style={{ cursor: dragNode.current ? "grabbing" : "grab" }}
            >
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full h-full"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                }}
                onClick={handleCanvasClick}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
            </div>
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center text-sm"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {graphData
                ? "No links between notes yet. Create [[wikilinks]] to build your graph."
                : "Failed to load graph data."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}