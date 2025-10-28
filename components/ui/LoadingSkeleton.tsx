// components/ui/LoadingSkeleton.tsx
// Skeleton de carga profesional para usar en toda la app

interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'dashboard' | 'table';
  rows?: number;
}

export default function LoadingSkeleton({ type = 'card', rows = 3 }: LoadingSkeletonProps) {
  
  // Dashboard completo
  if (type === 'dashboard') {
    return (
      <div className="animate-pulse space-y-6 p-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-8 bg-slate-700/50 rounded w-48"></div>
          <div className="h-10 bg-slate-700/50 rounded w-32"></div>
        </div>
        
        {/* KPI Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-lg p-6 space-y-3">
              <div className="h-4 bg-slate-700/50 rounded w-24"></div>
              <div className="h-8 bg-slate-700/50 rounded w-16"></div>
              <div className="h-3 bg-slate-700/50 rounded w-32"></div>
            </div>
          ))}
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-6 space-y-4">
              <div className="h-6 bg-slate-700/50 rounded w-40"></div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4 p-4 bg-slate-700/30 rounded">
                  <div className="h-12 w-12 bg-slate-700/50 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-700/50 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-700/50 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar content */}
          <div className="space-y-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-6 space-y-4">
              <div className="h-6 bg-slate-700/50 rounded w-32"></div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-slate-700/50 rounded w-full"></div>
                  <div className="h-3 bg-slate-700/50 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Card skeleton
  if (type === 'card') {
    return (
      <div className="animate-pulse bg-slate-800/60 border border-slate-700 rounded-lg p-6 space-y-4">
        <div className="h-4 bg-slate-700/50 rounded w-3/4"></div>
        <div className="h-4 bg-slate-700/50 rounded w-1/2"></div>
        <div className="h-4 bg-slate-700/50 rounded w-5/6"></div>
      </div>
    );
  }

  // List skeleton
  if (type === 'list') {
    return (
      <div className="animate-pulse space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-slate-800/60 border border-slate-700 rounded-lg">
            <div className="h-10 w-10 bg-slate-700/50 rounded-full flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-700/50 rounded w-3/4"></div>
              <div className="h-3 bg-slate-700/50 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Table skeleton
  if (type === 'table') {
    return (
      <div className="animate-pulse overflow-hidden rounded-lg border border-slate-700">
        {/* Header */}
        <div className="bg-slate-800/60 p-4 border-b border-slate-700 flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 bg-slate-700/50 rounded flex-1"></div>
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="bg-slate-900/40 p-4 border-b border-slate-700/50 flex gap-4">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-4 bg-slate-700/50 rounded flex-1"></div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// Skeleton más simple para componentes pequeños
export function SkeletonLine({ width = 'w-full' }: { width?: string }) {
  return <div className={`animate-pulse h-4 bg-slate-700/50 rounded ${width}`}></div>;
}

export function SkeletonCircle({ size = 'h-10 w-10' }: { size?: string }) {
  return <div className={`animate-pulse bg-slate-700/50 rounded-full ${size}`}></div>;
}

export function SkeletonButton() {
  return <div className="animate-pulse h-10 bg-slate-700/50 rounded-md w-32"></div>;
}
