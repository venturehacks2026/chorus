'use client';

export default function EdgeMarkerDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {/* Default: filled triangle */}
        <marker id="arrow-filled" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="#A68B6B" />
        </marker>
        {/* Decision true: filled circle */}
        <marker id="arrow-circle" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <circle cx="5" cy="5" r="4" fill="#6B8E6B" />
        </marker>
        {/* Decision false: open triangle */}
        <marker id="arrow-open" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="#B86B6B" strokeWidth="1.5" />
        </marker>
        {/* Error: X mark */}
        <marker id="arrow-x" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <line x1="2" y1="2" x2="8" y2="8" stroke="#B86B6B" strokeWidth="2" />
          <line x1="8" y1="2" x2="2" y2="8" stroke="#B86B6B" strokeWidth="2" />
        </marker>
        {/* Handoff: person silhouette */}
        <marker id="arrow-person" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
          <circle cx="6" cy="4" r="2" fill="#9E8B9E" />
          <path d="M 2 11 Q 2 7 6 7 Q 10 7 10 11" fill="#9E8B9E" />
        </marker>
        {/* Skill binding: hexagon */}
        <marker id="arrow-hex" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
          <polygon points="6,1 11,3.5 11,8.5 6,11 1,8.5 1,3.5" fill="#7A9E8E" />
        </marker>
      </defs>
    </svg>
  );
}
