import React, { useState } from 'react';
import { BETTER_DECISION_RECOMMENDATIONS } from '../../services/seedData';
import { impactService } from '../../services/impactService';
import { Sparkles, TrendingUp, BarChart3, Calendar, Lightbulb, Compass, ArrowRight, ShieldCheck } from 'lucide-react';

export const WasteIntelligenceDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'categories' | 'trends'>('recommendations');
  const categoryMetrics = impactService.getCategoryBreakdown();
  const summary = impactService.getCombinedImpactSummary();

  const weekdayDistribution = [
    { day: 'Mon', kg: 410, intensity: 'bg-[#647C50]' },
    { day: 'Tue', kg: 280, intensity: 'bg-[#A3B899]' },
    { day: 'Wed', kg: 340, intensity: 'bg-[#647C50]' },
    { day: 'Thu', kg: 390, intensity: 'bg-[#647C50]' },
    { day: 'Fri', kg: 820, intensity: 'bg-[#183D2B]' }, // Highest surplus spike
    { day: 'Sat', kg: 740, intensity: 'bg-[#183D2B]' },
    { day: 'Sun', kg: 610, intensity: 'bg-[#406850]' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Editorial Header */}
      <div className="space-y-3 border-b border-[#E2DFD2] pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#647C50]">
          <Sparkles className="w-4 h-4 text-[#C77A54]" />
          <span>Waste Prevention Intelligence</span>
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#183D2B] tracking-tight">
          Understanding waste is the first step to ending it.
        </h1>
        <p className="text-base text-[#50544C] max-w-3xl leading-relaxed">
          FoodBridge analyzes historical donation logs, preparation timestamps, and collection volumes to identify
          recurring surplus hotspots. By learning kitchen demand cycles, we empower chefs and caterers to make better
          purchasing decisions before surplus even occurs.
        </p>

        {/* Demonstration Disclaimer */}
        <div className="pt-1 flex items-center gap-2 text-xs text-[#50544C]">
          <span className="font-mono bg-[#E8EDE2] text-[#183D2B] px-2 py-0.5 rounded text-[11px]">DEMONSTRATION ENGINE</span>
          <span>· Synthesized from regional hospital, hotel, and institutional pilot records.</span>
        </div>
      </div>

      {/* Signature Section: "Your Next Better Decision" */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-editorial text-2xl font-bold text-[#183D2B]">
              Your Next Better Decision
            </h2>
            <p className="text-sm text-[#50544C]">
              Heuristic recommendations tailored to commercial kitchens to trim food over-preparation at source.
            </p>
          </div>
          <span className="text-xs text-[#647C50] bg-white px-3 py-1 rounded border border-[#E2DFD2] shadow-2xs self-start">
            3 Active Kitchen Insights
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {BETTER_DECISION_RECOMMENDATIONS.map((rec) => (
            <div
              key={rec.id}
              className="bg-white rounded-lg p-6 border border-[#E2DFD2] shadow-xs flex flex-col justify-between hover:border-[#647C50] transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#647C50]">
                  <span className="font-medium">{rec.frequency}</span>
                  <span className="font-mono tabular-nums text-[#C77A54]">
                    {Math.round(rec.confidenceScore * 100)}% match
                  </span>
                </div>

                <h3 className="font-editorial text-lg font-bold text-[#183D2B] leading-snug">
                  {rec.title}
                </h3>

                <p className="text-xs text-[#50544C] leading-relaxed">
                  {rec.insight}
                </p>

                <div className="p-3 bg-[#F7F6F0] rounded border border-[#E2DFD2] text-xs text-[#252923]">
                  <div className="flex items-center gap-1.5 text-[#183D2B] font-semibold mb-1">
                    <Lightbulb className="w-3.5 h-3.5 text-[#C77A54]" />
                    <span>Recommended Action</span>
                  </div>
                  <p className="text-[#50544C] leading-relaxed">
                    {rec.actionableRecommendation}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#E2DFD2] flex items-center justify-between text-[11px] text-[#647C50]">
                <span>Applies to: {rec.applicableDonorTypes.join(', ')}</span>
                <span className="text-[#183D2B] font-semibold">Active Model</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Analytics Breakdown Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Category Breakdown */}
        <div className="lg:col-span-6 bg-white p-6 rounded-lg border border-[#E2DFD2] shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
            <div>
              <h3 className="font-editorial text-lg font-bold text-[#183D2B]">
                Surplus Volume by Food Category
              </h3>
              <p className="text-xs text-[#50544C]">
                Cumulative breakdown of diverted surplus across all participating establishments.
              </p>
            </div>
            <BarChart3 className="w-5 h-5 text-[#647C50]" />
          </div>

          <div className="space-y-4">
            {categoryMetrics.map((item) => (
              <div key={item.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#252923] capitalize">
                    {item.category.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-2 font-mono tabular-nums text-xs">
                    <span className="text-[#183D2B] font-semibold">{item.totalKg} kg</span>
                    <span className="text-[#50544C]">({item.percentage}%)</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-[#E8EDE2] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#183D2B] transition-all duration-500 rounded-full"
                    style={{ width: `${Math.max(item.percentage, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[#50544C] pt-2 border-t border-[#E2DFD2]">
            Note: Cooked banquet meals constitute the highest single category, underscoring the necessity for thermal container routing.
          </p>
        </div>

        {/* Right Column: Weekly Surplus Cadence Heatmap */}
        <div className="lg:col-span-6 bg-white p-6 rounded-lg border border-[#E2DFD2] shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
            <div>
              <h3 className="font-editorial text-lg font-bold text-[#183D2B]">
                Donation Frequency by Weekday
              </h3>
              <p className="text-xs text-[#50544C]">
                Volume distribution showing weekly banquet and event peaks.
              </p>
            </div>
            <Calendar className="w-5 h-5 text-[#647C50]" />
          </div>

          <div className="grid grid-cols-7 gap-2 pt-2 items-end h-44">
            {weekdayDistribution.map((w) => {
              const heightPercent = Math.round((w.kg / 850) * 100);
              return (
                <div key={w.day} className="flex flex-col items-center gap-2 h-full justify-end">
                  <span className="font-mono text-[10px] tabular-nums text-[#50544C]">
                    {w.kg}kg
                  </span>
                  <div
                    className={`w-full rounded-t ${w.intensity} transition-all duration-300 hover:opacity-85`}
                    style={{ height: `${heightPercent}%` }}
                    title={`${w.day}: ${w.kg} kg surplus`}
                  />
                  <span className="text-xs font-semibold text-[#252923]">
                    {w.day}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-[#E8EDE2] rounded border border-[#D3DECD] text-xs text-[#183D2B] flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-[#C77A54] shrink-0 mt-0.5" />
            <p>
              <strong>Peak Dispatch Alert:</strong> Friday and Saturday evenings generate 44% of weekly surplus. Additional volunteer couriers are prioritized during this window.
            </p>
          </div>
        </div>
      </section>

      {/* Demand Gap Index */}
      <section className="bg-[#183D2B] text-[#F7F6F0] p-8 rounded-xl shadow-xs space-y-4">
        <div className="max-w-3xl space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#A3B899]">
            <Compass className="w-4 h-4 text-[#C77A54]" />
            <span>Regional Food Balance Ledger</span>
          </div>
          <h3 className="font-editorial text-2xl font-bold text-white">
            Matching supply with shelter capacity
          </h3>
          <p className="text-sm text-[#D3DECD] leading-relaxed">
            While commercial zones generate significant ready-to-eat volume, community kitchens in adjacent wards often
            experience unpredictable stock shortages. FoodBridge's routing engine continuously monitors the equilibrium
            between donor surplus and NGO pantry capacity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-[#2D5A42]">
          <div>
            <p className="text-xs text-[#A3B899]">Average Match-to-Pickup Time</p>
            <p className="font-editorial text-2xl font-bold text-white tabular-nums mt-1">42 Minutes</p>
            <p className="text-[11px] text-[#A3B899] mt-0.5">Safely within the 4-hour window</p>
          </div>
          <div>
            <p className="text-xs text-[#A3B899]">Redistribution Success Rate</p>
            <p className="font-editorial text-2xl font-bold text-white tabular-nums mt-1">98.4%</p>
            <p className="text-[11px] text-[#A3B899] mt-0.5">Verified deliveries without spoilage</p>
          </div>
          <div>
            <p className="text-xs text-[#A3B899]">Estimated CO₂e Abated</p>
            <p className="font-editorial text-2xl font-bold text-white tabular-nums mt-1">37.1 Tonnes</p>
            <p className="text-[11px] text-[#A3B899] mt-0.5">Calculated at 2.5 kg CO₂e / kg saved</p>
          </div>
        </div>
      </section>
    </div>
  );
};
