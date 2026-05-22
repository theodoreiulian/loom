import React, { useState, useEffect } from 'react';
import { Trash2, Settings, Sun, Moon, ChevronLeft, Edit2 } from 'lucide-react';
import logo from '../assets/sublogo.png';
import { useTheme } from '../context/ThemeContext';
import { useProject } from '../context/ProjectContext';
import { updateProjectName } from '../store/projectStore';

interface HeaderProps {
  onOpenSettings: () => void;
  onClearCanvas: () => void;
}

export default function Header({ onOpenSettings, onClearCanvas }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { currentProject, closeProject, refreshProjectInfo } = useProject();
  const isLight = theme === 'light';
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (currentProject) {
      setEditName(currentProject.name);
    }
  }, [currentProject]);

  const handleRenameSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (currentProject && editName.trim() && editName !== currentProject.name) {
      await updateProjectName(currentProject.id, editName.trim());
      await refreshProjectInfo();
    }
    setIsEditing(false);
  };

  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [promptName, setPromptName] = useState('Untitled Project');

  const handleBack = () => {
    if (currentProject?.name === 'Untitled Project' && !localStorage.getItem(`prompted_${currentProject.id}`)) {
      setPromptName('Untitled Project');
      setShowNamePrompt(true);
    } else {
      closeProject();
    }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentProject) {
      localStorage.setItem(`prompted_${currentProject.id}`, 'true');
      if (promptName.trim() && promptName !== currentProject.name) {
        await updateProjectName(currentProject.id, promptName.trim());
        await refreshProjectInfo();
      }
    }
    setShowNamePrompt(false);
    closeProject();
  };

  return (
    <>
    <header className="absolute top-3 left-3 right-3 z-50 flex items-center">
      <div className="glass-strong w-full flex items-center px-2 py-1.5 rounded-2xl">
        {/* Left: Back button & Project Name */}
        <div className="flex items-center pl-2 gap-3 flex-1">
          <button
            onClick={handleBack}
            className="glass-button flex items-center justify-center w-8 h-8 p-0"
            title="Back to Projects"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="h-4 w-px bg-[var(--color-line-strong)] mx-1" />
          
          {isEditing ? (
            <form onSubmit={handleRenameSubmit} className="flex-1 max-w-[200px]">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleRenameSubmit()}
                autoFocus
                className="w-full bg-[var(--color-input)] text-[var(--color-primary)] text-sm font-medium px-2 py-1 rounded border border-[var(--color-line-focus)] outline-none"
              />
            </form>
          ) : (
            <div 
              className="group flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
              onClick={() => setIsEditing(true)}
            >
              <span className="text-sm font-medium truncate max-w-[200px]">
                {currentProject?.name || 'Untitled Project'}
              </span>
              <Edit2 className="w-3 h-3 text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors opacity-0 group-hover:opacity-100" />
            </div>
          )}
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

        <div className="flex-1" />

        {/* Right: Theme toggle + Clear + Settings */}
        <div className="flex items-center gap-1.5 pr-2">
          <button
            onClick={toggleTheme}
            aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            className="glass-button flex items-center justify-center w-8 h-8 p-0"
          >
            {isLight ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
          </button>
          <button
            onClick={onClearCanvas}
            className="glass-button flex items-center gap-1.5 px-3 py-1.5 text-[12px]"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline font-medium">Clear</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="glass-button flex items-center gap-1.5 px-3 py-1.5 text-[12px]"
          >
            <Settings className="w-3 h-3" />
            <span className="hidden sm:inline font-medium">Settings</span>
          </button>
        </div>
      </div>
    </header>

      {/* Name Prompt Modal */}
      {showNamePrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-strong w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-popup-in">
            <div className="p-5 flex flex-col items-center text-center">
              <h2 className="text-lg font-semibold mb-2">Name your project</h2>
              <p className="text-sm text-[var(--color-secondary)] mb-6">
                You're about to leave your new project. Give it a name to easily find it later.
              </p>
              
              <form onSubmit={handlePromptSubmit} className="w-full">
                <input
                  type="text"
                  value={promptName}
                  onChange={(e) => setPromptName(e.target.value)}
                  className="w-full bg-[var(--color-input)] text-[var(--color-primary)] font-medium px-4 py-2 rounded-full border border-[var(--color-line-focus)] outline-none mb-6 text-center text-[13px]"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="submit"
                  className="w-full glass-button py-2 text-[12px] font-medium rounded-full"
                >
                  Save & Exit
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
