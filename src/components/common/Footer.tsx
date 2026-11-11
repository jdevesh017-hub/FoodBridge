import React, { useState } from 'react';
import { ShieldCheck, ArrowUpRight, X, FileText } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | null>(null);

  return (
    <footer className="bg-[#183D2B] text-[#F7F6F0] pt-16 pb-12 border-t border-[#2A523C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#2A523C]">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <svg className="w-8 h-8 text-[#A3B899]" viewBox="0 0 32 32" fill="none">
                <path d="M8 22C8 14 14 8 22 8C22 16 16 22 8 22Z" fill="currentColor" fillOpacity="0.9" />
                <path d="M13 26C13 20 18 15 24 15C24 21 19 26 13 26Z" fill="#C77A54" />
              </svg>
              <span className="font-editorial text-2xl font-bold tracking-tight text-white">FoodBridge</span>
            </div>
            <p className="text-sm font-medium text-[#D3DECD] italic">Good food. Better futures.</p>
            <p className="text-sm text-[#A3B899] max-w-sm leading-relaxed">
              FoodBridge connects commercial kitchens, hotels, and college canteens with verified NGOs and volunteer
              couriers to ensure surplus edible meals reach community dining rooms instead of landfills.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-[#A3B899]">
              <ShieldCheck className="w-4 h-4 text-[#C77A54]" />
              <span>Aligned with FSSAI Surplus Food Recovery Regulations (2019)</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-2 space-y-3">
            <p className="text-xs font-semibold tracking-wider uppercase text-[#A3B899]">Platform</p>
            <ul className="space-y-2 text-sm text-[#D3DECD]">
              <li>
                <button
                  onClick={() => onNavigate('landing')}
                  className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white rounded px-1 -mx-1"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('how_it_works')}
                  className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white rounded px-1 -mx-1"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('ngo_discovery')}
                  className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white rounded px-1 -mx-1"
                >
                  Find Surplus Food
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('impact')}
                  className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white rounded px-1 -mx-1"
                >
                  Our Impact
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('intelligence')}
                  className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white rounded px-1 -mx-1"
                >
                  Waste Intelligence
                </button>
              </li>
            </ul>
          </div>

          {/* Stakeholder Portals */}
          <div className="md:col-span-2 space-y-3">
            <p className="text-xs font-semibold tracking-wider uppercase text-[#A3B899]">Participation</p>
            <ul className="space-y-2 text-sm text-[#D3DECD]">
              <li>
                <button
                  onClick={() => onNavigate('donor_dashboard')}
                  className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white rounded px-1 -mx-1"
                >
                  Food Donor Portal
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('ngo_discovery')}
                  className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white rounded px-1 -mx-1"
                >
                  NGO Discovery
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('volunteer_dashboard')}
                  className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white rounded px-1 -mx-1"
                >
                  Volunteer Dispatch
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('safety')}
                  className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white rounded px-1 -mx-1"
                >
                  Safety Protocols
                </button>
              </li>
            </ul>
          </div>

          {/* Transparency & Standards */}
          <div className="md:col-span-3 space-y-3">
            <p className="text-xs font-semibold tracking-wider uppercase text-[#A3B899]">Transparency & Trust</p>
            <p className="text-xs text-[#A3B899] leading-relaxed">
              Every donation logged on FoodBridge is subject to verified time and thermal inspection. Metrics strictly
              reflect completed, documented handovers.
            </p>
            <div className="pt-2">
              <span className="inline-block text-xs bg-[#244A36] text-[#D3DECD] px-3 py-1.5 rounded border border-[#34654B]">
                Civic Sustainability Pilot · Maharashtra
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#A3B899] gap-4">
          <p>© {new Date().getFullYear()} FoodBridge Foundation. All rights reserved.</p>
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => setActiveModal('privacy')}
              className="hover:text-white underline transition-colors focus-visible:ring-2 focus-visible:ring-white rounded"
            >
              Privacy Policy
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveModal('terms')}
              className="hover:text-white underline transition-colors focus-visible:ring-2 focus-visible:ring-white rounded"
            >
              Terms of Redistribution
            </button>
            <span>·</span>
            <button
              onClick={() => onNavigate('safety')}
              className="hover:text-white underline transition-colors focus-visible:ring-2 focus-visible:ring-white rounded"
            >
              Food Safety Charter
            </button>
          </div>
        </div>
      </div>

      {/* Policy Modal Dialog */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="policy-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-[#F7F6F0] text-[#252923] rounded-xl max-w-lg w-full border border-[#E2DFD2] shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#183D2B]" />
                <h3 id="policy-dialog-title" className="font-editorial text-lg font-bold text-[#183D2B]">
                  {activeModal === 'privacy' ? 'Data Privacy & Local Storage Charter' : 'Terms of Non-Commercial Redistribution'}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                aria-label="Close dialog"
                className="text-[#50544C] hover:text-[#252923] p-1 rounded focus-visible:ring-2 focus-visible:ring-[#183D2B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#50544C] leading-relaxed">
              {activeModal === 'privacy' ? (
                <>
                  <p>
                    <strong>1. Local Prototype Storage:</strong> In this pilot demonstration, FoodBridge processes data locally in browser storage using schema-versioned adapters. No personal surveillance tracking or commercial telemetry is gathered.
                  </p>
                  <p>
                    <strong>2. Geographic Location Privacy:</strong> Precise street addresses and coordinates are visible strictly to verified participants on active runs. Public discovery views mask coordinates to maintain donor facility privacy.
                  </p>
                  <p>
                    <strong>3. Data Isolation:</strong> Resetting demonstration baseline records preserves all custom user-created donations and registered profiles without deletion.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>1. Strict Non-Commercial Purpose:</strong> All food logged, claimed, and redistributed via FoodBridge must be distributed free of charge to recipients experiencing food insecurity. Resale is strictly prohibited.
                  </p>
                  <p>
                    <strong>2. Mandatory Safety Adherence:</strong> Donors and recipient kitchens agree to comply with codified FSSAI Schedule 4 regulations, maintaining continuous thermal logs and allergen declarations.
                  </p>
                  <p>
                    <strong>3. Mutual Good-Faith Protection:</strong> FoodBridge provides structured decision support and temperature logging, connecting donors with verified community organizations under the Good Samaritan protections of Indian food safety law.
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E2DFD2]">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] rounded transition-colors focus-visible:ring-2 focus-visible:ring-[#183D2B]"
              >
                Understood & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
