import React from 'react';
import { Check, AlertTriangle, XCircle, Truck } from 'lucide-react';
import { DonationStatus } from '../../types';
import { DELIVERY_STEPS, getDeliveryStepInfo } from '../../utils/deliveryStepMapping';

interface DeliveryStepperProps {
  status: DonationStatus;
  className?: string;
  compact?: boolean;
}

/**
 * DeliveryStepper
 * An animated, accessible 4-stage delivery tracker for FoodBridge.
 *
 * Requirements:
 * - 4 states: Reserved -> Courier Assigned -> Picked Up -> Delivered.
 * - Active step has a gentle pulsing ring using theme colors.
 * - Completed steps show a checkmark with a quick scale-in.
 * - All transitions respect prefers-reduced-motion (instant switch, no pulse).
 * - Theme-locked: uses only approved brand tokens (#183D2B, #647C50, #C77A54, etc.)
 */
export const DeliveryStepper: React.FC<DeliveryStepperProps> = ({
  status,
  className = '',
  compact = false,
}) => {
  const stepInfo = getDeliveryStepInfo(status);

  // Handle cancelled or exception states
  if (stepInfo.isCancelled) {
    return (
      <div
        className={`flex items-center gap-2 p-2.5 rounded bg-amber-50/70 border border-amber-200 text-amber-900 text-xs ${className}`}
        role="status"
        aria-label="Delivery cancelled"
      >
        <XCircle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
        <span className="font-semibold">{stepInfo.stepLabel}</span>
      </div>
    );
  }

  if (stepInfo.isException && stepInfo.stepIndex === -1) {
    return (
      <div
        className={`flex items-center gap-2 p-2.5 rounded bg-rose-50/70 border border-rose-200 text-rose-900 text-xs ${className}`}
        role="alert"
        aria-label="Delivery incident flagged"
      >
        <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" aria-hidden="true" />
        <span className="font-semibold">{stepInfo.stepLabel}</span>
      </div>
    );
  }

  // If status is not in active delivery pipeline (e.g. 'available')
  if (stepInfo.stepIndex === -1) {
    return (
      <div
        className={`flex items-center gap-2 p-2 rounded bg-[#F7F6F0] border border-[#E2DFD2] text-[#50544C] text-xs ${className}`}
        role="status"
      >
        <span className="w-2 h-2 rounded-full bg-[#647C50]" aria-hidden="true" />
        <span className="font-medium">{stepInfo.stepLabel}</span>
      </div>
    );
  }

  const activeIndex = stepInfo.stepIndex;

  if (compact) {
    return (
      <nav
        aria-label={`Delivery progress: ${stepInfo.stepLabel}`}
        className={`w-full py-1 ${className}`}
      >
        <div className="flex items-center justify-between text-[11px] mb-1.5 font-medium">
          <span className="text-[#183D2B] font-semibold flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-[#183D2B]" aria-hidden="true" />
            {stepInfo.stepLabel}
          </span>
          <span className="text-[#50544C] font-mono text-[10px]">
            Step {Math.min(activeIndex + 1, 4)} of 4
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 h-1.5 rounded-full overflow-hidden bg-[#E8EDE2]">
          {DELIVERY_STEPS.map((step, idx) => {
            const isCompleted = idx < activeIndex || (idx === 3 && stepInfo.isComplete);
            const isCurrent = idx === activeIndex && !stepInfo.isComplete;
            return (
              <div
                key={step.id}
                className={`h-full rounded-full transition-colors duration-200 ${
                  isCompleted
                    ? 'bg-[#183D2B]'
                    : isCurrent
                    ? 'bg-[#647C50] motion-safe:animate-pulse'
                    : 'bg-[#E2DFD2]'
                }`}
                title={step.label}
              />
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label={`Delivery progress: ${stepInfo.stepLabel}`}
      className={`w-full py-2 ${className}`}
    >
      <ol className="flex items-center justify-between w-full relative">
        {DELIVERY_STEPS.map((step, idx) => {
          const isCompleted = idx < activeIndex || (idx === 3 && stepInfo.isComplete);
          const isCurrent = idx === activeIndex && !stepInfo.isComplete;
          const isUpcoming = idx > activeIndex;

          return (
            <React.Fragment key={step.id}>
              {/* Step item */}
              <li
                className="flex flex-col items-center relative z-10 flex-1 min-w-0"
                aria-current={isCurrent ? 'step' : undefined}
              >
                {/* Step Circle Indicator */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 select-none ${
                    isCompleted
                      ? 'bg-[#183D2B] text-white shadow-xs'
                      : isCurrent
                      ? 'bg-[#183D2B] text-white ring-4 ring-[#183D2B]/20 motion-safe:animate-pulse shadow-xs'
                      : 'bg-[#F7F6F0] border-2 border-[#E2DFD2] text-[#50544C]'
                  }`}
                  aria-label={`${step.label} ${isCompleted ? '(Completed)' : isCurrent ? '(Current Step)' : '(Pending)'}`}
                >
                  {isCompleted ? (
                    <Check
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white motion-safe:transition-transform motion-safe:scale-100 motion-reduce:transition-none"
                      strokeWidth={2.75}
                      aria-hidden="true"
                    />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Step Label below circle */}
                <div className="mt-1.5 text-center px-1 w-full">
                  <p
                    className={`text-[10px] sm:text-[11px] leading-tight truncate ${
                      isCompleted
                        ? 'font-semibold text-[#183D2B]'
                        : isCurrent
                        ? 'font-bold text-[#183D2B]'
                        : 'font-medium text-[#50544C]'
                    }`}
                    title={step.label}
                  >
                    {step.label}
                  </p>
                  {isCurrent && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded-full bg-[#E8EDE2] text-[9px] font-semibold text-[#183D2B]">
                      Active
                    </span>
                  )}
                </div>
              </li>

              {/* Connecting line between steps */}
              {idx < DELIVERY_STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5 sm:h-1 -mt-5 mx-0.5 sm:mx-1 bg-[#E2DFD2] relative overflow-hidden rounded-full"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full transition-all duration-300 ${
                      idx < activeIndex ? 'w-full bg-[#183D2B]' : 'w-0'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
