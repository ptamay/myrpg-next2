import React from "react";

interface CelestialIconProps {
  blocoId: number;
}

export default function CelestialIcon({ blocoId }: CelestialIconProps) {
  switch (blocoId) {
    case 1:
      return (
        <svg viewBox="0 0 100 100" className="hero-celestial-icon sun-diffuse">
          <circle cx="50" cy="50" r="30" fill="url(#diffuseGlow)" opacity="0.4" />
          <circle cx="50" cy="50" r="16" fill="url(#sunGoldGradient)" />
          <path d="M50 8 L50 20 M50 80 L50 92 M8 50 L20 50 M80 50 L92 50 M20 20 L29 29 M71 71 L80 80 M20 80 L29 71 M71 29 L80 20" stroke="#f5e1a4" strokeWidth="3" strokeLinecap="round" opacity="0.6" strokeDasharray="2 3" />
          <defs>
            <radialGradient id="diffuseGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f5e1a4" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <radialGradient id="sunGoldGradient" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#f5e1a4" />
              <stop offset="100%" stopColor="#e0b868" />
            </radialGradient>
          </defs>
        </svg>
      );
    case 2:
      return (
        <svg viewBox="0 0 100 100" className="hero-celestial-icon sun-strong">
          <circle cx="50" cy="50" r="35" fill="url(#strongGlow)" opacity="0.3" />
          <circle cx="50" cy="50" r="18" fill="url(#sunZeniteGradient)" />
          <path d="M50 6 L50 22 M50 78 L50 94 M6 50 L22 50 M78 50 L94 50 M19 19 L30 30 M70 70 L81 81 M19 80 L30 70 M70 30 L81 19" stroke="#ffc300" strokeWidth="4.5" strokeLinecap="round" />
          <defs>
            <radialGradient id="strongGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffc300" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <radialGradient id="sunZeniteGradient" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#ffea75" />
              <stop offset="80%" stopColor="#ffc300" />
              <stop offset="100%" stopColor="#e69500" />
            </radialGradient>
          </defs>
        </svg>
      );
    case 3:
      return (
        <svg viewBox="0 0 100 100" className="hero-celestial-icon sun-clouds">
          <circle cx="50" cy="42" r="18" fill="url(#sunCrepusculoGradient)" />
          <path d="M50 14 L50 24 M18 42 L28 42 M82 42 L72 42 M27 20 L35 28 M73 20 L65 28" stroke="#bf6b2c" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          <path d="M20 70 C20 62, 32 60, 36 64 C42 56, 58 56, 64 64 C70 58, 82 60, 82 68 C84 74, 16 74, 20 70 Z" fill="url(#cloudGradient)" opacity="0.85" />
          <path d="M10 75 C10 68, 25 66, 30 70 C38 62, 62 62, 70 70 C75 66, 90 68, 90 75 C90 80, 10 80, 10 75 Z" fill="url(#cloudDarkGradient)" opacity="0.95" />
          <defs>
            <radialGradient id="sunCrepusculoGradient" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ffe2a3" />
              <stop offset="60%" stopColor="#bf6b2c" />
              <stop offset="100%" stopColor="#8a3e14" />
            </radialGradient>
            <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6e432a" />
              <stop offset="100%" stopColor="#2b1a13" />
            </linearGradient>
            <linearGradient id="cloudDarkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3d2114" />
              <stop offset="100%" stopColor="#140a06" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 4:
      return (
        <svg viewBox="0 0 100 100" className="hero-celestial-icon moon-crescent">
          <circle cx="50" cy="50" r="30" fill="url(#moonGlowMagenta)" opacity="0.2" />
          <path d="M50 20 A30 30 0 1 0 80 50 A24 24 0 1 1 50 20 Z" fill="url(#moonMagentaGradient)" />
          <circle cx="28" cy="35" r="1" fill="#fff" opacity="0.7" />
          <circle cx="68" cy="22" r="1.5" fill="#fff" opacity="0.5" />
          <defs>
            <radialGradient id="moonGlowMagenta" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#cc33ff" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <radialGradient id="moonMagentaGradient" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#ecb3ff" />
              <stop offset="100%" stopColor="#cc33ff" />
            </radialGradient>
          </defs>
        </svg>
      );
    case 5:
      return (
        <svg viewBox="0 0 100 100" className="hero-celestial-icon moon-full">
          <circle cx="50" cy="50" r="32" fill="url(#moonGlowCobalt)" opacity="0.25" />
          <circle cx="50" cy="50" r="22" fill="url(#moonCobaltGradient)" />
          <circle cx="42" cy="40" r="4" fill="#004ca3" opacity="0.15" />
          <circle cx="58" cy="48" r="3" fill="#004ca3" opacity="0.15" />
          <circle cx="48" cy="62" r="5" fill="#004ca3" opacity="0.12" />
          <defs>
            <radialGradient id="moonGlowCobalt" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0066cc" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <radialGradient id="moonCobaltGradient" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#9cd4ff" />
              <stop offset="85%" stopColor="#0066cc" />
              <stop offset="100%" stopColor="#003c80" />
            </radialGradient>
          </defs>
        </svg>
      );
    case 6:
      return (
        <svg viewBox="0 0 100 100" className="hero-celestial-icon moon-waning">
          <circle cx="50" cy="50" r="30" fill="url(#moonGlowLavender)" opacity="0.2" />
          <path d="M50 20 A30 30 0 1 0 80 50 A24 24 0 1 1 50 20 Z" fill="url(#moonLavenderGradient)" transform="scale(-1, 1) translate(-100, 0)" />
          <circle cx="32" cy="25" r="1.5" fill="#fff" opacity="0.6" />
          <circle cx="72" cy="38" r="1" fill="#fff" opacity="0.8" />
          <defs>
            <radialGradient id="moonGlowLavender" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#9966ff" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <radialGradient id="moonLavenderGradient" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#e0d4ff" />
              <stop offset="100%" stopColor="#9966ff" />
            </radialGradient>
          </defs>
        </svg>
      );
    default:
      return null;
  }
}
