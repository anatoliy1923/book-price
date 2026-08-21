interface SkeletonProps {
  count?: number;
}

function SkeletonLine({ width, height = 16 }: { width: string; height?: number }) {
  return (
    <div
      style={{
        width,
        height,
        background: '#E8E8ED',
        borderRadius: '4px',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}

export default function Skeleton({ count = 3 }: SkeletonProps) {
  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: '#F5F5F7',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
          }}
        >
          <SkeletonLine width="60%" height={18} />
          <div style={{ marginTop: '8px' }}>
            <SkeletonLine width="35%" height={13} />
          </div>
          <div
            style={{
              height: '1px',
              background: '#D2D2D7',
              margin: '16px 0',
            }}
          />
          {[80, 65, 72, 58].map((w, j) => (
            <div
              key={j}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 0',
              }}
            >
              <SkeletonLine width="80px" height={14} />
              <SkeletonLine width={`${w}px`} height={16} />
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
