import React from 'react';
import { UserRole } from '../../types';
import { RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { storageAdapter } from '../../services/storageAdapter';

interface RoleSwitcherBannerProps {
  currentRole: UserRole;
  isDemoMode?: boolean;
  onSelectRole: (role: UserRole) => void;
  activeUserName?: string;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const RoleSwitcherBanner: React.FC<RoleSwitcherBannerProps> = ({
  currentRole,
  isDemoMode,
  onSelectRole,
  activeUserName,
  onShowToast,
}) => {
  const handleReset = () => {
    if (window.confirm('Reset demo baseline data? Note: All your custom user-created donations and accounts will be safely preserved.')) {
      storageAdapter.resetDemoData();
      onSelectRole('public');
      onShowToast('Demo data refreshed. Custom created donations and registered user accounts were preserved.', 'info');
    }
  };

  return (
    <div className="bg-[#183D2B] text-[#F7F6F0] border-b border-[#2D5A42] px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-wider uppercase text-[10px] text-[#A3B899] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C77A54]" />
            Evaluation Sandbox
          </span>
          <span className="text-[#A3B899] hidden sm:inline">·</span>
          {isDemoMode ? (
            <span className="bg-[#254F38] text-[#D3DECD] px-2 py-0.5 rounded text-[10px] font-mono">
              Demo Persona Active: {activeUserName || 'Curated Persona'}
            </span>
          ) : activeUserName ? (
            <span className="bg-[#C77A54]/30 text-amber-200 border border-amber-300/30 px-2 py-0.5 rounded text-[10px] font-mono">
              Live Registered User: {activeUserName}
            </span>
          ) : (
            <span className="text-[#E8EDE2] hidden sm:inline">
              Switch perspective to test end-to-end redistribution:
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-wrap justify-center">
          <button
            onClick={() => onSelectRole('public')}
            className={`px-2.5 py-1 rounded transition-colors focus-visible:ring-2 focus-visible:ring-[#F7F6F0] focus-visible:outline-none ${
              currentRole === 'public'
                ? 'bg-[#F7F6F0] text-[#183D2B] font-semibold shadow-xs'
                : 'text-[#E8EDE2] hover:bg-[#254F38]'
            }`}
          >
            Public Editorial
          </button>
          <button
            onClick={() => onSelectRole('donor')}
            className={`px-2.5 py-1 rounded transition-colors focus-visible:ring-2 focus-visible:ring-[#F7F6F0] focus-visible:outline-none ${
              currentRole === 'donor'
                ? 'bg-[#F7F6F0] text-[#183D2B] font-semibold shadow-xs'
                : 'text-[#E8EDE2] hover:bg-[#254F38]'
            }`}
          >
            Donor Portal
          </button>
          <button
            onClick={() => onSelectRole('ngo')}
            className={`px-2.5 py-1 rounded transition-colors focus-visible:ring-2 focus-visible:ring-[#F7F6F0] focus-visible:outline-none ${
              currentRole === 'ngo'
                ? 'bg-[#F7F6F0] text-[#183D2B] font-semibold shadow-xs'
                : 'text-[#E8EDE2] hover:bg-[#254F38]'
            }`}
          >
            NGO Discovery
          </button>
          <button
            onClick={() => onSelectRole('volunteer')}
            className={`px-2.5 py-1 rounded transition-colors focus-visible:ring-2 focus-visible:ring-[#F7F6F0] focus-visible:outline-none ${
              currentRole === 'volunteer'
                ? 'bg-[#F7F6F0] text-[#183D2B] font-semibold shadow-xs'
                : 'text-[#E8EDE2] hover:bg-[#254F38]'
            }`}
          >
            Volunteer Dispatch
          </button>

          <span className="text-[#4E755D] mx-1">|</span>

          <button
            onClick={handleReset}
            title="Reset to fresh pilot seed data"
            className="flex items-center gap-1 px-2 py-1 text-[#A3B899] hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-[#F7F6F0] focus-visible:outline-none rounded"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden lg:inline">Reset Sandbox</span>
          </button>
        </div>
      </div>
    </div>
  );
};
