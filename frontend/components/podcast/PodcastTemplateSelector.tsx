'use client';

import { Mic, Users, Radio } from 'lucide-react';
import { PodcastTemplate } from '@/lib/api';

interface PodcastTemplateSelectorProps {
  value: PodcastTemplate;
  onChange: (template: PodcastTemplate) => void;
  disabled?: boolean;
}

const TEMPLATES = [
  {
    id: 'EXECUTIVE_BRIEF' as PodcastTemplate,
    name: 'Executive Brief',
    description: 'Professional two-host interview format',
    icon: Mic,
    hosts: ['Sarah (Host)', 'Marcus (Analyst)'],
  },
  {
    id: 'STRATEGIC_DEBATE' as PodcastTemplate,
    name: 'Strategic Debate',
    description: 'Dynamic three-host discussion with contrasting views',
    icon: Users,
    hosts: ['Jordan (Moderator)', 'Morgan (Strategist)', 'Taylor (Analyst)'],
  },
  {
    id: 'INDUSTRY_PULSE' as PodcastTemplate,
    name: 'Industry Pulse',
    description: 'Fast-paced news roundtable format',
    icon: Radio,
    hosts: ['Riley (Anchor)', 'Casey (Reporter)', 'Drew (Analyst)'],
  },
];

export function PodcastTemplateSelector({ value, onChange, disabled }: PodcastTemplateSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-meraki-gray-700">
        Podcast Style
      </label>
      <div className="grid grid-cols-3 gap-3">
        {TEMPLATES.map((template) => {
          const isSelected = value === template.id;
          const Icon = template.icon;
          return (
            <label
              key={template.id}
              className={`relative flex flex-col p-3 border rounded-lg cursor-pointer transition-colors ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                isSelected
                  ? 'border-meraki-blue bg-meraki-blue/5'
                  : 'border-meraki-gray-200 hover:border-meraki-gray-300'
              }`}
            >
              <input
                type="radio"
                name="podcast-template"
                value={template.id}
                checked={isSelected}
                onChange={() => onChange(template.id)}
                disabled={disabled}
                className="sr-only"
              />
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${isSelected ? 'text-meraki-blue' : 'text-meraki-gray-500'}`} />
                <span className={`text-sm font-medium ${isSelected ? 'text-meraki-blue' : 'text-meraki-gray-900'}`}>
                  {template.name}
                </span>
              </div>
              <p className="text-xs text-meraki-gray-500">{template.description}</p>
              <div className="mt-2 text-xs text-meraki-gray-400">
                {template.hosts.length} hosts
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
