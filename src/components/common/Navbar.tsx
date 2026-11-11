import React, { useState } from 'react';
import { Menu, X, ArrowRight, User, HeartHandshake, Truck, Building2, Package } from 'lucide-react';
import { UserRole } from '../../types';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAuth: (initialTab?: 'signin' | 'register') => void;
  currentRole: UserRole;
  userName?: string;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
  currentRole,
  userName,
  onSignOut,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (view: string) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  // Render role-specific navigation links
  const renderNavLinks = (isMobile = false) => {
    const linkBaseClass = isMobile
      ? 'w-full text-left py-2.5 px-3 rounded text-sm transition-colors'
      : 'whitespace-nowrap transition-colors hover:text-[#183D2B] pb-1 border-b-2 focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none rounded-xs';

    const getLinkClass = (viewName: string) => {
      const isActive = currentView === viewName;
      if (isMobile) {
        return `${linkBaseClass} ${
          isActive
            ? 'bg-[#E8EDE2] text-[#183D2B] font-semibold'
            : 'text-[#50544C] hover:bg-stone-100'
        }`;
      }
      return `${linkBaseClass} ${
        isActive
          ? 'border-[#183D2B] text-[#183D2B] font-semibold'
          : 'border-transparent text-[#50544C]'
      }`;
    };

    if (currentRole === 'donor') {
      return (
        <>
          <button onClick={() => handleNav('donor_dashboard')} className={getLinkClass('donor_dashboard')}>
            Overview
          </button>
          <button onClick={() => handleNav('donor_donations')} className={getLinkClass('donor_donations')}>
            My Donations
          </button>
          <button onClick={() => handleNav('donor_create')} className={getLinkClass('donor_create')}>
            Create Donation
          </button>
          <button onClick={() => handleNav('donor_history')} className={getLinkClass('donor_history')}>
            Donation History
          </button>
          <button onClick={() => handleNav('impact')} className={getLinkClass('impact')}>
            Impact
          </button>
        </>
      );
    }

    if (currentRole === 'ngo') {
      return (
        <>
          <button onClick={() => handleNav('ngo_discovery')} className={getLinkClass('ngo_discovery')}>
            Overview
          </button>
          <button onClick={() => handleNav('ngo_discover')} className={getLinkClass('ngo_discover')}>
            Discover Food
          </button>
          <button onClick={() => handleNav('ngo_reservations')} className={getLinkClass('ngo_reservations')}>
            My Reservations
          </button>
          <button onClick={() => handleNav('ngo_deliveries')} className={getLinkClass('ngo_deliveries')}>
            Deliveries
          </button>
          <button onClick={() => handleNav('impact')} className={getLinkClass('impact')}>
            Impact
          </button>
        </>
      );
    }

    if (currentRole === 'volunteer') {
      return (
        <>
          <button onClick={() => handleNav('volunteer_dashboard')} className={getLinkClass('volunteer_dashboard')}>
            Overview
          </button>
          <button onClick={() => handleNav('volunteer_available')} className={getLinkClass('volunteer_available')}>
            Available Tasks
          </button>
          <button onClick={() => handleNav('volunteer_active')} className={getLinkClass('volunteer_active')}>
            My Deliveries
          </button>
          <button onClick={() => handleNav('volunteer_history')} className={getLinkClass('volunteer_history')}>
            Delivery History
          </button>
          <button onClick={() => handleNav('impact')} className={getLinkClass('impact')}>
            Impact
          </button>
        </>
      );
    }

    // Public / Visitor Navigation
    return (
      <>
        <button onClick={() => handleNav('landing')} className={getLinkClass('landing')}>
          Home
        </button>
        <button onClick={() => handleNav('how_it_works')} className={getLinkClass('how_it_works')}>
          How It Works
        </button>
        <button onClick={() => handleNav('impact')} className={getLinkClass('impact')}>
          Our Impact
        </button>
        <button onClick={() => handleNav('safety')} className={getLinkClass('safety')}>
          Food Safety
        </button>
        <button onClick={() => handleNav('intelligence')} className={getLinkClass('intelligence')}>
          Waste Intelligence
        </button>
      </>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F7F6F0]/95 backdrop-blur-md border-b border-[#E2DFD2] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => {
            if (currentRole === 'donor') onNavigate('donor_dashboard');
            else if (currentRole === 'ngo') onNavigate('ngo_discovery');
            else if (currentRole === 'volunteer') onNavigate('volunteer_dashboard');
            else onNavigate('landing');
          }}
          className="flex items-center gap-2.5 text-left group whitespace-nowrap shrink-0 focus-visible:outline-hidden"
        >
          <svg className="w-8 h-8 text-[#183D2B]" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M8 22C8 14 14 8 22 8C22 16 16 22 8 22Z"
              fill="currentColor"
              fillOpacity="0.85"
            />
            <path
              d="M13 26C13 20 18 15 24 15C24 21 19 26 13 26Z"
              fill="#C77A54"
              fillOpacity="0.8"
            />
          </svg>
          <div className="flex flex-col">
            <span className="font-editorial text-2xl font-bold tracking-tight text-[#183D2B] leading-none">
              FoodBridge
            </span>
            {currentRole !== 'public' && (
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#647C50] font-semibold mt-0.5">
                {currentRole === 'donor' ? 'Food Donor Portal' : currentRole === 'ngo' ? 'NGO Portal' : 'Delivery Partner Portal'}
              </span>
            )}
          </div>
        </button>

        {/* Zone 2: Role-Tailored Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-[14px] font-medium text-[#252923]">
          {renderNavLinks()}
        </nav>

        {/* Zone 3: Role-Aware Primary Action & Profile */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          {currentRole !== 'public' && userName ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[#50544C] flex items-center gap-1.5 bg-[#E8EDE2] px-2.5 py-1 rounded">
                <User className="w-3.5 h-3.5 text-[#183D2B]" />
                <span className="font-semibold text-[#183D2B]">{userName}</span>
              </span>
              <button
                onClick={onSignOut}
                className="text-xs text-[#50544C] hover:text-[#C77A54] transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenAuth('signin')}
                className="text-sm font-medium text-[#252923] hover:text-[#183D2B] transition-colors whitespace-nowrap"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="text-xs font-medium text-[#183D2B] hover:underline whitespace-nowrap"
              >
                Register
              </button>
            </div>
          )}

          {/* Role-Specific Primary CTA Button */}
          {currentRole === 'donor' ? (
            <button
              onClick={() => onNavigate('donor_create')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#F7F6F0] bg-[#183D2B] hover:bg-[#254F38] transition-all rounded shadow-xs whitespace-nowrap"
            >
              <span>+ Create Donation</span>
            </button>
          ) : currentRole === 'ngo' ? (
            <button
              onClick={() => onNavigate('ngo_discover')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#F7F6F0] bg-[#183D2B] hover:bg-[#254F38] transition-all rounded shadow-xs whitespace-nowrap"
            >
              <HeartHandshake className="w-3.5 h-3.5 text-[#C77A54]" />
              <span>Discover Surplus</span>
            </button>
          ) : currentRole === 'volunteer' ? (
            <button
              onClick={() => onNavigate('volunteer_available')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#F7F6F0] bg-[#183D2B] hover:bg-[#254F38] transition-all rounded shadow-xs whitespace-nowrap"
            >
              <Truck className="w-3.5 h-3.5 text-[#647C50]" />
              <span>Available Tasks</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('donor_dashboard')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#F7F6F0] bg-[#183D2B] hover:bg-[#254F38] transition-all rounded shadow-xs whitespace-nowrap"
            >
              <span>Donate Surplus</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#183D2B] rounded focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2DFD2] bg-[#F7F6F0] px-4 pt-3 pb-6 space-y-1">
          {renderNavLinks(true)}
          <div className="pt-3 border-t border-[#E2DFD2] flex flex-col gap-2">
            {currentRole === 'public' ? (
              <button
                onClick={() => {
                  onOpenAuth('signin');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2.5 text-xs font-semibold border border-[#183D2B] text-[#183D2B] bg-white rounded focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none"
              >
                Sign In
              </button>
            ) : (
              <button
                onClick={() => {
                  onSignOut();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2.5 text-xs text-[#C77A54] hover:underline font-medium"
              >
                Sign Out ({userName})
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
