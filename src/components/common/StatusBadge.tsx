import React from 'react';
import { DonationStatus } from '../../types';
import { CheckCircle2, Clock, AlertCircle, AlertTriangle, Truck, Package, ShieldCheck, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: DonationStatus;
  className?: string;
  showIcon?: boolean;
}

export interface StatusConfig {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const STATUS_CONFIG: Record<DonationStatus, StatusConfig> = {
  available: {
    label: 'AVAILABLE',
    bgColor: 'bg-[#E8EDE2]',
    textColor: 'text-[#183D2B]',
    borderColor: 'border-[#183D2B]/30',
    icon: Package,
  },
  locking: {
    label: 'HOLDING LOCK',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200',
    icon: Clock,
  },
  reserved: {
    label: 'RESERVED',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-300',
    icon: Clock,
  },
  assigned: {
    label: 'COURIER ASSIGNED',
    bgColor: 'bg-[#C77A54]/15',
    textColor: 'text-[#C77A54]',
    borderColor: 'border-[#C77A54]/30',
    icon: Truck,
  },
  arrived_at_donor: {
    label: 'AT DONOR',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    icon: Truck,
  },
  picked_up: {
    label: 'PICKED UP',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-800',
    borderColor: 'border-indigo-200',
    icon: Truck,
  },
  in_transit: {
    label: 'IN TRANSIT',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-900',
    borderColor: 'border-indigo-300',
    icon: Truck,
  },
  awaiting_ngo_confirmation: {
    label: 'AWAITING NGO CONFIRMATION',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-900',
    borderColor: 'border-purple-300',
    icon: Clock,
  },
  delivered: {
    label: 'DELIVERED',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-900',
    borderColor: 'border-emerald-300',
    icon: CheckCircle2,
  },
  cancelled_by_donor: {
    label: 'CANCELLED BY DONOR',
    bgColor: 'bg-stone-100',
    textColor: 'text-stone-700',
    borderColor: 'border-stone-300',
    icon: XCircle,
  },
  cancelled_by_ngo: {
    label: 'CANCELLED BY NGO',
    bgColor: 'bg-stone-100',
    textColor: 'text-stone-700',
    borderColor: 'border-stone-300',
    icon: XCircle,
  },
  volunteer_cancelled: {
    label: 'REASSIGNMENT URGENT',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-900',
    borderColor: 'border-orange-300',
    icon: AlertTriangle,
  },
  pickup_failed: {
    label: 'PICKUP FAILED',
    bgColor: 'bg-red-100',
    textColor: 'text-red-900',
    borderColor: 'border-red-300',
    icon: AlertCircle,
  },
  delivery_issue: {
    label: 'DELIVERY ISSUE',
    bgColor: 'bg-red-100',
    textColor: 'text-red-900',
    borderColor: 'border-red-300',
    icon: AlertCircle,
  },
  disputed: {
    label: 'DISPUTED',
    bgColor: 'bg-rose-100',
    textColor: 'text-rose-900',
    borderColor: 'border-rose-300',
    icon: AlertCircle,
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  showIcon = true,
}) => {
  const config = STATUS_CONFIG[status] || {
    label: status.toUpperCase().replace(/_/g, ' '),
    bgColor: 'bg-stone-100',
    textColor: 'text-stone-700',
    borderColor: 'border-stone-300',
    icon: Package,
  };

  const IconComponent = config.icon;

  return (
    <span
      role="status"
      aria-label={`Status: ${config.label}`}
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded border uppercase tracking-wider font-mono ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      {showIcon && <IconComponent className="w-3 h-3 shrink-0" aria-hidden="true" />}
      <span>{config.label}</span>
    </span>
  );
};

