import React from 'react';

interface CourtEmblemProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showSubtitle?: boolean;
  showText?: boolean;
}

/**
 * Official Posbakum Pengadilan Agama Banjarmasin Circular Logo Icon
 * (profesional - adil - terpercaya)
 */
export const PaBjmLogoIcon: React.FC<{ className?: string; sizeClass?: string }> = ({
  className = '',
  sizeClass = 'w-12 h-12',
}) => {
  return (
    <div className={`relative flex-shrink-0 flex items-center justify-center ${sizeClass} ${className}`}>
      <svg
        viewBox="0 0 500 500"
        className="w-full h-full drop-shadow-md select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Top text arc: POSBAKUM PENGADILAN AGAMA BANJARMASIN */}
          <path
            id="posbakum-top-arc"
            d="M 62,250 A 188,188 0 1,1 438,250"
            fill="none"
          />
          {/* Bottom text arc: profesional - adil - terpercaya */}
          <path
            id="posbakum-bottom-arc"
            d="M 92,300 A 180,180 0 0,0 408,300"
            fill="none"
          />

          {/* Gradients */}
          <linearGradient id="posbakum-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#15803D" />
            <stop offset="35%" stopColor="#22C55E" />
            <stop offset="65%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>

          <linearGradient id="posbakum-green-swoosh" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14532D" />
            <stop offset="50%" stopColor="#15803D" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>

          <linearGradient id="posbakum-gold-swoosh" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>

          <linearGradient id="posbakum-gold-light" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="100%" stopColor="#FACC15" />
          </linearGradient>

          <filter id="posbakum-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* 1. Base White Disc Canvas */}
        <circle cx="250" cy="250" r="240" fill="#FFFFFF" />

        {/* 2. Outer Gradient Circular Ring */}
        <circle
          cx="250"
          cy="250"
          r="236"
          fill="none"
          stroke="url(#posbakum-ring-grad)"
          strokeWidth="9.5"
        />

        {/* 3. Top Arching Text: POSBAKUM PENGADILAN AGAMA BANJARMASIN */}
        <text
          fill="#0F2815"
          fontSize="24"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
          letterSpacing="2.2"
        >
          <textPath
            href="#posbakum-top-arc"
            startOffset="50%"
            textAnchor="middle"
          >
            POSBAKUM PENGADILAN AGAMA BANJARMASIN
          </textPath>
        </text>

        {/* 4. Bottom Arching Text: profesional - adil - terpercaya */}
        <text
          fill="#14532D"
          fontSize="22"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
          letterSpacing="1.8"
        >
          <textPath
            href="#posbakum-bottom-arc"
            startOffset="50%"
            textAnchor="middle"
          >
            profesional - adil - terpercaya
          </textPath>
        </text>

        {/* 5. Inner Decorative Wave Swooshes (Green & Gold) */}
        {/* Left/Upper Green Swoosh */}
        <path
          d="M 135,260 C 130,165 210,120 295,115 C 235,128 175,170 170,250 C 166,310 200,345 240,360 C 180,345 138,315 135,260 Z"
          fill="url(#posbakum-green-swoosh)"
          opacity="0.95"
        />

        {/* Right/Upper Golden Swoosh */}
        <path
          d="M 210,140 C 290,120 370,165 375,255 C 370,185 315,145 245,138 C 230,137 218,138 210,140 Z"
          fill="url(#posbakum-gold-swoosh)"
          opacity="0.9"
        />
        <path
          d="M 375,255 C 375,320 325,365 255,370 C 315,355 355,315 355,255 C 355,210 325,175 285,160 C 335,180 375,215 375,255 Z"
          fill="url(#posbakum-green-swoosh)"
          opacity="0.85"
        />

        {/* 6. Central Emblem: Timbangan Keadilan (Scales of Justice) */}
        <g id="scales-of-justice" transform="translate(250, 242)">
          {/* Main Central Pillar */}
          <path
            d="M -3.5, -60 L 3.5, -60 L 4.5, 45 L -4.5, 45 Z"
            fill="#15803D"
            stroke="#CA8A04"
            strokeWidth="1.2"
          />

          {/* Central Top Finial / Spire */}
          <circle cx="0" cy="-62" r="6" fill="url(#posbakum-gold-light)" stroke="#CA8A04" strokeWidth="1.5" />
          <path d="M 0,-74 L 3,-64 L -3,-64 Z" fill="#CA8A04" />
          <circle cx="0" cy="-62" r="3" fill="#15803D" />

          {/* Horizontal Balance Beam (Curved Arch) */}
          <path
            d="M -75,-48 C -40,-60 40,-60 75,-48 C 76,-46 72,-43 65,-45 C 35,-54 -35,-54 -65,-45 C -72,-43 -76,-46 -75,-48 Z"
            fill="url(#posbakum-gold-light)"
            stroke="#CA8A04"
            strokeWidth="1.2"
          />
          <path
            d="M -75,-48 C -40,-58 40,-58 75,-48 L 72,-42 C 38,-51 -38,-51 -72,-42 Z"
            fill="#15803D"
          />

          {/* Center Joint Ring */}
          <circle cx="0" cy="-52" r="7.5" fill="url(#posbakum-gold-light)" stroke="#CA8A04" strokeWidth="1.5" />
          <circle cx="0" cy="-52" r="3.5" fill="#15803D" />

          {/* LEFT SCALE PAN */}
          <g transform="translate(-62, -45)">
            {/* 3 Suspension Cords */}
            <line x1="0" y1="0" x2="-26" y2="46" stroke="#15803D" strokeWidth="1.8" />
            <line x1="0" y1="0" x2="0" y2="47" stroke="#CA8A04" strokeWidth="1.5" />
            <line x1="0" y1="0" x2="26" y2="46" stroke="#15803D" strokeWidth="1.8" />

            {/* Left Pan Dish */}
            <path
              d="M -28,46 C -20,64 20,64 28,46 Z"
              fill="#15803D"
              stroke="#CA8A04"
              strokeWidth="1.5"
            />
            {/* Pan Rim */}
            <ellipse cx="0" cy="46" rx="28" ry="4.5" fill="url(#posbakum-gold-light)" stroke="#CA8A04" strokeWidth="1.2" />
          </g>

          {/* RIGHT SCALE PAN */}
          <g transform="translate(62, -45)">
            {/* 3 Suspension Cords */}
            <line x1="0" y1="0" x2="-26" y2="46" stroke="#15803D" strokeWidth="1.8" />
            <line x1="0" y1="0" x2="0" y2="47" stroke="#CA8A04" strokeWidth="1.5" />
            <line x1="0" y1="0" x2="26" y2="46" stroke="#15803D" strokeWidth="1.8" />

            {/* Right Pan Dish */}
            <path
              d="M -28,46 C -20,64 20,64 28,46 Z"
              fill="#15803D"
              stroke="#CA8A04"
              strokeWidth="1.5"
            />
            {/* Pan Rim */}
            <ellipse cx="0" cy="46" rx="28" ry="4.5" fill="url(#posbakum-gold-light)" stroke="#CA8A04" strokeWidth="1.2" />
          </g>
        </g>

        {/* 7. Bottom Open Law Book (Kitab Terbuka) */}
        <g id="open-law-book" transform="translate(250, 310)">
          {/* Outer Cover Trim (Gold) */}
          <path
            d="M 0,28 C -35,16 -85,18 -92,34 L -92,44 C -85,28 -35,26 0,38 C 35,26 85,28 92,44 L 92,34 C 85,18 35,16 0,28 Z"
            fill="url(#posbakum-gold-light)"
            stroke="#CA8A04"
            strokeWidth="1.2"
          />

          {/* Book Pages Layer (Deep Green & White Pages) */}
          {/* Left Page Base */}
          <path
            d="M 0, -18 C -35,-32 -82,-30 -88,-16 L -88, 28 C -82,14 -35,12 0, 24 Z"
            fill="#15803D"
            stroke="#0F5132"
            strokeWidth="1.5"
          />
          {/* Left Page Inner (White Sheet) */}
          <path
            d="M -3, -15 C -34,-27 -76,-25 -82,-12 L -82, 24 C -76,11 -34,9 -3, 20 Z"
            fill="#FFFFFF"
            stroke="#15803D"
            strokeWidth="1"
          />
          {/* Left Page Lines */}
          <path d="M -15,-8 C -35,-16 -65,-15 -74,-7" stroke="#15803D" strokeWidth="1.2" fill="none" opacity="0.6" />
          <path d="M -15,0 C -35,-8 -65,-7 -74,1" stroke="#15803D" strokeWidth="1.2" fill="none" opacity="0.6" />
          <path d="M -15,8 C -35,0 -65,1 -74,9" stroke="#15803D" strokeWidth="1.2" fill="none" opacity="0.6" />

          {/* Right Page Base */}
          <path
            d="M 0, -18 C 35,-32 82,-30 88,-16 L 88, 28 C 82,14 35,12 0, 24 Z"
            fill="#15803D"
            stroke="#0F5132"
            strokeWidth="1.5"
          />
          {/* Right Page Inner (White Sheet) */}
          <path
            d="M 3, -15 C 34,-27 76,-25 82,-12 L 82, 24 C 76,11 34,9 3, 20 Z"
            fill="#FFFFFF"
            stroke="#15803D"
            strokeWidth="1"
          />
          {/* Right Page Lines */}
          <path d="M 15,-8 C 35,-16 65,-15 74,-7" stroke="#15803D" strokeWidth="1.2" fill="none" opacity="0.6" />
          <path d="M 15,0 C 35,-8 65,-7 74,1" stroke="#15803D" strokeWidth="1.2" fill="none" opacity="0.6" />
          <path d="M 15,8 C 35,0 65,1 74,9" stroke="#15803D" strokeWidth="1.2" fill="none" opacity="0.6" />

          {/* Center Spine Crease */}
          <line x1="0" y1="-20" x2="0" y2="26" stroke="#CA8A04" strokeWidth="2.5" />

          {/* Gold Bookmark Ribbon */}
          <path
            d="M -4,24 L -6,44 L 0,38 L 6,44 L 4,24 Z"
            fill="url(#posbakum-gold-light)"
            stroke="#CA8A04"
            strokeWidth="1"
          />
        </g>
      </svg>
    </div>
  );
};

export const CourtEmblem: React.FC<CourtEmblemProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  showText = true,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
    '2xl': 'w-28 h-28',
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official Posbakum Circular Logo */}
      <PaBjmLogoIcon sizeClass={sizeClasses} />

      {showText && (
        <div className="text-left">
          <h1 className="text-sm md:text-base font-black text-slate-900 leading-tight">
            POS BANTUAN HUKUM (POSBAKUM)
          </h1>
          {showSubtitle && (
            <p className="text-[11px] md:text-xs font-semibold text-emerald-700">
              Sistem Buku Tamu Digital
            </p>
          )}
        </div>
      )}
    </div>
  );
};


