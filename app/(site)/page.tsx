import Link from 'next/link';

function Cube({ size }: { size: number }) {
  const h = size / 2;
  const face: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    border: '1px solid rgba(109,40,217,0.20)',
    background: 'rgba(109,40,217,0.03)',
  };
  const faces: React.CSSProperties[] = [
    { transform: `translateZ(${h}px)` },
    { transform: `rotateY(180deg) translateZ(${h}px)` },
    { transform: `rotateY(-90deg) translateZ(${h}px)` },
    { transform: `rotateY(90deg) translateZ(${h}px)` },
    { transform: `rotateX(90deg) translateZ(${h}px)` },
    { transform: `rotateX(-90deg) translateZ(${h}px)` },
  ];
  return (
    <div style={{ perspective: 900 }}>
      <div style={{
        width: size,
        height: size,
        transformStyle: 'preserve-3d',
        animation: 'spin 14s linear infinite',
        position: 'relative',
      }}>
        {faces.map((f, i) => <div key={i} style={{ ...face, ...f }} />)}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotateX(20deg) rotateY(0deg); }
          to   { transform: rotateX(20deg) rotateY(360deg); }
        }
        @keyframes in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: none; }
        }
        .in-1 { animation: in 0.7s ease both 0.0s; }
        .in-2 { animation: in 0.7s ease both 0.1s; }
        .in-3 { animation: in 0.7s ease both 0.2s; }
      `}</style>

      <main className="h-screen w-full bg-white flex flex-col overflow-hidden" style={{
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}>

        {/* Nav */}
        <nav className="flex items-center justify-between px-10 h-16 shrink-0">
          <span className="text-base font-semibold text-gray-900 tracking-tight">
            Chorus<span className="text-violet-600">.</span>
          </span>
          <Link
            href="/agents"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Go to app →
          </Link>
        </nav>

        {/* Hero */}
        <div className="flex-1 flex items-center justify-between px-10 lg:px-20 gap-16">

          {/* Text */}
          <div className="max-w-lg">
            <h1 className="in-1 text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight mb-4">
              Orchestrate<br />with precision.
            </h1>
            <p className="in-2 text-base text-gray-400 mb-8">
              Agent pipelines, behavioral contracts,<br />full observability. All in one place.
            </p>
            <Link
              href="/agents"
              className="in-3 inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Open the app →
            </Link>
          </div>

          {/* Cube */}
          <div className="hidden lg:flex items-center justify-center flex-1">
            <Cube size={180} />
          </div>

        </div>

        {/* Footer */}
        <div className="px-10 pb-6 flex items-center justify-between">
          <span className="text-xs text-gray-300">© 2026 Chorus</span>
        </div>

      </main>
    </>
  );
}
