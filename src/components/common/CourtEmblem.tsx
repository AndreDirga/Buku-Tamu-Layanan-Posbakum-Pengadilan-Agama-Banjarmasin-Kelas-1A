import React from 'react';

interface CourtEmblemProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showSubtitle?: boolean;
  showText?: boolean;
}

/**
 * Official Pengadilan Agama Banjarmasin Oval Emblem Logo
 */
export const PaBjmLogoIcon: React.FC<{ className?: string; sizeClass?: string }> = ({
  className = '',
  sizeClass = 'w-12 h-14',
}) => {
  return (
    <div className={`relative flex-shrink-0 flex items-center justify-center ${sizeClass} ${className}`}>
      <svg
        viewBox="0 0 450 520"
        className="w-full h-full drop-shadow-md select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Curve path for curved text around upper and sides of the oval */}
          <path
            id="pabjm-text-arc"
            d="M 68,340 A 165,195 0 1,1 382,340"
            fill="none"
          />
          {/* Gradients */}
          <linearGradient id="pabjm-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF176" />
            <stop offset="50%" stopColor="#FBC02D" />
            <stop offset="100%" stopColor="#F57F17" />
          </linearGradient>
          <linearGradient id="pabjm-green-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00A651" />
            <stop offset="100%" stopColor="#00843D" />
          </linearGradient>
          <filter id="pabjm-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* 1. Main Green Oval Canvas */}
        <ellipse
          cx="225"
          cy="260"
          rx="210"
          ry="248"
          fill="url(#pabjm-green-grad)"
          stroke="#FACC15"
          strokeWidth="9"
        />

        {/* 2. Inner Golden Border Guide */}
        <ellipse
          cx="225"
          cy="260"
          rx="184"
          ry="220"
          fill="none"
          stroke="#FDE047"
          strokeWidth="3.5"
        />

        {/* 3. Arching Text: PENGADILAN AGAMA BANJARMASIN */}
        <text
          fill="#FFF952"
          stroke="#713F12"
          strokeWidth="1.2"
          fontSize="27"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="4.5"
          filter="url(#pabjm-shadow)"
        >
          <textPath
            href="#pabjm-text-arc"
            startOffset="50%"
            textAnchor="middle"
          >
            PENGADILAN AGAMA BANJARMASIN
          </textPath>
        </text>

        {/* 4. Golden 8-Pointed Starburst / Cakra Surya Motif */}
        <g transform="translate(225, 230)">
          {/* Flame Petals / Sunburst rays */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <g key={i} transform={`rotate(${angle})`}>
              <path
                d="M 0,-85 C -25,-60 -18,-45 -48,-48 C -30,-25 -38,-10 0,0 C 38,-10 30,-25 48,-48 C 18,-45 25,-60 0,-85 Z"
                fill="url(#pabjm-gold-grad)"
                stroke="#CA8A04"
                strokeWidth="1.5"
              />
              <path
                d="M 0,-78 C -14,-56 -10,-40 -35,-42 C -20,-20 -25,-8 0,0"
                fill="#FEF08A"
                opacity="0.6"
              />
            </g>
          ))}

          {/* Sunburst Inner Golden Ring */}
          <circle cx="0" cy="0" r="54" fill="#FEF08A" stroke="#CA8A04" strokeWidth="2.5" />
          <circle cx="0" cy="0" r="48" fill="#15803D" stroke="#CA8A04" strokeWidth="2" />

          {/* Central Pancasila Shield */}
          {/* Quadrant 1: Top-Left (Red - Kepala Banteng) */}
          <path
            d="M 0,0 L -46,0 A 46,46 0 0,1 0,-46 Z"
            fill="#DC2626"
          />
          {/* Quadrant 2: Top-Right (White - Pohon Beringin) */}
          <path
            d="M 0,0 L 0,-46 A 46,46 0 0,1 46,0 Z"
            fill="#FFFFFF"
          />
          {/* Quadrant 3: Bottom-Left (White - Padi & Kapas) */}
          <path
            d="M 0,0 L -46,0 A 46,46 0 0,0 0,46 Z"
            fill="#FFFFFF"
          />
          {/* Quadrant 4: Bottom-Right (Red - Rantai) */}
          <path
            d="M 0,0 L 0,46 A 46,46 0 0,0 46,0 Z"
            fill="#DC2626"
          />

          {/* Dividing cross line */}
          <line x1="-46" y1="0" x2="46" y2="0" stroke="#1E293B" strokeWidth="2.5" />
          <line x1="0" y1="-46" x2="0" y2="46" stroke="#1E293B" strokeWidth="2.5" />

          {/* Top-Left: Banteng Head */}
          <g transform="translate(-22, -22) scale(0.65)">
            <path
              d="M -16,-12 C -8,-18 0,-6 0,-2 C 0,-6 8,-18 16,-12 C 12,-4 8,4 8,10 C 8,16 0,20 0,20 C 0,20 -8,16 -8,10 C -8,4 -12,-4 -16,-12 Z"
              fill="#0F172A"
            />
            {/* Horns */}
            <path
              d="M -16,-12 C -22,-24 -6,-22 -2,-10 M 16,-12 C 22,-24 6,-22 2,-10"
              stroke="#0F172A"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* Top-Right: Pohon Beringin */}
          <g transform="translate(22, -22) scale(0.65)">
            <path
              d="M 0,18 L 0,2 M -4,18 L -2,4 M 4,18 L 2,4"
              stroke="#451A03"
              strokeWidth="2.5"
            />
            <circle cx="0" cy="-6" r="14" fill="#14532D" />
            <circle cx="-9" cy="-2" r="9" fill="#166534" />
            <circle cx="9" cy="-2" r="9" fill="#166534" />
            <circle cx="0" cy="-14" r="8" fill="#15803D" />
          </g>

          {/* Bottom-Left: Padi dan Kapas */}
          <g transform="translate(-22, 22) scale(0.6)">
            {/* Rice branch (yellow) */}
            <path d="M 4,-16 C -6,-10 -10,0 -8,16" stroke="#EAB308" strokeWidth="2" fill="none" />
            <ellipse cx="-4" cy="-12" rx="3" ry="1.5" fill="#FACC15" transform="rotate(-30)" />
            <ellipse cx="-8" cy="-5" rx="3" ry="1.5" fill="#FACC15" transform="rotate(-20)" />
            <ellipse cx="-9" cy="4" rx="3" ry="1.5" fill="#FACC15" transform="rotate(-10)" />
            {/* Cotton branch (white/green) */}
            <path d="M -4,-16 C 6,-10 10,0 8,16" stroke="#16A34A" strokeWidth="2" fill="none" />
            <circle cx="5" cy="-8" r="3" fill="#FFFFFF" stroke="#16A34A" strokeWidth="1" />
            <circle cx="8" cy="1" r="3" fill="#FFFFFF" stroke="#16A34A" strokeWidth="1" />
            <circle cx="6" cy="10" r="3" fill="#FFFFFF" stroke="#16A34A" strokeWidth="1" />
          </g>

          {/* Bottom-Right: Rantai Emas (Golden Chain) */}
          <g transform="translate(22, 22) scale(0.6)">
            <path
              d="M -12,-8 C -4,-14 10,-12 14,-4 C 18,4 12,14 4,16 C -4,18 -14,10 -14,2"
              stroke="#FACC15"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="4 3"
              fill="none"
            />
          </g>

          {/* Central Black Pentagon Shield with Golden Star */}
          <polygon
            points="0,-18 16,-6 10,16 -10,16 -16,-6"
            fill="#0F172A"
            stroke="#FACC15"
            strokeWidth="1.5"
          />
          {/* Star at center */}
          <polygon
            points="0,-12 3,-3 11,-3 5,2 7,10 0,6 -7,10 -5,2 -11,-3 -3,-3"
            fill="#FACC15"
          />
        </g>

        {/* 5. Golden Ribbon Banner: "DHARMMAYUKTI" */}
        <g transform="translate(225, 375)">
          {/* Ribbon tails */}
          <path
            d="M -105,10 L -120,28 L -90,24 Z M 105,10 L 120,28 L 90,24 Z"
            fill="#CA8A04"
          />
          {/* Ribbon body */}
          <path
            d="M -100,-4 C -50,14 50,14 100,-4 L 92,22 C 46,36 -46,36 -92,22 Z"
            fill="url(#pabjm-gold-grad)"
            stroke="#A16207"
            strokeWidth="1.5"
            filter="url(#pabjm-shadow)"
          />
          <text
            x="0"
            y="17"
            fill="#064E3B"
            fontSize="14.5"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
            letterSpacing="2.5"
            textAnchor="middle"
          >
            DHARMMAYUKTI
          </text>
        </g>

        {/* 6. Golden Floral Wreath Garland (Under Banner) */}
        <g transform="translate(225, 418)">
          {/* Arching stem curve */}
          <path
            d="M -130,-30 C -120,45 120,45 130,-30"
            stroke="#FDE047"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          
          {/* Left Wreath Florets / Leaves */}
          {[-120, -100, -80, -60, -40, -20].map((x, i) => {
            const y = Math.sin((i / 5) * Math.PI) * 28;
            return (
              <g key={`l-${i}`} transform={`translate(${x}, ${y})`}>
                <circle cx="0" cy="0" r="5.5" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1.2" />
                <circle cx="0" cy="-6" r="3.5" fill="#FACC15" />
                <circle cx="-5" cy="3" r="3.5" fill="#FACC15" />
                <circle cx="5" cy="3" r="3.5" fill="#FACC15" />
              </g>
            );
          })}

          {/* Right Wreath Florets / Leaves */}
          {[20, 40, 60, 80, 100, 120].map((x, i) => {
            const y = Math.sin(((5 - i) / 5) * Math.PI) * 28;
            return (
              <g key={`r-${i}`} transform={`translate(${x}, ${y})`}>
                <circle cx="0" cy="0" r="5.5" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1.2" />
                <circle cx="0" cy="-6" r="3.5" fill="#FACC15" />
                <circle cx="-5" cy="3" r="3.5" fill="#FACC15" />
                <circle cx="5" cy="3" r="3.5" fill="#FACC15" />
              </g>
            );
          })}

          {/* Center Bow / Tie */}
          <g transform="translate(0, 30)">
            <ellipse cx="0" cy="0" rx="6" ry="5" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1.5" />
            <path d="M -5,4 C -12,12 -8,18 -4,15 M 5,4 C 12,12 8,18 4,15" stroke="#FDE047" strokeWidth="2.5" fill="none" />
          </g>
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
    sm: 'w-8 h-9.5',
    md: 'w-11 h-13',
    lg: 'w-16 h-19',
    xl: 'w-20 h-24',
    '2xl': 'w-28 h-33',
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official Court Logo */}
      <PaBjmLogoIcon sizeClass={sizeClasses} />

      {showText && (
        <div className="text-left">
          <div className="text-[10px] md:text-xs font-bold tracking-wider text-emerald-800 uppercase flex items-center gap-1">
            <span>MAHKAMAH AGUNG REPUBLIK INDONESIA</span>
          </div>
          <h1 className="text-sm md:text-base font-extrabold text-slate-900 leading-tight">
            PENGADILAN AGAMA BANJARMASIN KELAS 1A
          </h1>
          {showSubtitle && (
            <p className="text-[11px] md:text-xs font-semibold text-emerald-700">
              Pos Bantuan Hukum (POSBAKUM)
            </p>
          )}
        </div>
      )}
    </div>
  );
};

