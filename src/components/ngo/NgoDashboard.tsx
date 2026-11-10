import React, { useState } from 'react';
import { donationService } from '../../services/donationService';
import { FoodCategory, FoodDonation, UserProfile } from '../../types';
import { LeafletMap } from '../map/LeafletMap';
import { Filter, MapPin, Clock, ShieldCheck, Check, AlertCircle, ArrowRight, X, HeartHandshake, Eye } from 'lucide-react';

interface NgoDashboardProps {
  user: UserProfile | null;
  onViewSafetyAudit: (donation: FoodDonation) => void;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onNavigate: (view: string) => void;
}

export const NgoDashboard: React.FC<NgoDashboardProps> = ({
  user,
  onViewSafetyAudit,
  onShowToast,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'discover' | 'my_claims'>('discover');
  const [selectedDonationId, setSelectedDonationId] = useState<string | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dietaryFilter, setDietaryFilter] = useState<string>('all');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(15);

  // Reservation Confirmation Modal State
  const [reservingDonation, setReservingDonation] = useState<FoodDonation | null>(null);
  const [confirmLocking, setConfirmLocking] = useState(false);

  const ngoId = user?.id || 'ngo_hope_kitchen';
  const ngoName = user?.organizationName || user?.fullName || 'Hope Community Kitchen & Shelter';
  const ngoAddress = user?.address || '102 Compassion Lane, West Haven';
  const ngoLat = user?.lat || 19.0620;
  const ngoLng = user?.lng || 72.8550;

  const allDonations = donationService.getAllDonations();

  // Filter available donations
  const availableDonations = allDonations.filter((d) => {
    if (d.status !== 'available') return false;
    if (categoryFilter !== 'all' && d.foodCategory !== categoryFilter) return false;
    if (dietaryFilter !== 'all' && !d.dietaryTags.includes(dietaryFilter as any)) return false;
    return true;
  });

  // My claimed/reserved donations
  const myClaims = allDonations.filter(
    (d) => d.reservedByNgoId === ngoId || (user?.role === 'public' && d.reservedByNgoId === 'ngo_hope_kitchen')
  );

  const selectedDonation = allDonations.find((d) => d.id === selectedDonationId);

  // Handle clicking "Reserve" -> Step 1: Acquire lock
  const handleInitiateReservation = (donation: FoodDonation) => {
    const lockResult = donationService.acquireReservationLock(donation.id, ngoId, 90);
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
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-[#E8EDE2] p-1 rounded self-start md:self-auto">
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
            My Reserved Deliveries ({myClaims.length})
          </button>
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
      ) : (
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
                      <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#E8EDE2] text-[#183D2B] uppercase font-mono">
                        {claim.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-[#F7F6F0] p-3 rounded border border-[#E2DFD2]">
                      <div>
                        <p className="text-[#647C50]">Quantity Reserved</p>
                        <p className="font-bold text-[#183D2B] font-mono tabular-nums text-sm">
                          {effectiveKg} kg (~{claim.quantity.servingsEstimate} meals)
                        </p>
                      </div>
                      <div>
                        <p className="text-[#647C50]">Courier Status</p>
                        <p className="font-medium text-[#252923]">
                          {claim.assignedVolunteerName ? claim.assignedVolunteerName : 'Dispatched to couriers'}
                        </p>
                      </div>
                    </div>

                    {/* Progress tracking */}
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold text-[#252923]">Redistribution Sequence</p>
                      <div className="flex items-center gap-2 text-[11px] text-[#50544C]">
                        <span className="font-semibold text-[#183D2B]">1. Reserved</span>
                        <span>→</span>
                        <span className={['assigned', 'arrived_at_donor', 'in_transit', 'delivered'].includes(claim.status) ? 'font-semibold text-[#183D2B]' : ''}>
                          2. Courier Assigned
                        </span>
                        <span>→</span>
                        <span className={['in_transit', 'delivered'].includes(claim.status) ? 'font-semibold text-[#183D2B]' : ''}>
                          3. In Transit
                        </span>
                        <span>→</span>
                        <span className={claim.status === 'delivered' ? 'font-semibold text-emerald-700' : ''}>
                          4. Received
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 flex items-center justify-between border-t border-[#E2DFD2]">
                      <button
                        onClick={() => onViewSafetyAudit(claim)}
                        className="text-xs text-[#183D2B] hover:underline font-medium"
                      >
                        Inspect Food Safety Log
                      </button>

                      {claim.status === 'reserved' && (
                        <button
                          onClick={() => handleReleaseReservation(claim.id)}
                          className="text-xs text-[#C77A54] hover:underline"
                        >
                          Cancel Reservation
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RESERVATION CONFIRMATION DIALOG (Atomic Locking Step) */}
      {reservingDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#F7F6F0] rounded-xl max-w-lg w-full border border-[#E2DFD2] shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-[#183D2B]">
                <HeartHandshake className="w-5 h-5 text-[#C77A54]" />
                <h3 className="font-editorial text-xl font-bold">
                  Confirm Food Reservation
                </h3>
              </div>
              <button
                onClick={() => setReservingDonation(null)}
                className="text-[#50544C] hover:text-[#252923]"
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
    </div>
  );
};
