'use client';

import { useCallback } from 'react';
import { X, FileText, ChevronRight, Link2 } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import type { BaseNodeData } from '@/lib/types';
import { cn } from '@/lib/cn';

interface SOPSection {
  id: string;
  title: string;
  content: string;
  linkedNodeIds: string[];
}

interface Props {
  sopName: string;
  sections: SOPSection[];
}

export default function SOPViewerPanel({ sopName, sections }: Props) {
  const sopViewerOpen = useUIStore((s) => s.sopViewerOpen);
  const setSopViewerOpen = useUIStore((s) => s.setSopViewerOpen);
  const activeSectionId = useUIStore((s) => s.activeSectionId);
  const setActiveSectionId = useUIStore((s) => s.setActiveSectionId);
  const setHighlightedNodeIds = useUIStore((s) => s.setHighlightedNodeIds);
  const nodes = useWorkflowStore((s) => s.nodes);

  const handleSectionHover = useCallback((section: SOPSection) => {
    setActiveSectionId(section.id);
    setHighlightedNodeIds(section.linkedNodeIds);
  }, [setActiveSectionId, setHighlightedNodeIds]);

  const handleSectionLeave = useCallback(() => {
    setActiveSectionId(null);
    setHighlightedNodeIds([]);
  }, [setActiveSectionId, setHighlightedNodeIds]);

  if (!sopViewerOpen) return null;

  // Find which sections are linked from graph nodes
  const linkedSectionIds = new Set<string>();
  for (const node of nodes) {
    const data = node.data as unknown as BaseNodeData;
    if (data?.sopReference?.sectionId) {
      linkedSectionIds.add(data.sopReference.sectionId);
    }
  }

  return (
    <div className="absolute top-0 left-0 bottom-0 w-[380px] z-20 flex flex-col bg-white border-r border-gray-200 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-bg-subtle">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-violet-500 flex-shrink-0" />
          <span className="text-sm font-medium text-text truncate">{sopName}</span>
        </div>
        <button
          onClick={() => setSopViewerOpen(false)}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-sand-200 text-text-subtle hover:text-text transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto">
        {sections.map((section) => {
          const isActive = activeSectionId === section.id;
          const isLinked = linkedSectionIds.has(section.id);

          return (
            <div
              key={section.id}
              onMouseEnter={() => handleSectionHover(section)}
              onMouseLeave={handleSectionLeave}
              className={cn(
                'px-4 py-3 border-b border-gray-200/50 transition-colors cursor-default',
                isActive && 'bg-violet-50',
                !isActive && 'hover:bg-bg-subtle',
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="text-xs font-semibold text-text">{section.title}</h3>
                {isLinked && (
                  <Link2 className="w-3 h-3 text-sand-500 flex-shrink-0" />
                )}
                {section.linkedNodeIds.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-sand-200 text-sand-700 font-mono">
                    {section.linkedNodeIds.length} node{section.linkedNodeIds.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted leading-relaxed line-clamp-4">
                {section.content}
              </p>
              {isActive && section.linkedNodeIds.length > 0 && (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-violet-500">
                  <ChevronRight className="w-3 h-3" />
                  <span>Highlighting {section.linkedNodeIds.length} linked node{section.linkedNodeIds.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div className="px-4 py-2 border-t border-gray-200 bg-bg-subtle flex items-center justify-between text-[10px] text-text-subtle">
        <span>{sections.length} sections</span>
        <span>{linkedSectionIds.size} linked to graph</span>
      </div>
    </div>
  );
}
