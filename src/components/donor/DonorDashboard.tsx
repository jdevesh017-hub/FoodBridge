import React, { useState } from 'react';
import { donationService } from '../../services/donationService';
import { FoodCategory, FoodDonation, StorageCondition, UserProfile, DietaryTag } from '../../types';
import { Plus, CheckCircle2, Clock, AlertCircle, ShieldCheck, ChevronRight, Scale, Sparkles, X } from 'lucide-react';

interface DonorDashboardProps {
  user: UserProfile | null;
  onViewSafetyAudit: (donation: FoodDonation) => void;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onNavigate: (view: string) => void;
}

export const DonorDashboard: React.FC<DonorDashboardProps> = ({
  user,
  onViewSafetyAudit,
  onShowToast,
  onNavigate,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const donorId = user?.id || 'donor_grand_meridian';
  const donorName = user?.organizationName || user?.fullName || 'Grand Meridian Banquet & Hotel';
  const donorAddress = user?.address || '14 Royal Palm Way, Central District';
  const donorPhone = user?.phone || '+91 98201 54321';

  const myDonations = donationService.getDonationsByDonor(donorId);

  // Form State
  const [foodName, setFoodName] = useState('');
  const [foodCategory, setFoodCategory] = useState<FoodCategory>('prepared_meals');
  const [description, setDescription] = useState('');
  const [estimatedKg, setEstimatedKg] = useState<number>(20);
  const [measuredKg, setMeasuredKg] = useState<string>('');
  const [storageCondition, setStorageCondition] = useState<StorageCondition>('hot_held');
  const [temperatureCelsius, setTemperatureCelsius] = useState<string>('68');
  const [prepTimeMinutesAgo, setPrepTimeMinutesAgo] = useState<number>(30);
  const [isCleanPackaged, setIsCleanPackaged] = useState(true);
  const [isAllergenLabelled, setIsAllergenLabelled] = useState(true);
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>([
    'vegetarian',
  ]);
  const [pickupHoursRemaining, setPickupHoursRemaining] = useState<number>(2.5);
  const [specialNotes, setSpecialNotes] = useState('');

  // Metrics
  const activeCount = myDonations.filter((d) => ['available', 'reserved', 'assigned', 'in_transit'].includes(d.status)).length;
  const completedCount = myDonations.filter((d) => d.status === 'delivered').length;
  const totalRecoveredKg = myDonations.reduce((acc, d) => {
    return acc + (d.quantity.pickupConfirmedKg || d.quantity.measuredKg || d.quantity.donorEstimatedKg);
  }, 0);
  const pendingPickups = myDonations.filter((d) => ['reserved', 'assigned', 'arrived_at_donor'].includes(d.status)).length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const prepTimeIso = new Date(Date.now() - prepTimeMinutesAgo * 60 * 1000).toISOString();
    const pickupStart = new Date().toISOString();
    const pickupEnd = new Date(Date.now() + pickupHoursRemaining * 60 * 60 * 1000).toISOString();

    const result = donationService.createDonation({
      donorId,
      donorName,
      donorType: 'hotel',
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
      temperatureCelsius: temperatureCelsius ? Number(temperatureCelsius) : undefined,
      preparationTimestamp: prepTimeIso,
      isCleanPackaged,
      isAllergenLabelled,
      pickupWindowStart: pickupStart,
      pickupWindowEnd: pickupEnd,
      specialHandlingNotes: specialNotes,
      photoUrl: '/src/assets/images/hero_food_redistribution_1794331332502.jpg',
    });

    if (result.success && result.donation) {
      onShowToast(`Surplus logged successfully: "${result.donation.foodName}". NGOs notified.`, 'success');
      setShowCreateModal(false);
      // Reset form
      setFoodName('');
      setDescription('');
    } else {
      onShowToast(result.error || 'Failed to publish surplus.', 'error');
    }
  };

  const filteredDonations = myDonations.filter((d) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return ['available', 'reserved', 'assigned', 'in_transit'].includes(d.status);
    if (filterStatus === 'completed') return d.status === 'delivered';
    return d.status === filterStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Editorial Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DFD2] pb-6">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-[#647C50]">
            Donor Operations · Commercial Kitchen
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#183D2B] mt-1">
            Good day, {user?.fullName || 'Chef Marcus'}.
          </h1>
          <p className="text-sm text-[#50544C] mt-1">
            Active facility: <span className="font-medium text-[#252923]">{donorName}</span> ({donorAddress})
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] transition-all rounded shadow-xs self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Log Surplus Batch</span>
        </button>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
          <p className="text-xs text-[#647C50]">Active Surplus Batches</p>
          <p className="font-editorial text-3xl font-bold text-[#183D2B] tabular-nums mt-1">{activeCount}</p>
          <p className="text-[11px] text-[#50544C] mt-1">Open for NGO reservation</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
          <p className="text-xs text-[#647C50]">Pending Pickups</p>
          <p className="font-editorial text-3xl font-bold text-[#C77A54] tabular-nums mt-1">{pendingPickups}</p>
          <p className="text-[11px] text-[#50544C] mt-1">Couriers en route or assigned</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
          <p className="text-xs text-[#647C50]">Total Surplus Diverted</p>
          <p className="font-editorial text-3xl font-bold text-[#183D2B] tabular-nums mt-1">
            {Math.round(totalRecoveredKg)} <span className="text-sm font-sans font-normal text-[#50544C]">kg</span>
          </p>
          <p className="text-[11px] text-[#50544C] mt-1">Diverted from municipal waste</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E2DFD2] shadow-xs">
          <p className="text-xs text-[#647C50]">Completed Rescues</p>
          <p className="font-editorial text-3xl font-bold text-[#183D2B] tabular-nums mt-1">{completedCount}</p>
          <p className="text-[11px] text-[#50544C] mt-1">Verified handovers to shelters</p>
        </div>
      </div>

      {/* My Donations Table Section */}
      <div className="bg-white rounded-lg border border-[#E2DFD2] shadow-xs overflow-hidden">
        {/* Table Header & Filter Tabs */}
        <div className="p-5 border-b border-[#E2DFD2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FBF9F5]">
          <div>
            <h2 className="font-editorial text-xl font-bold text-[#183D2B]">
              Kitchen Surplus Ledger
            </h2>
            <p className="text-xs text-[#50544C]">
              Audited records of prepared food, measured volumes, and recipient handovers.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[#E8EDE2] p-1 rounded">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                filterStatus === 'all' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              All ({myDonations.length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                filterStatus === 'active' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                filterStatus === 'completed' ? 'bg-white text-[#183D2B] shadow-2xs' : 'text-[#50544C] hover:text-[#252923]'
              }`}
            >
              Delivered ({completedCount})
            </button>
          </div>
        </div>

        {/* Table Body */}
        {filteredDonations.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="font-editorial text-lg text-[#50544C]">No donations recorded under this filter.</p>
            <p className="text-xs text-[#737373]">Publish your commercial surplus when breakfast or luncheon services conclude.</p>
            <button
              onClick={() => setShowCreateModal(true)}
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
                  <th className="py-3 px-4 text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DFD2] text-[#252923]">
                {filteredDonations.map((d) => {
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
                          {d.quantity.pickupConfirmedKg ? ' (Verified)' : d.quantity.measuredKg ? ' (Scale)' : ' (Estimate)'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${
                            d.safety.complianceStatus === 'compliant'
                              ? 'bg-emerald-50 text-emerald-800'
                              : d.safety.complianceStatus === 'caution_urgent'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-red-50 text-red-800'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span className="capitalize">{d.safety.complianceStatus.replace('_', ' ')}</span>
                        </span>
                        <p className="text-[10px] text-[#50544C] mt-0.5">
                          {d.safety.storageCondition.replace('_', ' ')} ({d.safety.temperatureCelsius || '--'}°C)
                        </p>
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
                        <span
                          className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded uppercase tracking-wider ${
                            d.status === 'available'
                              ? 'bg-[#E8EDE2] text-[#183D2B]'
                              : d.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-900'
                              : d.status === 'in_transit'
                              ? 'bg-[#C77A54]/15 text-[#C77A54]'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {d.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onViewSafetyAudit(d)}
                          className="text-xs text-[#183D2B] hover:text-[#C77A54] font-medium underline inline-flex items-center gap-1"
                        >
                          Audit Safety
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SINGLE-PAGE CREATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#F7F6F0] rounded-xl max-w-2xl w-full border border-[#E2DFD2] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#E2DFD2] bg-[#E8EDE2] flex items-center justify-between">
              <div>
                <h3 className="font-editorial text-xl font-bold text-[#183D2B]">
                  Log Commercial Surplus Food
                </h3>
                <p className="text-xs text-[#50544C]">
                  One-page rapid donor intake with instant FSSAI safety validation.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-[#50544C] hover:text-[#252923] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5 overflow-y-auto">
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

              {/* FSSAI Food Safety Parameters */}
              <div className="p-4 bg-white rounded border border-[#E2DFD2] space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#183D2B] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#C77A54]" />
                  FSSAI Food Safety & Thermal Compliance
                </h4>

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
                      <option value="frozen">Deep Frozen (≤ -18°C)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#252923] mb-1">
                      Recorded Temperature (°C)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="e.g. 68.5"
                      value={temperatureCelsius}
                      onChange={(e) => setTemperatureCelsius(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#252923] mb-1">
                      Prepared (Minutes Ago)
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

                <div className="flex flex-col sm:flex-row gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs text-[#252923] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCleanPackaged}
                      onChange={(e) => setIsCleanPackaged(e.target.checked)}
                      className="rounded border-[#E2DFD2] text-[#183D2B] focus:ring-0"
                    />
                    <span>Food sealed in food-grade sanitized containers</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-[#252923] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllergenLabelled}
                      onChange={(e) => setIsAllergenLabelled(e.target.checked)}
                      className="rounded border-[#E2DFD2] text-[#183D2B] focus:ring-0"
                    />
                    <span>Allergens documented on packaging</span>
                  </label>
                </div>
              </div>

              {/* Pickup Constraints */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#252923] mb-1">
                    Pickup Deadline (Hours from now)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="8"
                    value={pickupHoursRemaining}
                    onChange={(e) => setPickupHoursRemaining(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2DFD2] rounded focus:border-[#183D2B] focus:outline-hidden font-mono"
                  />
                  <p className="text-[11px] text-[#50544C] mt-0.5">
                    Recommended: Within 3 hours for hot prepared meals.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#252923] mb-1">
                    Kitchen Pickup Location / Entry Gate
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rear Loading Dock B, Service Elevator 2"
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2DFD2] rounded focus:border-[#183D2B] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-[#E2DFD2] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#50544C] hover:text-[#252923]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] rounded shadow-xs"
                >
                  Publish & Notify Local NGOs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
