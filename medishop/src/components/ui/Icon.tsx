// ============================================================
// src/components/ui/Icon.tsx
// SVG icon set for the whole app — single source of truth.
// All icons are 24×24 viewBox, stroke-based.
// ============================================================

import React from "react";

export type IconName =
  | "lock" | "sell" | "stock" | "expiry" | "alert"
  | "sales" | "reports" | "customers" | "suppliers" | "settings"
  | "arrow" | "arrow-left" | "check" | "x" | "trash" | "edit"
  | "plus" | "minus" | "search" | "scan" | "cash" | "upi"
  | "credit" | "strip" | "tablet" | "warning" | "info"
  | "receipt" | "share" | "download" | "refresh" | "tag";

const PATHS: Record<IconName, React.ReactNode> = {
  lock:        <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  sell:        <><path d="M4 7h16l-1 13H5L4 7Z" /><path d="M8 7a4 4 0 0 1 8 0M12 11v5M9.5 13.5h5" /></>,
  stock:       <><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
  expiry:      <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16M8 14h.01M12 14h.01M16 14h.01" /></>,
  alert:       <><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4M12 17h.01" /></>,
  sales:       <><path d="M4 19V5M4 19h16M8 16v-5M12 16V7M16 16v-8" /></>,
  reports:     <><path d="M5 3h10l4 4v14H5V3Z" /><path d="M15 3v5h5M8 13h8M8 17h6" /></>,
  customers:   <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20M17 10a3 3 0 0 1 0 5.8M17 14h1a3.5 3.5 0 0 1 3.5 3.5V20" /></>,
  suppliers:   <><path d="M4 21V8l8-5 8 5v13M8 21v-6h8v6M8 10h.01M12 10h.01M16 10h.01" /></>,
  settings:    <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.3 2.3-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56v.1h-3.06v-.1a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.3-2.3.06-.06A1.7 1.7 0 0 0 6.6 15a1.7 1.7 0 0 0-1.56-1.03h-.1v-3.06h.1A1.7 1.7 0 0 0 6.6 9.88 1.7 1.7 0 0 0 6.26 8l-.06-.06 2.3-2.3.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56v-.1h3.06v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.3 2.3-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.1v3.06h-.1A1.7 1.7 0 0 0 19.4 15Z" /></>,
  arrow:       <path d="M5 12h14M13 6l6 6-6 6" />,
  "arrow-left":<path d="M19 12H5M11 6l-6 6 6 6" />,
  check:       <path d="M20 6 9 17l-5-5" />,
  x:           <path d="M18 6 6 18M6 6l12 12" />,
  trash:       <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></>,
  edit:        <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" /></>,
  plus:        <path d="M12 5v14M5 12h14" />,
  minus:       <path d="M5 12h14" />,
  search:      <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /></>,
  scan:        <><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="3" y1="12" x2="21" y2="12" /></>,
  cash:        <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></>,
  upi:         <><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" /><path d="M9 7l3 3 3-3" /></>,
  credit:      <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  strip:       <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h2v4H7zM11 10h2v4h-2zM15 10h2v4h-2z" /></>,
  tablet:      <><circle cx="12" cy="12" r="8" /><path d="m8.5 15.5 7-7" /></>,
  warning:     <><path d="M12 9v4M12 17h.01" /><path d="m10.29 3.86-8 13.85A1 1 0 0 0 3.15 19.5h17.7a1 1 0 0 0 .86-1.79l-8-13.85a1 1 0 0 0-1.72 0Z" /></>,
  info:        <><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>,
  receipt:     <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M8 10h8M8 14h4" /></>,
  share:       <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" /></>,
  download:    <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></>,
  refresh:     <><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16M21 8v5h-5M3 16v-5h5" /></>,
  tag:         <><path d="M12.59 2H6a2 2 0 0 0-2 2v6.59a2 2 0 0 0 .59 1.42l8.41 8.41a2 2 0 0 0 2.83 0l6.17-6.17a2 2 0 0 0 0-2.83Z" /><circle cx="8" cy="8" r="1.5" /></>,
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export default function Icon({ name, size = 22, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
