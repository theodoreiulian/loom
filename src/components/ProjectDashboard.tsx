import React, { useEffect, useState, useRef } from 'react';
import { Plus, MoreVertical, Edit2, Copy, Trash2, LayoutGrid, Sun, Moon } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { getProjects, createProject, deleteProject, duplicateProject, updateProjectName } from '../store/projectStore';
import type { ProjectInfo } from '../store/projectStore';
import logo from '../assets/sublogo.png';
import { useTheme } from '../context/ThemeContext';
import ConfirmDialog from './ConfirmDialog';

export default function ProjectDashboard() {
  const { openProject } = useProject();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Menu and Dialog states
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadProjects = async () => {
    setLoading(true);
    const projList = await getProjects();
    // Sort by updated time descending
    projList.sort((a, b) => b.updatedAt - a.updatedAt);
    setProjects(projList);
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateNew = async () => {
    const proj = await createProject('Untitled Project');
    openProject(proj.id);
  };

  const handleDuplicate = async (id: string, name: string) => {
    setActiveMenuId(null);
    await duplicateProject(id, `${name} (Copy)`);
    await loadProjects();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteProject(deleteId);
      setDeleteId(null);
      await loadProjects();
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (renameValue.trim()) {
      await updateProjectName(id, renameValue.trim());
      await loadProjects();
    }
    setRenameId(null);
    setRenameValue('');
  };

  const startRename = (proj: ProjectInfo) => {
    setActiveMenuId(null);
    setRenameId(proj.id);
    setRenameValue(proj.name);
  };

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleDateString(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="absolute top-3 left-3 right-3 z-50 flex items-center">
        <div className="glass-strong w-full flex items-center px-2 py-1.5 rounded-2xl">
          {/* Left: Projects Title */}
          <div className="flex items-center pl-2 gap-3 flex-1">
            <span className="text-sm font-medium tracking-tight">Projects</span>
          </div>

          {/* Center: Logo */}
          <div className="flex items-center justify-center absolute left-1/2 -translate-x-1/2 pointer-events-none">
            <img
              src={logo}
              alt="Loom"
              className="h-7 w-auto transition-[filter] duration-300 opacity-60"
              style={{ filter: isLight ? 'invert(1)' : 'none' }}
            />
          </div>

          {/* Right: Theme Toggle & New Project */}
          <div className="flex-1 flex justify-end items-center gap-1.5 pr-1">
            <button
              onClick={toggleTheme}
              aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
              className="glass-button flex items-center justify-center w-8 h-8 p-0"
            >
              {isLight ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
            </button>
            <button
              onClick={handleCreateNew}
              className="glass-button flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-full"
            >
              <Plus className="w-3 h-3" />
              <span className="font-medium">New Project</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="w-full h-full overflow-y-auto p-8 pt-20 relative z-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-6 text-[var(--color-muted)]">
              <LayoutGrid className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-medium mb-2">No projects yet</h2>
            <p className="text-[var(--color-secondary)] mb-6 text-sm">
              Create a new project to start building your AI workflow. Projects are automatically saved as you work.
            </p>
            <button
              onClick={handleCreateNew}
              className="glass-button flex items-center gap-2 px-5 py-2.5 text-sm rounded-full"
            >
              <Plus className="w-4 h-4" />
              <span>Create your first project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-up">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="liquid-glass group relative flex flex-col h-48 cursor-pointer"
                onClick={() => {
                  if (renameId !== proj.id && activeMenuId !== proj.id) {
                    openProject(proj.id);
                  }
                }}
              >
                {/* Thumbnail area (placeholder) */}
                <div className="flex-1 rounded-t-[15px] bg-[var(--color-surface-recessed)] border-b border-[var(--color-line-subtle)] overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-surface-hover)] opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:scale-110 transition-transform duration-500">
                    <LayoutGrid className="w-10 h-10" />
                  </div>
                </div>

                {/* Footer area */}
                <div className="p-4 flex justify-between items-center bg-[var(--color-surface)] rounded-b-[15px]">
                  <div className="overflow-hidden flex-1 mr-2">
                    {renameId === proj.id ? (
                      <form onSubmit={(e) => handleRenameSubmit(e, proj.id)} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={(e) => handleRenameSubmit(e, proj.id)}
                          autoFocus
                          className="w-full bg-[var(--color-input)] text-[var(--color-primary)] text-sm font-medium px-2 py-1 rounded border border-[var(--color-line-focus)] outline-none"
                        />
                      </form>
                    ) : (
                      <>
                        <h3 className="text-sm font-medium truncate">{proj.name}</h3>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5 truncate">
                          {formatDate(proj.updatedAt)}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Context Menu Button */}
                  <div className="relative" ref={activeMenuId === proj.id ? menuRef : null}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === proj.id ? null : proj.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-[var(--color-surface-hover)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuId === proj.id && (
                      <div className="absolute right-0 bottom-full mb-1 w-36 bg-[var(--color-canvas)] border border-[var(--color-line-strong)] rounded-xl py-1 z-50 animate-popup-in shadow-xl origin-bottom-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); startRename(proj); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" /> Rename
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDuplicate(proj.id, proj.name); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2 transition-colors"
                        >
                          <Copy className="w-3 h-3" /> Duplicate
                        </button>
                        <div className="my-1 border-t border-[var(--color-line-subtle)]" />
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(proj.id); setActiveMenuId(null); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-[var(--color-surface-hover)] flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
        isDestructive={true}
      />
    </div>
  );
}
