import React, { useState } from 'react';
import { volunteerService } from '../../services/volunteerService';
import { FoodDonation, UserProfile } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { AccessibleModal } from '../common/AccessibleModal';

const LeafletMap = React.lazy(() => import('../map/LeafletMap').then((m) => ({ default: m.LeafletMap })));
const DeliveryRouteMap = React.lazy(() => import('../delivery/DeliveryRouteMap'));
import { DeliveryStepper } from '../delivery/DeliveryStepper';

const MapFallback = () => (
  <div className="h-full min-h-[300px] w-full bg-[#E8EDE2]/50 rounded-xl border border-[#E2DFD2] flex flex-col items-center justify-center gap-2 p-6">
    <div className="w-6 h-6 border-2 border-[#183D2B]/20 border-t-[#183D2B] rounded-full animate-spin" />
    <span className="text-xs text-[#647C50]">Loading live route map...</span>
  </div>
);
import {
  Truck,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  X,
  Navigation,
  RotateCcw,
  AlertCircle,
  FileText,
  BarChart3,
  Award,
  Calendar,
  Layers
} from 'lucide-react';

interface VolunteerDashboardProps {
  user: UserProfile | null;
  onViewSafetyAudit: (donation: FoodDonation) => void;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onNavigate: (view: string) => void;
  initialTab?: 'overview' | 'available' | 'active' | 'history';
}

export const VolunteerDashboard: React.FC<VolunteerDashboardProps> = ({
  user,
  onViewSafetyAudit,
  onShowToast,
  onNavigate,
  initialTab = 'overview',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'available' | 'active' | 'history'>(initialTab);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined);
  const [mobileAvailableView, setMobileAvailableView] = useState<'tasks' | 'map'>('tasks');

  // Modal states for exception handling & pickup verification
  const [showCancelModal, setShowCancelModal] = useState<FoodDonation | null>(null);
  const [cancelReason, setCancelReason] = useState('Vehicle mechanical issue');
  const [showFailedModal, setShowFailedModal] = useState<FoodDonation | null>(null);
  const [failedReason, setFailedReason] = useState('Donor premises closed / unresponsive');
  const [showPickupModal, setShowPickupModal] = useState<FoodDonation | null>(null);
  const [verifiedWeightInput, setVerifiedWeightInput] = useState<string>('');
  const [showArrivalAtNgoModal, setShowArrivalAtNgoModal] = useState<FoodDonation | null>(null);
  const [arrivalNotesInput, setArrivalNotesInput] = useState<string>('Handed over thermal boxes to shelter staff');
  const [receiptDonation, setReceiptDonation] = useState<FoodDonation | null>(null);

  const volunteerId = user?.role === 'volunteer' && user?.id ? user.id : '';
  const volunteerName = user?.fullName || '';
  const volunteerPhone = user?.phone || '';
  const volunteerLat = typeof user?.lat === 'number' ? user.lat : undefined;
  const volunteerLng = typeof user?.lng === 'number' ? user.lng : undefined;

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabSelect = (tab: 'overview' | 'available' | 'active' | 'history') => {
    setActiveTab(tab);
    if (tab === 'overview') onNavigate('volunteer_dashboard');
    else if (tab === 'available') onNavigate('volunteer_available');
    else if (tab === 'active') onNavigate('volunteer_active');
    else if (tab === 'history') onNavigate('volunteer_history');
  };



  const availableTasks = volunteerService.getAvailableTasks(volunteerLat, volunteerLng);
  const myAssignments = volunteerId ? volunteerService.getMyAssignments(volunteerId) : [];
  const deliveryHistory = volunteerId ? volunteerService.getMyDeliveryHistory(volunteerId) : [];

  // Active assignment being processed
  const activeRun = myAssignments[0] || null;
  const displayedDonation = activeRun || availableTasks.find((t) => t.id === selectedTaskId) || null;

  // Volunteer metrics
  const totalKgTransported = deliveryHistory.reduce((acc, d) => {
    return acc + (d.quantity.deliveredKg || d.quantity.pickupConfirmedKg || d.quantity.measuredKg || d.quantity.donorEstimatedKg);
  }, 0);
  const totalMealsDelivered = deliveryHistory.reduce((acc, d) => {
    return acc + (d.impactReceipt?.mealsProvided || d.quantity.servingsEstimate || Math.round((d.quantity.deliveredKg || d.quantity.donorEstimatedKg) / 0.35));
  }, 0);

  // Handler: Accept Task
  const handleAcceptTask = (task: FoodDonation) => {
    const res = volunteerService.acceptTask(task.id, {
      id: volunteerId,
      name: volunteerName,
      phone: volunteerPhone,
      role: user?.role || 'volunteer',
    });
    if (res.success) {
      onShowToast(`Task accepted! Proceed to ${task.donorName} for collection.`, 'success');
      handleTabSelect('active');
    } else {
      onShowToast(res.error || 'Failed to claim task.', 'error');
    }
  };

  // Progression Step 2: Arrived at Donor
  const handleConfirmArrival = (donationId: string) => {
    const res = volunteerService.confirmArrivalAtDonor(donationId, volunteerId, volunteerName);
    if (res.success) {
      onShowToast('Arrival at donor confirmed. Begin temperature & packaging audit.', 'info');
    } else {
      onShowToast(res.error || 'Error recording arrival.', 'error');
    }
  };

  // Progression Step 3: Food Picked Up
  const handleConfirmPickupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPickupModal) return;

    const weight = verifiedWeightInput ? Number(verifiedWeightInput) : undefined;
    const res = volunteerService.confirmFoodPickup(showPickupModal.id, volunteerId, volunteerName, weight);

    setShowPickupModal(null);
    if (res.success) {
      onShowToast('Food secured in transit carrier. In transit to NGO destination.', 'success');
    } else {
      onShowToast(res.error || 'Error confirming pickup.', 'error');
    }
  };

  // Progression Step 4: Arrived at NGO
  const handleConfirmArrivalAtNgoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showArrivalAtNgoModal) return;

    const res = volunteerService.confirmArrivalAtNgo(showArrivalAtNgoModal.id, volunteerId, volunteerName, arrivalNotesInput);
    setShowArrivalAtNgoModal(null);

    if (res.success) {
      onShowToast('Arrival at NGO logged! Awaiting NGO staff intake sign-off.', 'success');
    } else {
      onShowToast(res.error || 'Error logging arrival at NGO.', 'error');
    }
  };

  // Exception 1: Cancel Assignment
  const handleConfirmCancelAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCancelModal) return;

    const res = volunteerService.cancelAssignment(showCancelModal.id, volunteerId, volunteerName, cancelReason);
    setShowCancelModal(null);

    if (res.success) {
      onShowToast('Assignment released back to dispatch queue.', 'info');
      handleTabSelect('available');
    } else {
      onShowToast(res.error || 'Failed to release assignment.', 'error');
    }
  };

  // Exception 2: Report Failed Pickup
  const handleConfirmFailedPickup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showFailedModal) return;

    const res = volunteerService.reportFailedPickup(showFailedModal.id, volunteerId, volunteerName, failedReason);
    setShowFailedModal(null);

    if (res.success) {
      onShowToast('Failed pickup logged in audit ledger. Notifying donor & NGO.', 'warning');
      handleTabSelect('available');
    } else {
      onShowToast(res.error || 'Error logging failed pickup.', 'error');
    }
  };

  if (!user || user.role !== 'volunteer') {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="bg-white rounded-xl border border-[#E2DFD2] p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#E8EDE2] text-[#183D2B] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-[#183D2B]" />
          </div>
          <h2 className="font-editorial text-2xl font-bold text-[#183D2B]">Sign In Required</h2>
          <p className="text-xs text-[#50544C] leading-relaxed">
            Please sign in with a registered volunteer / courier account or select the <strong>Volunteer Demo Persona</strong> from the top banner to access the Dispatch Portal.
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
      {/* Editorial Header with Status & Portal Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DFD2] pb-6">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-[#647C50]">
            Volunteer Courier & Logistics Fleet
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#183D2B] mt-1">
            Courier {volunteerName}
          </h1>
          <p className="text-sm text-[#50544C] mt-1">
            Dispatch zone: <span className="font-medium text-[#252923]">Bandra-Kurla / Western Suburbs</span> · Vehicle: Electric Scooter with Thermal Box
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <div className="flex items-center gap-1 bg-[#E8EDE2] p-1 rounded overflow-x-auto no-scrollbar w-full sm:w-auto">
            <button
              onClick={() => handleTabSelect('overview')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap min-h-[36px] ${
                activeTab === 'overview' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => handleTabSelect('available')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap min-h-[36px] ${
                activeTab === 'available' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              Available Tasks ({availableTasks.length})
            </button>
            <button
              onClick={() => handleTabSelect('active')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap min-h-[36px] ${
                activeTab === 'active' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              My Deliveries {activeRun ? '(1 Active)' : '(0)'}
            </button>
            <button
              onClick={() => handleTabSelect('history')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap min-h-[36px] ${
                activeTab === 'history' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              Delivery History ({deliveryHistory.length})
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          PAGE 1: OVERVIEW TAB
          ============================================================ */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Volunteer KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
              <p className="text-xs text-[#647C50]">Active Delivery Mission</p>
              <p className="font-editorial text-2xl sm:text-3xl font-bold text-[#183D2B] tabular-nums mt-1">
                {activeRun ? '1 Active' : '0 Idle'}
              </p>
              <p className="text-[11px] text-[#50544C] mt-1">{activeRun ? 'Live run in progress' : 'Ready for assignment'}</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
              <p className="text-xs text-[#647C50]">Available Runs Nearby</p>
              <p className="font-editorial text-2xl sm:text-3xl font-bold text-[#C77A54] tabular-nums mt-1">{availableTasks.length}</p>
              <p className="text-[11px] text-[#50544C] mt-1">Within 15 km radius</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
              <p className="text-xs text-[#647C50]">Total Food Transported</p>
              <p className="font-editorial text-2xl sm:text-3xl font-bold text-[#183D2B] tabular-nums mt-1">
                {Math.round(totalKgTransported)} <span className="text-sm font-sans font-normal text-[#50544C]">kg</span>
              </p>
              <p className="text-[11px] text-[#50544C] mt-1">Safely carried in thermal containers</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
              <p className="text-xs text-[#647C50]">Total Completed Runs</p>
              <p className="font-editorial text-2xl sm:text-3xl font-bold text-[#183D2B] tabular-nums mt-1">{deliveryHistory.length}</p>
              <p className="text-[11px] text-[#50544C] mt-1">~{totalMealsDelivered} community meals</p>
            </div>
          </div>

          {/* 2-Column Overview Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Active Mission Card or Ready for Dispatch (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {activeRun ? (
                <div className="bg-white p-6 rounded-lg border-2 border-[#183D2B] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#C77A54]">
                      ⚡ Active Live Mission in Progress
                    </span>
                    <StatusBadge status={activeRun.status} />
                  </div>

                  <div>
                    <h2 className="font-editorial text-2xl font-bold text-[#183D2B]">
                      {activeRun.foodName}
                    </h2>
                    <p className="text-xs text-[#50544C] mt-1">
                      From: <strong className="text-[#252923]">{activeRun.donorName}</strong> ({activeRun.donorAddress})
                    </p>
                    <p className="text-xs text-[#50544C] mt-0.5">
                      To: <strong className="text-[#252923]">{activeRun.reservedByNgoName}</strong> ({activeRun.ngoAddress || 'Community kitchen'})
                    </p>
                  </div>

                  <div className="p-3 bg-[#F7F6F0] rounded border border-[#E2DFD2] flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[#647C50]">Quantity to transport:</span>
                      <p className="font-bold text-sm text-[#183D2B] font-mono">
                        {activeRun.quantity.pickupConfirmedKg || activeRun.quantity.measuredKg || activeRun.quantity.donorEstimatedKg} kg
                      </p>
                    </div>
                    <button
                      onClick={() => handleTabSelect('active')}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] rounded shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Continue Mission Progression</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-lg border border-[#E2DFD2] shadow-xs text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-[#647C50] mx-auto opacity-75" />
                  <h3 className="font-editorial text-xl font-bold text-[#183D2B]">
                    Courier Ready for Dispatch
                  </h3>
                  <p className="text-xs text-[#50544C] max-w-md mx-auto">
                    You currently have no delivery runs claimed. There are{' '}
                    <strong className="text-[#183D2B]">{availableTasks.length}</strong> surplus runs waiting for pickup in your area.
                  </p>
                  <button
                    onClick={() => handleTabSelect('available')}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] rounded shadow-xs cursor-pointer"
                  >
                    <span>Browse Available Runs ({availableTasks.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Nearby Runs Quick View */}
              <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-[#647C50]" />
                    <h3 className="font-editorial text-lg font-bold text-[#183D2B]">
                      Fastest Available Pickups Nearby
                    </h3>
                  </div>
                  <button
                    onClick={() => handleTabSelect('available')}
                    className="text-xs font-semibold text-[#183D2B] hover:underline"
                  >
                    View All Runs →
                  </button>
                </div>

                {availableTasks.length === 0 ? (
                  <p className="text-xs text-[#737373] py-4 text-center">All nearby tasks are currently claimed.</p>
                ) : (
                  <div className="space-y-3">
                    {availableTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="p-3.5 rounded border border-[#E2DFD2] bg-[#FBF9F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-sm text-[#183D2B]">{task.foodName}</p>
                          <p className="text-[11px] text-[#50544C]">
                            {task.distanceKm} km away · {task.donorName} → {task.reservedByNgoName || 'Shelter'}
                          </p>
                        </div>

                        <button
                          onClick={() => handleAcceptTask(task)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] rounded self-start sm:self-auto cursor-pointer"
                        >
                          Accept Run
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Courier Profile & Recent Achievements (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs space-y-3">
                <div className="flex items-center gap-2 border-b border-[#E2DFD2] pb-3">
                  <Truck className="w-4 h-4 text-[#183D2B]" />
                  <h3 className="font-editorial text-lg font-bold text-[#183D2B]">Courier Fleet Profile</h3>
                </div>

                <div className="text-xs space-y-2">
                  <div className="p-3 bg-[#F7F6F0] rounded border border-[#E2DFD2] space-y-1">
                    <p className="text-[#647C50]">Driver / Partner</p>
                    <p className="font-bold text-[#183D2B] text-sm">{volunteerName}</p>
                    <p className="text-[#50544C]">Contact: {volunteerPhone}</p>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#E8EDE2] rounded text-[#183D2B]">
                    <span className="font-semibold">Transport Equipment</span>
                    <span className="font-bold">Thermal Box (Insulated)</span>
                  </div>
                  <p className="text-[11px] text-[#50544C]">
                    Compliant with FSSAI transit hygiene standards for hot-holding (≥65°C) and chilled perishables (≤5°C).
                  </p>
                </div>
              </div>

              {/* Recent Deliveries */}
              <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
                  <h3 className="font-editorial text-lg font-bold text-[#183D2B]">Recent Rescues</h3>
                  <button
                    onClick={() => handleTabSelect('history')}
                    className="text-xs font-semibold text-[#183D2B] hover:underline"
                  >
                    View History ({deliveryHistory.length})
                  </button>
                </div>

                {deliveryHistory.length === 0 ? (
                  <p className="text-xs text-[#737373] py-4 text-center">No completed runs recorded yet.</p>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    {deliveryHistory.slice(0, 3).map((item) => (
                      <div key={item.id} className="p-2.5 bg-[#FBF9F5] rounded border border-[#E2DFD2] flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-[#183D2B]">{item.foodName}</p>
                          <p className="text-[10px] text-[#50544C]">Delivered to {item.reservedByNgoName || 'Shelter'}</p>
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
          PAGE 2: AVAILABLE TASKS TAB (DISPATCH POOL + MAP)
          ============================================================ */}
      {activeTab === 'available' && (
        <>
          {/* Mobile View Switcher (Tasks vs Map) */}
          <div className="flex lg:hidden items-center justify-center p-1 bg-[#E8EDE2] rounded mb-4 w-full">
            <button
              type="button"
              onClick={() => setMobileAvailableView('tasks')}
              className={`flex-1 py-2 text-xs font-semibold rounded text-center transition-colors min-h-[38px] ${
                mobileAvailableView === 'tasks' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C]'
              }`}
            >
              Task List ({availableTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileAvailableView('map')}
              className={`flex-1 py-2 text-xs font-semibold rounded text-center transition-colors min-h-[38px] flex items-center justify-center gap-1.5 ${
                mobileAvailableView === 'map' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Task List */}
            <div className={`lg:col-span-7 space-y-4 ${mobileAvailableView === 'map' ? 'hidden lg:block' : 'block'}`}>
              <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-[#E2DFD2] shadow-xs flex items-center justify-between text-xs">
                <span className="font-semibold text-[#183D2B] flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-[#647C50]" />
                  Nearby Community Collection Runs
                </span>
                <span className="text-[#50544C] font-mono tabular-nums">
                  {availableTasks.length} runs ready
                </span>
              </div>

              {availableTasks.length === 0 ? (
                <div className="bg-white p-8 sm:p-12 rounded-lg border border-[#E2DFD2] text-center space-y-2">
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
                      className={`bg-white rounded-lg border p-4 sm:p-5 transition-all cursor-pointer shadow-xs ${
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
                            <h3 className="font-editorial text-base sm:text-lg font-bold text-[#183D2B] leading-tight">
                              {task.foodName}
                            </h3>
                          </div>

                          <div className="text-right font-mono tabular-nums shrink-0">
                            <p className="font-bold text-[#183D2B] text-sm sm:text-base">{effectiveKg} kg</p>
                            <p className="text-[10px] text-[#50544C] font-sans">~{task.quantity.servingsEstimate} meals</p>
                          </div>
                        </div>

                        {/* Route Summary */}
                        <div className="p-3 bg-[#F7F6F0] rounded border border-[#E2DFD2] space-y-1.5 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#183D2B] shrink-0" />
                            <span className="font-medium text-[#252923] shrink-0">Pickup:</span>
                            <span className="text-[#50544C] truncate">{task.donorName} ({task.donorAddress})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#C77A54] shrink-0" />
                            <span className="font-medium text-[#252923] shrink-0">Deliver To:</span>
                            <span className="text-[#50544C] truncate">{task.reservedByNgoName || 'Reserved Community Kitchen'}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewSafetyAudit(task);
                            }}
                            className="text-xs text-[#647C50] hover:text-[#183D2B] underline text-left sm:text-center py-1 cursor-pointer"
                          >
                            View FSSAI Handling Rules
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptTask(task);
                            }}
                            className="min-h-[44px] sm:min-h-[38px] px-5 py-2 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] transition-colors rounded shadow-xs cursor-pointer flex items-center justify-center"
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
            <div className={`lg:col-span-5 lg:sticky lg:top-28 space-y-3 ${mobileAvailableView === 'tasks' ? 'hidden lg:block' : 'block'}`}>
              <div className="h-[380px] sm:h-[460px] lg:h-[520px] w-full">
                <React.Suspense fallback={<MapFallback />}>
                  <LeafletMap
                    donations={availableTasks}
                    selectedDonationId={selectedTaskId}
                    onSelectDonation={(id) => setSelectedTaskId(id)}
                    showRouteForDonation={displayedDonation}
                  />
                </React.Suspense>
              </div>
              <p className="text-[11px] text-[#50544C] text-center">
                Routes connect donor kitchen to designated community shelter.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ============================================================
          PAGE 3: MY DELIVERIES / ACTIVE RUN PROGRESSION TAB
          ============================================================ */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          {!activeRun ? (
            <div className="bg-white p-12 rounded-lg border border-[#E2DFD2] text-center space-y-3">
              <Truck className="w-8 h-8 text-[#647C50] mx-auto opacity-75" />
              <p className="font-editorial text-lg text-[#50544C]">No active delivery in progress.</p>
              <p className="text-xs text-[#737373]">Claim an available run from the dispatch board to start.</p>
              <button
                onClick={() => handleTabSelect('available')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#183D2B] rounded hover:bg-[#254F38]"
              >
                <span>Browse Available Runs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Active Task Card */}
              <div className={`${activeRun.donorLat && activeRun.donorLng && activeRun.ngoLat && activeRun.ngoLng ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white rounded-lg border border-[#E2DFD2] p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-xs`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-[#E2DFD2] pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#C77A54]">
                      Active Live Mission
                    </span>
                    <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#183D2B] mt-0.5">
                      {activeRun.foodName}
                    </h2>
                    <p className="text-xs text-[#50544C] mt-0.5">
                      Donor: <strong className="text-[#252923]">{activeRun.donorName}</strong> · Phone: {activeRun.donorContactPhone}
                    </p>
                  </div>

                  <span className="text-xs font-semibold px-2.5 sm:px-3 py-1 bg-[#183D2B] text-white rounded uppercase font-mono shrink-0">
                    {activeRun.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* 4-STAGE ANIMATED DELIVERY STEPPER */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#647C50]">
                    Courier Dispatch Sequence
                  </p>
                  <DeliveryStepper status={activeRun.status} />

                  {/* Mission Parameters Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs pt-1">
                    <div className="p-2 bg-[#F7F6F0] rounded border border-[#E2DFD2]">
                      <p className="text-[10px] text-[#647C50]">Estimated Weight</p>
                      <p className="font-bold text-[#183D2B] font-mono">{activeRun.quantity.donorEstimatedKg} kg</p>
                    </div>
                    <div className="p-2 bg-[#F7F6F0] rounded border border-[#E2DFD2]">
                      <p className="text-[10px] text-[#647C50]">Thermal Holding</p>
                      <p className="font-bold text-[#183D2B] capitalize">{activeRun.safety.storageCondition.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="p-2 bg-[#F7F6F0] rounded border border-[#E2DFD2]">
                      <p className="text-[10px] text-[#647C50]">Meals Served</p>
                      <p className="font-bold text-[#183D2B]">~{activeRun.quantity.servingsEstimate}</p>
                    </div>
                    <div className="p-2 bg-[#F7F6F0] rounded border border-[#E2DFD2]">
                      <p className="text-[10px] text-[#647C50]">Safe Window</p>
                      <p className="font-bold text-[#183D2B]">FSSAI Safe</p>
                    </div>
                  </div>
                </div>

                {/* Waypoint Details */}
                <div className="space-y-3 bg-[#F7F6F0] p-3.5 sm:p-4 rounded border border-[#E2DFD2] text-xs">
                  <div className="space-y-1">
                    <p className="font-semibold text-[#183D2B] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#183D2B] shrink-0" />
                      Collection Waypoint:
                    </p>
                    <p className="text-[#252923] pl-5">{activeRun.donorAddress}</p>
                    {activeRun.specialHandlingNotes && (
                      <p className="text-[#50544C] pl-5 italic">Instructions: {activeRun.specialHandlingNotes}</p>
                    )}
                  </div>

                  <div className="space-y-1 pt-2 border-t border-[#E2DFD2]">
                    <p className="font-semibold text-[#C77A54] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#C77A54] shrink-0" />
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
                      className="w-full min-h-[44px] py-3 text-sm font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] transition-colors rounded shadow-xs flex items-center justify-center gap-2 cursor-pointer"
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
                      className="w-full min-h-[44px] py-3 text-sm font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] transition-colors rounded shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Thermal Condition & Confirm Pickup</span>
                    </button>
                  )}

                  {activeRun.status === 'picked_up' && (
                    <button
                      onClick={() => {
                        setShowArrivalAtNgoModal(activeRun);
                      }}
                      className="w-full min-h-[44px] py-3 text-sm font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] transition-colors rounded shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Confirm Arrival at NGO Shelter</span>
                    </button>
                  )}

                  {activeRun.status === 'awaiting_ngo_confirmation' && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded text-center space-y-1">
                      <p className="font-semibold text-xs text-purple-900 flex items-center justify-center gap-1.5">
                        <Clock className="w-4 h-4 text-purple-700" />
                        Handover Complete — Awaiting NGO Sign-Off
                      </p>
                      <p className="text-[11px] text-purple-700">
                        Food has been delivered to {activeRun.reservedByNgoName}. The NGO supervisor will inspect and confirm actual receipt quantity.
                      </p>
                    </div>
                  )}

                  {/* Exception actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs pt-2 border-t border-[#E2DFD2]">
                    {['assigned', 'arrived_at_donor'].includes(activeRun.status) ? (
                      <button
                        onClick={() => setShowCancelModal(activeRun)}
                        className="text-[#50544C] hover:text-[#C77A54] underline cursor-pointer text-left sm:text-center py-1"
                      >
                        Cancel Run (Release for Reassignment)
                      </button>
                    ) : (
                      <span className="text-[#647C50]">In transit to shelter</span>
                    )}

                    <button
                      onClick={() => setShowFailedModal(activeRun)}
                      className="text-[#C77A54] hover:underline cursor-pointer text-left sm:text-center py-1"
                    >
                      Report Incident / Failed Pickup
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Active Dynamic Route Map (only rendered when coordinates exist on both sides) */}
              {activeRun.donorLat && activeRun.donorLng && activeRun.ngoLat && activeRun.ngoLng ? (
                <div className="lg:col-span-5 h-[340px] sm:h-[420px] lg:h-[480px]">
                  <React.Suspense fallback={<MapFallback />}>
                    <DeliveryRouteMap
                      donorLat={activeRun.donorLat}
                      donorLng={activeRun.donorLng}
                      donorName={activeRun.donorName}
                      ngoLat={activeRun.ngoLat}
                      ngoLng={activeRun.ngoLng}
                      ngoName={activeRun.reservedByNgoName}
                      status={activeRun.status}
                    />
                  </React.Suspense>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          PAGE 4: DELIVERY HISTORY TAB
          ============================================================ */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-[#E2DFD2] p-6 space-y-4 shadow-xs">
          <div>
            <h2 className="font-editorial text-xl font-bold text-[#183D2B]">
              Completed Courier Mission History
            </h2>
            <p className="text-xs text-[#50544C]">
              Verified deliveries successfully transported and handed over by {volunteerName}.
            </p>
          </div>

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
                    <p className="text-[10px] text-[#737373]">
                      Delivered on: {new Date(d.updatedAt || d.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 font-mono tabular-nums">
                    <span className="font-bold text-[#183D2B]">
                      {d.quantity.deliveredKg || d.quantity.pickupConfirmedKg || d.quantity.measuredKg || d.quantity.donorEstimatedKg} kg
                    </span>
                    <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded text-[11px] font-sans font-semibold">
                      VERIFIED HANDOVER
                    </span>
                    {d.impactReceipt && (
                      <button
                        onClick={() => setReceiptDonation(d)}
                        className="text-xs text-emerald-800 hover:text-emerald-950 font-bold underline flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Receipt</span>
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
          VOLUNTEER MODALS
          ============================================================ */}

      {/* MODAL: ARRIVAL AT NGO & HANDOVER NOTES */}
      {showArrivalAtNgoModal && (
        <AccessibleModal
          isOpen={Boolean(showArrivalAtNgoModal)}
          onClose={() => setShowArrivalAtNgoModal(null)}
          aria-labelledby="arrival-ngo-modal-title"
        >
          <div className="bg-[#F7F6F0] rounded-xl max-w-md w-full border border-[#E2DFD2] shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
              <h3 id="arrival-ngo-modal-title" className="font-editorial text-lg sm:text-xl font-bold text-[#183D2B]">
                Handover at NGO Facility
              </h3>
              <button
                onClick={() => setShowArrivalAtNgoModal(null)}
                aria-label="Close dialog"
                className="text-[#50544C] hover:text-[#252923] p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#50544C]">
              Confirm arrival at <strong className="text-[#252923]">{showArrivalAtNgoModal.reservedByNgoName}</strong>. Hand over the thermal carriers to receiving shelter staff.
            </p>

            <form onSubmit={handleConfirmArrivalAtNgoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#252923] mb-1">
                  Handover Notes / Receiving Staff Name
                </label>
                <input
                  type="text"
                  required
                  value={arrivalNotesInput}
                  onChange={(e) => setArrivalNotesInput(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs bg-white border border-[#E2DFD2] rounded"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowArrivalAtNgoModal(null)}
                  className="min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-semibold text-[#50544C] hover:text-[#252923] rounded flex items-center justify-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] rounded cursor-pointer flex items-center justify-center"
                >
                  Confirm Delivery Handover
                </button>
              </div>
            </form>
          </div>
        </AccessibleModal>
      )}

      {/* MODAL: VERIFY THERMAL CONDITION & PICKUP WEIGHT */}
      {showPickupModal && (
        <AccessibleModal
          isOpen={Boolean(showPickupModal)}
          onClose={() => setShowPickupModal(null)}
          aria-labelledby="pickup-modal-title"
        >
          <div className="bg-[#F7F6F0] rounded-xl max-w-md w-full border border-[#E2DFD2] shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
              <h3 id="pickup-modal-title" className="font-editorial text-lg sm:text-xl font-bold text-[#183D2B]">
                Verify Pickup Quantity & Seals
              </h3>
              <button
                onClick={() => setShowPickupModal(null)}
                aria-label="Close dialog"
                className="text-[#50544C] hover:text-[#252923] p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#50544C]">
              Verify physical pickup for <strong className="text-[#252923]">"{showPickupModal.foodName}"</strong> at {showPickupModal.donorName}. Ensure containers are sealed.
            </p>

            <form onSubmit={handleConfirmPickupSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#252923] mb-1">
                  Measured Scale Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={verifiedWeightInput}
                  onChange={(e) => setVerifiedWeightInput(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 bg-white border border-[#E2DFD2] rounded font-mono font-bold text-base sm:text-sm"
                />
                <p className="text-[11px] text-[#647C50] mt-1">
                  Donor Estimated: {showPickupModal.quantity.donorEstimatedKg} kg
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                  Thermal Carrier Check
                </p>
                <p className="text-[11px] text-emerald-800">
                  Transferred into insulated thermal boxes ({showPickupModal.safety.storageCondition.replace(/_/g, ' ')}).
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPickupModal(null)}
                  className="min-h-[44px] sm:min-h-[38px] px-4 py-2 font-semibold text-[#50544C] hover:text-[#252923] rounded flex items-center justify-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] sm:min-h-[38px] px-4 py-2 font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] rounded cursor-pointer flex items-center justify-center"
                >
                  Confirm Pickup & Start Transit
                </button>
              </div>
            </form>
          </div>
        </AccessibleModal>
      )}

      {/* MODAL: CANCEL ASSIGNMENT */}
      {showCancelModal && (
        <AccessibleModal
          isOpen={Boolean(showCancelModal)}
          onClose={() => setShowCancelModal(null)}
          aria-labelledby="cancel-assignment-title"
        >
          <div className="bg-[#F7F6F0] rounded-xl max-w-md w-full border border-[#E2DFD2] shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
              <h3 id="cancel-assignment-title" className="font-editorial text-lg sm:text-xl font-bold text-red-800">
                Release Mission Assignment
              </h3>
              <button
                onClick={() => setShowCancelModal(null)}
                aria-label="Close dialog"
                className="text-[#50544C] hover:text-[#252923] p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#50544C]">
              Release <strong className="text-[#252923]">"{showCancelModal.foodName}"</strong> back to the available courier pool for immediate reassignment.
            </p>

            <form onSubmit={handleConfirmCancelAssignment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#252923] mb-1">
                  Reason for Cancellation *
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 bg-white border border-[#E2DFD2] rounded text-base sm:text-xs"
                >
                  <option value="Vehicle mechanical issue">Vehicle mechanical issue</option>
                  <option value="Severe traffic / transit gridlock">Severe traffic / transit gridlock</option>
                  <option value="Personal emergency">Personal emergency</option>
                  <option value="Thermal carrier capacity exceeded">Thermal carrier capacity exceeded</option>
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(null)}
                  className="min-h-[44px] sm:min-h-[38px] px-4 py-2 font-semibold text-[#50544C] hover:text-[#252923] rounded flex items-center justify-center cursor-pointer"
                >
                  Keep Mission
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] sm:min-h-[38px] px-4 py-2 font-semibold text-white bg-red-800 hover:bg-red-900 rounded cursor-pointer flex items-center justify-center"
                >
                  Release to Other Couriers
                </button>
              </div>
            </form>
          </div>
        </AccessibleModal>
      )}

      {/* MODAL: REPORT FAILED PICKUP */}
      {showFailedModal && (
        <AccessibleModal
          isOpen={Boolean(showFailedModal)}
          onClose={() => setShowFailedModal(null)}
          aria-labelledby="failed-pickup-title"
        >
          <div className="bg-[#F7F6F0] rounded-xl max-w-md w-full border border-[#E2DFD2] shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
              <h3 id="failed-pickup-title" className="font-editorial text-lg sm:text-xl font-bold text-amber-800">
                Report Collection Incident
              </h3>
              <button
                onClick={() => setShowFailedModal(null)}
                aria-label="Close dialog"
                className="text-[#50544C] hover:text-[#252923] p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#50544C]">
              Log an unresolved incident at <strong className="text-[#252923]">{showFailedModal.donorName}</strong> for{' '}
              <strong className="text-[#252923]">"{showFailedModal.foodName}"</strong>.
            </p>

            <form onSubmit={handleConfirmFailedPickup} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#252923] mb-1">
                  Incident Reason *
                </label>
                <select
                  value={failedReason}
                  onChange={(e) => setFailedReason(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 bg-white border border-[#E2DFD2] rounded text-base sm:text-xs"
                >
                  <option value="Donor premises closed / unresponsive">Donor premises closed / unresponsive</option>
                  <option value="Food already disposed or unavailable on site">Food already disposed or unavailable on site</option>
                  <option value="Food failed thermal safety check (spoiled/compromised)">Food failed thermal safety check (spoiled/compromised)</option>
                  <option value="Container damaged and unsealed">Container damaged and unsealed</option>
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFailedModal(null)}
                  className="min-h-[44px] sm:min-h-[38px] px-4 py-2 font-semibold text-[#50544C] hover:text-[#252923] rounded flex items-center justify-center cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] sm:min-h-[38px] px-4 py-2 font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded cursor-pointer flex items-center justify-center"
                >
                  Log Incident
                </button>
              </div>
            </form>
          </div>
        </AccessibleModal>
      )}

      {/* VERIFIED IMPACT RECEIPT MODAL */}
      {receiptDonation && receiptDonation.impactReceipt && (
        <AccessibleModal
          isOpen={Boolean(receiptDonation && receiptDonation.impactReceipt)}
          onClose={() => setReceiptDonation(null)}
          aria-labelledby="receipt-dialog-title"
        >
          <div className="bg-[#F7F6F0] rounded-xl max-w-lg w-full border border-[#E2DFD2] shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2DFD2] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#183D2B]" />
                <h3 id="receipt-dialog-title" className="font-editorial text-lg sm:text-xl font-bold text-[#183D2B]">
                  Verified Impact Certificate
                </h3>
              </div>
              <button
                onClick={() => setReceiptDonation(null)}
                aria-label="Close certificate"
                className="text-[#50544C] hover:text-[#252923] p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded border border-[#E2DFD2] space-y-3 text-xs">
              <div className="flex justify-between items-center text-[11px] text-[#647C50] font-mono">
                <span>Receipt: {receiptDonation.impactReceipt.receiptId}</span>
                <span>{new Date(receiptDonation.impactReceipt.deliveredAt).toLocaleDateString()}</span>
              </div>

              <div>
                <p className="font-semibold text-sm text-[#183D2B]">{receiptDonation.foodName}</p>
                <p className="text-[#50544C]">Donor: {receiptDonation.impactReceipt.donorName}</p>
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
                  <p className="text-[10px] text-[#647C50]">CO₂e Saved</p>
                  <p className="font-bold font-mono text-sm text-[#183D2B]">{receiptDonation.impactReceipt.co2PreventedKg} kg</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setReceiptDonation(null)}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-semibold text-white bg-[#183D2B] rounded hover:bg-[#254F38] cursor-pointer flex items-center justify-center"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </AccessibleModal>
      )}
    </div>
  );
};
