import React from 'react';
import { FoodDonation } from '../../types';
import { ShieldCheck, AlertTriangle, AlertCircle, X, Thermometer, Clock, PackageCheck, BookOpen } from 'lucide-react';
import { FSSAI_SURPLUS_RULES_CONFIG } from '../../services/fssaiSafetyRules';

interface FoodSafetyInspectorModalProps {
  donation: FoodDonation | null;
  onClose: () => void;
}

export const FoodSafetyInspectorModal: React.FC<FoodSafetyInspectorModalProps> = ({
  donation,
  onClose,
}) => {
  if (!donation) return null;

  const { safety } = donation;

  const getStatusBadge = () => {
    switch (safety.complianceStatus) {
      case 'compliant':
        return (
          <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>FSSAI Compliant · Safe for Controlled Redistribution</span>
          </div>
        );
      case 'caution_urgent':
        return (
          <div className="flex items-center gap-2 text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>Urgent Holding Window · Immediate Collection Required</span>
          </div>
        );
      case 'incomplete_flagged':
        return (
          <div className="flex items-center gap-2 text-orange-800 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-orange-700" />
            <span>Incomplete Safety Data · Physical Inspection Mandatory</span>
          </div>
        );
      case 'rejected_unsafe':
        return (
          <div className="flex items-center gap-2 text-red-800 bg-red-50 border border-red-200 px-3 py-1.5 rounded text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-red-700" />
            <span>Safety Threshold Breached · Unsafe for Human Consumption</span>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#F7F6F0] rounded-xl max-w-2xl w-full border border-[#E2DFD2] shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2DFD2] bg-[#E8EDE2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#183D2B]" />
            <div>
              <h3 className="font-editorial text-lg font-bold text-[#183D2B]">
                FSSAI Food Safety Assessment
              </h3>
              <p className="text-xs text-[#50544C]">
                Verification record for: <span className="font-medium text-[#252923]">{donation.foodName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#50544C] hover:text-[#252923] transition-colors rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Status Alert */}
          {getStatusBadge()}

          {/* Physical Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-3.5 rounded border border-[#E2DFD2]">
              <div className="flex items-center gap-2 text-xs text-[#647C50] mb-1">
                <Thermometer className="w-4 h-4" />
                <span>Thermal Control</span>
              </div>
              <p className="text-lg font-bold text-[#252923] tabular-nums">
                {safety.temperatureCelsius !== undefined ? `${safety.temperatureCelsius}°C` : 'Not recorded'}
              </p>
              <p className="text-[11px] text-[#50544C] mt-1 capitalize">
                Condition: {safety.storageCondition.replace('_', ' ')}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded border border-[#E2DFD2]">
              <div className="flex items-center gap-2 text-xs text-[#647C50] mb-1">
                <Clock className="w-4 h-4" />
                <span>Holding Timeline</span>
              </div>
              <p className="text-lg font-bold text-[#252923] tabular-nums">
                {safety.hoursSincePreparation}h / {safety.maxSafeHoldingHours}h
              </p>
              <p className="text-[11px] text-[#50544C] mt-1">
                Prep: {new Date(safety.preparationTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded border border-[#E2DFD2]">
              <div className="flex items-center gap-2 text-xs text-[#647C50] mb-1">
                <PackageCheck className="w-4 h-4" />
                <span>Packaging Integrity</span>
              </div>
              <p className="text-sm font-semibold text-[#252923]">
                {safety.isCleanPackaged ? 'Food-grade sealed' : 'Open / Unverified'}
              </p>
              <p className="text-[11px] text-[#50544C] mt-1">
                Allergens: {safety.isAllergenLabelled ? 'Disclosed' : 'Missing disclosure'}
              </p>
            </div>
          </div>

          {/* Detailed Audit Notes */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold tracking-wider uppercase text-[#647C50]">
              Audited Safety Checkpoints
            </h4>
            <div className="bg-white rounded border border-[#E2DFD2] divide-y divide-[#E2DFD2]">
              {safety.safetyNotes.map((note, index) => (
                <div key={index} className="p-3 text-xs text-[#252923] flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#183D2B] mt-1.5 shrink-0" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transport Specifications */}
          <div className="p-4 bg-[#E8EDE2] rounded border border-[#D3DECD] space-y-2 text-xs text-[#252923]">
            <h5 className="font-semibold text-[#183D2B] flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              Mandatory Volunteer Courier Handling
            </h5>
            <ul className="space-y-1 list-disc list-inside text-[#50544C]">
              {safety.requiresThermalTransit && (
                <li>Must transport in insulated thermal carriers maintaining &ge; 60&deg;C.</li>
              )}
              {safety.requiresColdChainTransit && (
                <li>Maintain cold-chain using ice-lined cooler boxes (&le; 5&deg;C).</li>
              )}
              <li>Volunteers must perform visual and olfactory inspection before accepting handover.</li>
              <li>Handover to NGO recipient must occur before {new Date(safety.safeConsumeUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</li>
            </ul>
          </div>

          {/* Legal Citation & AI Policy Notice */}
          <div className="text-[11px] text-[#50544C] space-y-1 border-t border-[#E2DFD2] pt-3">
            <p>
              <strong>Governing Standard:</strong> {safety.fssaiRuleCitation}
            </p>
            <p className="text-stone-500 italic">
              Safety Verification Policy: FoodBridge enforces physical temperature and timestamp rules. Food safety is never certified via computer vision or automated predictions alone.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#E8EDE2] border-t border-[#E2DFD2] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#183D2B] bg-white border border-[#E2DFD2] rounded hover:bg-stone-50 transition-colors"
          >
            Close Audit View
          </button>
        </div>
      </div>
    </div>
  );
};
