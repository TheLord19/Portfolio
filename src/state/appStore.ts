import { create } from 'zustand';

// The seam between the 3D layer (world/*) and anything outside it that
// needs to react to scene state — see PLAN.md §3. The old `Phase` state
// machine ('boot'|'room'|'approaching'|'transition'|'os') belonged to the
// dropped desk/monitor/fake-OS concept and is gone: there's no approach
// beat and no window system left to gate. What's left is the state a
// free-roam scene with floating content panels actually needs.
export type PanelId = 'about' | 'projects' | 'resume' | 'contact';

interface AppState {
  // Which panel (if any) the visitor has clicked into a focused/expanded
  // view of. `ContentPanels` reads this to grow a panel and mute the
  // others; `null` means "just orbiting the scene, nothing focused."
  focusedPanel: PanelId | null;
  // Ambient sound (wind/river) is off by default — autoplay-audio is bad
  // UX and most browsers block it before a user gesture anyway. Kept here
  // rather than local component state so any future control (e.g. a
  // mute button outside the Canvas) can read/flip it without prop drilling.
  audioEnabled: boolean;
  setFocusedPanel: (panel: PanelId | null) => void;
  setAudioEnabled: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  focusedPanel: null,
  audioEnabled: false,
  setFocusedPanel: (focusedPanel) => set({ focusedPanel }),
  setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
}));
