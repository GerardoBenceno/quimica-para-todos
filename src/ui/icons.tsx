// Íconos de interfaz en trazo lineal; heredan el color con currentColor.
type P = { size?: number; className?: string }

export const CheckIcon = ({ size = 20, className }: P) => (
  <svg className={className} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
    <polyline points="4,10.5 8.5,15 16,5.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
export const CrossIcon = ({ size = 20, className }: P) => (
  <svg className={className} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
    <path d="M5 5 L15 15 M15 5 L5 15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
)
export const LockIcon = ({ size = 20, className }: P) => (
  <svg className={className} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
    <rect x="4.5" y="9" width="11" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M7 9 V6.5 a3 3 0 0 1 6 0 V9" fill="none" stroke="currentColor" strokeWidth="1.8" />
  </svg>
)
export const BackIcon = ({ size = 24, className }: P) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <polyline points="15,5 8,12 15,19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
export const ChestIcon = ({ size = 20, className }: P) => (
  <svg className={className} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
    <rect x="3" y="6" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3 10 H17 M8.5 10 v2 h3 v-2" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
)
export const CoinIcon = ({ size = 16, className }: P) => (
  <svg className={`coin-icon ${className ?? ''}`} width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <circle className="coin-ring" cx="8" cy="8" r="6.5" fill="none" strokeWidth="1.6" />
    <circle className="coin-core" cx="8" cy="8" r="3" />
  </svg>
)
export const LearnIcon = ({ size = 26, className }: P) => (
  <svg className={className} width={size} height={size} viewBox="0 0 32 24" aria-hidden="true">
    <polyline points="3,18 11,8 19,18 27,8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
    <circle cx="27" cy="8" r="3" fill="currentColor" />
  </svg>
)
export const ReviewIcon = ({ size = 24, className }: P) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12 a7 7 0 1 0 2.2 -5.1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <polyline points="5,4 5,8.5 9.5,8.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
export const ProfileIcon = ({ size = 24, className }: P) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8.5" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M4.5 20 a7.5 7.5 0 0 1 15 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)
export const RewardsIcon = ({ size = 24, className }: P) => <ChestIcon size={size} className={className} />
