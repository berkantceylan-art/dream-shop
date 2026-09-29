// Dream Shop'un kendi simgesi: yıldız kesimli kristal.
export default function Crystal({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 80 100" className={className} aria-hidden>
      <defs>
        <linearGradient id="cg-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb3e6" />
          <stop offset="1" stopColor="#c24dff" />
        </linearGradient>
        <linearGradient id="cg-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff8ad8" />
          <stop offset="1" stopColor="#7a1fb8" />
        </linearGradient>
      </defs>
      {/* üst yarı */}
      <polygon points="40,0 58,34 40,50 22,34" fill="url(#cg-a)" />
      <polygon points="40,0 58,34 40,50" fill="url(#cg-b)" opacity=".55" />
      {/* yan uçlar */}
      <polygon points="0,50 22,34 40,50 22,66" fill="url(#cg-a)" />
      <polygon points="80,50 58,34 40,50 58,66" fill="url(#cg-b)" />
      {/* alt yarı */}
      <polygon points="40,100 58,66 40,50 22,66" fill="url(#cg-b)" />
      <polygon points="40,100 22,66 40,50" fill="url(#cg-a)" opacity=".6" />
      {/* parıltı */}
      <polygon points="36,14 40,6 44,14 40,22" fill="#fff" opacity=".85" />
    </svg>
  );
}
