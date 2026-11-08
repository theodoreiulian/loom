import { useCallback, useState, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { isSingleSourceHandle, isValidConnection } from "./graph/handles";
import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import EmptyState from "./components/EmptyState";
import EdgeContextMenu from "./components/EdgeContextMenu";
import NodeSettingsPanel from "./components/NodeSettingsPanel";
import ApiKeyModal from "./components/ApiKeyModal";
import { SettingsPanelProvider } from "./context/SettingsPanelContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { ProjectProvider, useProject } from "./context/ProjectContext";
import ProjectDashboard from "./components/ProjectDashboard";
import {
  getProjectData,
  saveProjectData,
  getProjects,
  createProject,
  type ProjectData,
} from "./store/projectStore";
import type { NodeData } from "./types";
import { createNodeData, migrateEdges, migrateNodes } from "./nodes/defaults";
import { TEMPLATES } from "./templates";

let idCounter = 0;
const getId = () => `node_${++idCounter}_${Date.now()}`;

function Flow() {
  const { currentProjectId } = useProject();
  const { screenToFlowPosition, addNodes, setViewport, getViewport } =
    useReactFlow();
  const { theme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [edgeMenu, setEdgeMenu] = useState<{
    x: number;
    y: number;
    edgeId: string;
  } | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const latestProjectData = useRef<ProjectData | null>(null);

  // Load project data
  useEffect(() => {
    if (!currentProjectId) return;
    let isMounted = true;

    getProjectData(currentProjectId).then((data) => {
      if (isMounted && data) {
        const nodes = migrateNodes(data.nodes || []);
        setNodes(nodes as Node<NodeData>[]);
        setEdges(migrateEdges(data.edges || [], nodes));
        if (data.viewport) {
          setViewport(data.viewport);
        }
        setIsLoaded(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentProjectId, setNodes, setEdges, setViewport]);

  // Keep a loaded snapshot so leaving for the landing page also saves edits
  // made before the debounce finishes. Never save the initial empty state.
  useEffect(() => {
    if (!isLoaded) return;
    latestProjectData.current = { nodes, edges, viewport: getViewport() };
  }, [nodes, edges, isLoaded, getViewport]);

  useEffect(() => {
    return () => {
      if (currentProjectId && latestProjectData.current) {
        void saveProjectData(currentProjectId, latestProjectData.current);
      }
    };
  }, [currentProjectId]);

  useEffect(() => {
    if (!currentProjectId || !isLoaded) return;
    const timeoutId = setTimeout(() => {
      void saveProjectData(currentProjectId, {
        nodes,
        edges,
        viewport: getViewport(),
      });
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, currentProjectId, getViewport, isLoaded]);

  // React Flow renders the Background dots via an SVG `fill` attribute, which
  // doesn't resolve CSS variables — so we pass a literal color per theme.
  const dotColor =
    theme === "light" ? "rgba(0, 0, 0, 0.18)" : "rgba(255, 255, 255, 0.14)";

  // While the empty-state CTA is showing there are no nodes to interact with —
  // freeze pan/zoom so the dot grid stays anchored behind the welcome card.
  const isEmpty = nodes.length === 0;

  // Global delete key handler — works regardless of focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const target = e.target as HTMLElement;
        // Don't delete if user is typing in an input/textarea
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
        setNodes((nds) => nds.filter((n) => !n.selected));
        setEdges((eds) => eds.filter((e) => !e.selected));
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!isValidConnection(params)) return;
      setEdges((eds) => {
        // Text handles accept only one source — replace any existing edge.
        // Image handles accept multiple sources — just append.
        const cleaned = isSingleSourceHandle(params.targetHandle)
          ? eds.filter(
              (e) =>
                !(
                  e.target === params.target &&
                  e.targetHandle === params.targetHandle
                ),
            )
          : eds;
        return addEdge(params, cleaned);
      });
    },
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Template drop — build the whole subgraph centred on the drop point.
      const templateId = event.dataTransfer.getData(
        "application/loom-template",
      );
      if (templateId) {
        const template = TEMPLATES.find((t) => t.id === templateId);
        if (!template) return;
        const center = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const { nodes: tplNodes, edges: tplEdges } = template.build({
          centerX: center.x,
          centerY: center.y,
          nextId: getId,
        });
        addNodes(tplNodes);
        setEdges((eds) => [...eds, ...tplEdges]);
        return;
      }

      const type = event.dataTransfer.getData("application/reactflow");
      const offsetX = parseInt(
        event.dataTransfer.getData("application/loom-offset-x") || "0",
        10,
      );
      const offsetY = parseInt(
        event.dataTransfer.getData("application/loom-offset-y") || "0",
        10,
      );

      const position = screenToFlowPosition({
        x: event.clientX - offsetX + 12,
        y: event.clientY - offsetY,
      });

      if (!type) return;

      const data = createNodeData(type);
      if (!data) return;

      const newNode: Node = { id: getId(), type, position, data };

      addNodes(newNode);
    },
    [screenToFlowPosition, addNodes, setEdges],
  );

  const handleDragStart = useCallback(
    (event: React.DragEvent, nodeType: string) => {
      event.dataTransfer.setData("application/reactflow", nodeType);
      event.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  const handleAddNode = useCallback(
    (type: string) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const position = screenToFlowPosition({ x: centerX, y: centerY });

      const data = createNodeData(type);
      if (!data) return;

      // Nudge inputs left and video output right so a fresh chain reads L→R.
      const offsetX =
        type === "imageInput"
          ? -400
          : type === "prompt"
            ? -200
            : type === "videoGen"
              ? 200
              : 0;
      const newNode: Node = {
        id: getId(),
        type,
        position: { x: position.x + offsetX, y: position.y },
        data,
      };

      addNodes(newNode);
    },
    [screenToFlowPosition, addNodes],
  );

  const handleAddTemplate = useCallback(
    (templateId: string) => {
      const template = TEMPLATES.find((t) => t.id === templateId);
      if (!template) return;
      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      const { nodes: tplNodes, edges: tplEdges } = template.build({
        centerX: center.x,
        centerY: center.y,
        nextId: getId,
      });
      addNodes(tplNodes);
      setEdges((eds) => [...eds, ...tplEdges]);
    },
    [screenToFlowPosition, addNodes, setEdges],
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setEdgeMenu({
        x: event.clientX,
        y: event.clientY,
        edgeId: edge.id,
      });
    },
    [],
  );

  const deleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    },
    [setEdges],
  );

  return (
    <>
      <Header onOpenSettings={() => setShowSettings(true)} />

      <Sidebar
        onDragStart={handleDragStart}
        onAddTemplate={handleAddTemplate}
      />

      <div ref={reactFlowWrapper} className="w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneClick={() => setEdgeMenu(null)}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
          minZoom={0.2}
          maxZoom={2}
          panOnDrag={!isEmpty}
          zoomOnScroll={!isEmpty}
          zoomOnPinch={!isEmpty}
          zoomOnDoubleClick={!isEmpty}
          deleteKeyCode="Delete"
          selectionKeyCode="Shift"
          multiSelectionKeyCode="Control"
          connectionLineStyle={{
            stroke: "var(--color-cable)",
            strokeWidth: 2.5,
            strokeLinecap: "round",
          }}
          defaultEdgeOptions={{
            type: "cable",
            animated: false,
            style: { strokeWidth: 2.5 },
          }}
          edgeTypes={edgeTypes}
        >
          <Background gap={44} size={2.2} color={dotColor} />
        </ReactFlow>
      </div>

      {nodes.length === 0 && <EmptyState onAddNode={handleAddNode} />}

      {edgeMenu && (
        <EdgeContextMenu
          x={edgeMenu.x}
          y={edgeMenu.y}
          onDelete={() => deleteEdge(edgeMenu.edgeId)}
          onClose={() => setEdgeMenu(null)}
        />
      )}

      <NodeSettingsPanel />

      <ApiKeyModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}

function MainContent() {
  const { currentProjectId, openProject } = useProject();
  const [isInitializing, setIsInitializing] = useState(true);

  const initialization = useRef<Promise<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Share initialization across StrictMode's repeated effect setup.
    initialization.current ??= getProjects().then(async (projects) => {
      const latest = projects.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      return latest?.id ?? (await createProject("Untitled Project")).id;
    });
    initialization.current
      .then((id) => {
        if (!cancelled) openProject(id);
      })
      .catch((error) => {
        console.error("Failed to initialize projects", error);
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [openProject]);

  if (isInitializing) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentProjectId) {
    return <ProjectDashboard />;
  }
  return <Flow key={currentProjectId} />;
}

export default function Editor() {
  return (
    <div className="w-full h-full">
      <ThemeProvider>
        <ProjectProvider>
          <ReactFlowProvider>
            <SettingsPanelProvider>
              <MainContent />
            </SettingsPanelProvider>
          </ReactFlowProvider>
        </ProjectProvider>
      </ThemeProvider>
    </div>
  );
}
