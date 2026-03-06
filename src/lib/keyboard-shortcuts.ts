export interface ShortcutGroup {
  title: string;
  shortcuts: Array<{ keys: string[]; description: string }>;
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: ["Ctrl", "Z"], description: "Undo" },
      { keys: ["Ctrl", "Shift", "Z"], description: "Redo" },
      { keys: ["Ctrl", "D"], description: "Duplicate selected" },
      { keys: ["Delete"], description: "Delete selected" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
  {
    title: "Tools",
    shortcuts: [
      { keys: ["V"], description: "Select tool" },
      { keys: ["G"], description: "Translate (move)" },
      { keys: ["R"], description: "Rotate" },
      { keys: ["S"], description: "Scale" },
    ],
  },
  {
    title: "Camera",
    shortcuts: [
      { keys: ["Home"], description: "Reset camera view" },
      { keys: ["F"], description: "Zoom to fit all objects" },
      { keys: ["Scroll"], description: "Zoom in/out" },
      { keys: ["Middle drag"], description: "Pan" },
      { keys: ["Left drag"], description: "Orbit" },
    ],
  },
  {
    title: "Selection",
    shortcuts: [
      { keys: ["Click"], description: "Select object" },
      { keys: ["Shift", "Click"], description: "Multi-select" },
      { keys: ["Escape"], description: "Deselect all" },
    ],
  },
];
