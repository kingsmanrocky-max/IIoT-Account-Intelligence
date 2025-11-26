'use client';

import { useState } from 'react';
import { Mic, Plus, AlertTriangle, RefreshCw } from 'lucide-react';
import { PodcastOptions } from '@/lib/api';
import { PodcastPlayer } from './PodcastPlayer';
import { PodcastGenerationStatus } from './PodcastGenerationStatus';
import { PodcastOptionsPanel } from './PodcastOptionsPanel';
import { usePodcast, useGeneratePodcast } from '@/lib/hooks/usePodcast';

interface PodcastSectionProps {
  reportId: string;
}

export function PodcastSection({ reportId }: PodcastSectionProps) {
  const { data: podcastData, isLoading } = usePodcast(reportId);
  const generateMutation = useGeneratePodcast();
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<PodcastOptions>({
    template: 'EXECUTIVE_BRIEF',
    duration: 'STANDARD',
  });

  const podcast = podcastData?.data?.data;

  const handleGenerate = () => {
    generateMutation.mutate({ reportId, options });
    setShowOptions(false);
  };

  if (isLoading) {
    return (
      <div className="p-4 border border-meraki-gray-200 rounded-lg">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-5 h-5 bg-meraki-gray-200 rounded" />
          <div className="h-4 w-32 bg-meraki-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // No podcast exists yet
  if (!podcast) {
    return (
      <div className="border border-meraki-gray-200 rounded-lg">
        <div className="p-4 border-b border-meraki-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-meraki-gray-500" />
              <span className="font-medium text-meraki-gray-900">Virtual Podcast</span>
            </div>
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-meraki-blue text-white rounded hover:bg-meraki-blue-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Generate Podcast
            </button>
          </div>
        </div>

        {showOptions && (
          <div className="p-4 space-y-4">
            <PodcastOptionsPanel options={options} onChange={setOptions} />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowOptions(false)}
                className="px-3 py-1.5 text-sm border border-meraki-gray-300 rounded hover:bg-meraki-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="px-3 py-1.5 text-sm bg-meraki-blue text-white rounded hover:bg-meraki-blue-dark disabled:opacity-50"
              >
                {generateMutation.isPending ? 'Starting...' : 'Generate'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Podcast is completed
  if (podcast.status === 'COMPLETED') {
    return (
      <div className="border border-meraki-gray-200 rounded-lg">
        <div className="p-4 border-b border-meraki-gray-200">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-meraki-blue" />
            <span className="font-medium text-meraki-gray-900">Virtual Podcast</span>
          </div>
        </div>
        <div className="p-4">
          <PodcastPlayer podcast={podcast} reportId={reportId} />
        </div>
      </div>
    );
  }

  // Podcast is generating
  if (['PENDING', 'GENERATING_SCRIPT', 'GENERATING_AUDIO', 'MIXING'].includes(podcast.status)) {
    return (
      <div className="border border-meraki-gray-200 rounded-lg">
        <div className="p-4 border-b border-meraki-gray-200">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-meraki-blue" />
            <span className="font-medium text-meraki-gray-900">Virtual Podcast</span>
          </div>
        </div>
        <div className="p-4">
          <PodcastGenerationStatus status={podcast.status} />
        </div>
      </div>
    );
  }

  // Podcast failed
  if (podcast.status === 'FAILED') {
    return (
      <div className="border border-red-200 rounded-lg bg-red-50">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="font-medium text-red-700">Podcast Generation Failed</span>
          </div>
          <p className="text-sm text-red-600 mb-3">{podcast.error || 'An error occurred'}</p>
          <button
            onClick={() => generateMutation.mutate({ reportId, options })}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            {generateMutation.isPending ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
