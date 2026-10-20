// Small stroke icon set shared by the shell and building blocks.
const iconPaths = {
  menu: "M4 7h16M4 12h16M4 17h16",
  back: "M15 5l-7 7 7 7",
  close: "M6 6l12 12M18 6L6 18",
  chevron: "M6 9l6 6 6-6",
  star: "M12 3.6l2.55 5.17 5.7.83-4.13 4.02.98 5.68L12 16.62l-5.1 2.68.98-5.68L3.75 9.6l5.7-.83z",
  next: "M9 5l7 7-7 7",
  plus: "M12 5v14M5 12h14",
  list: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  chart: "M5 20V11M11 20V5M17 20v-6M3 20h18",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  user: "M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8zM4.5 21a7.5 7.5 0 0 1 15 0",
  users: "M9 11a4 4 0 1 0 0-8a4 4 0 0 0 0 8zM2.5 21a6.5 6.5 0 0 1 13 0M16 3.6a4 4 0 0 1 0 7.3M18 14.5a6.5 6.5 0 0 1 3.5 6.5",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  gauge: "M12 14l4-4M3.5 15a8.5 8.5 0 1 1 17 0",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  check: "M5 12.5l4.5 4.5L19 7",
  arrow: "M7 17L17 7M8 7h9v9",
  register: "M9 3h6v3H9zM9 4.5H6V21h12V4.5h-3M12 10.5v6M9 13.5h6",
  history: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7v5l3 2",
  letter: "M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6",
  chat: "M4 5h16v11H9l-5 4zM8 9h8M8 12h5",
  map: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14",
};
export type IconName = keyof typeof iconPaths;
export function Icon({ name, size = 22, filled = false }: { name: IconName; size?: number; filled?: boolean }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={name === "star" ? 1.5 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[name]} /></svg>;
}
