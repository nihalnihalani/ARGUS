'use client';

import dynamic from 'next/dynamic';
import type { AttackArc } from '@/lib/types';

interface AttackMapProps {
  arcs: AttackArc[];
}

const AttackMapInner = dynamic(() => import('./AttackMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#030712] rounded-lg border border-[#374151]">
      <div className="text-center">
        <div className="text-[#6b7280] text-sm mb-2">Loading attack map...</div>
        <div className="w-8 h-8 border-2 border-[#374151] border-t-[#ef4444] rounded-full animate-spin mx-auto" />
      </div>
    </div>
  ),
});

export default function AttackMap(props: AttackMapProps) {
  return <AttackMapInner {...props} />;
}
