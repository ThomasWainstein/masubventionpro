import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { maskField, type MaskableFieldType } from '@/lib/dataMasking';

interface MaskedFieldProps {
  value: string | number | null | undefined;
  type: MaskableFieldType;
  showToggle?: boolean;
  defaultVisible?: boolean;
  className?: string;
  label?: string;
}

export function MaskedField({
  value,
  type,
  showToggle = true,
  defaultVisible = false,
  className = '',
  label,
}: MaskedFieldProps) {
  const [isVisible, setIsVisible] = useState(defaultVisible);

  if (value === null || value === undefined || value === '') {
    return (
      <span className={`text-slate-400 ${className}`}>
        Non renseigne
      </span>
    );
  }

  const displayValue = isVisible ? String(value) : maskField(value, type);

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {label && <span className="text-slate-500 text-sm">{label}</span>}
      <span className="font-mono">{displayValue}</span>
      {showToggle && (
        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title={isVisible ? 'Masquer' : 'Afficher'}
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      )}
    </span>
  );
}

export default MaskedField;
