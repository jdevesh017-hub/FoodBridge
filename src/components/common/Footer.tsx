import React from 'react';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
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
                <button onClick={() => onNavigate('landing')} className="hover:text-white transition-colors">
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('how_it_works')} className="hover:text-white transition-colors">
                  How It Works
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('ngo_discovery')} className="hover:text-white transition-colors">
                  Find Surplus Food
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('impact')} className="hover:text-white transition-colors">
                  Our Impact
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('intelligence')} className="hover:text-white transition-colors">
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
                <button onClick={() => onNavigate('donor_dashboard')} className="hover:text-white transition-colors">
                  Food Donor Portal
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('ngo_discovery')} className="hover:text-white transition-colors">
                  NGO Registration
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('volunteer_dashboard')} className="hover:text-white transition-colors">
                  Volunteer Dispatch
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('safety')} className="hover:text-white transition-colors">
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
          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>·</span>
            <span>Terms of Redistribution</span>
            <span>·</span>
            <span>Food Safety Charter</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
