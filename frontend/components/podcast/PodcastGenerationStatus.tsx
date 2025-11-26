'use client';

import { Loader2, Check, Circle } from 'lucide-react';
import { PodcastStatus } from '@/lib/api';

interface PodcastGenerationStatusProps {
  status: PodcastStatus;
  progress?: number;
}

const STAGES = [
  { id: 'PENDING', label: 'Queued' },
  { id: 'GENERATING_SCRIPT', label: 'Generating Script' },
  { id: 'GENERATING_AUDIO', label: 'Generating Audio' },
  { id: 'MIXING', label: 'Final Mixing' },
  { id: 'COMPLETED', label: 'Complete' },
];

const STATUS_ORDER = ['PENDING', 'GENERATING_SCRIPT', 'GENERATING_AUDIO', 'MIXING', 'COMPLETED'];

export function PodcastGenerationStatus({ status, progress }: PodcastGenerationStatusProps) {
  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <div className="p-4 bg-meraki-gray-50 rounded-lg border border-meraki-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <Loader2 className="w-5 h-5 text-meraki-blue animate-spin" />
        <span className="font-medium text-meraki-gray-900">Generating Podcast...</span>
      </div>

      {progress !== undefined && (
        <div className="mb-4">
          <div className="w-full h-2 bg-meraki-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-meraki-blue transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-meraki-gray-500 mt-1">{progress}% complete</div>
        </div>
      )}

      <div className="space-y-2">
        {STAGES.slice(0, -1).map((stage, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = STATUS_ORDER[index] === status;

          return (
            <div key={stage.id} className="flex items-center gap-2">
              {isComplete ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 text-meraki-blue animate-spin" />
              ) : (
                <Circle className="w-4 h-4 text-meraki-gray-300" />
              )}
              <span className={`text-sm ${isCurrent ? 'text-meraki-blue font-medium' : isComplete ? 'text-meraki-gray-500' : 'text-meraki-gray-400'}`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
