import React, { useState, useMemo } from 'react';
import { FoodDonation, AuditEvent } from '../../types';
import { ShieldCheck, AlertTriangle, AlertCircle, X, Thermometer, Clock, PackageCheck, BookOpen, History, Info, ListOrdered, User, FileText } from 'lucide-react';
import { DOCUMENTED_SAFETY_THRESHOLDS } from '../../services/fssaiSafetyRules';
import { auditEventRepository } from '../../repositories';

interface FoodSafetyInspectorModalProps {
  donation: FoodDonation | null;
  onClose: () => void;
}

export const FoodSafetyInspectorModal: React.FC<FoodSafetyInspectorModalProps> = ({
  donation,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'safety' | 'audit'>('safety');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (donation) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [donation, onClose]);

  const auditEvents = useMemo(() => {
    if (!donation) return [];
    return auditEventRepository.findByEntityId(donation.id);
  }, [donation]);

  if (!donation) return null;

  const { safety, safetyHistory } = donation;

  const getOutcomeBadge = () => {
    switch (safety.assessmentOutcome) {
      case 'SUITABLE_FOR_REVIEW':
        return (
          <div className="flex items-center gap-2 text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <p>Suitable for Further Review</p>
              <p className="text-[11px] font-normal text-emerald-800">
                Logged parameters align with documented holding guidelines. Note: This is an assessment, not a guarantee of safety.
              </p>
            </div>
          </div>
        );
      case 'NEEDS_REVIEW':
        return (
          <div className="flex items-center gap-2 text-amber-900 bg-amber-50 border border-amber-200 px-3 py-2 rounded text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <div>
              <p>Requires Manual Review</p>
              <p className="text-[11px] font-normal text-amber-800">
                Approaching holding deadlines or requires on-site allergen/packaging verification before serving.
              </p>
            </div>
          </div>
        );
      case 'INCOMPLETE_INFORMATION':
        return (
          <div className="flex items-center gap-2 text-orange-950 bg-orange-50 border border-orange-200 px-3 py-2 rounded text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-orange-700 shrink-0" />
            <div>
              <p>Needs Additional Information</p>
              <p className="text-[11px] font-normal text-orange-800">
                Critical thermal or preparation timestamps unrecorded. Must inspect temperature prior to collection.
              </p>
            </div>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="flex items-center gap-2 text-red-950 bg-red-50 border border-red-200 px-3 py-2 rounded text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
            <div>
              <p>Rejected Based on Configured Criteria</p>
              <p className="text-[11px] font-normal text-red-800">
                Temperature or safe holding elapsed beyond safety limits. Unsafe for human redistribution.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="bg-[#F7F6F0] rounded-xl max-w-2xl w-full border border-[#E2DFD2] shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2DFD2] bg-[#E8EDE2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#183D2B]" />
            <div>
              <h3 id="safety-modal-title" className="font-editorial text-lg font-bold text-[#183D2B]">
                {activeTab === 'safety' ? 'Food Safety Assessment Report' : 'Immutable Audit History'}
              </h3>
              <p className="text-xs text-[#50544C]">
                Record ID: <span className="font-mono font-medium text-[#252923]">{donation.id}</span> · <span className="font-medium text-[#252923]">{donation.foodName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close safety inspector modal"
            className="p-1 text-[#50544C] hover:text-[#252923] transition-colors rounded focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E2DFD2] bg-white px-6">
          <button
            onClick={() => setActiveTab('safety')}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'safety'
                ? 'border-[#183D2B] text-[#183D2B] font-semibold'
                : 'border-transparent text-[#50544C] hover:text-[#183D2B]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Safety & Thermal Criteria
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-[#183D2B] text-[#183D2B] font-semibold'
                : 'border-transparent text-[#50544C] hover:text-[#183D2B]'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            Audit Ledger ({auditEvents.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {activeTab === 'safety' ? (
            <>
              {/* Status Alert */}
              {getOutcomeBadge()}

          {/* Physical Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded border border-[#E2DFD2]">
              <div className="flex items-center gap-2 text-xs text-[#647C50] mb-1">
                <Thermometer className="w-4 h-4" />
                <span>Thermal Control</span>
              </div>
              <p className="text-lg font-bold text-[#252923] tabular-nums font-mono">
                {safety.temperatureCelsius !== undefined ? `${safety.temperatureCelsius}°C` : 'Not recorded'}
              </p>
              <p className="text-[11px] text-[#50544C] mt-1 capitalize">
                Condition: {safety.storageCondition.replace(/_/g, ' ')}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded border border-[#E2DFD2]">
              <div className="flex items-center gap-2 text-xs text-[#647C50] mb-1">
                <Clock className="w-4 h-4" />
                <span>Holding Timeline</span>
              </div>
              <p className="text-lg font-bold text-[#252923] tabular-nums font-mono">
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
                {safety.packagingCondition ? safety.packagingCondition.replace(/_/g, ' ') : safety.isCleanPackaged ? 'Food-grade sealed' : 'Open / Unverified'}
              </p>
              <p className="text-[11px] text-[#50544C] mt-1">
                Allergens: {safety.isAllergenLabelled ? 'Disclosed' : 'Missing disclosure'}
              </p>
            </div>
          </div>

          {/* Assessment Reasons & Warnings */}
          <div className="space-y-3">
            {safety.assessmentReasons && safety.assessmentReasons.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold tracking-wider uppercase text-[#647C50]">
                  Assessment Checkpoints & Criteria
                </h4>
                <div className="bg-white rounded border border-[#E2DFD2] divide-y divide-[#E2DFD2]">
                  {safety.assessmentReasons.map((reason, idx) => (
                    <div key={idx} className="p-2.5 text-xs text-[#252923] flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#183D2B] mt-1.5 shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings if any */}
            {safety.warnings && safety.warnings.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold tracking-wider uppercase text-[#C77A54] flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#C77A54]" />
                  Active Safety Warnings
                </h4>
                <div className="bg-amber-50 rounded border border-amber-200 divide-y divide-amber-200">
                  {safety.warnings.map((warning, idx) => (
                    <div key={idx} className="p-2.5 text-xs text-amber-900 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C77A54] mt-1.5 shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Info if any */}
            {safety.missingInformation && safety.missingInformation.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold tracking-wider uppercase text-orange-800 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-700" />
                  Missing Parameters
                </h4>
                <div className="bg-orange-50 rounded border border-orange-200 divide-y divide-orange-200">
                  {safety.missingInformation.map((info, idx) => (
                    <div key={idx} className="p-2.5 text-xs text-orange-950 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-700 mt-1.5 shrink-0" />
                      <span>{info}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Transport Specifications */}
          <div className="p-3.5 bg-[#E8EDE2] rounded border border-[#D3DECD] space-y-1.5 text-xs text-[#252923]">
            <h5 className="font-semibold text-[#183D2B] flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              Handling Guidance for Transport & Recipient
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

          {/* Assessment History Section */}
          {safetyHistory && safetyHistory.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#E2DFD2]">
              <h4 className="text-xs font-semibold tracking-wider uppercase text-[#647C50] flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#647C50]" />
                Assessment History & Audit Trail
              </h4>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {safetyHistory.map((rec, idx) => (
                  <div key={idx} className="bg-white p-3 rounded border border-[#E2DFD2] text-xs space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-[#50544C]">
                      <span>{new Date(rec.assessedAt).toLocaleString()}</span>
                      <span className="font-mono font-semibold uppercase">{rec.newOutcome.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-[#252923] font-medium">{rec.changesSummary}</p>
                    {rec.warnings && rec.warnings.length > 0 && (
                      <p className="text-[11px] text-[#C77A54] italic">Warnings: {rec.warnings.join('; ')}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

              {/* Transparency & Disclaimer Notice */}
              <div className="text-[11px] text-[#50544C] space-y-1 border-t border-[#E2DFD2] pt-3">
                <p>
                  <strong>Governing Standard:</strong> {safety.fssaiRuleCitation}
                </p>
                <p className="text-stone-500 italic">
                  Disclaimer: FoodBridge assessments provide structured decision support based on physical logging. Food safety is never certified via automated prediction, image recognition, or opaque heuristics.
                </p>
              </div>
            </>
          ) : (
            /* Audit Trail Tab */
            <div className="space-y-4">
              <div className="bg-[#E8EDE2] p-3 rounded border border-[#D3DECD] text-xs text-[#252923] flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#183D2B]">Immutable Entity Audit Trail</p>
                  <p className="text-[11px] text-[#50544C]">
                    All state mutations, reservation holds, quantity confirmations and exception events are appended to this immutable ledger.
                  </p>
                </div>
                <span className="font-mono bg-white text-[#183D2B] px-2 py-1 rounded border border-[#D3DECD] text-[10px] font-bold">
                  {auditEvents.length} Events Logged
                </span>
              </div>

              {auditEvents.length === 0 ? (
                <div className="text-center py-8 text-[#50544C] bg-white rounded border border-[#E2DFD2]">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">No audit events recorded for this entity yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {auditEvents.map((event, idx) => (
                    <div
                      key={event.id || idx}
                      className="bg-white p-3.5 rounded border border-[#E2DFD2] text-xs space-y-2 hover:border-[#183D2B]/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-[#F7F6F0] pb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${
                              event.eventType.includes('delivered') || event.eventType.includes('confirmed')
                                ? 'bg-emerald-100 text-emerald-800'
                                : event.eventType.includes('failed') || event.eventType.includes('issue') || event.eventType.includes('dispute')
                                ? 'bg-red-100 text-red-800'
                                : event.eventType.includes('lock')
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-stone-100 text-stone-800'
                            }`}
                          >
                            {event.eventType.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono text-[10px] text-stone-400">
                            {event.id}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#50544C] tabular-nums font-mono">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#50544C]">
                        <User className="w-3.5 h-3.5 text-[#647C50]" />
                        <span>
                          <strong className="text-[#252923]">{event.actorName}</strong> ({event.actorRole.toUpperCase()})
                        </span>
                        {event.actorId && (
                          <span className="font-mono text-[10px] text-stone-400">[{event.actorId}]</span>
                        )}
                      </div>

                      {event.note && (
                        <p className="text-[#252923] text-xs bg-[#F7F6F0] p-2 rounded border border-[#E2DFD2]/60">
                          {event.note}
                        </p>
                      )}

                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="pt-1 flex flex-wrap gap-1.5">
                          {Object.entries(event.metadata).map(([k, v]) => (
                            <span
                              key={k}
                              className="inline-flex items-center gap-1 bg-[#E8EDE2]/60 text-[#183D2B] px-2 py-0.5 rounded text-[10px] font-mono border border-[#D3DECD]/60"
                            >
                              <span className="text-stone-400">{k}:</span>
                              <span className="font-semibold">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
