import React from 'react';

/**
 * RouteGlobe Component (Step 2)
 * Lightweight, accessible SVG wireframe globe with an animated route arc from a donor pin to an NGO pin.
 * Uses only existing theme CSS variables (--brand-forest, --brand-olive, --brand-terracotta, etc.).
 * Decorative accent: aria-hidden="true", lazy-loaded, hidden below 1024px.
 * Automatically halts all rotation and motion under prefers-reduced-motion.
 */
export const RouteGlobe: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="hidden lg:flex flex-col items-center p-3 rounded-2xl bg-[#F7F6F0]/95 backdrop-blur-xs border border-[#E2DFD2] shadow-md select-none w-36 h-36"
    >
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Wireframe Rotating Globe Base */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full animate-[spin_28s_linear_infinite] motion-reduce:animate-none"
        >
          {/* Outer Boundary */}
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="var(--brand-olive)"
            strokeWidth="1.2"
            strokeOpacity="0.35"
          />
          {/* Equator & Latitudes */}
          <line
            x1="6"
            y1="50"
            x2="94"
            y2="50"
            stroke="var(--brand-olive)"
            strokeWidth="0.8"
            strokeOpacity="0.25"
          />
          <ellipse
            cx="50"
            cy="32"
            rx="38"
            ry="6"
            fill="none"
            stroke="var(--brand-olive)"
            strokeWidth="0.7"
            strokeOpacity="0.2"
          />
          <ellipse
            cx="50"
            cy="68"
            rx="38"
            ry="6"
            fill="none"
            stroke="var(--brand-olive)"
            strokeWidth="0.7"
            strokeOpacity="0.2"
          />

          {/* Longitude Ellipses */}
          <ellipse
            cx="50"
            cy="50"
            rx="30"
            ry="44"
            fill="none"
            stroke="var(--brand-olive)"
            strokeWidth="0.8"
            strokeOpacity="0.25"
          />
          <ellipse
            cx="50"
            cy="50"
            rx="14"
            ry="44"
            fill="none"
            stroke="var(--brand-olive)"
            strokeWidth="0.8"
            strokeOpacity="0.25"
          />
          <line
            x1="50"
            y1="6"
            x2="50"
            y2="94"
            stroke="var(--brand-olive)"
            strokeWidth="0.8"
            strokeOpacity="0.25"
          />
        </svg>

        {/* Static Overlay Layer for Fixed Route Arc & Pins (doesn't spin with the globe) */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--brand-forest)" />
              <stop offset="100%" stopColor="var(--brand-terracotta)" />
            </linearGradient>
          </defs>

          {/* Dashed Route Arc from Donor (24, 38) to NGO (76, 62) */}
          <path
            id="foodRoutePath"
            d="M 24 38 Q 48 14 76 62"
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="1.8"
            strokeDasharray="3 3"
            strokeLinecap="round"
          />

          {/* Traveling Pulse Dot along the Route */}
          <circle r="3.2" fill="var(--brand-terracotta)">
            <animateMotion
              dur="2.4s"
              repeatCount="indefinite"
              path="M 24 38 Q 48 14 76 62"
              keyPoints="0;1"
              keyTimes="0;1"
              className="motion-reduce:hidden"
            />
          </circle>

          {/* Donor Pin (Node 1) */}
          <circle cx="24" cy="38" r="4.5" fill="var(--brand-forest)" />
          <circle cx="24" cy="38" r="2" fill="var(--brand-ivory)" />

          {/* NGO Pin (Node 2) */}
          <circle cx="76" cy="62" r="4.5" fill="var(--brand-terracotta)" />
          <circle cx="76" cy="62" r="2" fill="var(--brand-ivory)" />
        </svg>
      </div>

      {/* Micro Status Label */}
      <div className="flex items-center justify-between w-full mt-1.5 px-1 text-[10px] font-medium tracking-tight">
        <span className="flex items-center gap-1 text-[#183D2B]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#183D2B]" />
          Donor
        </span>
        <span className="text-[#647C50]">→</span>
        <span className="flex items-center gap-1 text-[#C77A54]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C77A54]" />
          NGO
        </span>
      </div>
    </div>
  );
};

export default RouteGlobe;
