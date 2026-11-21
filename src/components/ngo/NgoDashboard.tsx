import React, { useState } from 'react';
import { donationService } from '../../services/donationService';
import { volunteerService, calculateDistanceKm } from '../../services/volunteerService';
import { FoodCategory, FoodDonation, UserProfile } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { useModalA11y } from '../../hooks/useModalA11y';

const LeafletMap = React.lazy(() => import('../map/LeafletMap').then((m) => ({ default: m.LeafletMap })));

const MapFallback = () => (
  <div className="h-full min-h-[300px] w-full bg-[#E8EDE2]/50 rounded-xl border border-[#E2DFD2] flex flex-col items-center justify-center gap-2 p-6">
    <div className="w-6 h-6 border-2 border-[#183D2B]/20 border-t-[#183D2B] rounded-full animate-spin" />
    <span className="text-xs text-[#647C50]">Loading live route map...</span>
  </div>
);
import {
  Filter,
  MapPin,
  Clock,
  ShieldCheck,
  Check,
  AlertCircle,
  ArrowRight,
  X,
  HeartHandshake,
  Eye,
  Scale,
  FileText,
  AlertTriangle,
  Info,
  BarChart3,
  Truck,
  RotateCcw,
  CheckCircle2,
  PackageCheck,
  Layers,
  Inbox
} from 'lucide-react';

interface NgoDashboardProps {
  user: UserProfile | null;
  onViewSafetyAudit: (donation: FoodDonation) => void;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onNavigate: (view: string) => void;
  initialTab?: 'overview' | 'discover' | 'reservations' | 'deliveries' | 'history';
}

export const NgoDashboard: React.FC<NgoDashboardProps> = ({
  user,
  onViewSafetyAudit,
  onShowToast,
  onNavigate,
  initialTab = 'overview',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'discover' | 'reservations' | 'deliveries' | 'history'>(initialTab);
  const [selectedDonationId, setSelectedDonationId] = useState<string | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dietaryFilter, setDietaryFilter] = useState<string>('all');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(25);
  const [minQuantityKg, setMinQuantityKg] = useState<number>(0);
  const [pickupDeadlineHours, setPickupDeadlineHours] = useState<number>(24);

  // Reservation Confirmation Modal State
  const [reservingDonation, setReservingDonation] = useState<FoodDonation | null>(null);
  const [confirmLocking, setConfirmLocking] = useState(false);
  const [receiptDonation, setReceiptDonation] = useState<FoodDonation | null>(null);
  const [inspectDonation, setInspectDonation] = useState<FoodDonation | null>(null);

  // NGO Confirm Receipt Modal State
  const [confirmReceiptDonation, setConfirmReceiptDonation] = useState<FoodDonation | null>(null);
  const [receivedKgInput, setReceivedKgInput] = useState<string>('');
  const [receivingSupervisorInput, setReceivingSupervisorInput] = useState<string>('');
  const [receiptNotesInput, setReceiptNotesInput] = useState<string>('');

  // Discrepancy Reporting Modal State
  const [discrepancyDonation, setDiscrepancyDonation] = useState<FoodDonation | null>(null);
  const [issueTypeInput, setIssueTypeInput] = useState<'damaged_food' | 'quantity_mismatch' | 'safety_temp_breach' | 'packaging_breach' | 'facility_closed'>('damaged_food');
  const [issueDetailsInput, setIssueDetailsInput] = useState<string>('');
  const [issueWeightInput, setIssueWeightInput] = useState<string>('');

  const ngoId = user?.role === 'ngo' && user?.id ? user.id : '';
  const ngoName = user?.organizationName || user?.fullName || '';
  const ngoAddress = user?.address || '';
  const ngoLat = typeof user?.lat === 'number' ? user.lat : undefined;
  const ngoLng = typeof user?.lng === 'number' ? user.lng : undefined;

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabSelect = (tab: 'overview' | 'discover' | 'reservations' | 'deliveries' | 'history') => {
    setActiveTab(tab);
    if (tab === 'overview') onNavigate('ngo_overview');
    else if (tab === 'discover') onNavigate('ngo_discover');
    else if (tab === 'reservations') onNavigate('ngo_reservations');
    else if (tab === 'deliveries') onNavigate('ngo_deliveries');
    else if (tab === 'history') onNavigate('ngo_history');
  };

  // Accessibility: Focus trap, focus restore, and Escape key handling for all modals
  const isAnyModalOpen = Boolean(reservingDonation || confirmReceiptDonation || discrepancyDonation || receiptDonation || inspectDonation);
  const handleCloseActiveModal = () => {
    if (reservingDonation) setReservingDonation(null);
    else if (confirmReceiptDonation) setConfirmReceiptDonation(null);
    else if (discrepancyDonation) setDiscrepancyDonation(null);
    else if (receiptDonation) setReceiptDonation(null);
    else if (inspectDonation) setInspectDonation(null);
  };
  const modalContainerRef = useModalA11y(isAnyModalOpen, handleCloseActiveModal);

  const allDonations = donationService.getAllDonations();

  // Filter available donations with Category, Dietary, Minimum Quantity, Distance, and Pickup Deadline
  const availableDonations = allDonations.filter((d) => {
    if (d.status !== 'available') return false;
    if (categoryFilter !== 'all' && d.foodCategory !== categoryFilter) return false;
    if (dietaryFilter !== 'all' && !d.dietaryTags.includes(dietaryFilter as any)) return false;

    const effectiveKg = d.quantity.measuredKg || d.quantity.donorEstimatedKg;
    if (minQuantityKg > 0 && effectiveKg < minQuantityKg) return false;

    if (typeof ngoLat === 'number' && typeof ngoLng === 'number') {
      const dist = calculateDistanceKm(ngoLat, ngoLng, d.donorLat, d.donorLng);
      if (dist > maxDistanceKm) return false;
    }

    // Pickup deadline filtering (within next X hours)
    if (pickupDeadlineHours < 24) {
      const deadlineDate = new Date(d.pickupWindowEnd);
      const hoursUntilDeadline = (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilDeadline > pickupDeadlineHours || hoursUntilDeadline < 0) return false;
    }

    return true;
  });

  // 1. My Reserved Donations (claimed by NGO, awaiting volunteer courier pickup)
  const myReservations = ngoId
    ? allDonations.filter((d) => d.reservedByNgoId === ngoId && d.status === 'reserved')
    : [];

  // 2. My Active Deliveries (courier assigned, en route, or arrived at NGO facility)
  const myDeliveries = ngoId
    ? allDonations.filter(
        (d) =>
          d.reservedByNgoId === ngoId &&
          ['assigned', 'arrived_at_donor', 'picked_up', 'in_transit', 'awaiting_ngo_confirmation'].includes(d.status)
      )
    : [];

  // 3. Completed donation history
  const completedHistory = ngoId
    ? allDonations.filter((d) => d.reservedByNgoId === ngoId && d.status === 'delivered')
    : [];

  // Totals
  const totalDeliveredMeals = completedHistory.reduce((acc, d) => {
    return acc + (d.impactReceipt?.mealsProvided || d.quantity.servingsEstimate || Math.round((d.quantity.deliveredKg || d.quantity.donorEstimatedKg) / 0.35));
  }, 0);
  const totalDeliveredKg = completedHistory.reduce((acc, d) => {
    return acc + (d.quantity.deliveredKg || d.quantity.pickupConfirmedKg || d.quantity.measuredKg || d.quantity.donorEstimatedKg);
  }, 0);

  const selectedDonation = allDonations.find((d) => d.id === selectedDonationId);

  // Handle clicking "Reserve" -> Step 1: Acquire lease lock
  const handleInitiateReservation = (donation: FoodDonation) => {
    const lockResult = donationService.acquireReservationLock(donation.id, ngoId, user?.role || 'ngo', 90);
    if (!lockResult.success) {
      onShowToast(lockResult.error || 'Donation is no longer available.', 'error');
      return;
    }

    setReservingDonation(donation);
    onShowToast('90-second atomic reservation lock acquired. Please confirm intake details.', 'info');
  };

  // Step 2: Confirm atomic reservation
  const handleConfirmReservationSubmit = () => {
    if (!reservingDonation) return;

    setConfirmLocking(true);
    const result = donationService.confirmReservation(reservingDonation.id, {
      id: ngoId,
      name: ngoName,
      address: ngoAddress,
      lat: typeof ngoLat === 'number' ? ngoLat : 0,
      lng: typeof ngoLng === 'number' ? ngoLng : 0,
      role: user?.role || 'ngo',
    });

    setConfirmLocking(false);
    setReservingDonation(null);

    if (result.success && result.donation) {
      onShowToast(`Reservation confirmed for "${result.donation.foodName}". Volunteer courier requested.`, 'success');
      handleTabSelect('reservations');
    } else {
      onShowToast(result.error || 'Could not complete reservation.', 'error');
    }
  };

  // Step 3: Release reservation back to pool
  const handleReleaseReservation = (donationId: string) => {
    const res = donationService.releaseReservation(donationId, ngoId, ngoName, 'Released by NGO');
    if (res.success) {
      onShowToast('Reservation released. The food is now available for other community organizations.', 'info');
    } else {
      onShowToast(res.error || 'Failed to release reservation.', 'error');
    }
  };

  // Step 4: Open Receipt Confirmation Dialog
  const handleOpenConfirmReceipt = (donation: FoodDonation) => {
    setConfirmReceiptDonation(donation);
    const expectedKg = donation.quantity.pickupConfirmedKg || donation.quantity.measuredKg || donation.quantity.donorEstimatedKg;
    setReceivedKgInput(String(expectedKg));
  };

  // Step 5: Submit Receipt Confirmation
  const handleSubmitConfirmReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmReceiptDonation) return;

    const receivedKg = Number(receivedKgInput);
    if (isNaN(receivedKg) || receivedKg <= 0) {
      onShowToast('Please enter a valid received quantity in kilograms.', 'error');
      return;
    }

    const res = volunteerService.confirmNgoReceipt(confirmReceiptDonation.id, ngoId, ngoName, {
      receivedKg,
      receivingSupervisorName: receivingSupervisorInput,
      notes: receiptNotesInput,
    });

    setConfirmReceiptDonation(null);

    if (res.success && res.donation) {
      onShowToast(
        `Verified Impact Receipt issued for "${res.donation.foodName}". ${Math.round(receivedKg / 0.35)} meals served to community.`,
        'success'
      );
      if (res.donation.impactReceipt) {
        setReceiptDonation(res.donation);
      }
      handleTabSelect('history');
    } else {
      onShowToast(res.error || 'Failed to confirm receipt.', 'error');
    }
  };

  // Discrepancy Reporting
  const handleSubmitDiscrepancy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discrepancyDonation) return;

    const res = volunteerService.reportDiscrepancy(
      discrepancyDonation.id,
      ngoId,
      'ngo',
      receivingSupervisorInput || ngoName,
      {
        issueType: issueTypeInput,
        details: issueDetailsInput,
        actualWeightReceivedKg: issueWeightInput ? Number(issueWeightInput) : undefined,
      }
    );

    setDiscrepancyDonation(null);

    if (res.success) {
      onShowToast('Discrepancy report logged in permanent audit ledger. Quality flagged.', 'warning');
    } else {
      onShowToast(res.error || 'Failed to file report.', 'error');
    }
  };

  if (!user || user.role !== 'ngo') {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="bg-white rounded-xl border border-[#E2DFD2] p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#E8EDE2] text-[#183D2B] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-[#183D2B]" />
          </div>
          <h2 className="font-editorial text-2xl font-bold text-[#183D2B]">Sign In Required</h2>
          <p className="text-xs text-[#50544C] leading-relaxed">
            Please sign in with a registered NGO / community kitchen account or select the <strong>NGO Demo Persona</strong> from the top banner to access the NGO Portal.
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
            Community Kitchen & Food Bank Operations
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#183D2B] mt-1">
            {ngoName}
          </h1>
          <p className="text-sm text-[#50544C] mt-1">
            Facility intake address: <span className="font-medium text-[#252923]">{ngoAddress}</span>
            {user?.verified === false && (
              <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                <AlertCircle className="w-3 h-3 text-amber-700" />
                NGO Accreditation Pending
              </span>
            )}
          </p>
        </div>

        {/* View Switcher Tabs & Intelligence Shortcut */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => onNavigate('intelligence')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#183D2B] bg-white border border-[#E2DFD2] hover:border-[#647C50] rounded transition-colors shadow-2xs cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#C77A54]" />
            <span>Supply vs Demand</span>
          </button>

          <div className="flex items-center gap-1 bg-[#E8EDE2] p-1 rounded">
            <button
              onClick={() => handleTabSelect('overview')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeTab === 'overview' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => handleTabSelect('discover')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeTab === 'discover' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              Discover Food ({availableDonations.length})
            </button>
            <button
              onClick={() => handleTabSelect('reservations')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeTab === 'reservations' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              My Reservations ({myReservations.length})
            </button>
            <button
              onClick={() => handleTabSelect('deliveries')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeTab === 'deliveries' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              Deliveries ({myDeliveries.length})
            </button>
            <button
              onClick={() => handleTabSelect('history')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeTab === 'history' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              History ({completedHistory.length})
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          PAGE 1: OVERVIEW TAB
          ============================================================ */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
              <p className="text-xs text-[#647C50]">Active Reservations</p>
              <p className="font-editorial text-3xl font-bold text-[#183D2B] tabular-nums mt-1">{myReservations.length}</p>
              <p className="text-[11px] text-[#50544C] mt-1">Claimed lots awaiting courier pickup</p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
              <p className="text-xs text-[#647C50]">In-Flight Deliveries</p>
              <p className="font-editorial text-3xl font-bold text-[#C77A54] tabular-nums mt-1">{myDeliveries.length}</p>
              <p className="text-[11px] text-[#50544C] mt-1">Couriers en route or arrived</p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
              <p className="text-xs text-[#647C50]">Community Meals Served</p>
              <p className="font-editorial text-3xl font-bold text-[#183D2B] tabular-nums mt-1">
                ~{totalDeliveredMeals}
              </p>
              <p className="text-[11px] text-[#50544C] mt-1">Across {completedHistory.length} verified handovers</p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
              <p className="text-xs text-[#647C50]">Total Surplus Received</p>
              <p className="font-editorial text-3xl font-bold text-[#183D2B] tabular-nums mt-1">
                {Math.round(totalDeliveredKg)} <span className="text-sm font-sans font-normal text-[#50544C]">kg</span>
              </p>
              <p className="text-[11px] text-[#50544C] mt-1">Diverted to dining center</p>
            </div>
          </div>

          {/* 2-Column Overview Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Urgent Surplus & Active Deliveries Snapshot (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Active Deliveries Quick Tracker */}
              {myDeliveries.length > 0 && (
                <div className="bg-white p-5 rounded-lg border-2 border-[#183D2B] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-[#C77A54]" />
                      <h2 className="font-editorial text-lg font-bold text-[#183D2B]">
                        Couriers En Route ({myDeliveries.length})
                      </h2>
                    </div>
                    <button
                      onClick={() => handleTabSelect('deliveries')}
                      className="text-xs font-semibold text-[#183D2B] hover:underline"
                    >
                      Track All Deliveries →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {myDeliveries.slice(0, 2).map((del) => (
                      <div key={del.id} className="p-3 bg-[#F7F6F0] rounded border border-[#E2DFD2] space-y-2 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-sm text-[#183D2B]">{del.foodName}</p>
                            <p className="text-[#50544C]">From {del.donorName} · Courier: {del.assignedVolunteerName || 'Active courier'}</p>
                          </div>
                          <StatusBadge status={del.status} />
                        </div>
                        {del.status === 'awaiting_ngo_confirmation' && (
                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() => handleOpenConfirmReceipt(del)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Sign Off Intake</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Surplus Lots Ready for Claim */}
              <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
                  <div className="flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-[#647C50]" />
                    <h2 className="font-editorial text-lg font-bold text-[#183D2B]">
                      Surplus Open for Reservation Nearby
                    </h2>
                  </div>
                  <button
                    onClick={() => handleTabSelect('discover')}
                    className="text-xs font-semibold text-[#183D2B] hover:underline"
                  >
                    View All Lots ({availableDonations.length}) →
                  </button>
                </div>

                {availableDonations.length === 0 ? (
                  <p className="text-xs text-[#737373] py-4 text-center">No unreserved surplus lots matching your radius right now.</p>
                ) : (
                  <div className="space-y-3">
                    {availableDonations.slice(0, 3).map((lot) => {
                      const dist =
                        typeof ngoLat === 'number' && typeof ngoLng === 'number'
                          ? calculateDistanceKm(ngoLat, ngoLng, lot.donorLat, lot.donorLng)
                          : null;
                      return (
                        <div key={lot.id} className="p-3.5 rounded border border-[#E2DFD2] bg-[#FBF9F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <p className="font-semibold text-sm text-[#183D2B]">{lot.foodName}</p>
                            <p className="text-[11px] text-[#50544C]">
                              {lot.quantity.measuredKg || lot.quantity.donorEstimatedKg} kg{dist !== null ? ` · ${dist.toFixed(1)} km away` : ''} ({lot.donorName})
                            </p>
                          </div>

                          <button
                            onClick={() => handleInitiateReservation(lot)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] rounded self-start sm:self-auto cursor-pointer"
                          >
                            Reserve Food Lot
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Dining Center Profile & Recent Handover History (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs space-y-3">
                <div className="flex items-center gap-2 border-b border-[#E2DFD2] pb-3">
                  <PackageCheck className="w-4 h-4 text-[#183D2B]" />
                  <h3 className="font-editorial text-lg font-bold text-[#183D2B]">Kitchen Facility Profile</h3>
                </div>

                <div className="text-xs space-y-2">
                  <div className="p-3 bg-[#F7F6F0] rounded border border-[#E2DFD2] space-y-1">
                    <p className="text-[#647C50]">Shelter / Dining Hall</p>
                    <p className="font-bold text-[#183D2B] text-sm">{ngoName}</p>
                    <p className="text-[#50544C]">{ngoAddress}</p>
                  </div>
                  <p className="text-[11px] text-[#50544C]">
                    Accredited distribution center receiving verified surplus for community meal distribution in western Mumbai.
                  </p>
                </div>
              </div>

              {/* Recent Completed Receipts */}
              <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
                  <h3 className="font-editorial text-lg font-bold text-[#183D2B]">Recent Intakes</h3>
                  <button
                    onClick={() => handleTabSelect('history')}
                    className="text-xs font-semibold text-[#183D2B] hover:underline"
                  >
                    View All ({completedHistory.length})
                  </button>
                </div>

                {completedHistory.length === 0 ? (
                  <p className="text-xs text-[#737373] py-4 text-center">No delivered handovers on record yet.</p>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    {completedHistory.slice(0, 3).map((item) => (
                      <div key={item.id} className="p-2.5 bg-[#FBF9F5] rounded border border-[#E2DFD2] flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-[#183D2B]">{item.foodName}</p>
                          <p className="text-[10px] text-[#50544C]">{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className="font-bold font-mono text-emerald-800">
                          {item.quantity.deliveredKg || item.quantity.donorEstimatedKg} kg
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          PAGE 2: DISCOVER FOOD TAB (AVAILABLE POOL + MAP)
          ============================================================ */}
      {activeTab === 'discover' && (
        <>
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-lg border border-[#E2DFD2] shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-[#183D2B] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#647C50]" />
                Filters:
              </span>

              {/* Food Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#F7F6F0] border border-[#E2DFD2] rounded text-[#252923]"
              >
                <option value="all">All Food Categories</option>
                <option value="prepared_meals">Cooked Prepared Meals</option>
                <option value="bakery_grains">Bakery & Grains</option>
                <option value="fresh_produce">Fresh Produce</option>
                <option value="dairy_chilled">Dairy & Chilled</option>
              </select>

              {/* Dietary Filter */}
              <select
                value={dietaryFilter}
                onChange={(e) => setDietaryFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#F7F6F0] border border-[#E2DFD2] rounded text-[#252923]"
              >
                <option value="all">All Dietary Requirements</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="halal">Halal</option>
                <option value="nut_free">Nut Free</option>
              </select>

              {/* Min Quantity Filter */}
              <select
                value={minQuantityKg}
                onChange={(e) => setMinQuantityKg(Number(e.target.value))}
                className="px-3 py-1.5 bg-[#F7F6F0] border border-[#E2DFD2] rounded text-[#252923]"
              >
                <option value={0}>Any Quantity (≥ 0 kg)</option>
                <option value={15}>Min 15 kg (~40+ meals)</option>
                <option value={25}>Min 25 kg (~70+ meals)</option>
                <option value={50}>Min 50 kg (~140+ meals)</option>
              </select>

              {/* Distance Radius Filter */}
              <select
                value={maxDistanceKm}
                onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                className="px-3 py-1.5 bg-[#F7F6F0] border border-[#E2DFD2] rounded text-[#252923]"
              >
                <option value={5}>Within 5 km</option>
                <option value={10}>Within 10 km</option>
                <option value={25}>Within 25 km</option>
                <option value={50}>Within 50 km</option>
              </select>

              {/* Pickup Deadline Filter */}
              <select
                value={pickupDeadlineHours}
                onChange={(e) => setPickupDeadlineHours(Number(e.target.value))}
                className="px-3 py-1.5 bg-[#F7F6F0] border border-[#E2DFD2] rounded text-[#252923]"
              >
                <option value={24}>Any Pickup Deadline</option>
                <option value={2}>Urgent: Within 2 hours</option>
                <option value={4}>Within 4 hours</option>
                <option value={8}>Within 8 hours</option>
              </select>
            </div>

            <p className="text-[#50544C]">
              Showing <strong className="text-[#183D2B] font-mono tabular-nums">{availableDonations.length}</strong> verified surplus lots
            </p>
          </div>

          {/* SPLIT LAYOUT: Listings Left (7 cols), Map Right (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Listings Column */}
            <div className="lg:col-span-7 space-y-4">
              {availableDonations.length === 0 ? (
                <div className="bg-white p-10 rounded-lg border border-[#E2DFD2] text-center space-y-2">
                  <p className="font-editorial text-lg text-[#50544C]">No active surplus matching current filters.</p>
                  <p className="text-xs text-[#737373]">Try resetting dietary or category filters to expand available lots.</p>
                </div>
              ) : (
                availableDonations.map((donation) => {
                  const effectiveKg = donation.quantity.pickupConfirmedKg || donation.quantity.measuredKg || donation.quantity.donorEstimatedKg;
                  const isSelected = selectedDonationId === donation.id;

                  return (
                    <div
                      key={donation.id}
                      onClick={() => setSelectedDonationId(donation.id)}
                      className={`bg-white rounded-lg border p-5 transition-all cursor-pointer shadow-xs ${
                        isSelected ? 'border-[#183D2B] ring-1 ring-[#183D2B]' : 'border-[#E2DFD2] hover:border-[#647C50]'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#647C50]">
                              {donation.donorName} · {donation.donorType}
                            </span>
                            <h3 className="font-editorial text-xl font-bold text-[#183D2B] mt-0.5">
                              {donation.foodName}
                            </h3>
                            <p className="text-xs text-[#50544C] mt-0.5">{donation.description}</p>
                          </div>

                          <div className="text-right font-mono tabular-nums">
                            <span className="font-bold text-lg text-[#183D2B]">{effectiveKg} kg</span>
                            <p className="text-[11px] text-[#50544C] font-sans">
                              ~{donation.quantity.servingsEstimate} portions
                            </p>
                          </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#F7F6F0] p-3 rounded text-xs border border-[#E2DFD2]">
                          <div>
                            <span className="text-[#647C50]">Safety Verdict:</span>
                            <p className="font-medium text-[#183D2B] capitalize">
                              {donation.safety.assessmentOutcome.replace(/_/g, ' ')}
                            </p>
                          </div>
                          <div>
                            <span className="text-[#647C50]">Storage Method:</span>
                            <p className="font-medium text-[#252923] capitalize">
                              {donation.safety.storageCondition.replace(/_/g, ' ')} ({donation.safety.temperatureCelsius !== undefined ? `${donation.safety.temperatureCelsius}°C` : '--'})
                            </p>
                          </div>
                          <div>
                            <span className="text-[#647C50]">Pickup Window:</span>
                            <p className="font-medium text-[#252923] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#C77A54]" />
                              <span>Until {new Date(donation.pickupWindowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </p>
                          </div>
                        </div>

                        {/* Dietary Tags */}
                        <div className="flex flex-wrap gap-1">
                          {donation.dietaryTags.map((t) => (
                            <span key={t} className="text-[10px] font-medium bg-[#E8EDE2] text-[#183D2B] px-2 py-0.5 rounded capitalize">
                              {t.replace('_', ' ')}
                            </span>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#E2DFD2]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewSafetyAudit(donation);
                            }}
                            className="text-xs text-[#647C50] hover:text-[#183D2B] underline"
                          >
                            Inspect FSSAI Audit Log
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInitiateReservation(donation);
                            }}
                            className="px-4 py-2 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] transition-colors rounded shadow-xs cursor-pointer"
                          >
                            Reserve Food Lot
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Map Column */}
            <div className="lg:col-span-5 sticky top-28 space-y-3">
              <div className="h-[560px] w-full">
                <React.Suspense fallback={<MapFallback />}>
                  <LeafletMap
                    donations={availableDonations}
                    selectedDonationId={selectedDonationId}
                    onSelectDonation={(id) => setSelectedDonationId(id)}
                    centerLat={ngoLat}
                    centerLng={ngoLng}
                  />
                </React.Suspense>
              </div>
              <p className="text-[11px] text-[#50544C] text-center">
                Click any marker on the map to inspect available food lot and verified location.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ============================================================
          PAGE 3: MY RESERVATIONS TAB (RESERVED, AWAITING COURIER)
          ============================================================ */}
      {activeTab === 'reservations' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
            <h2 className="font-editorial text-xl font-bold text-[#183D2B] mb-1">
              My Food Reservations
            </h2>
            <p className="text-xs text-[#50544C]">
              Food donations currently reserved by your organization awaiting volunteer courier pickup.
            </p>
          </div>

          {myReservations.length === 0 ? (
            <div className="bg-white p-12 rounded-lg border border-[#E2DFD2] text-center space-y-3">
              <Clock className="w-8 h-8 text-[#647C50] mx-auto opacity-60" />
              <p className="font-editorial text-lg text-[#50544C]">You have no pending reservations.</p>
              <p className="text-xs text-[#737373]">Browse available surplus to claim fresh meals for your dining hall.</p>
              <button
                onClick={() => handleTabSelect('discover')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#183D2B] rounded hover:bg-[#254F38]"
              >
                <span>Browse Available Food</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {myReservations.map((claim) => (
                <div key={claim.id} className="bg-white rounded-lg border border-[#E2DFD2] p-5 space-y-4 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold text-[#647C50] uppercase tracking-wider">
                        Donor: {claim.donorName}
                      </span>
                      <h3 className="font-editorial text-lg font-bold text-[#183D2B] mt-0.5">
                        {claim.foodName}
                      </h3>
                      <p className="text-xs text-[#50544C]">{claim.donorAddress}</p>
                    </div>
                    <StatusBadge status={claim.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-[#F7F6F0] p-3 rounded border border-[#E2DFD2]">
                    <div>
                      <p className="text-[#647C50]">Reserved Quantity</p>
                      <p className="font-bold text-[#183D2B] font-mono tabular-nums text-sm">
                        {claim.quantity.measuredKg || claim.quantity.donorEstimatedKg} kg
                      </p>
                      <p className="text-[10px] text-[#50544C]">~{claim.quantity.servingsEstimate} meals</p>
                    </div>
                    <div>
                      <p className="text-[#647C50]">Pickup Window</p>
                      <p className="font-medium text-[#252923]">
                        Until {new Date(claim.pickupWindowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[10px] text-[#C77A54]">Courier dispatch pending</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-between border-t border-[#E2DFD2]">
                    <button
                      onClick={() => onViewSafetyAudit(claim)}
                      className="text-xs text-[#183D2B] hover:underline font-medium"
                    >
                      Safety Audit
                    </button>

                    <button
                      onClick={() => handleReleaseReservation(claim.id)}
                      className="text-xs text-[#C77A54] hover:underline font-medium"
                    >
                      Release Reservation
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          PAGE 4: DELIVERIES TAB (IN-FLIGHT COURIERS & INTAKE SIGN-OFF)
          ============================================================ */}
      {activeTab === 'deliveries' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
            <h2 className="font-editorial text-xl font-bold text-[#183D2B] mb-1">
              Active Delivery Runs & Intake Sign-Off
            </h2>
            <p className="text-xs text-[#50544C]">
              Monitor volunteer couriers currently transporting food to {ngoName} and verify physical handovers.
            </p>
          </div>

          {myDeliveries.length === 0 ? (
            <div className="bg-white p-12 rounded-lg border border-[#E2DFD2] text-center space-y-3">
              <Truck className="w-8 h-8 text-[#647C50] mx-auto opacity-60" />
              <p className="font-editorial text-lg text-[#50544C]">No active deliveries in transit.</p>
              <p className="text-xs text-[#737373]">
                Once a volunteer accepts a pickup assignment for your reserved food, live tracking will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {myDeliveries.map((claim) => (
                <div key={claim.id} className="bg-white rounded-lg border border-[#E2DFD2] p-5 space-y-4 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold text-[#647C50] uppercase tracking-wider">
                        From: {claim.donorName}
                      </span>
                      <h3 className="font-editorial text-lg font-bold text-[#183D2B] mt-0.5">
                        {claim.foodName}
                      </h3>
                    </div>
                    <StatusBadge status={claim.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-[#F7F6F0] p-3 rounded border border-[#E2DFD2]">
                    <div>
                      <p className="text-[#647C50]">Quantity Ledger</p>
                      <p className="font-bold text-[#183D2B] font-mono tabular-nums text-sm">
                        {claim.quantity.pickupConfirmedKg || claim.quantity.measuredKg || claim.quantity.donorEstimatedKg} kg
                      </p>
                      <p className="text-[10px] text-[#50544C]">
                        {claim.quantity.pickupConfirmedKg ? 'Scale-Verified Pickup' : 'Donor Estimate'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#647C50]">Assigned Delivery Partner</p>
                      <p className="font-medium text-[#252923]">
                        {claim.assignedVolunteerName || 'Courier Assigned'}
                      </p>
                      {claim.volunteerPhone && (
                        <p className="text-[10px] text-[#50544C]">Phone: {claim.volunteerPhone}</p>
                      )}
                    </div>
                  </div>

                  {/* 5-Stage Stepper */}
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-[#252923]">Delivery Sequence</p>
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#50544C] flex-wrap">
                      <span className="font-semibold text-[#183D2B]">1. Reserved</span>
                      <span>→</span>
                      <span className={['assigned', 'arrived_at_donor', 'picked_up', 'in_transit', 'awaiting_ngo_confirmation'].includes(claim.status) ? 'font-semibold text-[#183D2B]' : ''}>
                        2. Courier Assigned
                      </span>
                      <span>→</span>
                      <span className={['picked_up', 'in_transit', 'awaiting_ngo_confirmation'].includes(claim.status) ? 'font-semibold text-[#183D2B]' : ''}>
                        3. In Transit
                      </span>
                      <span>→</span>
                      <span className={['awaiting_ngo_confirmation'].includes(claim.status) ? 'font-bold text-purple-800' : ''}>
                        4. At Facility
                      </span>
                    </div>
                  </div>

                  {/* ACTION BAR */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-[#E2DFD2]">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onViewSafetyAudit(claim)}
                        className="text-xs text-[#183D2B] hover:underline font-medium"
                      >
                        Safety Log
                      </button>

                      <button
                        onClick={() => {
                          setDiscrepancyDonation(claim);
                          setIssueDetailsInput('');
                        }}
                        className="text-xs text-[#C77A54] hover:underline font-medium flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3 h-3 text-[#C77A54]" />
                        <span>Report Issue</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {/* Confirm Receipt Button */}
                      {claim.status === 'awaiting_ngo_confirmation' ? (
                        <button
                          onClick={() => handleOpenConfirmReceipt(claim)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm Food Received</span>
                        </button>
                      ) : ['picked_up', 'in_transit'].includes(claim.status) ? (
                        <span className="text-[11px] text-[#50544C] italic bg-[#E2DFD2]/50 px-2.5 py-1 rounded">
                          Courier in transit · Awaiting arrival
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          PAGE 5: HISTORY TAB (COMPLETED RECEIPTS)
          ============================================================ */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
            <h2 className="font-editorial text-xl font-bold text-[#183D2B] mb-1">
              Completed Redirection History
            </h2>
            <p className="text-xs text-[#50544C]">
              Past donations successfully received and served at {ngoName}.
            </p>
          </div>

          {completedHistory.length === 0 ? (
            <div className="bg-white p-12 rounded-lg border border-[#E2DFD2] text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-[#647C50] mx-auto opacity-60" />
              <p className="font-editorial text-lg text-[#50544C]">No completed receipts recorded yet.</p>
              <p className="text-xs text-[#737373]">Completed handovers will generate official verified impact receipts here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {completedHistory.map((item) => (
                <div key={item.id} className="bg-white rounded-lg border border-[#E2DFD2] p-5 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold text-[#647C50] uppercase tracking-wider">
                        From {item.donorName}
                      </span>
                      <h3 className="font-editorial text-lg font-bold text-[#183D2B] mt-0.5">
                        {item.foodName}
                      </h3>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-[#F7F6F0] p-3 rounded text-center text-xs border border-[#E2DFD2]">
                    <div>
                      <p className="text-[10px] text-[#647C50]">Received Weight</p>
                      <p className="font-bold text-[#183D2B] font-mono text-sm">{item.quantity.deliveredKg || item.quantity.donorEstimatedKg} kg</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#647C50]">Portions Served</p>
                      <p className="font-bold text-[#183D2B] font-mono text-sm">~{item.impactReceipt?.mealsProvided || item.quantity.servingsEstimate}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#647C50]">Courier Handover</p>
                      <p className="font-medium text-[#252923] text-xs truncate">{item.assignedVolunteerName || 'Courier'}</p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center border-t border-[#E2DFD2]">
                    <button
                      onClick={() => onViewSafetyAudit(item)}
                      className="text-xs text-[#183D2B] hover:underline font-medium"
                    >
                      Audit Log
                    </button>
                    {item.impactReceipt && (
                      <button
                        onClick={() => setReceiptDonation(item)}
                        className="text-xs text-emerald-800 hover:text-emerald-950 font-medium underline flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Verified Receipt</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          SHARED NGO MODALS
          ============================================================ */}

      {/* RESERVATION CONFIRMATION DIALOG (Atomic Locking Step) */}
      {reservingDonation && (
        <div
          ref={modalContainerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-reservation-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-[#F7F6F0] rounded-xl max-w-lg w-full border border-[#E2DFD2] shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-[#183D2B]">
                <HeartHandshake className="w-5 h-5 text-[#C77A54]" />
                <h3 id="confirm-reservation-title" className="font-editorial text-xl font-bold">
                  Confirm Food Reservation
                </h3>
              </div>
              <button
                onClick={() => setReservingDonation(null)}
                aria-label="Close reservation dialog"
                className="text-[#50544C] hover:text-[#252923] p-1 rounded focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white p-4 rounded border border-[#E2DFD2] space-y-2 text-xs">
              <p className="font-semibold text-sm text-[#183D2B]">{reservingDonation.foodName}</p>
              <p className="text-[#50544C]">Donor: {reservingDonation.donorName} ({reservingDonation.donorAddress})</p>
              <div className="flex items-center gap-4 pt-2 font-mono tabular-nums">
                <span>
                  <strong>
                    {reservingDonation.quantity.pickupConfirmedKg ||
                      reservingDonation.quantity.measuredKg ||
                      reservingDonation.quantity.donorEstimatedKg}
                  </strong>{' '}
                  kg surplus
                </span>
                <span>·</span>
                <span>~{reservingDonation.quantity.servingsEstimate} community meals</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                Intake Confirmation Responsibility
              </p>
              <p className="text-[11px] text-amber-800">
                By completing reservation, your organization commits to receiving and verifying this food batch. FoodBridge will notify volunteer couriers for immediate pickup.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReservingDonation(null)}
                className="px-4 py-2 text-xs font-semibold text-[#50544C] hover:text-[#252923]"
              >
                Release Hold
              </button>
              <button
                type="button"
                disabled={confirmLocking}
                onClick={handleConfirmReservationSubmit}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] transition-colors rounded shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {confirmLocking ? 'Locking...' : 'Confirm Reservation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NGO CONFIRM FOOD RECEIVED MODAL */}
      {confirmReceiptDonation && (
        <div
          ref={modalContainerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-receipt-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-[#F7F6F0] rounded-xl max-w-lg w-full border border-[#E2DFD2] shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-[#E2DFD2] pb-3">
              <div className="flex items-center gap-2 text-emerald-800">
                <Check className="w-5 h-5" />
                <h3 id="confirm-receipt-title" className="font-editorial text-xl font-bold">
                  Confirm Food Receipt & Distribution
                </h3>
              </div>
              <button
                onClick={() => setConfirmReceiptDonation(null)}
                aria-label="Close dialog"
                className="text-[#50544C] hover:text-[#252923] p-1 rounded focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#50544C]">
              Verify incoming batch for <strong className="text-[#252923]">"{confirmReceiptDonation.foodName}"</strong> delivered by{' '}
              <strong className="text-[#252923]">{confirmReceiptDonation.assignedVolunteerName || 'Volunteer Courier'}</strong>.
            </p>

            <form onSubmit={handleSubmitConfirmReceipt} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#252923] mb-1">
                  Verified Intake Weight (kg) *
                </label>
                <input
                  type="number"
                  required
                  step="0.1"
                  value={receivedKgInput}
                  onChange={(e) => setReceivedKgInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2DFD2] rounded font-mono font-bold text-sm"
                />
                <p className="text-[11px] text-[#647C50] mt-1">
                  Expected weight: {confirmReceiptDonation.quantity.pickupConfirmedKg || confirmReceiptDonation.quantity.donorEstimatedKg} kg
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#252923] mb-1">
                  Receiving Supervisor / Kitchen Manager Name *
                </label>
                <input
                  type="text"
                  required
                  value={receivingSupervisorInput}
                  onChange={(e) => setReceivingSupervisorInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2DFD2] rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#252923] mb-1">
                  Intake Inspection Notes
                </label>
                <textarea
                  rows={2}
                  value={receiptNotesInput}
                  onChange={(e) => setReceiptNotesInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2DFD2] rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2DFD2]">
                <button
                  type="button"
                  onClick={() => setConfirmReceiptDonation(null)}
                  className="px-4 py-2 font-semibold text-[#50544C] hover:text-[#252923]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded shadow-xs cursor-pointer"
                >
                  Confirm & Generate Impact Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISCREPANCY REPORTING MODAL */}
      {discrepancyDonation && (
        <div
          ref={modalContainerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="discrepancy-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-[#F7F6F0] rounded-xl max-w-lg w-full border border-[#E2DFD2] shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-[#E2DFD2] pb-3">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-5 h-5 text-[#C77A54]" />
                <h3 id="discrepancy-title" className="font-editorial text-xl font-bold">
                  Report Handover Discrepancy
                </h3>
              </div>
              <button
                onClick={() => setDiscrepancyDonation(null)}
                aria-label="Close dialog"
                className="text-[#50544C] hover:text-[#252923] p-1 rounded focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDiscrepancy} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#252923] mb-1">
                  Discrepancy Classification *
                </label>
                <select
                  value={issueTypeInput}
                  onChange={(e) => setIssueTypeInput(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-[#E2DFD2] rounded"
                >
                  <option value="quantity_mismatch">Quantity Mismatch (Actual weight differs from ledger)</option>
                  <option value="damaged_food">Damaged Packaging / Contamination</option>
                  <option value="safety_temp_breach">Thermal Breach (Food temperature unsafe on arrival)</option>
                  <option value="packaging_breach">Unsealed or damaged container seals</option>
                  <option value="facility_closed">Delivery timing discrepancy</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#252923] mb-1">
                  Measured Weight (kg, if applicable)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={issueWeightInput}
                  onChange={(e) => setIssueWeightInput(e.target.value)}
                  placeholder="e.g. 18.5"
                  className="w-full px-3 py-2 bg-white border border-[#E2DFD2] rounded font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#252923] mb-1">
                  Incident Details & Corrective Action Taken *
                </label>
                <textarea
                  required
                  rows={3}
                  value={issueDetailsInput}
                  onChange={(e) => setIssueDetailsInput(e.target.value)}
                  placeholder="Describe the discrepancy clearly for the quality assurance ledger..."
                  className="w-full px-3 py-2 bg-white border border-[#E2DFD2] rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2DFD2]">
                <button
                  type="button"
                  onClick={() => setDiscrepancyDonation(null)}
                  className="px-4 py-2 font-semibold text-[#50544C] hover:text-[#252923]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded shadow-xs cursor-pointer"
                >
                  Log Discrepancy in Audit Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VERIFIED DELIVERY IMPACT RECEIPT MODAL */}
      {receiptDonation && receiptDonation.impactReceipt && (
        <div
          ref={modalContainerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-[#F7F6F0] rounded-xl max-w-lg w-full border border-[#E2DFD2] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#183D2B]" />
                <h3 id="receipt-dialog-title" className="font-editorial text-xl font-bold text-[#183D2B]">
                  Verified Impact Certificate
                </h3>
              </div>
              <button
                onClick={() => setReceiptDonation(null)}
                aria-label="Close certificate"
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
                <p className="text-[#50544C]">Donor Source: {receiptDonation.impactReceipt.donorName}</p>
                <p className="text-[#50544C]">Recipient Kitchen: {receiptDonation.impactReceipt.ngoName}</p>
                <p className="text-[#50544C]">Volunteer Transport: {receiptDonation.impactReceipt.volunteerName}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 bg-[#E8EDE2] rounded text-center">
                <div>
                  <p className="text-[10px] text-[#647C50]">Received</p>
                  <p className="font-bold font-mono text-sm text-[#183D2B]">{receiptDonation.impactReceipt.deliveredKg} kg</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#647C50]">Portions Served</p>
                  <p className="font-bold font-mono text-sm text-[#183D2B]">~{receiptDonation.impactReceipt.mealsProvided}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#647C50]">CO₂e Prevented</p>
                  <p className="font-bold font-mono text-sm text-[#183D2B]">{receiptDonation.impactReceipt.co2PreventedKg} kg</p>
                </div>
              </div>

              <p className="text-[10px] text-[#50544C] border-t border-[#E2DFD2] pt-2">
                FSSAI redistribution citation: {receiptDonation.impactReceipt.fssaiRuleCitation}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setReceiptDonation(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#183D2B] rounded hover:bg-[#254F38]"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
