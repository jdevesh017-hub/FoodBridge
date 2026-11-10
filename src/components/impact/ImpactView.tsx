import React, { useState } from 'react';
import { impactService } from '../../services/impactService';
import { ShieldCheck, Leaf, HeartHandshake, Building2, Truck, RefreshCw, Award } from 'lucide-react';

export const ImpactView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'combined' | 'session_only'>('combined');
  const summary = impactService.getCombinedImpactSummary();
  const demo = summary.demoBaseline;
  const session = summary.sessionVerified;

  const activeStats = viewMode === 'session_only' ? session : {
    totalSurplusKgDiverted: summary.totalCombinedKg,
    totalMealsRedistributed: summary.totalCombinedMeals,
    completedRescuesCount: demo.completedRescuesCount + session.completedRescuesCount,
    participatingDonorsCount: demo.participatingDonorsCount + session.participatingDonorsCount,
    participatingNgosCount: demo.participatingNgosCount + session.participatingNgosCount,
    activeVolunteersCount: demo.activeVolunteersCount + session.activeVolunteersCount,
    co2EquivalentPreventedKg: Math.round((summary.totalCombinedKg * 2.5) * 10) / 10,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DFD2] pb-6">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-[#647C50]">
            Verified Environmental & Social Accounting
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold text-[#183D2B] mt-1">
            Small actions. Measurable change.
          </h1>
          <p className="text-sm sm:text-base text-[#50544C] max-w-2xl mt-2 leading-relaxed">
            FoodBridge measures physical weight and delivery verification to produce an immutable record of diverted
            landfill emissions and community meal access.
          </p>
        </div>

        {/* Data Separation Toggle */}
        <div className="bg-white p-1 rounded border border-[#E2DFD2] flex items-center gap-1 text-xs self-start md:self-auto shadow-2xs">
          <button
            onClick={() => setViewMode('combined')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              viewMode === 'combined' ? 'bg-[#183D2B] text-white shadow-xs' : 'text-[#50544C] hover:text-[#252923]'
            }`}
          >
            All Pilot Records
          </button>
          <button
            onClick={() => setViewMode('session_only')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              viewMode === 'session_only' ? 'bg-[#183D2B] text-white shadow-xs' : 'text-[#50544C] hover:text-[#252923]'
            }`}
          >
            Active Session Only ({session.completedRescuesCount})
          </button>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[#E2DFD2] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#647C50]">
            <span>Surplus Rescued</span>
            <Leaf className="w-4 h-4 text-[#183D2B]" />
          </div>
          <p className="font-editorial text-4xl font-bold text-[#183D2B] tabular-nums">
            {activeStats.totalSurplusKgDiverted.toLocaleString()}{' '}
            <span className="text-base font-sans font-normal text-[#50544C]">kg</span>
          </p>
          <p className="text-xs text-[#50544C]">Physically weighed and signed off</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E2DFD2] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#647C50]">
            <span>Meals Provided</span>
            <HeartHandshake className="w-4 h-4 text-[#C77A54]" />
          </div>
          <p className="font-editorial text-4xl font-bold text-[#183D2B] tabular-nums">
            {activeStats.totalMealsRedistributed.toLocaleString()}
          </p>
          <p className="text-xs text-[#50544C]">At standard 350g meal portions</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E2DFD2] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#647C50]">
            <span>CO₂e Abatement</span>
            <ShieldCheck className="w-4 h-4 text-[#647C50]" />
          </div>
          <p className="font-editorial text-4xl font-bold text-[#183D2B] tabular-nums">
            {Math.round(activeStats.co2EquivalentPreventedKg).toLocaleString()}{' '}
            <span className="text-base font-sans font-normal text-[#50544C]">kg</span>
          </p>
          <p className="text-xs text-[#50544C]">Estimated emissions prevented</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E2DFD2] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#647C50]">
            <span>Verified Missions</span>
            <Award className="w-4 h-4 text-[#C77A54]" />
          </div>
          <p className="font-editorial text-4xl font-bold text-[#183D2B] tabular-nums">
            {activeStats.completedRescuesCount}
          </p>
          <p className="text-xs text-[#50544C]">Zero reported spoilage</p>
        </div>
      </div>

      {/* Network Distribution Metrics */}
      <div className="bg-[#E8EDE2] p-8 rounded-2xl border border-[#D3DECD] grid grid-cols-1 md:grid-cols-3 gap-6 text-[#183D2B]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#647C50]">
            <Building2 className="w-4 h-4 text-[#183D2B]" />
            <span>Participating Donors</span>
          </div>
          <p className="font-editorial text-3xl font-bold tabular-nums">
            {activeStats.participatingDonorsCount} Commercial Facilities
          </p>
          <p className="text-xs text-[#50544C]">Hotels, bakeries, corporate & college canteens</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#647C50]">
            <HeartHandshake className="w-4 h-4 text-[#C77A54]" />
            <span>Community Recipient NGOs</span>
          </div>
          <p className="font-editorial text-3xl font-bold tabular-nums">
            {activeStats.participatingNgosCount} Verified Shelters
          </p>
          <p className="text-xs text-[#50544C]">Elderly dining rooms, day shelters, and youth pantries</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#647C50]">
            <Truck className="w-4 h-4 text-[#647C50]" />
            <span>Active Dispatch Couriers</span>
          </div>
          <p className="font-editorial text-3xl font-bold tabular-nums">
            {activeStats.activeVolunteersCount} Volunteer Drivers
          </p>
          <p className="text-xs text-[#50544C]">Equipped with insulated thermal containers</p>
        </div>
      </div>

      {/* Transparent Methodology */}
      <div className="bg-white rounded-xl border border-[#E2DFD2] p-6 space-y-4 text-xs text-[#50544C]">
        <h3 className="font-editorial text-lg font-bold text-[#183D2B]">
          Impact Accounting Principles & Methodology
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="space-y-1">
            <p className="font-semibold text-[#252923]">1. Verified Delivery Handover Only</p>
            <p className="leading-relaxed">
              Donations only enter impact calculations after both the volunteer courier and recipient NGO sign off on the
              delivery status. Uncollected or cancelled lots are excluded.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[#252923]">2. Conservative Portion Equivalents</p>
            <p className="leading-relaxed">
              Meal counts are calculated at 350 grams per portion, aligning with World Food Programme and FSSAI dietary
              guidance for wholesome adult nutrition.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[#252923]">3. Greenhouse Gas Abatement Factor</p>
            <p className="leading-relaxed">
              Applying the internationally recognized FAO factor of 2.5 kg CO₂-equivalent prevented for each kilogram of
              edible surplus kept out of municipal anaerobic decomposition.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
