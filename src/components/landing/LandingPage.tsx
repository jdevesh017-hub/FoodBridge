import React from 'react';
import { impactService } from '../../services/impactService';
import { ArrowRight, ShieldCheck, HeartHandshake, Truck, Building2, Sparkles, Check, ChevronRight } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: string) => void;
  onOpenAuth: (tab?: 'signin' | 'register') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  onOpenAuth,
}) => {
  const summary = impactService.getCombinedImpactSummary();
  const demoStats = summary.demoBaseline;
  const sessionStats = summary.sessionVerified;

  return (
    <div className="space-y-24 pb-20">
      {/* 1. HERO SECTION (Editorial Split) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Editorial Headline & Copy */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#647C50]">
              <span className="w-2 h-2 rounded-full bg-[#183D2B]" />
              <span>Food Recovery · Community · Sustainability</span>
            </div>

            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-bold text-[#183D2B] leading-[1.12] tracking-tight text-balance">
              Good food deserves a <span className="italic font-normal text-[#C77A54]">second chance</span>.
            </h1>

            <p className="text-base sm:text-lg text-[#50544C] max-w-xl leading-relaxed">
              Every day, perfectly edible food goes unused while communities need access to nutritious meals.
              FoodBridge brings commercial donors, verified NGOs, and volunteer couriers together to change that.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                onClick={() => onNavigate('donor_dashboard')}
                className="flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] transition-all rounded shadow-xs focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none"
              >
                <span>Donate Surplus Food</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById('how_it_works');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    onNavigate('how_it_works');
                  }
                }}
                className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium text-[#183D2B] hover:bg-[#E8EDE2] transition-colors rounded border border-[#183D2B]/30 focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none"
              >
                <span>Explore How It Works</span>
              </button>
            </div>

            {/* Quiet Trust Marker */}
            <div className="pt-4 flex items-center gap-6 text-xs text-[#50544C]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#647C50]" />
                FSSAI Guideline Compliant
              </span>
              <span>·</span>
              <span>Zero Commercially Sold Waste</span>
              <span>·</span>
              <span>Free for Community Kitchens</span>
            </div>
          </div>

          {/* Right Column: Authentic Documentary Photography */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-[#E2DFD2] aspect-[4/3] bg-[#E8EDE2]">
              <img
                src="/src/assets/images/hero_food_redistribution_1794331332502.jpg"
                alt="Community volunteers packing fresh nutritious meals"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              {/* Subtle Tasteful Floating Label (Anti-slop compliant) */}
              <div className="absolute bottom-4 left-4 right-4 bg-[#F7F6F0]/95 backdrop-blur-xs px-4 py-2.5 rounded-lg border border-[#E2DFD2] shadow-xs flex items-center justify-between text-xs">
                <span className="font-editorial text-sm font-bold text-[#183D2B]">
                  One community. Less waste.
                </span>
                <span className="text-[#647C50] text-[11px]">
                  Daily urban food recovery
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. IMPACT INTRODUCTION & STATISTICS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-[#E2DFD2] p-8 sm:p-12 shadow-xs space-y-10">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#647C50]">
              The Problem We Solve
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-[#183D2B] leading-tight">
              Food should feed people, not landfills.
            </h2>
            <p className="text-sm sm:text-base text-[#50544C] leading-relaxed">
              When prepared meals and wholesome bakery surplus end up in municipal waste, nutrients and resources are
              squandered while local families, shelter residents, and seniors face meal insecurity. By orchestrating rapid
              thermal collection, FoodBridge eliminates this breakdown.
            </p>
          </div>

          {/* 3 Carefully Designed Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-4 border-t border-[#E2DFD2]">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-[#647C50] font-semibold">Surplus Food Recovered</p>
              <p className="font-editorial text-4xl sm:text-5xl font-bold text-[#183D2B] tabular-nums">
                {demoStats.totalSurplusKgDiverted.toLocaleString()}{' '}
                <span className="text-lg font-sans font-normal text-[#50544C]">kg</span>
              </p>
              <p className="text-xs text-[#50544C]">
                {sessionStats.totalSurplusKgDiverted > 0
                  ? `+${sessionStats.totalSurplusKgDiverted} kg logged in current session`
                  : 'Edible surplus salvaged from hotels and kitchens'}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-[#647C50] font-semibold">Meals Redistributed</p>
              <p className="font-editorial text-4xl sm:text-5xl font-bold text-[#183D2B] tabular-nums">
                {demoStats.totalMealsRedistributed.toLocaleString()}
              </p>
              <p className="text-xs text-[#50544C]">
                Calculated at standard 350g wholesome portions
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-[#647C50] font-semibold">Successful Rescues</p>
              <p className="font-editorial text-4xl sm:text-5xl font-bold text-[#183D2B] tabular-nums">
                {demoStats.completedRescuesCount + sessionStats.completedRescuesCount}
              </p>
              <p className="text-xs text-[#50544C]">
                Verified handovers to verified community organizations
              </p>
            </div>
          </div>

          {/* Demonstration Notice */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-[#737373] border-t border-[#E2DFD2]">
            <span>* Baseline pilot demonstration metrics. Live session rescues are tracked separately.</span>
            <button onClick={() => onNavigate('impact')} className="text-[#183D2B] hover:underline font-medium">
              View Detailed Impact Accounting →
            </button>
          </div>
        </div>
      </section>

      {/* 3. HOW FOODBRIDGE WORKS (3 Editorial Steps) */}
      <section id="how_it_works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-semibold tracking-wider uppercase text-[#647C50]">
            Operational Workflow
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-[#183D2B]">
            How FoodBridge works
          </h2>
          <p className="text-sm text-[#50544C]">
            A dignified, time-sensitive system connecting three essential community pillars.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 01 */}
          <div className="bg-white rounded-xl border border-[#E2DFD2] p-8 space-y-4 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <span className="font-editorial text-3xl font-bold text-[#C77A54] block">
                01
              </span>
              <h3 className="font-editorial text-xl font-bold text-[#183D2B]">
                Share surplus
              </h3>
              <p className="text-sm text-[#50544C] leading-relaxed">
                Food donors record available surplus, food category, preparation timestamp, holding conditions, and
                collection deadlines in under 90 seconds.
              </p>
            </div>
            <div className="pt-4 border-t border-[#E2DFD2] text-xs text-[#647C50] font-medium">
              Direct 1-page form · FSSAI verified
            </div>
          </div>

          {/* Step 02 */}
          <div className="bg-white rounded-xl border border-[#E2DFD2] p-8 space-y-4 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <span className="font-editorial text-3xl font-bold text-[#C77A54] block">
                02
              </span>
              <h3 className="font-editorial text-xl font-bold text-[#183D2B]">
                Find the right match
              </h3>
              <p className="text-sm text-[#50544C] leading-relaxed">
                Local NGOs discover available meals on an interactive split-screen map and reserve them with atomic
                locking, preventing concurrent duplicate claims.
              </p>
            </div>
            <div className="pt-4 border-t border-[#E2DFD2] text-xs text-[#647C50] font-medium">
              Geographic matching · Collision-safe
            </div>
          </div>

          {/* Step 03 */}
          <div className="bg-white rounded-xl border border-[#E2DFD2] p-8 space-y-4 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <span className="font-editorial text-3xl font-bold text-[#C77A54] block">
                03
              </span>
              <h3 className="font-editorial text-xl font-bold text-[#183D2B]">
                Complete the rescue
              </h3>
              <p className="text-sm text-[#50544C] leading-relaxed">
                Volunteer couriers coordinate insulated transit, audit temperatures upon collection, and confirm
                handover with the community kitchen coordinator.
              </p>
            </div>
            <div className="pt-4 border-t border-[#E2DFD2] text-xs text-[#647C50] font-medium">
              4-stage progress · Exception recovery
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHO WE CONNECT (3 Visually Distinct Sections) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-semibold tracking-wider uppercase text-[#647C50]">
            Our Ecosystem
          </span>
          <h2 className="font-editorial text-3xl font-bold text-[#183D2B]">
            Who we bring together
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* DONORS */}
          <div className="bg-[#183D2B] text-white p-8 rounded-xl shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#A3B899]">Donors</span>
                <Building2 className="w-5 h-5 text-[#C77A54]" />
              </div>
              <h3 className="font-editorial text-2xl font-bold leading-snug">
                "Turn surplus into something meaningful."
              </h3>
              <p className="text-xs text-[#D3DECD] leading-relaxed">
                Restaurants, caterers, hotels, and college canteens streamline their surplus redistribution without
                operational overhead, backed by documented food safety logs.
              </p>
            </div>

            <button
              onClick={() => onNavigate('donor_dashboard')}
              className="w-full py-2.5 text-xs font-semibold text-[#183D2B] bg-[#F7F6F0] hover:bg-white rounded transition-colors"
            >
              Access Donor Portal
            </button>
          </div>

          {/* NGOS */}
          <div className="bg-[#647C50] text-white p-8 rounded-xl shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#E8EDE2]">Community NGOs</span>
                <HeartHandshake className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-editorial text-2xl font-bold leading-snug">
                "Connect your community to available food."
              </h3>
              <p className="text-xs text-[#E8EDE2] leading-relaxed">
                Shelters, pantries, and senior dining centers view nearby surplus batches with dietary tags and reserve
                wholesome meals with complete delivery coordination.
              </p>
            </div>

            <button
              onClick={() => onNavigate('ngo_discovery')}
              className="w-full py-2.5 text-xs font-semibold text-[#183D2B] bg-[#F7F6F0] hover:bg-white rounded transition-colors"
            >
              Browse Available Food
            </button>
          </div>

          {/* VOLUNTEERS */}
          <div className="bg-[#E8EDE2] text-[#183D2B] p-8 rounded-xl border border-[#D3DECD] shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#647C50]">Volunteers</span>
                <Truck className="w-5 h-5 text-[#C77A54]" />
              </div>
              <h3 className="font-editorial text-2xl font-bold leading-snug">
                "Be the connection that makes it happen."
              </h3>
              <p className="text-xs text-[#50544C] leading-relaxed">
                Drivers, cyclists, and walking couriers choose local delivery runs that fit their schedule, ensuring food
                travels safely across the final mile.
              </p>
            </div>

            <button
              onClick={() => onNavigate('volunteer_dashboard')}
              className="w-full py-2.5 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] rounded transition-colors"
            >
              Join Courier Dispatch
            </button>
          </div>
        </div>
      </section>

      {/* 5. SIGNATURE AWARENESS & INTELLIGENCE TEASER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#F7F6F0] rounded-2xl border border-[#E2DFD2] p-8 sm:p-12 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C77A54]">
              Signature Feature · Food Waste Intelligence
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-[#183D2B]">
              Understanding waste is the first step to ending it.
            </h2>
            <p className="text-sm sm:text-base text-[#50544C] leading-relaxed">
              FoodBridge analyzes historical donation cadences to pinpoint recurring surplus patterns. By helping
              commercial kitchens adjust preparation quantities for recurring peaks, we prevent food waste before it
              even begins.
            </p>
            <div className="pt-2">
              <button
                onClick={() => onNavigate('intelligence')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] rounded shadow-xs"
              >
                <span>Explore Waste Intelligence</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-[#E2DFD2] shadow-xs space-y-3 text-xs">
            <p className="font-editorial text-sm font-bold text-[#183D2B]">Sample Kitchen Heuristic</p>
            <div className="p-3 bg-[#E8EDE2] rounded text-[#252923] space-y-1">
              <p className="font-semibold text-[#183D2B]">Friday Banquet Excess Rice</p>
              <p className="text-[#50544C] text-[11px]">
                "Friday luncheon services regularly generate 22% excess grain. Consider par-cooking in staggered batches."
              </p>
            </div>
            <p className="text-[10px] text-[#737373] text-right font-mono">Matched against 820 kg history</p>
          </div>
        </div>
      </section>
    </div>
  );
};
