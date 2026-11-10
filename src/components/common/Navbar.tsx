import React, { useState } from 'react';
import { Menu, X, ArrowRight, User } from 'lucide-react';
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

  return (
    <header className="sticky top-0 z-40 bg-[#F7F6F0]/95 backdrop-blur-md border-b border-[#E2DFD2] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text/mark element) */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2.5 text-left group whitespace-nowrap shrink-0 focus-visible:outline-hidden"
        >
          {/* Minimalist connection emblem: two interlocking leaf shapes */}
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
          <span className="font-editorial text-2xl font-bold tracking-tight text-[#183D2B]">
            FoodBridge
          </span>
        </button>

        {/* Zone 2: 4–5 single-line clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-[14px] font-medium text-[#252923]">
          <button
            onClick={() => onNavigate('how_it_works')}
            className={`whitespace-nowrap transition-colors hover:text-[#183D2B] pb-1 border-b-2 ${
              currentView === 'how_it_works' ? 'border-[#183D2B] text-[#183D2B]' : 'border-transparent text-[#50544C]'
            }`}
          >
            How It Works
          </button>
          <button
            onClick={() => onNavigate('ngo_discovery')}
            className={`whitespace-nowrap transition-colors hover:text-[#183D2B] pb-1 border-b-2 ${
              currentView === 'ngo_discovery' ? 'border-[#183D2B] text-[#183D2B]' : 'border-transparent text-[#50544C]'
            }`}
          >
            Find Food
          </button>
          <button
            onClick={() => onNavigate('impact')}
            className={`whitespace-nowrap transition-colors hover:text-[#183D2B] pb-1 border-b-2 ${
              currentView === 'impact' ? 'border-[#183D2B] text-[#183D2B]' : 'border-transparent text-[#50544C]'
            }`}
          >
            Our Impact
          </button>
          <button
            onClick={() => onNavigate('safety')}
            className={`whitespace-nowrap transition-colors hover:text-[#183D2B] pb-1 border-b-2 ${
              currentView === 'safety' ? 'border-[#183D2B] text-[#183D2B]' : 'border-transparent text-[#50544C]'
            }`}
          >
            Food Safety
          </button>
          <button
            onClick={() => onNavigate('intelligence')}
            className={`whitespace-nowrap transition-colors hover:text-[#183D2B] pb-1 border-b-2 ${
              currentView === 'intelligence' ? 'border-[#183D2B] text-[#183D2B]' : 'border-transparent text-[#50544C]'
            }`}
          >
            Waste Intelligence
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action (with subtle sign in option) */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          {currentRole !== 'public' && userName ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[#50544C] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#183D2B]" />
                {userName}
              </span>
              <button
                onClick={onSignOut}
                className="text-xs text-[#50544C] hover:text-[#C77A54] transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenAuth('signin')}
              className="text-sm font-medium text-[#252923] hover:text-[#183D2B] transition-colors whitespace-nowrap"
            >
              Sign In
            </button>
          )}

          <button
            onClick={() => {
              if (currentRole === 'donor') {
                onNavigate('donor_dashboard');
              } else {
                onNavigate('donor_dashboard');
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#F7F6F0] bg-[#183D2B] hover:bg-[#254F38] transition-all rounded shadow-xs whitespace-nowrap"
          >
            <span>Donate Surplus Food</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile menu trigger */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#183D2B] rounded focus-visible:outline-hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2DFD2] bg-[#F7F6F0] px-4 pt-3 pb-6 space-y-3">
          <button
            onClick={() => {
              onNavigate('landing');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-base font-medium text-[#252923]"
          >
            Home
          </button>
          <button
            onClick={() => {
              onNavigate('how_it_works');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-base font-medium text-[#252923]"
          >
            How It Works
          </button>
          <button
            onClick={() => {
              onNavigate('ngo_discovery');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-base font-medium text-[#252923]"
          >
            Find Food
          </button>
          <button
            onClick={() => {
              onNavigate('impact');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-base font-medium text-[#252923]"
          >
            Our Impact
          </button>
          <button
            onClick={() => {
              onNavigate('safety');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-base font-medium text-[#252923]"
          >
            Food Safety Standards
          </button>
          <button
            onClick={() => {
              onNavigate('intelligence');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-base font-medium text-[#252923]"
          >
            Waste Intelligence
          </button>

          <div className="pt-4 border-t border-[#E2DFD2] flex flex-col gap-3">
            {currentRole === 'public' ? (
              <button
                onClick={() => {
                  onOpenAuth('signin');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2.5 text-sm font-medium border border-[#183D2B] text-[#183D2B] rounded"
              >
                Sign In
              </button>
            ) : (
              <button
                onClick={() => {
                  onSignOut();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2 text-sm text-[#C77A54]"
              >
                Sign Out ({userName})
              </button>
            )}

            <button
              onClick={() => {
                onNavigate('donor_dashboard');
                setMobileMenuOpen(false);
              }}
              className="w-full text-center py-2.5 text-sm font-semibold bg-[#183D2B] text-white rounded"
            >
              Donate Surplus Food
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
