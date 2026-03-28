import { create } from 'zustand';

type OverlayMode = 'none' | 'heatmap' | 'coverage';

interface UIStore {
  // Overlay toggles (mutually exclusive)
  activeOverlay: OverlayMode;
  setOverlay: (mode: OverlayMode) => void;
  toggleOverlay: (mode: OverlayMode) => void;

  // SOP viewer
  sopViewerOpen: boolean;
  activeSectionId: string | null;
  setSopViewerOpen: (open: boolean) => void;
  setActiveSectionId: (id: string | null) => void;
  highlightedNodeIds: string[];
  setHighlightedNodeIds: (ids: string[]) => void;

  // Edge selection for context waterfall
  selectedEdgeId: string | null;
  setSelectedEdgeId: (id: string | null) => void;

  // Execution replay
  replayMode: boolean;
  replayIndex: number;
  replayPlaying: boolean;
  replaySpeed: number;
  setReplayMode: (on: boolean) => void;
  setReplayIndex: (idx: number) => void;
  setReplayPlaying: (playing: boolean) => void;
  setReplaySpeed: (speed: number) => void;

  // Contract suggestion tooltip
  tooltipNodeId: string | null;
  setTooltipNodeId: (id: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeOverlay: 'none',
  setOverlay: (mode) => set({ activeOverlay: mode }),
  toggleOverlay: (mode) =>
    set((s) => ({ activeOverlay: s.activeOverlay === mode ? 'none' : mode })),

  sopViewerOpen: false,
  activeSectionId: null,
  setSopViewerOpen: (open) => set({ sopViewerOpen: open }),
  setActiveSectionId: (id) => set({ activeSectionId: id }),
  highlightedNodeIds: [],
  setHighlightedNodeIds: (ids) => set({ highlightedNodeIds: ids }),

  selectedEdgeId: null,
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id }),

  replayMode: false,
  replayIndex: 0,
  replayPlaying: false,
  replaySpeed: 1,
  setReplayMode: (on) => set({ replayMode: on, replayIndex: 0, replayPlaying: false }),
  setReplayIndex: (idx) => set({ replayIndex: idx }),
  setReplayPlaying: (playing) => set({ replayPlaying: playing }),
  setReplaySpeed: (speed) => set({ replaySpeed: speed }),

  tooltipNodeId: null,
  setTooltipNodeId: (id) => set({ tooltipNodeId: id }),
}));
