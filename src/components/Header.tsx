import { Trash2, Settings, Sun, Moon } from 'lucide-react';
import logo from '../assets/sublogo.png';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onOpenSettings: () => void;
  onClearCanvas: () => void;
}

export default function Header({ onOpenSettings, onClearCanvas }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <header className="absolute top-3 left-3 right-3 z-50 flex items-center">
      <div className="glass-strong w-full flex items-center px-2 py-1.5 rounded-2xl">
        {/* Left: Logo */}
        <div className="flex items-center pl-4">
          <img
            src={logo}
            alt="Loom"
            className="h-9 w-auto transition-[filter] duration-300"
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
  );
}
