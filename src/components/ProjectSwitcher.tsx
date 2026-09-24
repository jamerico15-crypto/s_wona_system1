import { useState, useRef, useEffect } from 'react';
import { ChevronDown, FolderKanban, Check } from 'lucide-react';
import type { Project } from '@/contexts/ProjectContext';

interface ProjectSwitcherProps {
  projects: Project[];
  activeProject: Project | null;
  onSelect: (project: Project) => void;
}

export default function ProjectSwitcher({ projects, activeProject, onSelect }: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:bg-slate-100"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
          <FolderKanban className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-400">Projeto Ativo</p>
          <p className="truncate text-sm font-semibold text-slate-700">
            {activeProject ? activeProject.nome : 'Selecionar...'}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-scale-in">
          {projects.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">Nenhum projeto disponível</div>
          ) : (
            <div className="max-h-64 overflow-y-auto py-1">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    onSelect(project);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-slate-50 ${
                    activeProject?.id === project.id ? 'bg-slate-50' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{project.nome}</p>
                    {project.descricao && (
                      <p className="truncate text-xs text-slate-400">{project.descricao}</p>
                    )}
                  </div>
                  {activeProject?.id === project.id && (
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
