import React, { useState } from 'react';
import { donationService } from '../../services/donationService';
import { FoodCategory, FoodDonation, StorageCondition, UserProfile, DietaryTag } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Scale,
  X,
  Edit3,
  Ban,
  FileText,
  Eye,
  Lightbulb,
  ArrowRight,
  TrendingUp,
  History,
  Package,
  Layers,
  Award
} from 'lucide-react';

interface DonorDashboardProps {
  user: UserProfile | null;
  onViewSafetyAudit: (donation: FoodDonation) => void;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onNavigate: (view: string) => void;
  initialTab?: 'overview' | 'donations' | 'create' | 'history';
}

export const DonorDashboard: React.FC<DonorDashboardProps> = ({
  user,
  onViewSafetyAudit,
  onShowToast,
  onNavigate,
  initialTab = 'overview',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'donations' | 'history'>(
    initialTab === 'create' ? 'donations' : (initialTab as 'overview' | 'donations' | 'history')
  );
  const [showCreateModal, setShowCreateModal] = useState(initialTab === 'create');
  const [editingDonation, setEditingDonation] = useState<FoodDonation | null>(null);
  const [cancellingDonation, setCancellingDonation] = useState<FoodDonation | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('Surplus lot no longer available');
  const [receiptDonation, setReceiptDonation] = useState<FoodDonation | null>(null);
  const [inspectDonation, setInspectDonation] = useState<FoodDonation | null>(null);

  // Sub-filters for active and history lists
  const [activeSubFilter, setActiveSubFilter] = useState<'all' | 'available' | 'reserved' | 'in_transit'>('all');
  const [historySubFilter, setHistorySubFilter] = useState<'all' | 'delivered' | 'cancelled'>('all');

  const donorId = user?.role === 'donor' && user?.id ? user.id : '';
  const donorName = user?.organizationName || user?.fullName || '';
  const donorAddress = user?.address || '';
  const donorPhone = user?.phone || '';

  const myDonations = donorId ? donationService.getDonationsByDonor(donorId) : [];

  // Sync when initialTab prop changes from external router (Navbar, etc.)
  React.useEffect(() => {
    if (initialTab) {
      if (initialTab === 'create') {
        setActiveTab('donations');
        openCreateModal();
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [initialTab]);

  const handleTabSelect = (tab: 'overview' | 'donations' | 'history') => {
    setActiveTab(tab);
    if (tab === 'overview') onNavigate('donor_dashboard');
    else if (tab === 'donations') onNavigate('donor_donations');
    else if (tab === 'history') onNavigate('donor_history');
  };

  // Handle keyboard Escape for all modals
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCreateModal) {
          setShowCreateModal(false);
          setEditingDonation(null);
        } else if (cancellingDonation) {
          setCancellingDonation(null);
        } else if (inspectDonation) {
          setInspectDonation(null);
        } else if (receiptDonation) {
          setReceiptDonation(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal, cancellingDonation, inspectDonation, receiptDonation]);

  // Form State for Create & Edit
  const [foodName, setFoodName] = useState('');
  const [foodCategory, setFoodCategory] = useState<FoodCategory>('prepared_meals');
  const [description, setDescription] = useState('');
  const [estimatedKg, setEstimatedKg] = useState<number>(20);
  const [measuredKg, setMeasuredKg] = useState<string>('');
  const [storageCondition, setStorageCondition] = useState<StorageCondition>('hot_held');
  const [temperatureCelsius, setTemperatureCelsius] = useState<string>('68');
  const [temperatureUnit, setTemperatureUnit] = useState<'celsius' | 'fahrenheit'>('celsius');
  const [packagingCondition, setPackagingCondition] = useState<'food_grade_sealed' | 'covered_clean' | 'loose_unsealed' | 'damaged_packaging'>('food_grade_sealed');
  const [prepTimeMinutesAgo, setPrepTimeMinutesAgo] = useState<number>(30);
  const [isCleanPackaged, setIsCleanPackaged] = useState(true);
  const [isAllergenLabelled, setIsAllergenLabelled] = useState(true);
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>(['vegetarian']);
  const [foodHandlingNotes, setFoodHandlingNotes] = useState('');
  const [bestBeforeDate, setBestBeforeDate] = useState('');
  const [pickupHoursRemaining, setPickupHoursRemaining] = useState<number>(2.5);
  const [specialNotes, setSpecialNotes] = useState('');

  // Sliced collections
  const activeDonations = myDonations.filter((d) =>
    ['available', 'reserved', 'assigned', 'arrived_at_donor', 'picked_up', 'in_transit', 'awaiting_ngo_confirmation'].includes(d.status)
  );
  const historyDonations = myDonations.filter((d) =>
    ['delivered', 'cancelled_by_donor', 'cancelled_by_ngo', 'pickup_failed'].includes(d.status)
  );

  // Metrics
  const activeCount = activeDonations.length;
  const completedCount = myDonations.filter((d) => d.status === 'delivered').length;
  const totalRecoveredKg = myDonations.reduce((acc, d) => {
    return acc + (d.quantity.deliveredKg || d.quantity.pickupConfirmedKg || d.quantity.measuredKg || d.quantity.donorEstimatedKg);
  }, 0);
  const pendingPickups = myDonations.filter((d) => ['reserved', 'assigned', 'arrived_at_donor'].includes(d.status)).length;
  const totalMealsProvided = myDonations.reduce((acc, d) => {
    return acc + (d.impactReceipt?.mealsProvided || d.quantity.servingsEstimate || Math.round((d.quantity.deliveredKg || d.quantity.donorEstimatedKg) / 0.35));
  }, 0);

  // Category breakdown for Overview
  const categoryStats: Record<string, number> = {};
  myDonations.forEach((d) => {
    const kg = d.quantity.deliveredKg || d.quantity.pickupConfirmedKg || d.quantity.measuredKg || d.quantity.donorEstimatedKg;
    categoryStats[d.foodCategory] = (categoryStats[d.foodCategory] || 0) + kg;
  });

  const openCreateModal = () => {
    setEditingDonation(null);
    setFoodName('');
    setFoodCategory('prepared_meals');
    setDescription('');
    setEstimatedKg(20);
    setMeasuredKg('');
    setStorageCondition('hot_held');
    setTemperatureCelsius('68');
    setTemperatureUnit('celsius');
    setPackagingCondition('food_grade_sealed');
    setPrepTimeMinutesAgo(30);
    setIsCleanPackaged(true);
    setIsAllergenLabelled(true);
    setDietaryTags(['vegetarian']);
    setFoodHandlingNotes('');
    setBestBeforeDate('');
    setPickupHoursRemaining(2.5);
    setSpecialNotes('');
    setShowCreateModal(true);
  };

  const openEditModal = (donation: FoodDonation) => {
    if (donation.status !== 'available') {
      onShowToast(`Cannot edit listing: Already ${donation.status.replace(/_/g, ' ')}.`, 'error');
      return;
    }
    setEditingDonation(donation);
    setFoodName(donation.foodName);
    setFoodCategory(donation.foodCategory);
    setDescription(donation.description);
    setEstimatedKg(donation.quantity.donorEstimatedKg);
    setMeasuredKg(donation.quantity.measuredKg !== undefined ? String(donation.quantity.measuredKg) : '');
    setStorageCondition(donation.safety.storageCondition);
    setTemperatureCelsius(donation.safety.temperatureCelsius !== undefined ? String(donation.safety.temperatureCelsius) : '');
    setTemperatureUnit(donation.safety.temperatureUnit || 'celsius');
    setPackagingCondition(donation.safety.packagingCondition || (donation.safety.isCleanPackaged ? 'food_grade_sealed' : 'loose_unsealed'));
    setFoodHandlingNotes(donation.safety.foodHandlingNotes || '');
    setBestBeforeDate(donation.safety.bestBeforeTimestamp ? donation.safety.bestBeforeTimestamp.slice(0, 10) : '');
    setPrepTimeMinutesAgo(Math.max(5, Math.round(donation.safety.hoursSincePreparation * 60)));
    setIsCleanPackaged(donation.safety.isCleanPackaged);
    setIsAllergenLabelled(donation.safety.isAllergenLabelled);
    setDietaryTags(donation.dietaryTags);
    setPickupHoursRemaining(2.5);
    setSpecialNotes(donation.specialHandlingNotes || '');
    setShowCreateModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!foodName.trim()) {
      onShowToast('Please provide a food item name or preparation title.', 'error');
      return;
    }

    if (!estimatedKg || Number(estimatedKg) <= 0) {
      onShowToast('Please enter a valid surplus quantity in kilograms (greater than 0).', 'error');
      return;
    }

    if (pickupHoursRemaining <= 0 || pickupHoursRemaining > 24) {
      onShowToast('Pickup deadline must be between 0.5 and 24 hours.', 'error');
      return;
    }

    const prepTimeIso = new Date(Date.now() - prepTimeMinutesAgo * 60 * 1000).toISOString();
    const pickupStart = new Date().toISOString();
    const pickupEnd = new Date(Date.now() + pickupHoursRemaining * 60 * 60 * 1000).toISOString();

    if (editingDonation) {
      const result = donationService.updateDonation(
        editingDonation.id,
        donorId,
        {
          foodName,
          foodCategory,
          description,
          dietaryTags,
          donorEstimatedKg: Number(estimatedKg),
          measuredKg: measuredKg ? Number(measuredKg) : undefined,
          storageCondition,
          temperatureCelsius: temperatureCelsius !== '' ? Number(temperatureCelsius) : undefined,
          temperatureUnit,
          packagingCondition,
          foodHandlingNotes,
          bestBeforeTimestamp: bestBeforeDate ? new Date(bestBeforeDate).toISOString() : undefined,
          preparationTimestamp: prepTimeIso,
          isCleanPackaged: packagingCondition === 'food_grade_sealed' || packagingCondition === 'covered_clean',
          isAllergenLabelled,
          pickupWindowStart: pickupStart,
          pickupWindowEnd: pickupEnd,
          specialHandlingNotes: specialNotes,
        },
        user?.role || 'donor'
      );

      if (result.success && result.donation) {
        onShowToast(`Listing updated successfully: "${result.donation.foodName}".`, 'success');
        setShowCreateModal(false);
        setEditingDonation(null);
      } else {
        onShowToast(result.error || 'Failed to update surplus listing.', 'error');
      }
    } else {
      const result = donationService.createDonation({
        donorId,
        donorName,
        donorType: (user?.organizationType as any) || 'hotel',
        donorAddress,
        donorLat: user?.lat || 19.0760,
        donorLng: user?.lng || 72.8777,
        donorContactPhone: donorPhone,
        foodName,
        foodCategory,
        description,
        dietaryTags,
        donorEstimatedKg: Number(estimatedKg),
        measuredKg: measuredKg ? Number(measuredKg) : undefined,
        storageCondition,
        temperatureCelsius: temperatureCelsius !== '' ? Number(temperatureCelsius) : undefined,
        temperatureUnit,
        packagingCondition,
        foodHandlingNotes,
        bestBeforeTimestamp: bestBeforeDate ? new Date(bestBeforeDate).toISOString() : undefined,
        preparationTimestamp: prepTimeIso,
        isCleanPackaged: packagingCondition === 'food_grade_sealed' || packagingCondition === 'covered_clean',
        isAllergenLabelled,
        pickupWindowStart: pickupStart,
        pickupWindowEnd: pickupEnd,
        specialHandlingNotes: specialNotes,
        photoUrl: '/images/hero_food_redistribution_1794331332502.jpg',
      });

      if (result.success && result.donation) {
        onShowToast(`Surplus logged successfully: "${result.donation.foodName}". NGOs notified.`, 'success');
        setShowCreateModal(false);
      } else {
        onShowToast(result.error || 'Failed to publish surplus.', 'error');
      }
    }
  };

  const handleConfirmCancelListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingDonation) return;

    const res = donationService.cancelDonationByDonor(
      cancellingDonation.id,
      donorId,
      cancelReasonInput,
      user?.role || 'donor'
    );
    if (res.success) {
      onShowToast(`Donation "${cancellingDonation.foodName}" cancelled.`, 'info');
      setCancellingDonation(null);
    } else {
      onShowToast(res.error || 'Unable to cancel donation.', 'error');
    }
  };

  // Filtered list for "My Donations" tab
  const filteredActiveDonations = activeDonations.filter((d) => {
    if (activeSubFilter === 'available') return d.status === 'available';
    if (activeSubFilter === 'reserved') return ['reserved', 'assigned', 'arrived_at_donor'].includes(d.status);
    if (activeSubFilter === 'in_transit') return ['picked_up', 'in_transit', 'awaiting_ngo_confirmation'].includes(d.status);
    return true;
  });

  // Filtered list for "Donation History" tab
  const filteredHistoryDonations = historyDonations.filter((d) => {
    if (historySubFilter === 'delivered') return d.status === 'delivered';
    if (historySubFilter === 'cancelled') return ['cancelled_by_donor', 'cancelled_by_ngo', 'pickup_failed'].includes(d.status);
    return true;
  });

  if (!user || user.role !== 'donor') {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="bg-white rounded-xl border border-[#E2DFD2] p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#E8EDE2] text-[#183D2B] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-[#183D2B]" />
          </div>
          <h2 className="font-editorial text-2xl font-bold text-[#183D2B]">Sign In Required</h2>
          <p className="text-xs text-[#50544C] leading-relaxed">
            Please sign in with a registered donor account or select the <strong>Donor Demo Persona</strong> from the top banner to access the Donor Portal.
          </p>
          <button
            onClick={() => onNavigate('landing')}
            className="w-full py-2.5 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] transition-colors rounded shadow-xs cursor-pointer"
          >
            Return to Public Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Editorial Header with Facility Details & Portal Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DFD2] pb-6">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-[#647C50]">
            Donor Operations · Commercial Kitchen
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#183D2B] mt-1">
            Good day, {user?.fullName || donorName}.
          </h1>
          <p className="text-sm text-[#50544C] mt-1">
            Active facility: <span className="font-medium text-[#252923]">{donorName}</span> ({donorAddress})
            {user?.verified === false && (
              <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                <AlertCircle className="w-3 h-3 text-amber-700" />
                Account Verification Pending
              </span>
            )}
          </p>
        </div>

        {/* Tab Selector & Primary Action */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <div className="flex items-center gap-1 bg-[#E8EDE2] p-1 rounded">
            <button
              onClick={() => handleTabSelect('overview')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeTab === 'overview'
                  ? 'bg-white text-[#183D2B] shadow-2xs'
                  : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => handleTabSelect('donations')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeTab === 'donations'
                  ? 'bg-white text-[#183D2B] shadow-2xs'
                  : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              My Donations ({activeCount})
            </button>
            <button
              onClick={() => handleTabSelect('history')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeTab === 'history'
                  ? 'bg-white text-[#183D2B] shadow-2xs'
                  : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              Donation History ({historyDonations.length})
            </button>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] transition-all rounded shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Surplus Batch</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          PAGE 1: OVERVIEW TAB
          ============================================================ */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
              <p className="text-xs text-[#647C50]">Active Surplus Batches</p>
              <p className="font-editorial text-3xl font-bold text-[#183D2B] tabular-nums mt-1">{activeCount}</p>
              <p className="text-[11px] text-[#50544C] mt-1">Open in pool or courier en route</p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
              <p className="text-xs text-[#647C50]">Pending Pickups</p>
              <p className="font-editorial text-3xl font-bold text-[#C77A54] tabular-nums mt-1">{pendingPickups}</p>
              <p className="text-[11px] text-[#50544C] mt-1">Couriers en route to kitchen</p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
              <p className="text-xs text-[#647C50]">Total Surplus Diverted</p>
              <p className="font-editorial text-3xl font-bold text-[#183D2B] tabular-nums mt-1">
                {Math.round(totalRecoveredKg)} <span className="text-sm font-sans font-normal text-[#50544C]">kg</span>
              </p>
              <p className="text-[11px] text-[#50544C] mt-1">Diverted from municipal disposal</p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
              <p className="text-xs text-[#647C50]">Community Meals Served</p>
              <p className="font-editorial text-3xl font-bold text-[#183D2B] tabular-nums mt-1">
                ~{totalMealsProvided}
              </p>
              <p className="text-[11px] text-[#50544C] mt-1">Across {completedCount} verified deliveries</p>
            </div>
          </div>

          {/* Kitchen Intelligence & Calibration Banner */}
          <div className="bg-[#E8EDE2] border border-[#D3DECD] p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#183D2B] text-white flex items-center justify-center shrink-0 mt-0.5">
                <Lightbulb className="w-5 h-5 text-[#C77A54]" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#647C50]">
                  Waste Prevention Intelligence · Kitchen Calibration
                </span>
                <h3 className="font-editorial text-lg font-bold text-[#183D2B] mt-0.5">
                  Prevent surplus before it leaves the cooking range.
                </h3>
                <p className="text-xs text-[#50544C] max-w-2xl mt-0.5">
                  FoodBridge analyzes your preparation logs to detect recurring surplus patterns and recommend portioning adjustments.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('intelligence')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] rounded shadow-xs shrink-0 self-start md:self-auto cursor-pointer"
            >
              <span>Explore Waste Intelligence</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2-Column Overview Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Recent Activity Feed (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
                <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#647C50]" />
                    <h2 className="font-editorial text-lg font-bold text-[#183D2B]">Recent Surplus Activity</h2>
                  </div>
                  <button
                    onClick={() => handleTabSelect('donations')}
                    className="text-xs font-semibold text-[#183D2B] hover:underline"
                  >
                    View All Active ({activeCount})
                  </button>
                </div>

                {myDonations.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="font-editorial text-[#50544C]">No donation activity recorded yet.</p>
                    <p className="text-xs text-[#737373]">Publish your first commercial surplus batch to start.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myDonations.slice(0, 4).map((d) => (
                      <div
                        key={d.id}
                        className="p-3.5 rounded border border-[#E2DFD2] bg-[#FBF9F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-sm text-[#183D2B]">{d.foodName}</p>
                          <p className="text-[11px] text-[#50544C]">
                            {d.quantity.measuredKg || d.quantity.donorEstimatedKg} kg · {d.foodCategory.replace(/_/g, ' ')}
                            {d.reservedByNgoName && ` · Claimed by ${d.reservedByNgoName}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <StatusBadge status={d.status} />
                          <button
                            onClick={() => setInspectDonation(d)}
                            className="text-xs text-[#183D2B] hover:underline font-semibold"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Category Distribution & Quality Health (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Category Breakdown */}
              <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs space-y-3">
                <div className="flex items-center gap-2 border-b border-[#E2DFD2] pb-3">
                  <Layers className="w-4 h-4 text-[#647C50]" />
                  <h3 className="font-editorial text-lg font-bold text-[#183D2B]">Surplus by Category</h3>
                </div>

                <div className="space-y-2.5 text-xs">
                  {Object.entries(categoryStats).length === 0 ? (
                    <p className="text-xs text-[#737373]">No volume history available.</p>
                  ) : (
                    Object.entries(categoryStats).map(([cat, kg]) => {
                      const pct = Math.round((kg / (totalRecoveredKg || 1)) * 100);
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-[#252923] font-medium">
                            <span className="capitalize">{cat.replace(/_/g, ' ')}</span>
                            <span className="font-mono">{kg.toFixed(1)} kg ({pct}%)</span>
                          </div>
                          <div className="w-full bg-[#E8EDE2] h-2 rounded-full overflow-hidden">
                            <div className="bg-[#183D2B] h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Food Safety & Compliance Health */}
              <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs space-y-3">
                <div className="flex items-center gap-2 border-b border-[#E2DFD2] pb-3">
                  <ShieldCheck className="w-4 h-4 text-[#183D2B]" />
                  <h3 className="font-editorial text-lg font-bold text-[#183D2B]">FSSAI Compliance Status</h3>
                </div>

                <div className="text-xs space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-[#E8EDE2] rounded text-[#183D2B]">
                    <span className="font-semibold">Safety Criteria Rating</span>
                    <span className="font-bold text-xs">100% Validated</span>
                  </div>
                  <p className="text-[11px] text-[#50544C] leading-relaxed">
                    All food batches published have recorded storage methods, holding temperatures, allergen disclosures, and pickup deadlines adhering to surplus redistribution rules.
                  </p>
                  <button
                    onClick={() => onNavigate('safety')}
                    className="text-xs font-semibold text-[#183D2B] hover:underline inline-flex items-center gap-1 pt-1"
                  >
                    <span>Review Food Safety Charter</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          PAGE 2: MY DONATIONS TAB (ACTIVE LISTINGS)
          ============================================================ */}
      {activeTab === 'donations' && (
        <div className="bg-white rounded-lg border border-[#E2DFD2] shadow-xs overflow-hidden">
          {/* Sub-header with Active Filters */}
          <div className="p-5 border-b border-[#E2DFD2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FBF9F5]">
            <div>
              <h2 className="font-editorial text-xl font-bold text-[#183D2B]">
                Active Surplus Listings
              </h2>
              <p className="text-xs text-[#50544C]">
                Batches currently open in the community pool, reserved by NGOs, or in courier transit.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[#E8EDE2] p-1 rounded">
              <button
                onClick={() => setActiveSubFilter('all')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  activeSubFilter === 'all' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
                }`}
              >
                All Active ({activeDonations.length})
              </button>
              <button
                onClick={() => setActiveSubFilter('available')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  activeSubFilter === 'available' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
                }`}
              >
                Available ({activeDonations.filter((d) => d.status === 'available').length})
              </button>
              <button
                onClick={() => setActiveSubFilter('reserved')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  activeSubFilter === 'reserved' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
                }`}
              >
                Reserved ({activeDonations.filter((d) => ['reserved', 'assigned', 'arrived_at_donor'].includes(d.status)).length})
              </button>
              <button
                onClick={() => setActiveSubFilter('in_transit')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  activeSubFilter === 'in_transit' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
                }`}
              >
                In Transit ({activeDonations.filter((d) => ['picked_up', 'in_transit', 'awaiting_ngo_confirmation'].includes(d.status)).length})
              </button>
            </div>
          </div>

          {/* Active Table Body */}
          {filteredActiveDonations.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Package className="w-8 h-8 text-[#647C50] mx-auto opacity-60" />
              <p className="font-editorial text-lg text-[#50544C]">No active surplus batches under this filter.</p>
              <p className="text-xs text-[#737373]">
                Post your commercial surplus when morning, luncheon, or banquet services wrap up.
              </p>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#183D2B] rounded hover:bg-[#254F38]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log First Surplus Batch</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F6F0] text-[#647C50] font-semibold border-b border-[#E2DFD2] uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Food Item & Category</th>
                    <th className="py-3 px-4">Quantity Ledger</th>
                    <th className="py-3 px-4">FSSAI Safety</th>
                    <th className="py-3 px-4">Recipient / Courier</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DFD2] text-[#252923]">
                  {filteredActiveDonations.map((d) => {
                    const effectiveKg = d.quantity.pickupConfirmedKg || d.quantity.measuredKg || d.quantity.donorEstimatedKg;
                    return (
                      <tr key={d.id} className="hover:bg-[#FBF9F5] transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-sm text-[#183D2B]">{d.foodName}</p>
                          <p className="text-[11px] text-[#50544C] capitalize">
                            {d.foodCategory.replace('_', ' ')} · {d.dietaryTags.join(', ')}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums">
                          <span className="font-bold text-[#183D2B] text-sm">{effectiveKg} kg</span>
                          <p className="text-[10px] text-[#50544C] font-sans">
                            ~{d.quantity.servingsEstimate} meals
                            {d.quantity.pickupConfirmedKg ? ' (Pickup Verified)' : d.quantity.measuredKg ? ' (Scale)' : ' (Estimate)'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${
                                d.safety.assessmentOutcome === 'SUITABLE_FOR_REVIEW'
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : d.safety.assessmentOutcome === 'NEEDS_REVIEW'
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'bg-orange-50 text-orange-800'
                              }`}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span className="capitalize">{(d.safety.assessmentOutcome || d.safety.complianceStatus).replace(/_/g, ' ')}</span>
                            </span>
                            <p className="text-[10px] text-[#50544C]">
                              {d.safety.storageCondition.replace(/_/g, ' ')} ({d.safety.temperatureCelsius !== undefined ? `${d.safety.temperatureCelsius}°${d.safety.temperatureUnit === 'fahrenheit' ? 'F' : 'C'}` : '--'})
                            </p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {d.reservedByNgoName ? (
                            <>
                              <p className="font-medium text-[#252923]">{d.reservedByNgoName}</p>
                              <p className="text-[10px] text-[#50544C]">
                                Courier: {d.assignedVolunteerName || 'Awaiting assignment'}
                              </p>
                            </>
                          ) : (
                            <span className="text-[#737373] italic">Available in NGO pool</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={d.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => setInspectDonation(d)}
                            className="text-xs text-[#183D2B] hover:text-[#C77A54] font-medium underline inline-flex items-center gap-0.5"
                          >
                            <Eye className="w-3 h-3" />
                            Details
                          </button>

                          <button
                            onClick={() => onViewSafetyAudit(d)}
                            className="text-xs text-[#183D2B] hover:text-[#C77A54] font-medium underline inline-flex items-center gap-0.5"
                          >
                            Audit
                          </button>

                          {/* Allow Edit only when Available */}
                          {d.status === 'available' && (
                            <button
                              onClick={() => openEditModal(d)}
                              className="text-xs text-[#183D2B] hover:text-[#254F38] font-medium underline inline-flex items-center gap-0.5"
                            >
                              <Edit3 className="w-3 h-3" />
                              Edit
                            </button>
                          )}

                          {/* Allow Cancel before courier pickup */}
                          {['available', 'reserved', 'assigned', 'arrived_at_donor'].includes(d.status) && (
                            <button
                              onClick={() => setCancellingDonation(d)}
                              className="text-xs text-red-700 hover:text-red-900 font-medium underline inline-flex items-center gap-0.5"
                            >
                              <Ban className="w-3 h-3" />
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          PAGE 3: DONATION HISTORY TAB (COMPLETED & CANCELLED)
          ============================================================ */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-[#E2DFD2] shadow-xs overflow-hidden">
          {/* Sub-header with History Filters */}
          <div className="p-5 border-b border-[#E2DFD2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FBF9F5]">
            <div>
              <h2 className="font-editorial text-xl font-bold text-[#183D2B]">
                Donation History & Verified Receipts
              </h2>
              <p className="text-xs text-[#50544C]">
                Historical records of verified shelter handovers, impact certificates, and cancelled listings.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[#E8EDE2] p-1 rounded">
              <button
                onClick={() => setHistorySubFilter('all')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  historySubFilter === 'all' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
                }`}
              >
                All History ({historyDonations.length})
              </button>
              <button
                onClick={() => setHistorySubFilter('delivered')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  historySubFilter === 'delivered' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
                }`}
              >
                Delivered & Verified ({historyDonations.filter((d) => d.status === 'delivered').length})
              </button>
              <button
                onClick={() => setHistorySubFilter('cancelled')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  historySubFilter === 'cancelled' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
                }`}
              >
                Cancelled ({historyDonations.filter((d) => ['cancelled_by_donor', 'cancelled_by_ngo', 'pickup_failed'].includes(d.status)).length})
              </button>
            </div>
          </div>

          {/* History Table Body */}
          {filteredHistoryDonations.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <History className="w-8 h-8 text-[#647C50] mx-auto opacity-60" />
              <p className="font-editorial text-lg text-[#50544C]">No historical records found.</p>
              <p className="text-xs text-[#737373]">
                Delivered surplus lots will automatically generate official impact receipts here upon shelter receipt.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F6F0] text-[#647C50] font-semibold border-b border-[#E2DFD2] uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Food Item & Completion Date</th>
                    <th className="py-3 px-4">Delivered Quantity</th>
                    <th className="py-3 px-4">Meals Served</th>
                    <th className="py-3 px-4">Recipient Community Kitchen</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Receipt & Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DFD2] text-[#252923]">
                  {filteredHistoryDonations.map((d) => {
                    const deliveredKg = d.quantity.deliveredKg || d.quantity.pickupConfirmedKg || d.quantity.measuredKg || d.quantity.donorEstimatedKg;
                    const mealsServed = d.impactReceipt?.mealsProvided || d.quantity.servingsEstimate || Math.round(deliveredKg / 0.35);

                    return (
                      <tr key={d.id} className="hover:bg-[#FBF9F5] transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-sm text-[#183D2B]">{d.foodName}</p>
                          <p className="text-[11px] text-[#50544C]">
                            {new Date(d.updatedAt || d.createdAt).toLocaleDateString([], {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })} · {d.foodCategory.replace(/_/g, ' ')}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 font-mono tabular-nums">
                          <span className="font-bold text-[#183D2B] text-sm">{deliveredKg} kg</span>
                        </td>

                        <td className="py-3.5 px-4 font-mono tabular-nums">
                          {d.status === 'delivered' ? (
                            <span className="font-bold text-emerald-800 text-sm">~{mealsServed} meals</span>
                          ) : (
                            <span className="text-[#737373] italic">0 meals</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-medium text-[#252923]">{d.reservedByNgoName || 'Unreserved'}</p>
                          {d.assignedVolunteerName && (
                            <p className="text-[10px] text-[#50544C]">Courier: {d.assignedVolunteerName}</p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <StatusBadge status={d.status} />
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => setInspectDonation(d)}
                            className="text-xs text-[#183D2B] hover:underline font-medium"
                          >
                            Details
                          </button>

                          <button
                            onClick={() => onViewSafetyAudit(d)}
                            className="text-xs text-[#183D2B] hover:underline font-medium"
                          >
                            Safety Audit
                          </button>

                          {d.status === 'delivered' && d.impactReceipt && (
                            <button
                              onClick={() => setReceiptDonation(d)}
                              className="text-xs text-emerald-800 hover:text-emerald-950 font-bold underline inline-flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          SHARED MODALS
          ============================================================ */}

      {/* CREATE & EDIT DONATION MODAL */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-donation-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-[#F7F6F0] rounded-xl max-w-2xl w-full border border-[#E2DFD2] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#E2DFD2] bg-[#E8EDE2] flex items-center justify-between">
              <div>
                <h3 id="create-donation-title" className="font-editorial text-xl font-bold text-[#183D2B]">
                  {editingDonation ? 'Edit Surplus Food Listing' : 'Log Commercial Surplus Food'}
                </h3>
                <p className="text-xs text-[#50544C]">
                  {editingDonation ? 'Update food details and FSSAI parameters before reservation.' : 'One-page rapid donor intake with instant FSSAI safety validation.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingDonation(null);
                }}
                aria-label="Close dialog"
                className="p-1 text-[#50544C] hover:text-[#252923] rounded focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-5 overflow-y-auto">
              {/* Food Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#252923] mb-1">
                    Food Name / Preparation Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Steamed Basmati Rice & Mixed Vegetable Curry"
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2DFD2] rounded focus:border-[#183D2B] focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#252923] mb-1">
                      Food Category *
                    </label>
                    <select
                      value={foodCategory}
                      onChange={(e) => setFoodCategory(e.target.value as FoodCategory)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2DFD2] rounded focus:border-[#183D2B] focus:outline-hidden"
                    >
                      <option value="prepared_meals">Prepared Cooked Meals (Hot/Chilled)</option>
                      <option value="bakery_grains">Bakery & Grains (Bread, Loaves)</option>
                      <option value="fresh_produce">Fresh Uncut Fruits & Produce</option>
                      <option value="dairy_chilled">Dairy, Yogurts & Desserts</option>
                      <option value="packaged_dry">Packaged Dry Staples</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#252923] mb-1">
                      Estimated Quantity (kg) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="1000"
                      step="0.5"
                      value={estimatedKg}
                      onChange={(e) => setEstimatedKg(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2DFD2] rounded focus:border-[#183D2B] focus:outline-hidden font-mono"
                    />
                    <p className="text-[11px] text-[#647C50] mt-1">
                      Estimated Servings: ~{Math.round(estimatedKg / 0.35)} meal portions (350g/meal)
                    </p>
                  </div>
                </div>

                {/* Category-sensitive guidance banner */}
                {foodCategory === 'prepared_meals' && (
                  <div className="p-3 bg-[#E8EDE2] border border-[#D3DECD] rounded text-xs text-[#183D2B] space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#183D2B]" />
                      Cooked Meals Safety Rules
                    </p>
                    <p className="text-[11px] text-[#50544C] leading-relaxed">
                      Hot food requires holding temperature ≥ 65°C and max 4-hour holding window from finish. Chilled cooked food must be kept ≤ 5°C. Temperature reading and prep time are mandatory.
                    </p>
                  </div>
                )}
                {foodCategory === 'dairy_chilled' && (
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded text-xs text-sky-950 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-800" />
                      Dairy & Chilled Goods Protocol
                    </p>
                    <p className="text-[11px] text-sky-800 leading-relaxed">
                      Dairy products are high-risk perishables. Require refrigeration at ≤ 5°C (41°F) and a recorded Best-Before or Use-By date.
                    </p>
                  </div>
                )}
                {foodCategory === 'bakery_grains' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-950 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-800" />
                      Bakery & Grains Protocol
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Ambient dry storage is suitable (≤ 25°C). Best-before date is recommended to verify freshness. Clean packaging is required.
                    </p>
                  </div>
                )}
                {foodCategory === 'fresh_produce' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-950 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" />
                      Fresh Produce Protocol
                    </p>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Raw uncut fruits and vegetables. Temperature reading is optional; ambient or refrigerated storage is permitted.
                    </p>
                  </div>
                )}
                {foodCategory === 'packaged_dry' && (
                  <div className="p-3 bg-[#F7F6F0] border border-[#E2DFD2] rounded text-xs text-[#252923] space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#183D2B]" />
                      Packaged Dry Staples Protocol
                    </p>
                    <p className="text-[11px] text-[#50544C] leading-relaxed">
                      Factory-sealed commercial dry goods. Best-Before date and intact packaging seals are required.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#252923] mb-1">
                    Optional Scale Measured Quantity (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Optional: Enter scale reading if weighed in kitchen"
                    value={measuredKg}
                    onChange={(e) => setMeasuredKg(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2DFD2] rounded focus:border-[#183D2B] focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#252923] mb-1">
                    Dietary Declarations
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['vegetarian', 'vegan', 'halal', 'nut_free', 'dairy_free', 'gluten_free'] as DietaryTag[]).map((tag) => {
                      const isSelected = dietaryTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setDietaryTags(dietaryTags.filter((t) => t !== tag));
                            } else {
                              setDietaryTags([...dietaryTags, tag]);
                            }
                          }}
                          className={`px-2.5 py-1 text-xs rounded border transition-colors capitalize ${
                            isSelected
                              ? 'bg-[#183D2B] text-white border-[#183D2B] font-medium'
                              : 'bg-white text-[#50544C] border-[#E2DFD2] hover:border-[#647C50]'
                          }`}
                        >
                          {tag.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#252923] mb-1">
                    Description & Ingredients
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of dishes, ingredients, or allergens."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2DFD2] rounded focus:border-[#183D2B] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Food Safety & Thermal Compliance Parameters */}
              <div className="p-4 bg-white rounded border border-[#E2DFD2] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#183D2B] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#C77A54]" />
                    Food Safety & Thermal Verification
                  </h4>
                  <span className="text-[10px] text-[#647C50]">Decision-support criteria</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#252923] mb-1">
                      Storage Condition *
                    </label>
                    <select
                      value={storageCondition}
                      onChange={(e) => setStorageCondition(e.target.value as StorageCondition)}
                      className="w-full px-3 py-1.5 text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded"
                    >
                      <option value="hot_held">Hot Held (Standard: ≥ 65°C)</option>
                      <option value="refrigerated">Refrigerated (Standard: ≤ 5°C)</option>
                      <option value="ambient">Ambient Dry Storage (≤ 25°C)</option>
                      <option value="frozen">Deep Frozen (Standard: ≤ -18°C)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-[#252923]">
                        Temperature {['prepared_meals', 'dairy_chilled'].includes(foodCategory) ? '*' : '(Optional)'}
                      </label>
                      <div className="inline-flex rounded border border-[#E2DFD2] text-[10px] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setTemperatureUnit('celsius')}
                          className={`px-1.5 py-0.5 ${temperatureUnit === 'celsius' ? 'bg-[#183D2B] text-white font-bold' : 'bg-white text-[#50544C]'}`}
                        >
                          °C
                        </button>
                        <button
                          type="button"
                          onClick={() => setTemperatureUnit('fahrenheit')}
                          className={`px-1.5 py-0.5 ${temperatureUnit === 'fahrenheit' ? 'bg-[#183D2B] text-white font-bold' : 'bg-white text-[#50544C]'}`}
                        >
                          °F
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      step="0.5"
                      placeholder={temperatureUnit === 'celsius' ? 'e.g. 68.5' : 'e.g. 155'}
                      value={temperatureCelsius}
                      onChange={(e) => setTemperatureCelsius(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#252923] mb-1">
                      Prepared (Minutes Ago) *
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="240"
                      value={prepTimeMinutesAgo}
                      onChange={(e) => setPrepTimeMinutesAgo(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-[#252923] mb-1">
                      Packaging Condition *
                    </label>
                    <select
                      value={packagingCondition}
                      onChange={(e) => setPackagingCondition(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded"
                    >
                      <option value="food_grade_sealed">Food Grade Sealed Container</option>
                      <option value="covered_clean">Covered Clean Catering Pans</option>
                      <option value="loose_unsealed">Loose / Unsealed (Needs Packaging Review)</option>
                      <option value="damaged_packaging">Damaged Packaging (Will Reject)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#252923] mb-1">
                      Pickup Window Deadline (Hours) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      value={pickupHoursRemaining}
                      onChange={(e) => setPickupHoursRemaining(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs text-[#252923] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllergenLabelled}
                      onChange={(e) => setIsAllergenLabelled(e.target.checked)}
                      className="rounded border-[#E2DFD2] text-[#183D2B] focus:ring-[#183D2B]"
                    />
                    <span>Allergen labels marked on transport container</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-[#252923] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCleanPackaged}
                      onChange={(e) => setIsCleanPackaged(e.target.checked)}
                      className="rounded border-[#E2DFD2] text-[#183D2B] focus:ring-[#183D2B]"
                    />
                    <span>Surfaces sanitized before food transfer</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2DFD2]">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingDonation(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#50544C] hover:text-[#252923] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] transition-colors rounded shadow-xs cursor-pointer"
                >
                  {editingDonation ? 'Save Updates' : 'Publish to NGO Pool'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL DONATION MODAL */}
      {cancellingDonation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-donation-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-[#F7F6F0] rounded-xl max-w-md w-full border border-[#E2DFD2] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
              <div className="flex items-center gap-2 text-red-800">
                <Ban className="w-5 h-5" />
                <h3 id="cancel-donation-title" className="font-editorial text-xl font-bold">
                  Cancel Donation Listing
                </h3>
              </div>
              <button
                onClick={() => setCancellingDonation(null)}
                aria-label="Close dialog"
                className="text-[#50544C] hover:text-[#252923] p-1 rounded focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#50544C]">
              Are you sure you want to cancel the surplus listing for{' '}
              <strong className="text-[#252923]">"{cancellingDonation.foodName}"</strong>?
              {cancellingDonation.reservedByNgoName && (
                <span className="block mt-1 text-amber-800 font-medium">
                  Note: Reserved by {cancellingDonation.reservedByNgoName}. An automated alert will be dispatched to their team.
                </span>
              )}
            </p>

            <form onSubmit={handleConfirmCancelListing} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#252923] mb-1">
                  Reason for Cancellation *
                </label>
                <select
                  value={cancelReasonInput}
                  onChange={(e) => setCancelReasonInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E2DFD2] rounded"
                >
                  <option value="Surplus lot no longer available">Surplus lot no longer available</option>
                  <option value="Internal kitchen use / served to banquet guests">Internal kitchen use / served to banquet guests</option>
                  <option value="Quality / temperature parameter compromised">Quality / temperature parameter compromised</option>
                  <option value="Emergency facility closure">Emergency facility closure</option>
                  <option value="Duplicate entry logged in error">Duplicate entry logged in error</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingDonation(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#50544C] hover:text-[#252923]"
                >
                  Keep Listing
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 rounded"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT DETAILS MODAL */}
      {inspectDonation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-donation-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-[#F7F6F0] rounded-xl max-w-lg w-full border border-[#E2DFD2] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
              <div>
                <span className="text-[10px] font-semibold text-[#647C50] uppercase tracking-wider">
                  Surplus Batch Ledger · {inspectDonation.id}
                </span>
                <h3 id="inspect-donation-title" className="font-editorial text-xl font-bold text-[#183D2B]">
                  {inspectDonation.foodName}
                </h3>
              </div>
              <button
                onClick={() => setInspectDonation(null)}
                aria-label="Close dialog"
                className="text-[#50544C] hover:text-[#252923] p-1 rounded focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white p-4 rounded border border-[#E2DFD2] space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#647C50]">Status</span>
                <StatusBadge status={inspectDonation.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E2DFD2]">
                <div>
                  <p className="text-[#647C50]">Estimated Quantity</p>
                  <p className="font-bold text-sm text-[#183D2B] font-mono">{inspectDonation.quantity.donorEstimatedKg} kg</p>
                  <p className="text-[10px] text-[#50544C]">~{inspectDonation.quantity.servingsEstimate} meals</p>
                </div>
                <div>
                  <p className="text-[#647C50]">Pickup Confirmed / Delivered</p>
                  <p className="font-bold text-sm text-[#183D2B] font-mono">
                    {inspectDonation.quantity.deliveredKg
                      ? `${inspectDonation.quantity.deliveredKg} kg (Delivered)`
                      : inspectDonation.quantity.pickupConfirmedKg
                      ? `${inspectDonation.quantity.pickupConfirmedKg} kg (In Transit)`
                      : 'Pending Collection'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E2DFD2] space-y-1">
                <p className="text-[#647C50] font-semibold uppercase tracking-wider">Redistribution Recipient</p>
                {inspectDonation.reservedByNgoName ? (
                  <div>
                    <p className="font-medium text-[#252923]">{inspectDonation.reservedByNgoName}</p>
                    <p className="text-[11px] text-[#50544C]">{inspectDonation.ngoAddress || 'Community kitchen'}</p>
                    <p className="text-[11px] text-[#183D2B] mt-0.5">
                      Assigned Courier: <span className="font-medium">{inspectDonation.assignedVolunteerName || 'Awaiting assignment'}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-[#737373] italic">Surplus is open in the NGO discovery pool. No reservations yet.</p>
                )}
              </div>

              {/* Timeline audit */}
              <div className="pt-2 border-t border-[#E2DFD2] space-y-1">
                <p className="text-[#647C50] font-semibold uppercase tracking-wider">Lifecycle Progression</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {inspectDonation.timeline.map((item, idx) => (
                    <div key={idx} className="p-2 bg-[#F7F6F0] rounded border border-[#E2DFD2] text-[11px]">
                      <div className="flex justify-between items-center font-medium text-[#183D2B]">
                        <span>{item.actor}</span>
                        <span className="font-mono text-[10px] text-[#50544C]">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[#50544C] mt-0.5">{item.note || item.status.replace(/_/g, ' ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setInspectDonation(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#183D2B] rounded hover:bg-[#254F38]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VERIFIED DELIVERY IMPACT RECEIPT MODAL */}
      {receiptDonation && receiptDonation.impactReceipt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-donation-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-[#F7F6F0] rounded-xl max-w-lg w-full border border-[#E2DFD2] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#183D2B]" />
                <h3 id="receipt-donation-title" className="font-editorial text-xl font-bold text-[#183D2B]">
                  Verified Impact Receipt
                </h3>
              </div>
              <button
                onClick={() => setReceiptDonation(null)}
                aria-label="Close impact receipt"
                className="text-[#50544C] hover:text-[#252923] p-1 rounded focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white p-4 rounded border border-[#E2DFD2] space-y-3 text-xs">
              <div className="flex justify-between items-center text-[11px] text-[#647C50] font-mono">
                <span>Receipt: {receiptDonation.impactReceipt.receiptId}</span>
                <span>{new Date(receiptDonation.impactReceipt.deliveredAt).toLocaleDateString()}</span>
              </div>

              <div>
                <p className="font-semibold text-sm text-[#183D2B]">{receiptDonation.foodName}</p>
                <p className="text-[#50544C]">Recipient: {receiptDonation.impactReceipt.ngoName}</p>
                <p className="text-[#50544C]">Courier: {receiptDonation.impactReceipt.volunteerName}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 bg-[#E8EDE2] rounded text-center">
                <div>
                  <p className="text-[10px] text-[#647C50]">Delivered</p>
                  <p className="font-bold font-mono text-sm text-[#183D2B]">{receiptDonation.impactReceipt.deliveredKg} kg</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#647C50]">Meals Served</p>
                  <p className="font-bold font-mono text-sm text-[#183D2B]">~{receiptDonation.impactReceipt.mealsProvided}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#647C50]">CO₂e Prevented</p>
                  <p className="font-bold font-mono text-sm text-[#183D2B]">{receiptDonation.impactReceipt.co2PreventedKg} kg</p>
                </div>
              </div>

              <p className="text-[10px] text-[#50544C] border-t border-[#E2DFD2] pt-2">
                Verification standard: {receiptDonation.impactReceipt.fssaiRuleCitation}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setReceiptDonation(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#183D2B] rounded hover:bg-[#254F38]"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
