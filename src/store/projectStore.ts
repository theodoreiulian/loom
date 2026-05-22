import type { Node, Edge, Viewport } from '@xyflow/react';
import type { NodeData } from '../types';

export interface ProjectInfo {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectData {
  nodes: Node<NodeData>[];
  edges: Edge[];
  viewport: Viewport;
}

const DB_NAME = 'loom_db';
const STORE_NAME = 'keyval';
const PROJECTS_LIST_KEY = 'loom_projects_list';
const PROJECT_DATA_PREFIX = 'loom_project_data_';

// Simple IndexedDB wrapper
function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function get<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function set(key: string, val: any): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(request.error);
  });
}

export async function del(key: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(request.error);
  });
}

/**
 * Get all project metadata
 */
export async function getProjects(): Promise<ProjectInfo[]> {
  const projects = await get<ProjectInfo[]>(PROJECTS_LIST_KEY);
  return projects || [];
}

/**
 * Save project metadata list
 */
async function saveProjectsList(projects: ProjectInfo[]): Promise<void> {
  await set(PROJECTS_LIST_KEY, projects);
}

/**
 * Create a new project and return its info
 */
export async function createProject(name: string): Promise<ProjectInfo> {
  const projects = await getProjects();
  const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = Date.now();
  
  const newProject: ProjectInfo = {
    id,
    name,
    createdAt: now,
    updatedAt: now,
  };
  
  projects.push(newProject);
  await saveProjectsList(projects);
  
  // Initialize empty data
  const initialData: ProjectData = {
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 0.9 },
  };
  await saveProjectData(id, initialData);
  
  return newProject;
}

/**
 * Get full project data (nodes, edges, viewport)
 */
export async function getProjectData(id: string): Promise<ProjectData | undefined> {
  return await get<ProjectData>(`${PROJECT_DATA_PREFIX}${id}`);
}

/**
 * Save full project data and update modified timestamp
 */
export async function saveProjectData(id: string, data: ProjectData): Promise<void> {
  await set(`${PROJECT_DATA_PREFIX}${id}`, data);
  
  // Update timestamp
  const projects = await getProjects();
  const index = projects.findIndex(p => p.id === id);
  if (index !== -1) {
    projects[index].updatedAt = Date.now();
    await saveProjectsList(projects);
  }
}

/**
 * Update project name
 */
export async function updateProjectName(id: string, newName: string): Promise<void> {
  const projects = await getProjects();
  const index = projects.findIndex(p => p.id === id);
  if (index !== -1) {
    projects[index].name = newName;
    projects[index].updatedAt = Date.now();
    await saveProjectsList(projects);
  }
}

/**
 * Delete project and its data
 */
export async function deleteProject(id: string): Promise<void> {
  const projects = await getProjects();
  const updatedProjects = projects.filter(p => p.id !== id);
  await saveProjectsList(updatedProjects);
  await del(`${PROJECT_DATA_PREFIX}${id}`);
}

/**
 * Duplicate a project
 */
export async function duplicateProject(id: string, newName: string): Promise<ProjectInfo | null> {
  const sourceData = await getProjectData(id);
  if (!sourceData) return null;
  
  const newProject = await createProject(newName);
  
  const clonedData: ProjectData = JSON.parse(JSON.stringify(sourceData));
  
  await saveProjectData(newProject.id, clonedData);
  return newProject;
}
