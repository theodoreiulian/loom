import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getProjects } from '../store/projectStore';
import type { ProjectInfo } from '../store/projectStore';

interface ProjectContextType {
  currentProjectId: string | null;
  currentProject: ProjectInfo | null;
  openProject: (id: string) => void;
  closeProject: () => void;
  refreshProjectInfo: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<ProjectInfo | null>(null);

  const refreshProjectInfo = useCallback(async () => {
    if (currentProjectId) {
      const projects = await getProjects();
      const proj = projects.find(p => p.id === currentProjectId);
      setCurrentProject(proj || null);
    } else {
      setCurrentProject(null);
    }
  }, [currentProjectId]);

  useEffect(() => {
    refreshProjectInfo();
  }, [refreshProjectInfo]);

  const openProject = useCallback((id: string) => {
    setCurrentProjectId(id);
  }, []);

  const closeProject = useCallback(() => {
    setCurrentProjectId(null);
  }, []);

  return (
    <ProjectContext.Provider value={{
      currentProjectId,
      currentProject,
      openProject,
      closeProject,
      refreshProjectInfo
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
