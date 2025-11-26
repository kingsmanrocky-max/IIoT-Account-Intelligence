'use client';

import { PodcastOptions } from '@/lib/api';
import { PodcastTemplateSelector } from './PodcastTemplateSelector';
import { PodcastDurationSelector } from './PodcastDurationSelector';
import { PodcastDeliverySelector } from './PodcastDeliverySelector';

interface PodcastOptionsPanelProps {
  options: PodcastOptions;
  onChange: (options: PodcastOptions) => void;
  disabled?: boolean;
}

export function PodcastOptionsPanel({ options, onChange, disabled }: PodcastOptionsPanelProps) {
  return (
    <div className="space-y-4 p-4 bg-meraki-gray-50 rounded-lg border border-meraki-gray-200">
      <PodcastTemplateSelector
        value={options.template}
        onChange={(template) => onChange({ ...options, template })}
        disabled={disabled}
      />
      <PodcastDurationSelector
        value={options.duration}
        onChange={(duration) => onChange({ ...options, duration })}
        disabled={disabled}
      />
      <div className="pt-2 border-t border-meraki-gray-300">
        <PodcastDeliverySelector
          enabled={options.deliveryEnabled || false}
          destination={options.deliveryDestination || ''}
          destinationType={options.deliveryDestinationType || 'email'}
          onEnabledChange={(deliveryEnabled) => onChange({ ...options, deliveryEnabled })}
          onDestinationChange={(deliveryDestination) => onChange({ ...options, deliveryDestination })}
          onDestinationTypeChange={(deliveryDestinationType) => onChange({ ...options, deliveryDestinationType })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
