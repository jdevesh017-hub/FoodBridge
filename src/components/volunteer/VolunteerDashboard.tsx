import React, { useState } from 'react';
import { volunteerService } from '../../services/volunteerService';
import { FoodDonation, UserProfile } from '../../types';
import { LeafletMap } from '../map/LeafletMap';
import { Truck, MapPin, CheckCircle2, AlertTriangle, Clock, ArrowRight, ShieldCheck, X, Navigation, RotateCcw } from 'lucide-react';

interface VolunteerDashboardProps {
  user: UserProfile | null;
  onViewSafetyAudit: (donation: FoodDonation) => void;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onNavigate: (view: string) => void;
}

export const VolunteerDashboard: React.FC<VolunteerDashboardProps> = ({
  user,
  onViewSafetyAudit,
  onShowToast,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'available' | 'active_run' | 'history'>('available');
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined);

  // Modal states for exception handling & pickup verification
  const [showCancelModal, setShowCancelModal] = useState<FoodDonation | null>(null);
  const [cancelReason, setCancelReason] = useState('Vehicle mechanical issue');
  const [showFailedModal, setShowFailedModal] = useState<FoodDonation | null>(null);
  const [failedReason, setFailedReason] = useState('Donor premises closed / unresponsive');
  const [showPickupModal, setShowPickupModal] = useState<FoodDonation | null>(null);
  const [verifiedWeightInput, setVerifiedWeightInput] = useState<string>('');

  const volunteerId = user?.id || 'volunteer_alex';
  const volunteerName = user?.fullName || 'Alex Rivera';
  const volunteerPhone = user?.phone || '+91 98440 23901';
  const volunteerLat = user?.lat || 19.0720;
  const volunteerLng = user?.lng || 72.8710;

  const availableTasks = volunteerService.getAvailableTasks(volunteerLat, volunteerLng);
  const myAssignments = volunteerService.getMyAssignments(volunteerId);
  const deliveryHistory = volunteerService.getMyDeliveryHistory(volunteerId);

  // Active assignment being processed
  const activeRun = myAssignments[0] || null;
  const displayedDonation = activeRun || availableTasks.find((t) => t.id === selectedTaskId) || null;

  // Handler: Accept Task
  const handleAcceptTask = (task: FoodDonation) => {
    const res = volunteerService.acceptTask(task.id, {
      id: volunteerId,
      name: volunteerName,
      phone: volunteerPhone,
    });
    if (res.success) {
      onShowToast(`Task accepted! Proceed to ${task.donorName} for collection.`, 'success');
      setActiveTab('active_run');
    } else {
      onShowToast(res.error || 'Failed to claim task.', 'error');
    }
  };

  // Progression Step 2: Arrived at Donor
  const handleConfirmArrival = (donationId: string) => {
    const res = volunteerService.confirmArrivalAtDonor(donationId, volunteerName);
    if (res.success) {
      onShowToast('Arrival confirmed. Begin temperature & packaging audit.', 'info');
    } else {
      onShowToast(res.error || 'Error recording arrival.', 'error');
    }
  };

  // Progression Step 3: Food Picked Up
  const handleConfirmPickupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPickupModal) return;

    const weight = verifiedWeightInput ? Number(verifiedWeightInput) : undefined;
    const res = volunteerService.confirmFoodPickup(showPickupModal.id, volunteerName, weight);

    setShowPickupModal(null);
    if (res.success) {
      onShowToast('Food secured in transit carrier. Route to NGO recipient.', 'success');
    } else {
      onShowToast(res.error || 'Error confirming pickup.', 'error');
    }
  };

  // Progression Step 4: Final Handover to NGO
  const handleConfirmDelivery = (donation: FoodDonation) => {
    const receiverName = donation.reservedByNgoName || 'Shelter Supervisor';
    const res = volunteerService.confirmDeliveryToNgo(
      donation.id,
      volunteerName,
      receiverName,
      'Food inspected and accepted in full.'
    );
    if (res.success) {
      onShowToast(`Rescue completed! Food safely received at ${receiverName}.`, 'success');
      setActiveTab('history');
    } else {
      onShowToast(res.error || 'Error completing delivery.', 'error');
    }
  };

  // Exception Workflow: Cancel Assignment
  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCancelModal) return;

    const res = volunteerService.cancelAssignment(showCancelModal.id, volunteerName, cancelReason);
    setShowCancelModal(null);
    if (res.success) {
      onShowToast('Assignment released. Reopened with urgent priority for other couriers.', 'info');
      setActiveTab('available');
    } else {
      onShowToast(res.error || 'Error cancelling assignment.', 'error');
    }
  };

  // Exception Workflow: Report Failed Pickup
  const handleFailedPickupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showFailedModal) return;

    const res = volunteerService.reportFailedPickup(showFailedModal.id, volunteerName, failedReason);
    setShowFailedModal(null);
    if (res.success) {
      onShowToast('Pickup incident logged. Recipient NGO and donor team alerted.', 'warning');
      setActiveTab('available');
    } else {
      onShowToast(res.error || 'Error logging incident.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DFD2] pb-5">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-[#647C50]">
            Volunteer Courier Dispatch · Community Fleet
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#183D2B] mt-1">
            Welcome back, {volunteerName}.
          </h1>
          <p className="text-sm text-[#50544C] mt-1">
            Dispatch base: 22 Elm Street · Service radius: <span className="font-medium text-[#252923]">10 km</span> · Available for runs
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-[#E8EDE2] p-1 rounded self-start md:self-auto">
          <button
            onClick={() => setActiveTab('available')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors ${
              activeTab === 'available' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
            }`}
          >
            Available Tasks ({availableTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('active_run')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors ${
              activeTab === 'active_run' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
            }`}
          >
            Active Run {myAssignments.length > 0 && <span className="ml-1 px-1.5 py-0.2 bg-[#C77A54] text-white rounded-full text-[10px]">1</span>}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors ${
              activeTab === 'history' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
            }`}
          >
            My Rescues ({deliveryHistory.length})
          </button>
        </div>
      </div>

      {/* TAB 1: AVAILABLE DISPATCH TASKS */}
      {activeTab === 'available' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Task List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-4 rounded-lg border border-[#E2DFD2] shadow-xs flex items-center justify-between text-xs">
              <span className="font-semibold text-[#183D2B] flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-[#647C50]" />
                Nearby Community Collection Runs
              </span>
              <span className="text-[#50544C] font-mono tabular-nums">
                {availableTasks.length} runs ready for pickup
              </span>
            </div>

            {availableTasks.length === 0 ? (
              <div className="bg-white p-12 rounded-lg border border-[#E2DFD2] text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#647C50] mx-auto opacity-75" />
                <p className="font-editorial text-lg text-[#50544C]">All current surplus runs have been assigned.</p>
                <p className="text-xs text-[#737373]">New banquet surpluses are typically logged after 14:00 and 21:00.</p>
              </div>
            ) : (
              availableTasks.map((task) => {
                const effectiveKg = task.quantity.pickupConfirmedKg || task.quantity.measuredKg || task.quantity.donorEstimatedKg;
                const isSelected = selectedTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`bg-white rounded-lg border p-5 transition-all cursor-pointer shadow-xs ${
                      isSelected ? 'border-[#183D2B] ring-1 ring-[#183D2B]' : 'border-[#E2DFD2] hover:border-[#647C50]'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {task.status === 'volunteer_cancelled' && (
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-white bg-[#C77A54] px-2 py-0.5 rounded mb-1">
                              Urgent Reassignment Needed
                            </span>
                          )}
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#647C50]">
                            {task.distanceKm} km away · {task.donorType}
                          </p>
                          <h3 className="font-editorial text-lg font-bold text-[#183D2B] leading-tight">
                            {task.foodName}
                          </h3>
                        </div>

                        <div className="text-right font-mono tabular-nums">
                          <p className="font-bold text-[#183D2B] text-sm">{effectiveKg} kg</p>
                          <p className="text-[10px] text-[#50544C] font-sans">~{task.quantity.servingsEstimate} meals</p>
                        </div>
                      </div>

                      {/* Route Summary */}
                      <div className="p-3 bg-[#F7F6F0] rounded border border-[#E2DFD2] space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#183D2B]" />
                          <span className="font-medium text-[#252923]">Pickup:</span>
                          <span className="text-[#50544C] truncate">{task.donorName} ({task.donorAddress})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#C77A54]" />
                          <span className="font-medium text-[#252923]">Deliver To:</span>
                          <span className="text-[#50544C] truncate">{task.reservedByNgoName || 'Reserved Community Kitchen'}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewSafetyAudit(task);
                          }}
                          className="text-xs text-[#647C50] hover:text-[#183D2B] underline"
                        >
                          View FSSAI Handling Rules
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptTask(task);
                          }}
                          className="px-5 py-2 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] transition-colors rounded shadow-xs"
                        >
                          Accept Assignment
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Map view */}
          <div className="lg:col-span-5 sticky top-28 space-y-3">
            <div className="h-[520px] w-full">
              <LeafletMap
                donations={availableTasks}
                selectedDonationId={selectedTaskId}
                onSelectDonation={(id) => setSelectedTaskId(id)}
                showRouteForDonation={displayedDonation}
              />
            </div>
            <p className="text-[11px] text-[#50544C] text-center">
              Routes connect donor kitchen to designated community shelter.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE DELIVERY RUN PROGRESSION */}
      {activeTab === 'active_run' && (
        <div className="space-y-6">
          {!activeRun ? (
            <div className="bg-white p-12 rounded-lg border border-[#E2DFD2] text-center space-y-3">
              <Truck className="w-8 h-8 text-[#647C50] mx-auto opacity-75" />
              <p className="font-editorial text-lg text-[#50544C]">No active delivery in progress.</p>
              <p className="text-xs text-[#737373]">Claim an available run from the dispatch board to start.</p>
              <button
                onClick={() => setActiveTab('available')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#183D2B] rounded hover:bg-[#254F38]"
              >
                <span>Browse Available Runs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Active Task Card */}
              <div className="lg:col-span-7 bg-white rounded-lg border border-[#E2DFD2] p-6 space-y-6 shadow-xs">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-[#E2DFD2] pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#C77A54]">
                      Active Live Mission
                    </span>
                    <h2 className="font-editorial text-2xl font-bold text-[#183D2B] mt-0.5">
                      {activeRun.foodName}
                    </h2>
                    <p className="text-xs text-[#50544C] mt-0.5">
                      Donor: <strong className="text-[#252923]">{activeRun.donorName}</strong> · Phone: {activeRun.donorContactPhone}
                    </p>
                  </div>

                  <span className="text-xs font-semibold px-3 py-1 bg-[#183D2B] text-white rounded uppercase font-mono">
                    {activeRun.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* 4-STAGE PROGRESSION STEPPER */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#647C50]">
                    Dispatch Sequence & Verification
                  </p>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    {/* Stage 1 */}
                    <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold">
                      <p className="text-[10px] text-emerald-700">Step 1</p>
                      <p>Accepted</p>
                    </div>

                    {/* Stage 2 */}
                    <div
                      className={`p-2.5 rounded border ${
                        ['arrived_at_donor', 'in_transit', 'delivered'].includes(activeRun.status)
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
                          : 'bg-[#F7F6F0] border-[#E2DFD2] text-[#50544C]'
                      }`}
                    >
                      <p className="text-[10px]">Step 2</p>
                      <p>At Donor</p>
                    </div>

                    {/* Stage 3 */}
                    <div
                      className={`p-2.5 rounded border ${
                        ['in_transit', 'delivered'].includes(activeRun.status)
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
                          : 'bg-[#F7F6F0] border-[#E2DFD2] text-[#50544C]'
                      }`}
                    >
                      <p className="text-[10px]">Step 3</p>
                      <p>Picked Up</p>
                    </div>

                    {/* Stage 4 */}
                    <div
                      className={`p-2.5 rounded border ${
                        activeRun.status === 'delivered'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
                          : 'bg-[#F7F6F0] border-[#E2DFD2] text-[#50544C]'
                      }`}
                    >
                      <p className="text-[10px]">Step 4</p>
                      <p>Delivered</p>
                    </div>
                  </div>
                </div>

                {/* Waypoint Details */}
                <div className="space-y-3 bg-[#F7F6F0] p-4 rounded border border-[#E2DFD2] text-xs">
                  <div className="space-y-1">
                    <p className="font-semibold text-[#183D2B] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#183D2B]" />
                      Collection Waypoint:
                    </p>
                    <p className="text-[#252923] pl-5">{activeRun.donorAddress}</p>
                    {activeRun.specialHandlingNotes && (
                      <p className="text-[#50544C] pl-5 italic">Instructions: {activeRun.specialHandlingNotes}</p>
                    )}
                  </div>

                  <div className="space-y-1 pt-2 border-t border-[#E2DFD2]">
                    <p className="font-semibold text-[#C77A54] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#C77A54]" />
                      Delivery Waypoint:
                    </p>
                    <p className="text-[#252923] pl-5">
                      {activeRun.reservedByNgoName} ({activeRun.ngoAddress || 'Community Dining Center'})
                    </p>
                  </div>
                </div>

                {/* Primary Action Buttons according to status */}
                <div className="space-y-3 pt-2">
                  {activeRun.status === 'assigned' && (
                    <button
                      onClick={() => handleConfirmArrival(activeRun.id)}
                      className="w-full py-3 text-sm font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] transition-colors rounded shadow-xs flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Arrival at Donor Kitchen</span>
                    </button>
                  )}

                  {activeRun.status === 'arrived_at_donor' && (
                    <button
                      onClick={() => {
                        setShowPickupModal(activeRun);
                        setVerifiedWeightInput(
                          String(activeRun.quantity.measuredKg || activeRun.quantity.donorEstimatedKg)
                        );
                      }}
                      className="w-full py-3 text-sm font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] transition-colors rounded shadow-xs flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Thermal Condition & Confirm Pickup</span>
                    </button>
                  )}

                  {activeRun.status === 'in_transit' && (
                    <button
                      onClick={() => handleConfirmDelivery(activeRun)}
                      className="w-full py-3 text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 transition-colors rounded shadow-xs flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Delivery & Sign-Off at NGO</span>
                    </button>
                  )}

                  {/* Exception actions */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E2DFD2]">
                    {['assigned', 'arrived_at_donor'].includes(activeRun.status) ? (
                      <button
                        onClick={() => setShowCancelModal(activeRun)}
                        className="text-[#50544C] hover:text-[#C77A54] underline"
                      >
                        Cancel Run (Release for Reassignment)
                      </button>
                    ) : (
                      <span className="text-[#647C50]">In transit to shelter</span>
                    )}

                    <button
                      onClick={() => setShowFailedModal(activeRun)}
                      className="text-[#C77A54] hover:underline"
                    >
                      Report Incident / Failed Pickup
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Active Route Map */}
              <div className="lg:col-span-5 h-[480px]">
                <LeafletMap
                  donations={[activeRun]}
                  selectedDonationId={activeRun.id}
                  showRouteForDonation={activeRun}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RESCUE HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-[#E2DFD2] p-6 space-y-4 shadow-xs">
          <h2 className="font-editorial text-xl font-bold text-[#183D2B]">
            Completed Courier Mission History
          </h2>
          <p className="text-xs text-[#50544C]">
            Verified deliveries completed by {volunteerName}.
          </p>

          {deliveryHistory.length === 0 ? (
            <p className="text-sm text-[#737373] py-8 text-center">No completed rescues logged in this session yet.</p>
          ) : (
            <div className="divide-y divide-[#E2DFD2]">
              {deliveryHistory.map((d) => (
                <div key={d.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-sm text-[#183D2B]">{d.foodName}</p>
                    <p className="text-[#50544C]">
                      From {d.donorName} → {d.reservedByNgoName}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 font-mono tabular-nums">
                    <span className="font-bold text-[#183D2B]">
                      {d.quantity.pickupConfirmedKg || d.quantity.measuredKg || d.quantity.donorEstimatedKg} kg
                    </span>
                    <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded text-[11px] font-sans font-semibold">
                      VERIFIED HANDOVER
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: PHYSICAL PICKUP & WEIGHT CONFIRMATION */}
      {showPickupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleConfirmPickupSubmit}
            className="bg-[#F7F6F0] rounded-xl max-w-md w-full border border-[#E2DFD2] shadow-2xl p-6 space-y-4"
          >
            <h3 className="font-editorial text-xl font-bold text-[#183D2B]">
              Audit & Confirm Food Pickup
            </h3>
            <p className="text-xs text-[#50544C]">
              Verify temperature and packaging integrity before loading into vehicle.
            </p>

            <div className="space-y-3 bg-white p-4 rounded border border-[#E2DFD2] text-xs">
              <p className="font-semibold text-[#183D2B]">{showPickupModal.foodName}</p>
              <p className="text-[#50544C]">Required: {showPickupModal.safety.fssaiRuleCitation}</p>

              <div>
                <label className="block text-xs font-semibold text-[#252923] mb-1">
                  Physically Confirmed Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={verifiedWeightInput}
                  onChange={(e) => setVerifiedWeightInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-[#F7F6F0] border border-[#E2DFD2] rounded font-mono"
                />
                <p className="text-[10px] text-[#647C50] mt-1">
                  Audited against donor estimate: {showPickupModal.quantity.donorEstimatedKg} kg
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPickupModal(null)}
                className="px-4 py-2 text-xs text-[#50544C]"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-[#183D2B] rounded hover:bg-[#254F38]"
              >
                Confirm Collection & Start Transit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EXCEPTION - VOLUNTEER CANCELLATION */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleCancelSubmit}
            className="bg-[#F7F6F0] rounded-xl max-w-md w-full border border-[#E2DFD2] shadow-2xl p-6 space-y-4"
          >
            <h3 className="font-editorial text-lg font-bold text-[#183D2B] flex items-center gap-1.5">
              <RotateCcw className="w-5 h-5 text-[#C77A54]" />
              Release Assignment
            </h3>
            <p className="text-xs text-[#50544C]">
              If you cannot complete this run, releasing it immediately will flag it with urgent priority on the volunteer board.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#252923] mb-1">
                Reason for Reassignment
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2DFD2] rounded"
              >
                <option value="Vehicle mechanical issue">Vehicle mechanical / bicycle issue</option>
                <option value="Personal / family emergency">Personal emergency</option>
                <option value="Severe traffic gridlock">Severe traffic gridlock / route blocked</option>
                <option value="Weather hindrance">Severe weather hindrance</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(null)}
                className="px-4 py-2 text-xs text-[#50544C]"
              >
                Keep Run
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#C77A54] rounded hover:bg-[#a9603e]"
              >
                Release for Urgent Dispatch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EXCEPTION - FAILED PICKUP REPORT */}
      {showFailedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleFailedPickupSubmit}
            className="bg-[#F7F6F0] rounded-xl max-w-md w-full border border-[#E2DFD2] shadow-2xl p-6 space-y-4"
          >
            <h3 className="font-editorial text-lg font-bold text-red-900 flex items-center gap-1.5">
              <AlertTriangle className="w-5 h-5 text-red-700" />
              Report Incident / Failed Pickup
            </h3>
            <p className="text-xs text-[#50544C]">
              Log on-site issues preventing safe collection. This alerts the donor management and re-routes the recipient NGO.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#252923] mb-1">
                Incident Reason *
              </label>
              <select
                value={failedReason}
                onChange={(e) => setFailedReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2DFD2] rounded"
              >
                <option value="Donor premises closed / unresponsive">Donor premises closed / staff unresponsive</option>
                <option value="Food spoiled / temperature safety breached">Food temperature unsafe / spoilage detected</option>
                <option value="Surplus food already collected or missing">Surplus batch already collected or missing</option>
                <option value="Improper packaging / unhygienic containers">Improper non-food-grade containers</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFailedModal(null)}
                className="px-4 py-2 text-xs text-[#50544C]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-red-800 rounded hover:bg-red-900"
              >
                Submit Incident Report
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
