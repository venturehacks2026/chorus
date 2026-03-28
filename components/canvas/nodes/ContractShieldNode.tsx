'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useExecutionStore, type ContractShieldState } from '@/stores/executionStore';
import { cn } from '@/lib/cn';

export interface ContractShieldNodeData {
  sourceAgentId: string;
  targetAgentId: string;
  contractCount: number;
  [key: string]: unknown;
}

const STATUS_CONFIG: Record<ContractShieldState['status'] | 'idle', {
  border: string;
  bg: string;
  iconColor: string;
  ring?: string;
  animate?: string;
}> = {
  idle:      { border: 'border-gray-200', bg: 'bg-gray-50',    iconColor: 'text-gray-400' },
  checking:  { border: 'border-violet-300', bg: 'bg-violet-50', iconColor: 'text-violet-500', ring: 'ring-2 ring-violet-300/40', animate: 'animate-pulse' },
  pass:      { border: 'border-emerald-400', bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  fail:      { border: 'border-red-400', bg: 'bg-red-50', iconColor: 'text-red-500', ring: 'ring-2 ring-red-300/40' },
  retrying:  { border: 'border-amber-400', bg: 'bg-amber-50', iconColor: 'text-amber-600', animate: 'animate-pulse' },
};

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function RetryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function StatusOverlay({ status }: { status: ContractShieldState['status'] | 'idle' }) {
  if (status === 'idle' || status === 'checking') return null;
  if (status === 'pass') return <CheckIcon className="w-2.5 h-2.5 text-emerald-600 absolute -bottom-0.5 -right-0.5" />;
  if (status === 'fail') return <XIcon className="w-2.5 h-2.5 text-red-500 absolute -bottom-0.5 -right-0.5" />;
  if (status === 'retrying') return <RetryIcon className="w-2.5 h-2.5 text-amber-600 absolute -bottom-0.5 -right-0.5 animate-spin" />;
  return null;
}

export const ContractShieldNode = memo(function ContractShieldNode({ id, data: raw }: NodeProps) {
  const data = raw as unknown as ContractShieldNodeData;
  const shield = useExecutionStore((s) => s.contractShields[id]);
  const status: ContractShieldState['status'] | 'idle' = shield?.status ?? 'idle';
  const config = STATUS_CONFIG[status];
  const count = data.contractCount ?? 0;

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-xl border-2 px-3 py-2 shadow-sm transition-all duration-300 select-none',
        config.border, config.bg, config.ring, config.animate,
      )}
      style={{ minWidth: 64, minHeight: 56 }}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-violet-400 !border-white !border-2" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-violet-400 !border-white !border-2" />

      <div className="relative">
        <ShieldIcon className={cn('w-5 h-5', config.iconColor)} />
        <StatusOverlay status={status} />
      </div>

      {count > 0 && (
        <span className={cn('text-[9px] font-bold mt-0.5', config.iconColor)}>
          {count}
        </span>
      )}

      {shield?.lastResult && status === 'fail' && (
        <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] text-red-500 font-medium">
          {shield.lastResult.length > 30 ? shield.lastResult.slice(0, 30) + '…' : shield.lastResult}
        </p>
      )}
    </div>
  );
});
