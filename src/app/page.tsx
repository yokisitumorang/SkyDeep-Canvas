import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-6 text-center max-w-lg">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100">
          <svg
            className="w-8 h-8 text-indigo-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <path d="M10 6.5h4" />
            <path d="M6.5 10v4" />
            <path d="M17.5 10v4" />
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            C4 Diagramming Platform
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            A local-first, browser-based platform for creating and exploring C4
            architecture diagrams. Design your system architecture visually and
            save it as a single file.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full sm:flex-row sm:justify-center">
          <Link
            href="/canvas"
            className="text-sm font-semibold text-white px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm text-center transition-colors"
          >
            Open Canvas
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mt-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-blue-300" />
            System
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-green-300" />
            Container
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-purple-300" />
            Component
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-slate-300" />
            Code
          </div>
        </div>
      </div>
    </div>
  );
}
