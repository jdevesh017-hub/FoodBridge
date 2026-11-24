import React from 'react';

export type EmptyStateVariant =
  | 'donor-donations'
  | 'donor-history'
  | 'ngo-discover'
  | 'ngo-reservations'
  | 'ngo-deliveries'
  | 'volunteer-tasks'
  | 'volunteer-active'
  | 'volunteer-history';

export interface EmptyStateProps {
  variant: EmptyStateVariant;
  title: string;
  description: string;
  actionText?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

/**
 * Clean, inline SVG illustrations matching the FoodBridge design system.
 * Uses only existing brand colors (#183D2B, #647C50, #C77A54, #E8EDE2, #F7F6F0).
 */
const EmptyIllustration: React.FC<{ variant: EmptyStateVariant }> = ({ variant }) => {
  switch (variant) {
    case 'donor-donations':
      // Crate with wholesome meals & fresh produce
      return (
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="mx-auto"
        >
          <circle cx="40" cy="40" r="36" fill="#F7F6F0" stroke="#E2DFD2" strokeWidth="2" />
          {/* Crate Box */}
          <rect x="20" y="38" width="40" height="24" rx="3" fill="#E8EDE2" stroke="#183D2B" strokeWidth="2.5" />
          <line x1="20" y1="48" x2="60" y2="48" stroke="#183D2B" strokeWidth="2" strokeDasharray="3 3" />
          <line x1="30" y1="38" x2="30" y2="62" stroke="#647C50" strokeWidth="1.5" />
          <line x1="50" y1="38" x2="50" y2="62" stroke="#647C50" strokeWidth="1.5" />
          {/* Fresh Vegetables / Bread sticking out */}
          <path d="M28 38C28 30 35 25 38 38" fill="#647C50" stroke="#183D2B" strokeWidth="2" />
          <path d="M42 38C42 27 52 27 52 38" fill="#C77A54" stroke="#183D2B" strokeWidth="2" />
          <circle cx="34" cy="27" r="3" fill="#C77A54" />
        </svg>
      );

    case 'donor-history':
    case 'volunteer-history':
      // Verified Impact Certificate & Ribbon Badge
      return (
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="mx-auto"
        >
          <circle cx="40" cy="40" r="36" fill="#F7F6F0" stroke="#E2DFD2" strokeWidth="2" />
          {/* Document Sheet */}
          <rect x="25" y="20" width="30" height="40" rx="3" fill="#FFFFFF" stroke="#183D2B" strokeWidth="2.5" />
          <line x1="31" y1="28" x2="49" y2="28" stroke="#647C50" strokeWidth="2" strokeLinecap="round" />
          <line x1="31" y1="34" x2="45" y2="34" stroke="#E2DFD2" strokeWidth="2" strokeLinecap="round" />
          <line x1="31" y1="40" x2="47" y2="40" stroke="#E2DFD2" strokeWidth="2" strokeLinecap="round" />
          {/* Verified Seal Badge */}
          <circle cx="46" cy="48" r="9" fill="#183D2B" />
          <circle cx="46" cy="48" r="6" fill="#C77A54" />
          <path d="M44 48l1.5 1.5 3-3" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'ngo-discover':
      // Map Compass & Fresh Surplus Dish
      return (
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="mx-auto"
        >
          <circle cx="40" cy="40" r="36" fill="#F7F6F0" stroke="#E2DFD2" strokeWidth="2" />
          {/* Dining Plate */}
          <circle cx="38" cy="42" r="18" fill="#E8EDE2" stroke="#183D2B" strokeWidth="2" />
          <circle cx="38" cy="42" r="12" fill="#FFFFFF" stroke="#647C50" strokeWidth="1.5" />
          {/* Search Lens Pin */}
          <circle cx="48" cy="32" r="10" fill="#FFFFFF" stroke="#C77A54" strokeWidth="2.5" />
          <line x1="55" y1="39" x2="62" y2="46" stroke="#C77A54" strokeWidth="3" strokeLinecap="round" />
          <circle cx="48" cy="32" r="4" fill="#183D2B" />
        </svg>
      );

    case 'ngo-reservations':
      // Holding Pantry Shelf with Scheduled Clock
      return (
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="mx-auto"
        >
          <circle cx="40" cy="40" r="36" fill="#F7F6F0" stroke="#E2DFD2" strokeWidth="2" />
          {/* Pantry Shelf */}
          <rect x="22" y="46" width="36" height="4" rx="1.5" fill="#183D2B" />
          {/* Reserved Food Cloche / Jar */}
          <path d="M26 46v-8a6 6 0 0112 0v8H26z" fill="#E8EDE2" stroke="#183D2B" strokeWidth="2" />
          <circle cx="32" cy="34" r="1.5" fill="#C77A54" />
          {/* Reservation Schedule Clock */}
          <circle cx="48" cy="32" r="10" fill="#FFFFFF" stroke="#647C50" strokeWidth="2" />
          <path d="M48 27v5l3 2" stroke="#183D2B" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'ngo-deliveries':
    case 'volunteer-active':
      // Courier Cargo Transport En Route
      return (
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="mx-auto"
        >
          <circle cx="40" cy="40" r="36" fill="#F7F6F0" stroke="#E2DFD2" strokeWidth="2" />
          {/* Delivery Van Body */}
          <rect x="22" y="32" width="24" height="18" rx="2" fill="#183D2B" stroke="#183D2B" strokeWidth="2" />
          <path d="M46 38h9l5 6v6H46V38z" fill="#647C50" stroke="#183D2B" strokeWidth="2" />
          {/* Wheels */}
          <circle cx="30" cy="50" r="4" fill="#FFFFFF" stroke="#252923" strokeWidth="2.5" />
          <circle cx="53" cy="50" r="4" fill="#FFFFFF" stroke="#252923" strokeWidth="2.5" />
          {/* Wind / Motion Dashes */}
          <line x1="16" y1="36" x2="20" y2="36" stroke="#C77A54" strokeWidth="2" strokeLinecap="round" />
          <line x1="14" y1="42" x2="19" y2="42" stroke="#C77A54" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'volunteer-tasks':
    default:
      // Dispatch Route Waypoints Map
      return (
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="mx-auto"
        >
          <circle cx="40" cy="40" r="36" fill="#F7F6F0" stroke="#E2DFD2" strokeWidth="2" />
          {/* Route Line */}
          <path d="M26 48c4-12 16-16 26-6s12-4 12-14" fill="none" stroke="#C77A54" strokeWidth="2.5" strokeDasharray="3 3" />
          {/* Donor Pin */}
          <circle cx="26" cy="48" r="6" fill="#183D2B" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx="26" cy="48" r="2" fill="#FFFFFF" />
          {/* Destination Shelter Pin */}
          <circle cx="64" cy="28" r="6" fill="#647C50" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx="64" cy="28" r="2" fill="#FFFFFF" />
        </svg>
      );
  }
};

/**
 * EmptyState
 * Reusable, accessible empty-state presentation for FoodBridge dashboards.
 * Tone: An invitation, not an apology.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  variant,
  title,
  description,
  actionText,
  actionIcon,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      role="status"
      className={`bg-white rounded-lg border border-[#E2DFD2] p-8 sm:p-12 text-center space-y-4 shadow-xs ${className}`}
    >
      <EmptyIllustration variant={variant} />

      <div className="space-y-1.5 max-w-md mx-auto">
        <h3 className="font-editorial text-lg sm:text-xl font-bold text-[#183D2B]">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-[#50544C] leading-relaxed">
          {description}
        </p>
      </div>

      {(onAction || onSecondaryAction) && (
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {onAction && actionText && (
            <button
              onClick={onAction}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] transition-colors rounded shadow-xs min-h-[44px] cursor-pointer"
            >
              {actionIcon}
              <span>{actionText}</span>
            </button>
          )}

          {onSecondaryAction && secondaryActionText && (
            <button
              onClick={onSecondaryAction}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-[#183D2B] hover:text-[#C77A54] underline min-h-[44px] cursor-pointer"
            >
              {secondaryActionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
