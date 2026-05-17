import { useCallback, useState, useRef, useEffect } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import EmptyState from './components/EmptyState';
import EdgeContextMenu from './components/EdgeContextMenu';
import NodeSettingsPanel from './components/NodeSettingsPanel';
import ApiKeyModal from './components/ApiKeyModal';
import { SettingsPanelProvider } from './context/SettingsPanelContext';
import type { PromptNodeData, PromptEngineerNodeData, ImageGenNodeData, VideoGenNodeData } from './types';
import { DEFAULT_IMAGE_SYSTEM_PROMPT, DEFAULT_VIDEO_SYSTEM_PROMPT } from './api/gemini';

let idCounter = 0;
const getId = () => `node_${++idCounter}`;

function Flow() {
  const { screenToFlowPosition, addNodes } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [edgeMenu, setEdgeMenu] = useState<{ x: number; y: number; edgeId: string } | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

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
      setEdges((eds) => addEdge(params, eds));
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
              referenceImages: [],
              generatedImages: [],
            } as PromptNodeData,
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
              model: 'gemini-3.1-flash-image-preview',
              aspectRatio: '1:1',
              negativePrompt: '',
              resolution: '1K',
              numberOfImages: 1,
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
            data: { prompt: '', referenceImages: [], generatedImages: [] } as PromptNodeData,
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
              model: 'gemini-3.1-flash-image-preview',
              aspectRatio: '1:1',
              negativePrompt: '',
              resolution: '1K',
              numberOfImages: 1,
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

  const handleClearCanvas = useCallback(() => {
    if (confirm('Clear all nodes and connections?')) {
      setNodes([]);
      setEdges([]);
    }
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
        onAddNode={handleAddNode}
        onClearCanvas={handleClearCanvas}
      />

      <Sidebar onDragStart={handleDragStart} />

      <div ref={reactFlowWrapper} className="w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneClick={() => setEdgeMenu(null)}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes as any}
          defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
          minZoom={0.2}
          maxZoom={2}
          deleteKeyCode="Delete"
          selectionKeyCode="Shift"
          multiSelectionKeyCode="Control"
          connectionLineStyle={{ stroke: 'rgba(255, 255, 255, 0.7)', strokeWidth: 2.5, strokeLinecap: 'round' }}
          defaultEdgeOptions={{
            type: 'cable',
            animated: false,
            style: { strokeWidth: 2.5 },
          }}
          edgeTypes={edgeTypes as any}
        >
          <Background gap={28} size={1} color="rgba(255,255,255,0.035)" />
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
    </>
  );
}

export default function App() {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <SettingsPanelProvider>
          <Flow />
        </SettingsPanelProvider>
      </ReactFlowProvider>
    </div>
  );
}
