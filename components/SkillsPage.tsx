'use client';

import { Puzzle, Upload, Plug, FileCode } from 'lucide-react';
import { cn } from '@/lib/cn';

const SKILL_CATEGORIES = [
  { icon: Plug, label: 'Connectors', description: 'Import from registered connector integrations', count: 0, color: 'bg-blue-50 text-blue-600' },
  { icon: FileCode, label: 'API Specs', description: 'Upload OpenAPI / Swagger specs to auto-create skills', count: 0, color: 'bg-emerald-50 text-emerald-600' },
  { icon: Puzzle, label: 'Custom Skills', description: 'Manually define agent capabilities', count: 0, color: 'bg-violet-50 text-violet-600' },
];

export default function SkillsPage() {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="shrink-0 px-8 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Skills</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Agent capabilities from connectors, API specs, and custom definitions. Drag onto graphs to create SkillNodes.
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
            <Upload className="w-4 h-4" />
            Import Skill
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="grid grid-cols-3 gap-4 mt-4">
          {SKILL_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.label}
                className="flex flex-col items-center gap-3 px-6 py-8 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', cat.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
                  {cat.label}
                </h3>
                <p className="text-xs text-gray-400 text-center leading-relaxed">{cat.description}</p>
                <span className="text-[11px] text-gray-400 font-medium">{cat.count} skills</span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
            <Puzzle className="w-5 h-5 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">No skills imported yet</p>
          <p className="text-xs text-gray-400">Upload an OpenAPI spec or scan your connectors to get started</p>
        </div>
      </div>
    </div>
  );
}
