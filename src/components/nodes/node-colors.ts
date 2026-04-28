/**
 * Color configuration for custom node colors.
 * Maps color names to Tailwind class sets.
 */

export interface NodeColorClasses {
  bg: string;
  ring: string;
  ringSelected: string;
  icon: string;
  badge: string;
  badgeBg: string;
  badgeRing: string;
  handle: string;
  resizerLine: string;
  resizerHandle: string;
}

const COLOR_MAP: Record<string, NodeColorClasses> = {
  blue: {
    bg: 'bg-blue-50', ring: 'ring-blue-300', ringSelected: 'ring-blue-500',
    icon: 'text-blue-500', badge: 'text-blue-700', badgeBg: 'bg-blue-100', badgeRing: 'ring-blue-200',
    handle: '!bg-blue-400', resizerLine: '!border-blue-400', resizerHandle: '!bg-blue-500 !w-2.5 !h-2.5 !border-white !border-2 !rounded-sm',
  },
  green: {
    bg: 'bg-green-50', ring: 'ring-green-300', ringSelected: 'ring-green-500',
    icon: 'text-green-500', badge: 'text-green-700', badgeBg: 'bg-green-100', badgeRing: 'ring-green-200',
    handle: '!bg-green-400', resizerLine: '!border-green-400', resizerHandle: '!bg-green-500 !w-2.5 !h-2.5 !border-white !border-2 !rounded-sm',
  },
  purple: {
    bg: 'bg-purple-50', ring: 'ring-purple-300', ringSelected: 'ring-purple-500',
    icon: 'text-purple-500', badge: 'text-purple-700', badgeBg: 'bg-purple-100', badgeRing: 'ring-purple-200',
    handle: '!bg-purple-400', resizerLine: '!border-purple-400', resizerHandle: '!bg-purple-500 !w-2.5 !h-2.5 !border-white !border-2 !rounded-sm',
  },
  red: {
    bg: 'bg-red-50', ring: 'ring-red-300', ringSelected: 'ring-red-500',
    icon: 'text-red-500', badge: 'text-red-700', badgeBg: 'bg-red-100', badgeRing: 'ring-red-200',
    handle: '!bg-red-400', resizerLine: '!border-red-400', resizerHandle: '!bg-red-500 !w-2.5 !h-2.5 !border-white !border-2 !rounded-sm',
  },
  amber: {
    bg: 'bg-amber-50', ring: 'ring-amber-300', ringSelected: 'ring-amber-500',
    icon: 'text-amber-500', badge: 'text-amber-700', badgeBg: 'bg-amber-100', badgeRing: 'ring-amber-200',
    handle: '!bg-amber-400', resizerLine: '!border-amber-400', resizerHandle: '!bg-amber-500 !w-2.5 !h-2.5 !border-white !border-2 !rounded-sm',
  },
  cyan: {
    bg: 'bg-cyan-50', ring: 'ring-cyan-300', ringSelected: 'ring-cyan-500',
    icon: 'text-cyan-500', badge: 'text-cyan-700', badgeBg: 'bg-cyan-100', badgeRing: 'ring-cyan-200',
    handle: '!bg-cyan-400', resizerLine: '!border-cyan-400', resizerHandle: '!bg-cyan-500 !w-2.5 !h-2.5 !border-white !border-2 !rounded-sm',
  },
  pink: {
    bg: 'bg-pink-50', ring: 'ring-pink-300', ringSelected: 'ring-pink-500',
    icon: 'text-pink-500', badge: 'text-pink-700', badgeBg: 'bg-pink-100', badgeRing: 'ring-pink-200',
    handle: '!bg-pink-400', resizerLine: '!border-pink-400', resizerHandle: '!bg-pink-500 !w-2.5 !h-2.5 !border-white !border-2 !rounded-sm',
  },
  slate: {
    bg: 'bg-slate-50', ring: 'ring-slate-300', ringSelected: 'ring-slate-500',
    icon: 'text-slate-500', badge: 'text-slate-700', badgeBg: 'bg-slate-100', badgeRing: 'ring-slate-200',
    handle: '!bg-slate-400', resizerLine: '!border-slate-400', resizerHandle: '!bg-slate-500 !w-2.5 !h-2.5 !border-white !border-2 !rounded-sm',
  },
};

/** Default colors per C4 type */
const TYPE_DEFAULTS: Record<string, string> = {
  system: 'blue',
  container: 'green',
  component: 'purple',
  code: 'slate',
};

/**
 * Returns the color classes for a node, using customColor if set,
 * otherwise falling back to the C4 type default.
 */
export function getNodeColors(c4Type: string, customColor?: string): NodeColorClasses {
  const colorKey = customColor ?? TYPE_DEFAULTS[c4Type] ?? 'slate';
  return COLOR_MAP[colorKey] ?? COLOR_MAP.slate;
}

/** Returns the inline font-family style for a node based on its font setting. */
export function getNodeFontStyle(font?: 'default' | 'virgil'): React.CSSProperties {
  if (font === 'default') {
    return { fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' };
  }
  // 'virgil' is the default for canvas nodes (set via .react-flow__node CSS)
  return {};
}
