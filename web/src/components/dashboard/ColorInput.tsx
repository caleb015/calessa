'use client';

import InfoTooltip from './InfoTooltip';

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export default function ColorInput({
  label,
  tooltip,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  tooltip?: string;
  value: string;
  defaultValue: string;
  onChange: (value: string) => void;
}) {
  const swatch = HEX_COLOR.test(value) ? value : defaultValue;

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={swatch}
          onChange={e => onChange(e.target.value)}
          className="w-9 h-9 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0"
        />
        <input
          type="text"
          value={value}
          placeholder={defaultValue}
          onChange={e => onChange(e.target.value)}
          className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>
    </div>
  );
}
