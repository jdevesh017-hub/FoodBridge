import React from 'react';
import { FSSAI_SURPLUS_RULES_CONFIG, FSSAI_LEGAL_CITATIONS } from '../../services/fssaiSafetyRules';
import { ShieldCheck, Thermometer, Clock, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export const FoodSafetyPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Editorial Header */}
      <div className="space-y-3 border-b border-[#E2DFD2] pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#647C50]">
          <ShieldCheck className="w-4 h-4 text-[#C77A54]" />
          <span>Regulatory Compliance & Standards</span>
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold text-[#183D2B] tracking-tight">
          Food safety is non-negotiable.
        </h1>
        <p className="text-sm sm:text-base text-[#50544C] max-w-3xl leading-relaxed">
          Surplus food redistribution must uphold the exact same hygienic, thermal, and microbiological standards as
          commercial hospitality. FoodBridge applies codified FSSAI rules to every lot logged on our platform.
        </p>
      </div>

      {/* Core Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[#E2DFD2] shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-lg bg-[#E8EDE2] flex items-center justify-center text-[#183D2B]">
            <Thermometer className="w-5 h-5" />
          </div>
          <h3 className="font-editorial text-xl font-bold text-[#183D2B]">
            Thermal Chain Integrity
          </h3>
          <p className="text-xs text-[#50544C] leading-relaxed">
            Hot foods must be maintained at or above <strong>65°C</strong> from kitchen removal through volunteer
            handover. Chilled perishables must remain at or below <strong>5°C</strong> inside insulated cold carriers.
          </p>
          <p className="text-[11px] font-mono text-[#647C50] pt-2 border-t border-[#E2DFD2]">
            Citation: FSSAI Schedule 4 Part II
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E2DFD2] shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-lg bg-[#E8EDE2] flex items-center justify-center text-[#183D2B]">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-editorial text-xl font-bold text-[#183D2B]">
            Strict Holding Windows
          </h3>
          <p className="text-xs text-[#50544C] leading-relaxed">
            Ready-to-eat cooked preparations must be consumed within a maximum of <strong>4 hours</strong> if not
            refrigerated. Food lingering in the ambient danger zone (5°C–60°C) for over 2 hours is strictly rejected.
          </p>
          <p className="text-[11px] font-mono text-[#647C50] pt-2 border-t border-[#E2DFD2]">
            Citation: Codex CAC/GL 20-1995 Time Control
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E2DFD2] shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-lg bg-[#E8EDE2] flex items-center justify-center text-[#183D2B]">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="font-editorial text-xl font-bold text-[#183D2B]">
            Mandatory Allergen Disclosures
          </h3>
          <p className="text-xs text-[#50544C] leading-relaxed">
            Every batch requires explicit labeling for major allergens (gluten, dairy, nuts, soy, eggs). Community
            kitchen coordinators inspect labels before integrating surplus into meal lines.
          </p>
          <p className="text-[11px] font-mono text-[#647C50] pt-2 border-t border-[#E2DFD2]">
            Citation: FSSAI Labeling & Display Regs
          </p>
        </div>
      </div>

      {/* AI & Computer Vision Policy Alert */}
      <div className="p-6 bg-[#E8EDE2] rounded-xl border border-[#D3DECD] space-y-3 text-xs text-[#252923]">
        <div className="flex items-center gap-2 text-sm font-bold text-[#183D2B]">
          <ShieldCheck className="w-5 h-5 text-[#C77A54]" />
          <span>FoodBridge Safety Integrity Protocol</span>
        </div>
        <p className="leading-relaxed text-[#50544C]">
          <strong>Physical Audits Over Black-Box Predictions:</strong> Many automated platforms attempt to predict food
          spoilage through camera photos or computer vision. At FoodBridge, we recognize that bacteria and thermal
          degradation cannot be reliably verified from an image. We mandate physical probe thermometry, verified prep
          timestamps, and hands-on sensory inspection upon courier handover.
        </p>
      </div>

      {/* Statutory Guidelines Reference Table */}
      <div className="bg-white rounded-xl border border-[#E2DFD2] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E2DFD2] bg-[#FBF9F5]">
          <h3 className="font-editorial text-xl font-bold text-[#183D2B]">
            Configured Parameter Thresholds
          </h3>
          <p className="text-xs text-[#50544C]">
            These rule parameters govern the real-time evaluation engine in the donor and NGO portals.
          </p>
        </div>

        <div className="divide-y divide-[#E2DFD2] text-xs">
          <div className="p-4 flex items-center justify-between">
            <span className="font-medium text-[#252923]">Minimum Hot Holding Temperature</span>
            <span className="font-mono font-bold text-[#183D2B]">≥ {FSSAI_SURPLUS_RULES_CONFIG.minHotHoldingTempC}°C</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <span className="font-medium text-[#252923]">Maximum Cold Chain Temperature</span>
            <span className="font-mono font-bold text-[#183D2B]">≤ {FSSAI_SURPLUS_RULES_CONFIG.maxColdHoldingTempC}°C</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <span className="font-medium text-[#252923]">Maximum Hot Held Window to Consumption</span>
            <span className="font-mono font-bold text-[#183D2B]">{FSSAI_SURPLUS_RULES_CONFIG.maxHotHeldHours} Hours</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <span className="font-medium text-[#252923]">Maximum Ambient Perishable Exposure (Danger Zone)</span>
            <span className="font-mono font-bold text-[#C77A54]">≤ {FSSAI_SURPLUS_RULES_CONFIG.maxAmbientPerishableHours} Hours</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <span className="font-medium text-[#252923]">Bakery & Dry Starch Maximum Storage</span>
            <span className="font-mono font-bold text-[#183D2B]">{FSSAI_SURPLUS_RULES_CONFIG.maxBakeryShelfHours} Hours</span>
          </div>
        </div>
      </div>
    </div>
  );
};
