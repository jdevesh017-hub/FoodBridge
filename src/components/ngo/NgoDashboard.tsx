import React, { useState } from 'react';
import { donationService } from '../../services/donationService';
import { volunteerService, calculateDistanceKm } from '../../services/volunteerService';
import { FoodCategory, FoodDonation, UserProfile } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { LeafletMap } from '../map/LeafletMap';
import { Filter, MapPin, Clock, ShieldCheck, Check, AlertCircle, ArrowRight, X, HeartHandshake, Eye, Scale, FileText, AlertTriangle, Info, BarChart3 } from 'lucide-react';

interface NgoDashboardProps {
  user: UserProfile | null;
  onViewSafetyAudit: (donation: FoodDonation) => void;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onNavigate: (view: string) => void;
  initialTab?: 'discover' | 'my_claims' | 'history';
}

export const NgoDashboard: React.FC<NgoDashboardProps> = ({
  user,
  onViewSafetyAudit,
  onShowToast,
  onNavigate,
  initialTab = 'discover',
}) => {
  const [activeTab, setActiveTab] = useState<'discover' | 'my_claims' | 'history'>(initialTab);
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

  // NGO Confirm Receipt Modal State
  const [confirmReceiptDonation, setConfirmReceiptDonation] = useState<FoodDonation | null>(null);
  const [receivedKgInput, setReceivedKgInput] = useState<string>('');
  const [receivingSupervisorInput, setReceivingSupervisorInput] = useState<string>('Sister Teresa Roy');
  const [receiptNotesInput, setReceiptNotesInput] = useState<string>('Inspected and served in community kitchen');

  // Discrepancy Reporting Modal State
  const [discrepancyDonation, setDiscrepancyDonation] = useState<FoodDonation | null>(null);
  const [issueTypeInput, setIssueTypeInput] = useState<'damaged_food' | 'quantity_mismatch' | 'safety_temp_breach' | 'packaging_breach' | 'facility_closed'>('damaged_food');
  const [issueDetailsInput, setIssueDetailsInput] = useState<string>('');
  const [issueWeightInput, setIssueWeightInput] = useState<string>('');

  const ngoId = user?.id || 'ngo_hope_kitchen';
  const ngoName = user?.organizationName || user?.fullName || 'Hope Community Kitchen & Shelter';
  const ngoAddress = user?.address || '102 Compassion Lane, West Haven';
  const ngoLat = user?.lat || 19.0620;
  const ngoLng = user?.lng || 72.8550;

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Handle keyboard Escape for all modals
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (reservingDonation) setReservingDonation(null);
        else if (confirmReceiptDonation) setConfirmReceiptDonation(null);
        else if (discrepancyDonation) setDiscrepancyDonation(null);
        else if (receiptDonation) setReceiptDonation(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reservingDonation, confirmReceiptDonation, discrepancyDonation, receiptDonation]);

  const allDonations = donationService.getAllDonations();

  // Filter available donations with Category, Dietary, Minimum Quantity, Distance, and Pickup Deadline
  const availableDonations = allDonations.filter((d) => {
    if (d.status !== 'available') return false;
    if (categoryFilter !== 'all' && d.foodCategory !== categoryFilter) return false;
    if (dietaryFilter !== 'all' && !d.dietaryTags.includes(dietaryFilter as any)) return false;

    const effectiveKg = d.quantity.measuredKg || d.quantity.donorEstimatedKg;
    if (minQuantityKg > 0 && effectiveKg < minQuantityKg) return false;

    const dist = calculateDistanceKm(ngoLat, ngoLng, d.donorLat, d.donorLng);
    if (dist > maxDistanceKm) return false;

    // Pickup deadline filtering (within next X hours)
    if (pickupDeadlineHours < 24) {
      const deadlineDate = new Date(d.pickupWindowEnd);
      const hoursUntilDeadline = (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilDeadline > pickupDeadlineHours || hoursUntilDeadline < 0) return false;
    }

    return true;
  });

  // My active claims / reservations (in-flight)
  const myClaims = allDonations.filter(
    (d) =>
      (d.reservedByNgoId === ngoId || (user?.role === 'public' && d.reservedByNgoId === 'ngo_hope_kitchen')) &&
      d.status !== 'delivered' &&
      d.status !== 'cancelled_by_ngo'
  );

  // Completed donation history
  const completedHistory = allDonations.filter(
    (d) =>
      (d.reservedByNgoId === ngoId || (user?.role === 'public' && d.reservedByNgoId === 'ngo_hope_kitchen')) &&
      d.status === 'delivered'
  );

  const selectedDonation = allDonations.find((d) => d.id === selectedDonationId);

  // Handle clicking "Reserve" -> Step 1: Acquire lease lock
  const handleInitiateReservation = (donation: FoodDonation) => {
    const lockResult = donationService.acquireReservationLock(donation.id, ngoId, user?.role || 'ngo', 90);
    if (!lockResult.success) {
      onShowToast(lockResult.error || 'Donation is no longer available.', 'error');
      return;
    }
    setReservingDonation(donation);
  };

  // Step 2: Confirm atomic reservation
  const handleConfirmReservation = () => {
    if (!reservingDonation) return;
    setConfirmLocking(true);

    const result = donationService.confirmReservation(reservingDonation.id, {
      id: ngoId,
      name: ngoName,
      address: ngoAddress,
      lat: ngoLat,
      lng: ngoLng,
      role: user?.role || 'ngo',
    });

    setConfirmLocking(false);
    setReservingDonation(null);

    if (result.success && result.donation) {
      onShowToast(
        `Reservation confirmed! "${result.donation.foodName}" has been routed to our volunteer dispatch pool.`,
        'success'
      );
      setActiveTab('my_claims');
    } else {
      onShowToast(result.error || 'Failed to complete reservation.', 'error');
    }
  };

  // NGO releases reservation if no longer needed
  const handleReleaseReservation = (donationId: string) => {
    if (window.confirm('Release this reservation back to other local community kitchens?')) {
      const res = donationService.releaseReservation(donationId, ngoName);
      if (res.success) {
        onShowToast('Donation released back to available pool.', 'info');
      } else {
        onShowToast(res.error || 'Could not release reservation.', 'error');
      }
    }
  };

  // Open Confirm Receipt Modal
  const handleOpenConfirmReceipt = (donation: FoodDonation) => {
    setConfirmReceiptDonation(donation);
    setReceivedKgInput(
      String(donation.quantity.pickupConfirmedKg || donation.quantity.measuredKg || donation.quantity.donorEstimatedKg)
    );
  };

  // Submit NGO Confirm Receipt
  const handleConfirmReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmReceiptDonation) return;

    const res = volunteerService.confirmNgoReceipt(confirmReceiptDonation.id, ngoName, {
      receivedKg: Number(receivedKgInput),
      receivingSupervisorName: receivingSupervisorInput,
      notes: receiptNotesInput,
    });

    setConfirmReceiptDonation(null);
    if (res.success && res.donation) {
      onShowToast(
        `Food receipt confirmed! Delivered weight verified: ${res.donation.quantity.deliveredKg} kg (~${res.donation.impactReceipt?.mealsProvided} meals). Impact logged.`,
        'success'
      );
      setActiveTab('history');
    } else {
      onShowToast(res.error || 'Failed to confirm receipt.', 'error');
    }
  };

  // Submit Discrepancy / Damage Report
  const handleDiscrepancySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discrepancyDonation) return;

    const res = volunteerService.reportDiscrepancy(discrepancyDonation.id, 'ngo', ngoName, {
      issueType: issueTypeInput,
      details: issueDetailsInput,
      actualWeightReceivedKg: issueWeightInput ? Number(issueWeightInput) : undefined,
    });

    setDiscrepancyDonation(null);
    if (res.success) {
      onShowToast(`Delivery issue flagged. Recorded in mission timeline for donor review.`, 'warning');
    } else {
      onShowToast(res.error || 'Failed to report discrepancy.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DFD2] pb-5">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-[#647C50]">
            Community Redistribution Portal · Verified NGO
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#183D2B] mt-1">
            Discover Available Surplus Food
          </h1>
          <p className="text-sm text-[#50544C] mt-1">
            Logged in organization: <span className="font-medium text-[#252923]">{ngoName}</span> · Active distribution zone: West Haven
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
              onClick={() => setActiveTab('discover')}
              className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeTab === 'discover' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              Available Surplus ({availableDonations.length})
            </button>
            <button
              onClick={() => setActiveTab('my_claims')}
              className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeTab === 'my_claims' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              My Active Deliveries ({myClaims.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeTab === 'history' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              Completed History ({completedHistory.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'discover' ? (
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
                        isSelected
                          ? 'border-[#183D2B] ring-1 ring-[#183D2B]'
                          : 'border-[#E2DFD2] hover:border-[#647C50]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Food Image */}
                        <div className="w-full sm:w-36 h-28 shrink-0 rounded overflow-hidden bg-[#E8EDE2] relative">
                          <img
                            src={donation.photoUrl || '/src/assets/images/hero_food_redistribution_1794331332502.jpg'}
                            alt={donation.foodName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1.5 left-1.5 bg-[#183D2B]/90 text-white text-[10px] px-2 py-0.5 rounded font-mono tabular-nums">
                            {effectiveKg} kg
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[11px] uppercase tracking-wider text-[#647C50] font-semibold">
                                {donation.donorType} · {donation.donorName}
                              </p>
                              <h3 className="font-editorial text-lg font-bold text-[#183D2B] leading-tight">
                                {donation.foodName}
                              </h3>
                            </div>
                            <span className="text-xs font-mono font-semibold text-[#183D2B] bg-[#E8EDE2] px-2 py-0.5 rounded">
                              ~{donation.quantity.servingsEstimate} meals
                            </span>
                          </div>

                          <p className="text-xs text-[#50544C] line-clamp-2">
                            {donation.description}
                          </p>

                          {/* Food Safety & Thermal Compliance Row */}
                          <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded ${
                                donation.safety.assessmentOutcome === 'SUITABLE_FOR_REVIEW'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : donation.safety.assessmentOutcome === 'NEEDS_REVIEW'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : donation.safety.assessmentOutcome === 'INCOMPLETE_INFORMATION'
                                  ? 'bg-orange-50 text-orange-800 border border-orange-200'
                                  : 'bg-red-50 text-red-800 border border-red-200'
                              }`}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>{(donation.safety.assessmentOutcome || donation.safety.complianceStatus).replace(/_/g, ' ')}</span>
                            </span>
                            <span className="text-[#50544C]">
                              {donation.safety.storageCondition.replace(/_/g, ' ')}
                              {donation.safety.temperatureCelsius !== undefined
                                ? ` · ${donation.safety.temperatureCelsius}°${donation.safety.temperatureUnit === 'fahrenheit' ? 'F' : 'C'}`
                                : ''}
                            </span>
                            {donation.safety.warnings && donation.safety.warnings.length > 0 && (
                              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px] flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {donation.safety.warnings.length} advisory
                              </span>
                            )}
                          </div>

                          {/* Metadata row */}
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#50544C] pt-1 border-t border-[#E2DFD2]">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#C77A54]" />
                              {donation.donorAddress.split(',')[0]}
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#647C50]" />
                              Pickup before {new Date(donation.pickupWindowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Action Row */}
                          <div className="pt-2 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewSafetyAudit(donation);
                              }}
                              className="text-xs text-[#647C50] hover:text-[#183D2B] font-medium flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-[#183D2B]" />
                              <span>View FSSAI Audit</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInitiateReservation(donation);
                              }}
                              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] transition-colors rounded shadow-2xs"
                            >
                              Reserve This Donation
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Map Column (Sticky) */}
            <div className="lg:col-span-5 sticky top-28 space-y-3">
              <div className="h-[520px] w-full">
                <LeafletMap
                  donations={availableDonations}
                  selectedDonationId={selectedDonationId}
                  onSelectDonation={(id) => setSelectedDonationId(id)}
                  showRouteForDonation={selectedDonation}
                />
              </div>
              <p className="text-[11px] text-[#50544C] text-center">
                Click any marker on the map to inspect available food lot and verified location.
              </p>
            </div>
          </div>
        </>
      ) : activeTab === 'my_claims' ? (
        /* MY RESERVATIONS TAB */
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
            <h2 className="font-editorial text-xl font-bold text-[#183D2B] mb-1">
              Active Community Reservations & Deliveries
            </h2>
            <p className="text-xs text-[#50544C]">
              Surplus lots currently locked and dispatched for delivery to {ngoName}.
            </p>
          </div>

          {myClaims.length === 0 ? (
            <div className="bg-white p-12 rounded-lg border border-[#E2DFD2] text-center space-y-3">
              <p className="font-editorial text-lg text-[#50544C]">You have no active food reservations.</p>
              <p className="text-xs text-[#737373]">Explore available surplus to request meals for your dining hall.</p>
              <button
                onClick={() => setActiveTab('discover')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#183D2B] rounded hover:bg-[#254F38]"
              >
                <span>Browse Surplus Food</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {myClaims.map((claim) => {
                const effectiveKg = claim.quantity.pickupConfirmedKg || claim.quantity.measuredKg || claim.quantity.donorEstimatedKg;
                return (
                  <div key={claim.id} className="bg-white rounded-lg border border-[#E2DFD2] p-5 space-y-4 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-semibold text-[#647C50] uppercase tracking-wider">
                          Donor: {claim.donorName}
                        </span>
                        <h3 className="font-editorial text-lg font-bold text-[#183D2B] mt-0.5">
                          {claim.foodName}
                        </h3>
                      </div>
                      <StatusBadge status={claim.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-[#F7F6F0] p-3 rounded border border-[#E2DFD2]">
                      <div>
                        <p className="text-[#647C50]">Quantity Reserved</p>
                        <p className="font-bold text-[#183D2B] font-mono tabular-nums text-sm">
                          {claim.quantity.pickupConfirmedKg || claim.quantity.measuredKg || claim.quantity.donorEstimatedKg} kg (~{claim.quantity.servingsEstimate} meals)
                        </p>
                      </div>
                      <div>
                        <p className="text-[#647C50]">Assigned Delivery Partner</p>
                        <p className="font-medium text-[#252923]">
                          {claim.assignedVolunteerName ? (
                            <span>{claim.assignedVolunteerName} ({claim.volunteerPhone || 'Active run'})</span>
                          ) : (
                            <span className="italic text-[#737373]">Dispatched to courier fleet</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Progress tracking */}
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold text-[#252923]">Redistribution Sequence</p>
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#50544C] flex-wrap">
                        <span className="font-semibold text-[#183D2B]">1. Reserved</span>
                        <span>→</span>
                        <span className={['assigned', 'arrived_at_donor', 'picked_up', 'in_transit', 'awaiting_ngo_confirmation', 'delivered'].includes(claim.status) ? 'font-semibold text-[#183D2B]' : ''}>
                          2. Courier Assigned
                        </span>
                        <span>→</span>
                        <span className={['picked_up', 'in_transit', 'awaiting_ngo_confirmation', 'delivered'].includes(claim.status) ? 'font-semibold text-[#183D2B]' : ''}>
                          3. In Transit
                        </span>
                        <span>→</span>
                        <span className={['awaiting_ngo_confirmation', 'delivered'].includes(claim.status) ? 'font-semibold text-purple-800' : ''}>
                          4. At NGO Facility
                        </span>
                        <span>→</span>
                        <span className={claim.status === 'delivered' ? 'font-semibold text-emerald-700' : ''}>
                          5. Receipt Confirmed
                        </span>
                      </div>
                    </div>

                    {/* NGO ACTION BAR */}
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
                          Report Issue
                        </button>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {claim.status === 'reserved' && (
                          <button
                            onClick={() => handleReleaseReservation(claim.id)}
                            className="text-xs text-[#C77A54] hover:underline font-medium"
                          >
                            Cancel Reservation
                          </button>
                        )}

                        {/* NGO Confirm Receipt Button: Enabled when awaiting NGO confirmation or arrived */}
                        {['awaiting_ngo_confirmation', 'picked_up', 'in_transit'].includes(claim.status) && (
                          <button
                            onClick={() => handleOpenConfirmReceipt(claim)}
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded shadow-xs flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm Food Received</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* COMPLETED DONATION HISTORY TAB */
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

      {/* RESERVATION CONFIRMATION DIALOG (Atomic Locking Step) */}
      {reservingDonation && (
        <div
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

            {/* Dedicated Food Safety & Quality Review Section */}
            <div className="bg-white p-4 rounded border border-[#E2DFD2] space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-2">
                <span className="font-semibold text-[#183D2B] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-[#C77A54]" />
                  Food Safety Assessment Review
                </span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-[10px] ${
                    reservingDonation.safety.assessmentOutcome === 'SUITABLE_FOR_REVIEW'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : reservingDonation.safety.assessmentOutcome === 'NEEDS_REVIEW'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : reservingDonation.safety.assessmentOutcome === 'INCOMPLETE_INFORMATION'
                      ? 'bg-orange-50 text-orange-800 border border-orange-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {(reservingDonation.safety.assessmentOutcome || reservingDonation.safety.complianceStatus).replace(/_/g, ' ')}
                </span>
              </div>

              {/* Assessment parameters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-[#F7F6F0] p-2.5 rounded border border-[#E2DFD2]">
                <div>
                  <p className="text-[#647C50]">Storage Method</p>
                  <p className="font-medium text-[#252923] capitalize">
                    {reservingDonation.safety.storageCondition.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-[#647C50]">Recorded Temp</p>
                  <p className="font-bold text-[#183D2B] font-mono">
                    {reservingDonation.safety.temperatureCelsius !== undefined
                      ? `${reservingDonation.safety.temperatureCelsius}°${reservingDonation.safety.temperatureUnit === 'fahrenheit' ? 'F' : 'C'}`
                      : 'Not recorded'}
                  </p>
                </div>
                <div>
                  <p className="text-[#647C50]">Prepared</p>
                  <p className="font-medium text-[#252923]">
                    ~{Math.round(reservingDonation.safety.hoursSincePreparation * 60)} mins ago
                  </p>
                </div>
                <div>
                  <p className="text-[#647C50]">Packaging</p>
                  <p className="font-medium text-[#252923] capitalize">
                    {(reservingDonation.safety.packagingCondition || (reservingDonation.safety.isCleanPackaged ? 'food_grade_sealed' : 'unsealed')).replace(/_/g, ' ')}
                  </p>
                </div>
              </div>

              {/* Warnings and Missing Info */}
              {reservingDonation.safety.warnings && reservingDonation.safety.warnings.length > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] space-y-1 text-amber-950">
                  <p className="font-semibold flex items-center gap-1 text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    Advisory Considerations:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-900 pl-1">
                    {reservingDonation.safety.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {reservingDonation.safety.missingInformation && reservingDonation.safety.missingInformation.length > 0 && (
                <div className="p-2.5 bg-orange-50 border border-orange-200 rounded text-[11px] space-y-1 text-orange-950">
                  <p className="font-semibold flex items-center gap-1 text-orange-900">
                    <AlertCircle className="w-3.5 h-3.5 text-orange-700" />
                    Missing Donor Information:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-orange-900 pl-1">
                    {reservingDonation.safety.missingInformation.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Prominent Caution Banner for Needs Review / Incomplete Information */}
              {(reservingDonation.safety.assessmentOutcome === 'NEEDS_REVIEW' ||
                reservingDonation.safety.assessmentOutcome === 'INCOMPLETE_INFORMATION') && (
                <div className="p-3 bg-amber-100/70 border border-amber-300 rounded text-xs space-y-1 text-amber-950">
                  <p className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    Caution: On-Site Kitchen Inspection Required
                  </p>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    This donation is flagged as <strong>{reservingDonation.safety.assessmentOutcome.replace(/_/g, ' ')}</strong> due to missing temperature readings or handling advisories. Your receiving staff must conduct a visual, sensory, and temperature check upon delivery before serving to beneficiaries.
                  </p>
                </div>
              )}

              {/* Official assessment notice */}
              <p className="text-[10px] text-[#737373] italic">
                * Note: Structured assessment outcomes are decision-support classifications, not certified guarantees of food safety. Receiving inspection remains strictly required.
              </p>

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => onViewSafetyAudit(reservingDonation)}
                  className="text-[11px] text-[#183D2B] hover:text-[#C77A54] underline font-medium flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#183D2B]" />
                  <span>Open Full Food Safety Inspector & Audit Trail</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#E8EDE2] rounded border border-[#D3DECD] text-xs text-[#183D2B] space-y-1">
              <p className="font-semibold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-[#183D2B]" />
                Redistribution Commitment
              </p>
              <p className="text-[#50544C] leading-relaxed">
                By confirming, this batch is atomically locked for {ngoName}. A volunteer courier will be routed to pick up
                and deliver to your facility.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReservingDonation(null)}
                className="px-4 py-2 text-xs font-medium text-[#50544C] hover:text-[#252923]"
              >
                Back
              </button>
              <button
                type="button"
                disabled={confirmLocking}
                onClick={handleConfirmReservation}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] rounded shadow-xs"
              >
                {confirmLocking ? 'Locking Reservation...' : 'Confirm & Dispatch Courier'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* NGO CONFIRM RECEIPT MODAL */}
      {confirmReceiptDonation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-receipt-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <form
            onSubmit={handleConfirmReceiptSubmit}
            className="bg-[#F7F6F0] rounded-xl max-w-md w-full border border-[#E2DFD2] shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-emerald-900 border-b border-[#E2DFD2] pb-3">
              <Check className="w-5 h-5 text-emerald-700" />
              <h3 id="confirm-receipt-title" className="font-editorial text-xl font-bold">
                Confirm Food Received at Shelter
              </h3>
            </div>
            <p className="text-xs text-[#50544C]">
              Verify incoming condition and measure actual delivered weight. This generates the official impact receipt.
            </p>

            <div className="space-y-3 bg-white p-4 rounded border border-[#E2DFD2] text-xs">
              <div>
                <p className="font-semibold text-sm text-[#183D2B]">{confirmReceiptDonation.foodName}</p>
                <p className="text-[#50544C]">Donor: {confirmReceiptDonation.donorName}</p>
                <p className="text-[#50544C]">Courier: {confirmReceiptDonation.assignedVolunteerName || 'Volunteer'}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252923] mb-1">
                  Receiving Supervisor Name *
                </label>
                <input
                  type="text"
                  required
                  value={receivingSupervisorInput}
                  onChange={(e) => setReceivingSupervisorInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252923] mb-1">
                  Actual Delivered Net Weight (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  min="0.1"
                  value={receivedKgInput}
                  onChange={(e) => setReceivedKgInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded font-mono font-bold text-[#183D2B]"
                />
                <p className="text-[10px] text-[#647C50] mt-1">
                  Estimated Portions: ~{Math.round((Number(receivedKgInput) || 0) / 0.35)} community meals
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252923] mb-1">
                  Condition & Acceptance Notes
                </label>
                <input
                  type="text"
                  value={receiptNotesInput}
                  onChange={(e) => setReceiptNotesInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2DFD2]">
              <button
                type="button"
                onClick={() => setConfirmReceiptDonation(null)}
                className="px-4 py-2 text-xs text-[#50544C]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-800 rounded hover:bg-emerald-900 shadow-xs"
              >
                Sign Off & Conclude Delivery
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DISCREPANCY / DAMAGE REPORT MODAL */}
      {discrepancyDonation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="discrepancy-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <form
            onSubmit={handleDiscrepancySubmit}
            className="bg-[#F7F6F0] rounded-xl max-w-md w-full border border-[#E2DFD2] shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-red-900 border-b border-[#E2DFD2] pb-3">
              <AlertTriangle className="w-5 h-5 text-red-700" />
              <h3 id="discrepancy-title" className="font-editorial text-lg font-bold">
                Report Delivery Issue / Discrepancy
              </h3>
            </div>
            <p className="text-xs text-[#50544C]">
              Flag issues found upon arrival or handover for: <strong>{discrepancyDonation.foodName}</strong>.
            </p>

            <div className="space-y-3 bg-white p-4 rounded border border-[#E2DFD2] text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#252923] mb-1">
                  Issue Type *
                </label>
                <select
                  value={issueTypeInput}
                  onChange={(e) => setIssueTypeInput(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded"
                >
                  <option value="damaged_food">Food spilled, spoiled or damaged during transit</option>
                  <option value="quantity_mismatch">Major quantity mismatch / deficit</option>
                  <option value="safety_temp_breach">Thermal safety breach (temperature below/above threshold)</option>
                  <option value="packaging_breach">Unhygienic / damaged packaging seals</option>
                  <option value="facility_closed">Delivery rejected / facility issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252923] mb-1">
                  Detailed Notes *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe the issue, temperature reading, or damage observed."
                  value={issueDetailsInput}
                  onChange={(e) => setIssueDetailsInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252923] mb-1">
                  Actual Usable Weight If Any (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0 if completely rejected"
                  value={issueWeightInput}
                  onChange={(e) => setIssueWeightInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2DFD2]">
              <button
                type="button"
                onClick={() => setDiscrepancyDonation(null)}
                className="px-4 py-2 text-xs text-[#50544C]"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-red-800 rounded hover:bg-red-900"
              >
                Log Discrepancy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VERIFIED DELIVERY IMPACT RECEIPT MODAL */}
      {receiptDonation && receiptDonation.impactReceipt && (
        <div
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
                  Verified Delivery & Impact Receipt
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
                <p className="text-[#50544C]">Donor Facility: {receiptDonation.impactReceipt.donorName}</p>
                <p className="text-[#50544C]">Courier Sign-Off: {receiptDonation.impactReceipt.volunteerName}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 bg-[#E8EDE2] rounded text-center">
                <div>
                  <p className="text-[10px] text-[#647C50]">Received Weight</p>
                  <p className="font-bold font-mono text-sm text-[#183D2B]">{receiptDonation.impactReceipt.deliveredKg} kg</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#647C50]">Portions Provided</p>
                  <p className="font-bold font-mono text-sm text-[#183D2B]">~{receiptDonation.impactReceipt.mealsProvided}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#647C50]">CO₂e Prevented</p>
                  <p className="font-bold font-mono text-sm text-[#183D2B]">{receiptDonation.impactReceipt.co2PreventedKg} kg</p>
                </div>
              </div>

              <p className="text-[10px] text-[#50544C] border-t border-[#E2DFD2] pt-2">
                Safety compliance: {receiptDonation.impactReceipt.fssaiRuleCitation}
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
