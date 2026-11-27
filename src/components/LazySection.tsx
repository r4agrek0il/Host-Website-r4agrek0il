import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';

interface LazySectionProps {
  children: ReactNode;
  /** Placeholder height so layout does not jump while loading. */
  minHeight: string;
  label: string;
  /** Section id the placeholder carries so nav anchors still resolve. */
  anchorId?: string;
  /** How far ahead of the viewport to start mounting. */
  rootMargin?: string;
}

function SectionPlaceholder({
  minHeight,
  label,
  anchorId,
}: {
  minHeight: string;
  label: string;
  anchorId?: string;
}) {
  return (
    <div
      id={anchorId}
      aria-busy="true"
      aria-label={`Loading ${label}`}
      style={{ minHeight }}
      className="relative mx-auto flex w-full max-w-7xl items-center justify-center px-4 py-16 sm:px-6"
    >
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-[#00F0FF]/15 bg-[#04071A]/60">
        <span className="animate-pulse font-mono text-xs uppercase tracking-[0.3em] text-[#00F0FF]/60">
          Loading {label}…
        </span>
      </div>
    </div>
  );
}

/**
 * Mounts heavy children only once they approach the viewport, and wraps them
 * in Suspense so React.lazy chunks show a same-height neon placeholder.
 */
export default function LazySection({
  children,
  minHeight,
  label,
  anchorId,
  rootMargin = '600px 0px',
}: LazySectionProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(
    () => typeof window === 'undefined' || !('IntersectionObserver' in window)
  );

  useEffect(() => {
    if (visible || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  const placeholder = <SectionPlaceholder minHeight={minHeight} label={label} anchorId={anchorId} />;

  return (
    <div ref={ref}>
      {visible ? <Suspense fallback={<SectionPlaceholder minHeight={minHeight} label={label} />}>{children}</Suspense> : placeholder}
    </div>
  );
}
