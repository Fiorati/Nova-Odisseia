/**
 * Emblemas ilustrativos em SVG inline (placeholders funcionais).
 *
 * Estes ícones seguem o conceito visual descrito no guia "Nova Odisseia 2.0"
 * (brasão de Ítaka, Cavalo de Tróia, Spartacus, Tio Patinhas, Bússola Nórdica).
 * Servem como substitutos leves e funcionais até que a arte final em alta
 * resolução (SVG/PNG) produzida pela equipe de design seja anexada aos
 * mesmos locais — basta trocar o `<svg>` pelo `<img src="...">` do arquivo
 * final quando ele estiver disponível.
 */

export function ItakaEmblem({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="30" stroke="#00d47e" strokeWidth="2.5" fill="#002b1d" />
      <circle cx="32" cy="32" r="24" stroke="#d4af37" strokeWidth="1.2" opacity="0.8" />
      <path d="M22 40 L22 26 Q22 18 32 18 Q42 18 42 26 L42 40 L36 36 L32 40 L28 36 Z" fill="#d4af37" />
      <path d="M32 20 L35 30 L30 30 Z" fill="#00d47e" />
    </svg>
  );
}

export function TrojanHorseEmblem({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#3a2a17" stroke="#00d47e" strokeWidth="2" />
      <circle cx="32" cy="32" r="25" stroke="#00d47e" strokeWidth="0.75" opacity="0.5" />
      <path
        d="M18 42 L24 30 L22 24 L26 26 L30 20 L33 26 L38 22 L36 30 L46 34 L40 36 L42 42 L36 40 L34 44 L30 40 L26 44 L24 40 Z"
        fill="none"
        stroke="#00d47e"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SpartacusEmblem({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M32 6 L52 14 V32 Q52 48 32 58 Q12 48 12 32 V14 Z" fill="#1e252b" stroke="#00d47e" strokeWidth="2" />
      <path d="M20 20 L44 44 M44 20 L20 44" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="18" r="4" fill="#00d47e" />
    </svg>
  );
}

export function TioPatinhasTrophy({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <ellipse cx="32" cy="52" rx="14" ry="4" fill="#d4af37" opacity="0.5" />
      <path d="M22 20 H42 V28 Q42 40 32 40 Q22 40 22 28 Z" fill="#d4af37" stroke="#8a6d1c" strokeWidth="1" />
      <path d="M22 22 Q12 22 14 30 Q16 36 22 34" fill="none" stroke="#d4af37" strokeWidth="2" />
      <path d="M42 22 Q52 22 50 30 Q48 36 42 34" fill="none" stroke="#d4af37" strokeWidth="2" />
      <rect x="29" y="40" width="6" height="8" fill="#d4af37" />
      <path d="M20 48 H44 L41 54 H23 Z" fill="#00d47e" />
    </svg>
  );
}

export function LaurelTop1({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M14 32 Q10 18 20 8" stroke="#d4af37" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M50 32 Q54 18 44 8" stroke="#d4af37" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="30" r="16" fill="#002b1d" stroke="#d4af37" strokeWidth="2" />
      <text x="32" y="37" textAnchor="middle" fontSize="18" fontWeight="700" fill="#d4af37" fontFamily="ui-monospace, monospace">1</text>
    </svg>
  );
}

export function NordicCompassEmblem({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="28" stroke="#00d47e" strokeWidth="2" fill="#0b1f16" />
      <circle cx="32" cy="32" r="20" stroke="#00d47e" strokeWidth="0.6" opacity="0.5" />
      <path d="M32 12 L36 30 L32 34 L28 30 Z" fill="#00d47e" />
      <path d="M32 52 L28 34 L32 30 L36 34 Z" fill="#d4af37" opacity="0.85" />
      <circle cx="32" cy="32" r="2.4" fill="#f4f6f8" />
    </svg>
  );
}

export function ItakaDailySeal({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="#d4af37" stroke="#8a6d1c" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="21" fill="none" stroke="#002b1d" strokeWidth="1.2" />
      <path d="M32 18 L36 30 L32 34 L28 30 Z" fill="#002b1d" />
    </svg>
  );
}
