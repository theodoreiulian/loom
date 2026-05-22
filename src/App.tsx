import { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge as FlowEdge,
  type Node,
  type Edge,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

type HandleKind = 'text' | 'image';

// Single source of truth: every handle in the app, and what it carries.
// If a handle isn't listed here, no edge to/from it will be accepted.
const HANDLE_KIND: Record<string, HandleKind> = {
  // sources
  'prompt-text-out': 'text',
  'image-input-out': 'image',
  'engineer-out': 'text',
  'image-out': 'image',
  // targets
  'engineer-text-in': 'text',
  'engineer-image-in': 'image',
  'image-text-in': 'text',
  'image-image-in': 'image',
  'video-text-in': 'text',
  'video-image-in': 'image',
};

const isValidConnection = (c: Connection | FlowEdge): boolean => {
  if (!c.source || !c.target || !c.sourceHandle || !c.targetHandle) return false;
  if (c.source === c.target) return false;
  const src = HANDLE_KIND[c.sourceHandle];
  const tgt = HANDLE_KIND[c.targetHandle];
  return !!src && !!tgt && src === tgt;
};

import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import EmptyState from './components/EmptyState';
import EdgeContextMenu from './components/EdgeContextMenu';
import NodeSettingsPanel from './components/NodeSettingsPanel';
import ApiKeyModal from './components/ApiKeyModal';
import ConfirmDialog from './components/ConfirmDialog';
import { SettingsPanelProvider } from './context/SettingsPanelContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ProjectProvider, useProject } from './context/ProjectContext';
import ProjectDashboard from './components/ProjectDashboard';
import { getProjectData, saveProjectData, getProjects, createProject } from './store/projectStore';
import type { PromptNodeData, ImageInputNodeData, PromptEngineerNodeData, ImageGenNodeData, VideoGenNodeData, NodeData } from './types';
import { DEFAULT_IMAGE_SYSTEM_PROMPT, DEFAULT_VIDEO_SYSTEM_PROMPT } from './api/gemini';
import { TEMPLATES } from './templates';

let idCounter = 0;
const getId = () => `node_${++idCounter}_${Date.now()}`;

function Flow() {
  const { currentProjectId } = useProject();
  const { screenToFlowPosition, addNodes, setViewport, getViewport } = useReactFlow();
  const { theme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [edgeMenu, setEdgeMenu] = useState<{ x: number; y: number; edgeId: string } | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Load project data
  useEffect(() => {
    if (!currentProjectId) return;
    let isMounted = true;
    
    getProjectData(currentProjectId).then(data => {
      if (isMounted && data) {
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        if (data.viewport) {
          setViewport(data.viewport);
        }
      }
    });
    
    return () => { isMounted = false; };
  }, [currentProjectId, setNodes, setEdges, setViewport]);

  // Auto-save functionality
  useEffect(() => {
    if (!currentProjectId) return;
    // Don't save if nodes/edges haven't loaded yet (basic check)
    // Actually, XYFlow state is synchronous here, but we could add a "loaded" flag if needed.
    // For now, debounced save is fine.
    const timeoutId = setTimeout(() => {
      saveProjectData(currentProjectId, {
        nodes,
        edges,
        viewport: getViewport(),
      });
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, currentProjectId, getViewport]);

  // React Flow renders the Background dots via an SVG `fill` attribute, which
  // doesn't resolve CSS variables — so we pass a literal color per theme.
  const dotColor = theme === 'light' ? 'rgba(0, 0, 0, 0.18)' : 'rgba(255, 255, 255, 0.14)';

  // While the empty-state CTA is showing there are no nodes to interact with —
  // freeze pan/zoom so the dot grid stays anchored behind the welcome card.
  const isEmpty = nodes.length === 0;

  // Global delete key handler — works regardless of focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        // Don't delete if user is typing in an input/textarea
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        setNodes((nds) => nds.filter((n) => !n.selected));
        setEdges((eds) => eds.filter((e) => !e.selected));
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!isValidConnection(params)) return;
      setEdges((eds) => {
        // Text handles accept only one source — replace any existing edge.
        // Image handles accept multiple sources — just append.
        const kind = params.targetHandle ? HANDLE_KIND[params.targetHandle] : null;
        const cleaned = kind === 'text'
          ? eds.filter((e) => !(e.target === params.target && e.targetHandle === params.targetHandle))
          : eds;
        return addEdge(params, cleaned);
      });
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Template drop — build the whole subgraph centred on the drop point.
      const templateId = event.dataTransfer.getData('application/loom-template');
      if (templateId) {
        const template = TEMPLATES.find((t) => t.id === templateId);
        if (!template) return;
        const center = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const { nodes: tplNodes, edges: tplEdges } = template.build({
          centerX: center.x,
          centerY: center.y,
          nextId: getId,
        });
        addNodes(tplNodes);
        setEdges((eds) => [...eds, ...tplEdges]);
        return;
      }

      const type = event.dataTransfer.getData('application/reactflow');
      const offsetX = parseInt(event.dataTransfer.getData('application/loom-offset-x') || '0', 10);
      const offsetY = parseInt(event.dataTransfer.getData('application/loom-offset-y') || '0', 10);

      const position = screenToFlowPosition({
        x: event.clientX - offsetX + 12,
        y: event.clientY - offsetY,
      });

      if (!type) return;

      let newNode: Node;

      switch (type) {
        case 'prompt':
          newNode = {
            id: getId(),
            type: 'prompt',
            position,
            data: {
              prompt: '',
            } as PromptNodeData,
          };
          break;
        case 'imageInput':
          newNode = {
            id: getId(),
            type: 'imageInput',
            position,
            data: {
              images: [],
            } as ImageInputNodeData,
          };
          break;
        case 'imageGen':
          newNode = {
            id: getId(),
            type: 'imageGen',
            position,
            data: {
              status: 'idle',
              resultImages: [],
              errorMessage: null,
              provider: 'gemini',
              model: 'gemini-3.1-flash-image-preview',
              aspectRatio: '1:1',
              negativePrompt: '',
              resolution: '1K',
              numberOfImages: 1,
              quality: 'auto',
              outputFormat: 'png',
              outputCompression: 100,
              background: 'auto',
              inputFidelity: 'low',
              moderation: 'auto',
            } as ImageGenNodeData,
          };
          break;
        case 'videoGen':
          newNode = {
            id: getId(),
            type: 'videoGen',
            position,
            data: {
              status: 'idle',
              resultVideo: null,
              errorMessage: null,
              provider: 'kling',
              model: 'kling-v1',
              mode: 'starting-frame',
              duration: 5,
              aspectRatio: '16:9',
              negativePrompt: '',
              resolution: '720p',
            } as VideoGenNodeData,
          };
          break;
        case 'promptEngineer':
          newNode = {
            id: getId(),
            type: 'promptEngineer',
            position,
            data: {
              status: 'idle',
              targetMode: 'image',
              rawPrompt: '',
              enhancedPrompt: '',
              errorMessage: null,
              customSystemPromptImage: DEFAULT_IMAGE_SYSTEM_PROMPT,
              customSystemPromptVideo: DEFAULT_VIDEO_SYSTEM_PROMPT,
              referenceImages: [],
            } as PromptEngineerNodeData,
          };
          break;
        default:
          return;
      }

      addNodes(newNode);
    },
    [screenToFlowPosition, addNodes, setNodes, setEdges]
  );

  const handleDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleAddNode = useCallback(
    (type: string) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const position = screenToFlowPosition({ x: centerX, y: centerY });

      let newNode: Node;
      switch (type) {
        case 'prompt':
          newNode = {
            id: getId(),
            type: 'prompt',
            position: { x: position.x - 200, y: position.y },
            data: { prompt: '' } as PromptNodeData,
          };
          break;
        case 'imageInput':
          newNode = {
            id: getId(),
            type: 'imageInput',
            position: { x: position.x - 400, y: position.y },
            data: { images: [] } as ImageInputNodeData,
          };
          break;
        case 'imageGen':
          newNode = {
            id: getId(),
            type: 'imageGen',
            position,
            data: {
              status: 'idle',
              resultImages: [],
              errorMessage: null,
              provider: 'gemini',
              model: 'gemini-3.1-flash-image-preview',
              aspectRatio: '1:1',
              negativePrompt: '',
              resolution: '1K',
              numberOfImages: 1,
              quality: 'auto',
              outputFormat: 'png',
              outputCompression: 100,
              background: 'auto',
              inputFidelity: 'low',
              moderation: 'auto',
            } as ImageGenNodeData,
          };
          break;
        case 'videoGen':
          newNode = {
            id: getId(),
            type: 'videoGen',
            position: { x: position.x + 200, y: position.y },
            data: {
              status: 'idle',
              resultVideo: null,
              errorMessage: null,
              provider: 'kling',
              model: 'kling-v1',
              mode: 'starting-frame',
              duration: 5,
              aspectRatio: '16:9',
              negativePrompt: '',
              resolution: '720p',
            } as VideoGenNodeData,
          };
          break;
        case 'promptEngineer':
          newNode = {
            id: getId(),
            type: 'promptEngineer',
            position,
            data: {
              status: 'idle',
              targetMode: 'image',
              rawPrompt: '',
              enhancedPrompt: '',
              errorMessage: null,
              customSystemPromptImage: DEFAULT_IMAGE_SYSTEM_PROMPT,
              customSystemPromptVideo: DEFAULT_VIDEO_SYSTEM_PROMPT,
              referenceImages: [],
            } as PromptEngineerNodeData,
          };
          break;
        default:
          return;
      }
      addNodes(newNode);
    },
    [screenToFlowPosition, addNodes]
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
    [screenToFlowPosition, addNodes, setEdges]
  );

  const handleClearCanvas = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const confirmClearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: any) => {
      event.preventDefault();
      setEdgeMenu({
        x: event.clientX,
        y: event.clientY,
        edgeId: edge.id,
      });
    },
    []
  );

  const deleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    },
    [setEdges]
  );

  return (
    <>
      <Header
        onOpenSettings={() => setShowSettings(true)}
        onClearCanvas={handleClearCanvas}
      />

      <Sidebar onDragStart={handleDragStart} onAddTemplate={handleAddTemplate} />

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
          nodeTypes={nodeTypes as any}
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
          connectionLineStyle={{ stroke: 'var(--color-cable)', strokeWidth: 2.5, strokeLinecap: 'round' }}
          defaultEdgeOptions={{
            type: 'cable',
            animated: false,
            style: { strokeWidth: 2.5 },
          }}
          edgeTypes={edgeTypes as any}
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

      <ApiKeyModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear canvas"
        message="This will remove all nodes and connections. You can't undo this."
        confirmLabel="Clear"
        onConfirm={confirmClearCanvas}
        onClose={() => setShowClearConfirm(false)}
      />
    </>
  );
}

function MainContent() {
  const { currentProjectId, openProject } = useProject();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const projects = await getProjects();
        if (projects.length === 0) {
          const newProj = await createProject('Untitled Project');
          openProject(newProj.id);
        }
      } catch (e) {
        console.error("Failed to initialize projects", e);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
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
  return <Flow />;
}

export default function App() {
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
