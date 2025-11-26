'use client';

import { CISCO_IIOT_PRODUCTS, CiscoProduct } from '@/lib/constants/cisco-products';
import { Network, Cpu, Shield, Activity, Check } from 'lucide-react';

interface ProductSelectorProps {
  selectedProducts: string[];
  onProductsChange: (products: string[]) => void;
  disabled?: boolean;
}

const productIcons: Record<string, React.ReactNode> = {
  'industrial-networking': <Network className="w-6 h-6" />,
  'edge-computing': <Cpu className="w-6 h-6" />,
  'security': <Shield className="w-6 h-6" />,
  'iot-operations': <Activity className="w-6 h-6" />,
};

export default function ProductSelector({
  selectedProducts,
  onProductsChange,
  disabled = false,
}: ProductSelectorProps) {
  const toggleProduct = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      onProductsChange(selectedProducts.filter((id) => id !== productId));
    } else {
      onProductsChange([...selectedProducts, productId]);
    }
  };

  const selectAll = () => {
    onProductsChange(CISCO_IIOT_PRODUCTS.map((p) => p.id));
  };

  const clearAll = () => {
    onProductsChange([]);
  };

  const allSelected = selectedProducts.length === CISCO_IIOT_PRODUCTS.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-meraki-gray-700">
          Cisco IIoT Products to Compare
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            disabled={disabled || allSelected}
            className="text-xs text-meraki-blue hover:text-meraki-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select All
          </button>
          <span className="text-meraki-gray-300">|</span>
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled || selectedProducts.length === 0}
            className="text-xs text-meraki-blue hover:text-meraki-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CISCO_IIOT_PRODUCTS.map((product) => {
          const isSelected = selectedProducts.includes(product.id);

          return (
            <button
              key={product.id}
              type="button"
              onClick={() => toggleProduct(product.id)}
              disabled={disabled}
              className={`relative flex items-start gap-3 p-4 border rounded-lg text-left transition-all ${
                isSelected
                  ? 'border-meraki-blue bg-meraki-blue/5 ring-1 ring-meraki-blue'
                  : 'border-meraki-gray-200 hover:border-meraki-gray-300 hover:bg-meraki-gray-50'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              {/* Selection indicator */}
              <div
                className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center ${
                  isSelected ? 'bg-meraki-blue text-white' : 'bg-meraki-gray-100'
                }`}
              >
                {isSelected && <Check className="w-3 h-3" />}
              </div>

              {/* Icon */}
              <div
                className={`p-2 rounded-lg ${
                  isSelected
                    ? 'bg-meraki-blue/10 text-meraki-blue'
                    : 'bg-meraki-gray-100 text-meraki-gray-500'
                }`}
              >
                {productIcons[product.id]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-6">
                <div
                  className={`font-medium ${
                    isSelected ? 'text-meraki-gray-900' : 'text-meraki-gray-700'
                  }`}
                >
                  {product.name}
                </div>
                <p className="text-xs text-meraki-gray-500 mt-0.5 line-clamp-2">
                  {product.description}
                </p>
                {isSelected && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {product.keyProducts.slice(0, 2).map((kp) => (
                      <span
                        key={kp}
                        className="text-xs bg-meraki-blue/10 text-meraki-blue px-1.5 py-0.5 rounded"
                      >
                        {kp}
                      </span>
                    ))}
                    {product.keyProducts.length > 2 && (
                      <span className="text-xs text-meraki-gray-400">
                        +{product.keyProducts.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-meraki-gray-400">
        {selectedProducts.length === 0
          ? 'Select products to focus the competitive analysis'
          : `${selectedProducts.length} product${selectedProducts.length !== 1 ? 's' : ''} selected`}
      </p>
    </div>
  );
}
