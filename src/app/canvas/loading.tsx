export default function CanvasLoading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <svg
          className="h-8 w-8 animate-spin text-indigo-600"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="text-sm font-medium text-slate-700">
          Loading canvas…
        </p>
      </div>
    </div>
  );
}
