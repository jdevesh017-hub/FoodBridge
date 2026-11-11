import React, { useState, useEffect } from 'react';
import {
  FoodCategory,
  UserProfile,
  UserRole,
  AnalyticsTimeRange,
  NgoDemandRequest,
} from '../../types';
import { analyticsService, MEAL_PORTION_KG, CO2_PER_KG_FOOD } from '../../services/analyticsService';
import { storageAdapter } from '../../services/storageAdapter';
import {
  Sparkles,
  TrendingUp,
  BarChart3,
  Calendar,
  Lightbulb,
  Clock,
  ShieldCheck,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Truck,
  HeartHandshake,
  Layers,
  ArrowRight,
  Plus,
  Info,
  X,
} from 'lucide-react';

interface WasteIntelligenceDashboardProps {
  currentUser?: UserProfile | null;
  currentRole?: UserRole;
  onNavigate?: (view: string) => void;
}

export const WasteIntelligenceDashboard: React.FC<WasteIntelligenceDashboardProps> = ({
  currentUser,
  currentRole = 'public',
  onNavigate,
}) => {
  // Multidimensional filter state
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('30d');
  const [selectedCategory, setSelectedCategory] = useState<'all' | FoodCategory>('all');
  const [dataOrigin, setDataOrigin] = useState<'all' | 'user_created' | 'curated_demo'>('all');
  const [perspective, setPerspective] = useState<UserRole | 'all'>(
    currentRole !== 'public' ? currentRole : 'all'
  );

  // NGO Demand Modal state
  const [showDemandModal, setShowDemandModal] = useState(false);
  const [demandCategory, setDemandCategory] = useState<FoodCategory>('prepared_meals');
  const [demandDailyKg, setDemandDailyKg] = useState<number>(50);
  const [demandUrgency, setDemandUrgency] = useState<'normal' | 'medium' | 'high'>('high');
  const [demandNotes, setDemandNotes] = useState('');

  // Storage mutation reactivity
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = storageAdapter.subscribe(() => {
      setTick((t) => t + 1);
    });
    return () => unsub();
  }, []);

  // Keyboard Escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDemandModal) {
        setShowDemandModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDemandModal]);

  // Construct active filter
  const activeDonorId =
    perspective === 'donor' && currentUser?.id ? currentUser.id : undefined;
  const activeNgoId =
    perspective === 'ngo' && currentUser?.id ? currentUser.id : undefined;
  const activeVolunteerId =
    perspective === 'volunteer' && currentUser?.id ? currentUser.id : undefined;

  const filterOptions = {
    timeRange,
    category: selectedCategory,
    origin: dataOrigin,
    donorId: activeDonorId,
    ngoId: activeNgoId,
    volunteerId: activeVolunteerId,
  };

  // Compute analytics
  const kpis = analyticsService.getFoodWasteKpis(filterOptions);
  const categoryBreakdown = analyticsService.getCategoryAnalysis(filterOptions);
  const dailyTrends = analyticsService.getDailyTrends(10, filterOptions);
  const weekdayDistribution = analyticsService.getWeekdayDistribution(filterOptions);
  const supplyVsDemand = analyticsService.getSupplyVsDemand(filterOptions);
  const recurringPatterns = analyticsService.getRecurringPatterns(filterOptions);
  const recommendations = analyticsService.getBetterDecisionRecommendations(filterOptions);
  const roleSummary = analyticsService.getRoleAnalyticsSummary(currentRole, currentUser || null);

  // Handle NGO demand submission
  const handleCreateDemand = (e: React.FormEvent) => {
    e.preventDefault();
    const newDemand: NgoDemandRequest = {
      id: `dem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ngoId: currentUser?.id || 'ngo_community_general',
      ngoName: currentUser?.organizationName || currentUser?.fullName || 'Community Shelter Hub',
      category: demandCategory,
      requestedDailyKg: Number(demandDailyKg),
      servingsTarget: Math.round(Number(demandDailyKg) / MEAL_PORTION_KG),
      requiredByDate: new Date().toISOString(),
      urgency: demandUrgency,
      status: 'active',
      fulfilledKg: 0,
      notes: demandNotes || 'Daily dining hall meal requirement',
      createdAt: new Date().toISOString(),
    };

    storageAdapter.addDemandRequest(newDemand);
    setShowDemandModal(false);
    setDemandNotes('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* 1. EDITORIAL HEADER & POSITIONING */}
      <div className="border-b border-[#E2DFD2] pb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#647C50]">
            <Sparkles className="w-4 h-4 text-[#C77A54]" />
            <span>FoodBridge Waste Intelligence & Heuristics</span>
          </div>

          {/* Data Origin Partition Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#E8EDE2] text-[#183D2B] text-xs font-medium border border-[#D3DECD]">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>
              Data Source:{' '}
              {dataOrigin === 'all'
                ? 'Combined Pilot & Live Logs'
                : dataOrigin === 'user_created'
                ? 'Live User Session Records Only'
                : 'Curated Pilot Demonstration'}
            </span>
          </div>
        </div>

        <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold text-[#183D2B] tracking-tight">
          Food waste is a design flaw. Here is how we trim it.
        </h1>
        <p className="text-sm sm:text-base text-[#50544C] max-w-4xl leading-relaxed">
          FoodBridge does not merely redistribute surplus food after the banquet ends. We analyze preparation logs,
          collection timestamps, and shelter intake patterns to identify recurring surplus cycles and help kitchen teams
          make better portioning decisions before waste occurs.
        </p>

        {/* 2. MULTI-DIMENSIONAL FILTER CONTROLS */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-4 text-xs bg-white p-4 rounded-xl border border-[#E2DFD2] shadow-xs">
          {/* Left: Perspective Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#183D2B] flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#647C50]" />
              Perspective:
            </span>
            <div className="inline-flex rounded border border-[#E2DFD2] bg-[#F7F6F0] p-0.5">
              <button
                type="button"
                onClick={() => setPerspective('all')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  perspective === 'all'
                    ? 'bg-[#183D2B] text-white shadow-2xs'
                    : 'text-[#50544C] hover:text-[#252923]'
                }`}
              >
                Platform
              </button>
              <button
                type="button"
                onClick={() => setPerspective('donor')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  perspective === 'donor'
                    ? 'bg-[#183D2B] text-white shadow-2xs'
                    : 'text-[#50544C] hover:text-[#252923]'
                }`}
              >
                Donor Kitchen
              </button>
              <button
                type="button"
                onClick={() => setPerspective('ngo')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  perspective === 'ngo'
                    ? 'bg-[#183D2B] text-white shadow-2xs'
                    : 'text-[#50544C] hover:text-[#252923]'
                }`}
              >
                Shelter (NGO)
              </button>
              <button
                type="button"
                onClick={() => setPerspective('volunteer')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  perspective === 'volunteer'
                    ? 'bg-[#183D2B] text-white shadow-2xs'
                    : 'text-[#50544C] hover:text-[#252923]'
                }`}
              >
                Courier Fleet
              </button>
            </div>
          </div>

          {/* Right: Date Range & Data Origin Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#647C50]" />
              <span className="text-[#50544C]">Time:</span>
              <div className="inline-flex rounded border border-[#E2DFD2] bg-[#F7F6F0] p-0.5">
                {(['7d', '30d', '90d', 'all'] as AnalyticsTimeRange[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTimeRange(r)}
                    className={`px-2.5 py-0.5 rounded uppercase font-mono text-[11px] font-semibold transition-colors ${
                      timeRange === r
                        ? 'bg-[#183D2B] text-white'
                        : 'text-[#50544C] hover:text-[#252923]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Origin partition filter */}
            <select
              value={dataOrigin}
              onChange={(e) => setDataOrigin(e.target.value as any)}
              className="px-2.5 py-1 bg-[#F7F6F0] border border-[#E2DFD2] rounded text-[#252923] text-xs font-medium"
            >
              <option value="all">All Records (Curated + Live)</option>
              <option value="user_created">Live User Session Data Only</option>
              <option value="curated_demo">Curated Pilot Baseline</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. KPI OVERVIEW: 6 CORE FOOD WASTE METRICS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-editorial text-2xl font-bold text-[#183D2B]">
            Food Waste Operational Balance
          </h2>
          <span className="text-xs text-[#50544C] font-mono">
            {kpis.totalRecordsCount} distinct recorded events
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* KPI 1: Total Surplus Recorded */}
          <div className="bg-white p-5 rounded-xl border border-[#E2DFD2] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#647C50]">
              <span className="font-semibold uppercase tracking-wider">Total Surplus Intake</span>
              <Scale className="w-4 h-4 text-[#C77A54]" />
            </div>
            <p className="font-editorial text-3xl font-bold text-[#183D2B] tabular-nums font-mono">
              {kpis.totalSurplusRecordedKg} <span className="text-lg font-sans font-normal text-[#50544C]">kg</span>
            </p>
            <div className="flex items-center justify-between text-[11px] text-[#50544C] pt-2 border-t border-[#E2DFD2]">
              <span>Meal Equivalents:</span>
              <span className="font-semibold text-[#183D2B]">
                ~{Math.round(kpis.totalSurplusRecordedKg / MEAL_PORTION_KG)} community meals
              </span>
            </div>
          </div>

          {/* KPI 2: Successfully Delivered */}
          <div className="bg-white p-5 rounded-xl border border-[#E2DFD2] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#647C50]">
              <span className="font-semibold uppercase tracking-wider">Successfully Redistributed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="font-editorial text-3xl font-bold text-emerald-900 tabular-nums font-mono">
              {kpis.totalDeliveredKg} <span className="text-lg font-sans font-normal text-[#50544C]">kg</span>
            </p>
            <div className="flex items-center justify-between text-[11px] text-[#50544C] pt-2 border-t border-[#E2DFD2]">
              <span>Verified Shelter Receipts:</span>
              <span className="font-semibold text-emerald-800">
                {kpis.completedDeliveriesCount} completed runs
              </span>
            </div>
          </div>

          {/* KPI 3: Food Recovery Rate */}
          <div className="bg-white p-5 rounded-xl border border-[#E2DFD2] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#647C50]">
              <span className="font-semibold uppercase tracking-wider">Food Recovery Rate</span>
              <TrendingUp className="w-4 h-4 text-[#183D2B]" />
            </div>
            <p className="font-editorial text-3xl font-bold text-[#183D2B] tabular-nums font-mono">
              {kpis.recoveryRatePct} <span className="text-lg font-sans font-normal text-[#50544C]">%</span>
            </p>
            {/* Progress bar */}
            <div className="w-full h-2 bg-[#E8EDE2] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#183D2B] transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, Math.max(kpis.recoveryRatePct, 2))}%` }}
              />
            </div>
            <p className="text-[10px] text-[#50544C] pt-1">
              Delivered weight divided by valid logged surplus volume.
            </p>
          </div>

          {/* KPI 4: Pending Quantity Breakdown */}
          <div className="bg-white p-5 rounded-xl border border-[#E2DFD2] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#647C50]">
              <span className="font-semibold uppercase tracking-wider">Pending In Pipeline</span>
              <Clock className="w-4 h-4 text-[#C77A54]" />
            </div>
            <p className="font-editorial text-3xl font-bold text-[#252923] tabular-nums font-mono">
              {kpis.pendingQuantitiesKg.totalPending}{' '}
              <span className="text-lg font-sans font-normal text-[#50544C]">kg</span>
            </p>
            <div className="flex items-center justify-between text-[10px] text-[#50544C] pt-2 border-t border-[#E2DFD2] flex-wrap gap-1">
              <span className="bg-[#E8EDE2] px-1.5 py-0.5 rounded text-[#183D2B] font-mono">
                {kpis.pendingQuantitiesKg.available}kg open
              </span>
              <span className="bg-amber-50 px-1.5 py-0.5 rounded text-amber-900 font-mono">
                {kpis.pendingQuantitiesKg.reserved}kg reserved
              </span>
              <span className="bg-blue-50 px-1.5 py-0.5 rounded text-blue-900 font-mono">
                {kpis.pendingQuantitiesKg.assigned + kpis.pendingQuantitiesKg.pickedUp}kg in transit
              </span>
            </div>
          </div>

          {/* KPI 5: Failed Pickups Count */}
          <div className="bg-white p-5 rounded-xl border border-[#E2DFD2] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#647C50]">
              <span className="font-semibold uppercase tracking-wider">Failed Pickup Incidents</span>
              <AlertTriangle className="w-4 h-4 text-amber-700" />
            </div>
            <p className="font-editorial text-3xl font-bold text-amber-900 tabular-nums font-mono">
              {kpis.failedPickupsCount}
            </p>
            <div className="flex items-center justify-between text-[11px] text-[#50544C] pt-2 border-t border-[#E2DFD2]">
              <span>Incident Rate:</span>
              <span className="font-semibold text-[#252923]">
                {kpis.totalRecordsCount > 0
                  ? `${Math.round((kpis.failedPickupsCount / kpis.totalRecordsCount) * 100)}% of runs`
                  : '0%'}
              </span>
            </div>
          </div>

          {/* KPI 6: Average Delivery Completion Time */}
          <div className="bg-white p-5 rounded-xl border border-[#E2DFD2] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#647C50]">
              <span className="font-semibold uppercase tracking-wider">Avg Delivery Handover</span>
              <Truck className="w-4 h-4 text-[#183D2B]" />
            </div>
            <p className="font-editorial text-3xl font-bold text-[#183D2B] tabular-nums font-mono">
              {kpis.averageDeliveryMinutes !== null ? (
                <>
                  {kpis.averageDeliveryMinutes}{' '}
                  <span className="text-lg font-sans font-normal text-[#50544C]">mins</span>
                </>
              ) : (
                <span className="text-base font-normal italic text-[#737373]">
                  Awaiting timed runs
                </span>
              )}
            </p>
            <div className="flex items-center justify-between text-[11px] text-[#50544C] pt-2 border-t border-[#E2DFD2]">
              <span>Thermal Holding Ceiling:</span>
              <span className="font-semibold text-emerald-800">240 mins (Codex standard)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SIGNATURE FEATURE: "YOUR NEXT BETTER DECISION" */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2DFD2] pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#C77A54]">
              <Lightbulb className="w-4 h-4 text-[#C77A54]" />
              <span>The Signature Feature of FoodBridge</span>
            </div>
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#183D2B] mt-0.5">
              Your Next Better Decision
            </h2>
            <p className="text-sm text-[#50544C] max-w-3xl">
              Rule-based, traceable recommendations derived directly from historical kitchen intake logs and delivery
              cadence. We don't guess — every insight cites underlying logged records.
            </p>
          </div>
          <span className="text-xs text-[#183D2B] bg-[#E8EDE2] px-3 py-1 rounded border border-[#D3DECD] font-medium self-start sm:self-auto">
            {recommendations.length} Active Heuristic Model{recommendations.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`rounded-xl p-6 border flex flex-col justify-between transition-all ${
                rec.hasSufficientEvidence
                  ? 'bg-white border-[#E2DFD2] shadow-xs hover:border-[#647C50]'
                  : 'bg-[#FBF9F5] border-dashed border-[#D3DECD] text-[#737373]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#647C50]">
                    {rec.supportingRecordCount} supporting records
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      rec.confidenceIndicator === 'high'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : rec.confidenceIndicator === 'medium'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    {Math.round(rec.confidenceScore * 100)}% confidence
                  </span>
                </div>

                <h3 className="font-editorial text-lg font-bold text-[#183D2B] leading-snug">
                  {rec.title}
                </h3>

                <p className="text-xs text-[#50544C] leading-relaxed">
                  <strong>Pattern:</strong> {rec.detectedPattern}
                </p>

                <div className="p-3.5 bg-[#F7F6F0] rounded border border-[#E2DFD2] text-xs space-y-1 text-[#252923]">
                  <p className="font-semibold text-[#183D2B] flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-[#C77A54]" />
                    <span>Suggested Kitchen Action</span>
                  </p>
                  <p className="text-[#50544C] leading-relaxed">{rec.suggestedAction}</p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#E2DFD2] flex items-center justify-between text-[11px] text-[#647C50]">
                <span>Window: {rec.analysisPeriod}</span>
                <span className="font-semibold text-[#183D2B]">Traceable Rule</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CATEGORY BREAKDOWN & WORKING CATEGORY FILTER */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Category Analysis Table / Progress */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-[#E2DFD2] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2DFD2] pb-3">
            <div>
              <h3 className="font-editorial text-xl font-bold text-[#183D2B]">
                Surplus Volume by Food Category
              </h3>
              <p className="text-xs text-[#50544C]">
                Click any category to filter the entire intelligence view.
              </p>
            </div>
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="text-xs text-[#C77A54] hover:underline font-medium self-start sm:self-auto"
              >
                Reset Filter (Showing all)
              </button>
            )}
          </div>

          <div className="space-y-4">
            {categoryBreakdown.map((item) => {
              const isSelected = selectedCategory === item.category;
              return (
                <div
                  key={item.category}
                  onClick={() =>
                    setSelectedCategory(isSelected ? 'all' : item.category)
                  }
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#183D2B] bg-[#E8EDE2]/60 ring-1 ring-[#183D2B]'
                      : 'border-[#E2DFD2] hover:border-[#647C50] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[#252923] capitalize flex items-center gap-1.5">
                      <span>{item.category.replace(/_/g, ' ')}</span>
                      {isSelected && (
                        <span className="text-[10px] bg-[#183D2B] text-white px-1.5 py-0.2 rounded font-normal">
                          Active Filter
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-3 font-mono tabular-nums text-xs">
                      <span className="text-[#183D2B] font-bold">{item.recordedKg} kg logged</span>
                      <span className="text-emerald-800 font-semibold">{item.deliveredKg} kg delivered</span>
                      <span className="text-[#50544C]">({item.percentageOfTotal}%)</span>
                    </div>
                  </div>

                  {/* Dual Bar (Delivered vs Pending/Lost) */}
                  <div className="w-full h-2.5 bg-[#E8EDE2] rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-800 transition-all duration-500"
                      style={{
                        width: `${item.recordedKg > 0 ? (item.deliveredKg / item.recordedKg) * 100 : 0}%`,
                      }}
                      title={`${item.deliveredKg} kg delivered`}
                    />
                    <div
                      className="h-full bg-[#183D2B]/50 transition-all duration-500"
                      style={{
                        width: `${item.recordedKg > 0 ? (item.pendingKg / item.recordedKg) * 100 : 0}%`,
                      }}
                      title={`${item.pendingKg} kg pending`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#E2DFD2] flex items-center justify-between text-[11px] text-[#50544C]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-800 inline-block" /> Delivered
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#183D2B]/50 inline-block" /> Pending
            </span>
            <span>Explicit units in kilograms (kg)</span>
          </div>
        </div>

        {/* Right Column: Day-of-Week Cadence (Real Timestamps) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-[#E2DFD2] shadow-xs space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
              <div>
                <h3 className="font-editorial text-xl font-bold text-[#183D2B]">
                  Surplus Cadence by Weekday
                </h3>
                <p className="text-xs text-[#50544C]">
                  Volume distribution from actual record timestamps.
                </p>
              </div>
              <Calendar className="w-5 h-5 text-[#647C50]" />
            </div>

            {/* Vertical column bars */}
            <div className="grid grid-cols-7 gap-2 pt-6 items-end h-44">
              {weekdayDistribution.map((w) => {
                const maxKg = Math.max(...weekdayDistribution.map((i) => i.recordedKg), 1);
                const heightPct = Math.round((w.recordedKg / maxKg) * 100);
                return (
                  <div key={w.day} className="flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="font-mono text-[10px] tabular-nums text-[#50544C]">
                      {w.recordedKg > 0 ? `${w.recordedKg}k` : '0'}
                    </span>
                    <div
                      className={`w-full rounded-t transition-all duration-300 ${
                        w.percentage >= 25 ? 'bg-[#183D2B]' : 'bg-[#647C50]'
                      }`}
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                      title={`${w.day}: ${w.recordedKg} kg (${w.count} events)`}
                    />
                    <span className="text-xs font-semibold text-[#252923]">{w.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-[#E8EDE2] rounded border border-[#D3DECD] text-xs text-[#183D2B] flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-[#C77A54] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Cadence Peak:</strong> Banquet preparation cycles trigger elevated volumes toward the weekend. Volunteer courier dispatch runs are automatically pre-routed during these windows.
            </p>
          </div>
        </div>
      </section>

      {/* 6. SUPPLY VERSUS DEMAND ANALYSIS (NGO DEMAND LEDGER) */}
      <section className="bg-white p-6 sm:p-8 rounded-xl border border-[#E2DFD2] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2DFD2] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#647C50]">
              <HeartHandshake className="w-4 h-4 text-[#C77A54]" />
              <span>Supply & Demand Equilibrium</span>
            </div>
            <h3 className="font-editorial text-2xl font-bold text-[#183D2B] mt-0.5">
              Matching Kitchen Supply with Shelter Capacity
            </h3>
            <p className="text-xs sm:text-sm text-[#50544C] max-w-3xl">
              We compare actual donor surplus intake against verified NGO daily shelter targets to prevent unfulfilled
              shortages in community dining halls.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDemandModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] rounded shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Shelter Demand Target</span>
          </button>
        </div>

        {/* Aggregate supply vs demand numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#F7F6F0] rounded-xl border border-[#E2DFD2] text-xs">
          <div>
            <span className="text-[#647C50]">Total Food Supply Logged</span>
            <p className="font-editorial text-2xl font-bold text-[#183D2B] font-mono">
              {supplyVsDemand.totalSupplyKg} kg
            </p>
          </div>
          <div>
            <span className="text-[#647C50]">Shelter Demand Requested</span>
            <p className="font-editorial text-2xl font-bold text-[#183D2B] font-mono">
              {supplyVsDemand.totalDemandKg} kg
            </p>
          </div>
          <div>
            <span className="text-[#647C50]">Actual Received at Pantries</span>
            <p className="font-editorial text-2xl font-bold text-emerald-900 font-mono">
              {supplyVsDemand.totalReceivedKg} kg
            </p>
          </div>
          <div>
            <span className="text-[#647C50]">Unfulfilled Demand Deficit</span>
            <p className="font-editorial text-2xl font-bold text-amber-900 font-mono">
              {supplyVsDemand.totalUnfulfilledKg} kg
            </p>
          </div>
        </div>

        {/* Category-wise supply vs demand coverage */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#183D2B]">
            Category Demand Fulfillment Ratios
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supplyVsDemand.metrics.map((m) => (
              <div
                key={m.category}
                className="p-3.5 bg-white rounded border border-[#E2DFD2] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#252923] capitalize">
                    {m.category.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`font-mono font-bold text-xs ${
                      m.coverageRatioPct >= 80
                        ? 'text-emerald-800'
                        : m.coverageRatioPct >= 50
                        ? 'text-amber-800'
                        : 'text-red-800'
                    }`}
                  >
                    {m.coverageRatioPct}% fulfilled
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#50544C] font-mono">
                  <span>Supply: {m.supplyRecordedKg} kg</span>
                  <span>Demand: {m.demandRequestedKg} kg</span>
                  <span>Deficit: {m.unfulfilledDemandKg} kg</span>
                </div>

                <div className="w-full h-2 bg-[#E8EDE2] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      m.coverageRatioPct >= 80
                        ? 'bg-emerald-800'
                        : m.coverageRatioPct >= 50
                        ? 'bg-amber-700'
                        : 'bg-red-700'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(m.coverageRatioPct, 4))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. RECURRING SURPLUS PATTERNS & HEURISTICS */}
      <section className="space-y-4">
        <div className="border-b border-[#E2DFD2] pb-3">
          <h3 className="font-editorial text-2xl font-bold text-[#183D2B]">
            Detected Production Patterns
          </h3>
          <p className="text-xs sm:text-sm text-[#50544C]">
            Pattern discovery requiring a minimum sample size before claiming recurring cycles.
          </p>
        </div>

        {recurringPatterns.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-[#E2DFD2] text-center space-y-2">
            <Info className="w-6 h-6 text-[#647C50] mx-auto" />
            <p className="font-editorial text-lg text-[#252923]">
              Minimum Sample Threshold Not Yet Reached
            </p>
            <p className="text-xs text-[#50544C] max-w-md mx-auto">
              Our pattern engine requires at least 3 distinct surplus batches under the active filter before confirming recurring operational habits.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recurringPatterns.map((pat) => (
              <div
                key={pat.id}
                className="bg-white p-5 rounded-xl border border-[#E2DFD2] shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-[#647C50]">
                  <span className="font-semibold uppercase tracking-wider capitalize">
                    {pat.type.replace(/_/g, ' ')}
                  </span>
                  <span className="font-mono text-xs text-[#183D2B] font-bold">
                    {Math.round(pat.confidenceScore * 100)}% match
                  </span>
                </div>

                <h4 className="font-editorial text-lg font-bold text-[#183D2B] leading-tight">
                  {pat.title}
                </h4>

                <p className="text-xs text-[#50544C] leading-relaxed">
                  {pat.description}
                </p>

                <div className="pt-2 border-t border-[#E2DFD2] text-[11px] text-[#647C50] flex items-center justify-between">
                  <span>{pat.analysisPeriod}</span>
                  <span className="font-mono">{pat.supportingRecordCount} records verified</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 8. ENVIRONMENTAL IMPACT CONVERSIONS & ASSUMPTIONS */}
      <section className="bg-[#183D2B] text-white p-8 rounded-xl shadow-xs space-y-4">
        <div className="max-w-3xl space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#A3B899]">
            <ShieldCheck className="w-4 h-4 text-[#C77A54]" />
            <span>Documented Environmental Conversion Methodology</span>
          </div>
          <h3 className="font-editorial text-2xl sm:text-3xl font-bold">
            Transparent and Defensible Impact Metrics
          </h3>
          <p className="text-xs sm:text-sm text-[#D3DECD] leading-relaxed">
            FoodBridge rejects fabricated carbon statistics. Our environmental figures are calculated directly from verified kilograms delivered, using published food waste life-cycle emission factors (FAO / WRAP guidelines: 2.5 kg CO₂e avoided per kg food rescued from anaerobic landfill decomposition).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-[#2D5A42] text-xs">
          <div>
            <span className="text-[#A3B899]">Verified Diverted Weight</span>
            <p className="font-editorial text-2xl font-bold text-white font-mono mt-1">
              {kpis.totalDeliveredKg} kg
            </p>
            <p className="text-[11px] text-[#A3B899] mt-0.5">Strictly confirmed receipts only</p>
          </div>
          <div>
            <span className="text-[#A3B899]">CO₂e Avoided</span>
            <p className="font-editorial text-2xl font-bold text-white font-mono mt-1">
              {Math.round(kpis.totalDeliveredKg * CO2_PER_KG_FOOD * 10) / 10} kg
            </p>
            <p className="text-[11px] text-[#A3B899] mt-0.5">Calculated at 2.5 kg CO₂e / kg</p>
          </div>
          <div>
            <span className="text-[#A3B899]">Community Servings</span>
            <p className="font-editorial text-2xl font-bold text-white font-mono mt-1">
              ~{Math.round(kpis.totalDeliveredKg / MEAL_PORTION_KG)} meals
            </p>
            <p className="text-[11px] text-[#A3B899] mt-0.5">Based on 350g meal standard</p>
          </div>
        </div>
      </section>

      {/* MODAL: SUBMIT SHELTER DEMAND TARGET */}
      {showDemandModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="demand-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <form
            onSubmit={handleCreateDemand}
            className="bg-[#F7F6F0] rounded-xl max-w-md w-full border border-[#E2DFD2] shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
              <div className="flex items-center gap-2 text-[#183D2B]">
                <HeartHandshake className="w-5 h-5 text-[#C77A54]" />
                <h3 id="demand-modal-title" className="font-editorial text-xl font-bold">
                  Register Shelter Food Demand
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDemandModal(false)}
                aria-label="Close demand dialog"
                className="text-[#50544C] hover:text-[#252923] p-1 rounded focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#50544C]">
              Specify your facility's daily intake requirements. This establishes our live supply vs. demand balance index.
            </p>

            <div className="space-y-3 bg-white p-4 rounded border border-[#E2DFD2] text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#252923] mb-1">
                  Food Category Needed *
                </label>
                <select
                  value={demandCategory}
                  onChange={(e) => setDemandCategory(e.target.value as FoodCategory)}
                  className="w-full px-3 py-1.5 text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded"
                >
                  <option value="prepared_meals">Cooked Prepared Meals (Hot/Chilled)</option>
                  <option value="bakery_grains">Bakery & Grains (Loaves, Buns)</option>
                  <option value="fresh_produce">Fresh Produce (Raw Fruits & Vegetables)</option>
                  <option value="dairy_chilled">Dairy & Chilled Staples</option>
                  <option value="packaged_dry">Packaged Dry Staples (Rice, Pulses)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252923] mb-1">
                  Daily Quantity Target (kg) *
                </label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  step="5"
                  required
                  value={demandDailyKg}
                  onChange={(e) => setDemandDailyKg(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded font-mono font-bold"
                />
                <p className="text-[10px] text-[#647C50] mt-0.5">
                  Meal Equivalents: ~{Math.round(demandDailyKg / MEAL_PORTION_KG)} portions/day
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252923] mb-1">
                  Urgency Level *
                </label>
                <select
                  value={demandUrgency}
                  onChange={(e) => setDemandUrgency(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded"
                >
                  <option value="high">High (Immediate pantry deficit)</option>
                  <option value="medium">Medium (Regular planned service)</option>
                  <option value="normal">Normal (Standing buffer)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252923] mb-1">
                  Specific Requirements or Dietary Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vegetarian only, senior dining lunch service by 12:30"
                  value={demandNotes}
                  onChange={(e) => setDemandNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2DFD2]">
              <button
                type="button"
                onClick={() => setShowDemandModal(false)}
                className="px-4 py-2 text-xs text-[#50544C]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-[#183D2B] rounded hover:bg-[#254F38] shadow-xs"
              >
                Save Demand Target
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
