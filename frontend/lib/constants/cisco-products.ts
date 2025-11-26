/**
 * Cisco IIoT Product Portfolio and Industry Verticals
 * Used for Competitive Intelligence workflow customization
 */

export interface CiscoProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  keyProducts: string[];
}

export const CISCO_IIOT_PRODUCTS: CiscoProduct[] = [
  {
    id: 'industrial-networking',
    name: 'Industrial Networking',
    category: 'Networking',
    description: 'Ruggedized switches and routers for industrial environments',
    keyProducts: [
      'Catalyst IE3x00 Switches',
      'Catalyst IR1100 Routers',
      'Industrial Ethernet Switches',
      'Catalyst IE9300 Rugged Series',
    ],
  },
  {
    id: 'edge-computing',
    name: 'Edge Computing',
    category: 'Compute',
    description: 'Edge processing and IoT gateway solutions',
    keyProducts: [
      'Catalyst 8200 Edge',
      'IOx Application Hosting',
      'Edge Intelligence',
      'IC3000 Industrial Compute Gateway',
    ],
  },
  {
    id: 'security',
    name: 'Security',
    category: 'Security',
    description: 'OT security and secure equipment access',
    keyProducts: [
      'Cyber Vision',
      'Secure Equipment Access (SEA)',
      'Industrial Firewalls',
      'ISA/IEC 62443 Compliance',
    ],
  },
  {
    id: 'iot-operations',
    name: 'IoT Operations',
    category: 'Management',
    description: 'Visibility, management, and analytics for IoT',
    keyProducts: [
      'IoT Operations Dashboard',
      'DNA Center',
      'ThousandEyes',
      'Meraki Dashboard',
    ],
  },
];

export interface IndustryVertical {
  id: string;
  name: string;
  description: string;
  useCases: string[];
}

export const INDUSTRY_VERTICALS: IndustryVertical[] = [
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    description: 'Discrete and process manufacturing operations',
    useCases: [
      'Smart Factory',
      'Production Line Monitoring',
      'Quality Control',
      'Predictive Maintenance',
    ],
  },
  {
    id: 'energy-utilities',
    name: 'Energy & Utilities',
    description: 'Power generation, distribution, and utility services',
    useCases: [
      'Grid Modernization',
      'Substation Automation',
      'Renewable Integration',
      'AMI/Smart Metering',
    ],
  },
  {
    id: 'transportation',
    name: 'Transportation & Logistics',
    description: 'Fleet management, rail, ports, and supply chain',
    useCases: [
      'Fleet Tracking',
      'Rail Communications',
      'Port Automation',
      'Warehouse Connectivity',
    ],
  },
  {
    id: 'smart-cities',
    name: 'Smart Cities',
    description: 'Municipal infrastructure and public services',
    useCases: [
      'Traffic Management',
      'Public Safety',
      'Smart Lighting',
      'Environmental Monitoring',
    ],
  },
  {
    id: 'oil-gas',
    name: 'Oil & Gas',
    description: 'Upstream, midstream, and downstream operations',
    useCases: [
      'Pipeline Monitoring',
      'Refinery Automation',
      'Remote Site Connectivity',
      'SCADA Networks',
    ],
  },
];

// Helper functions
export function getProductById(id: string): CiscoProduct | undefined {
  return CISCO_IIOT_PRODUCTS.find((p) => p.id === id);
}

export function getIndustryById(id: string): IndustryVertical | undefined {
  return INDUSTRY_VERTICALS.find((i) => i.id === id);
}
