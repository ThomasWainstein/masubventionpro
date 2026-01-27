import { Button } from '@/components/ui/button';
import {
  CheckSquare,
  Square,
  FileText,
  Mail,
  X,
} from 'lucide-react';

interface SelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onExportPDF: () => void;
  onSendEmail: () => void;
  onCancel: () => void;
}

export function SelectionToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onExportPDF,
  onSendEmail,
  onCancel,
}: SelectionToolbarProps) {
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 px-4 py-3 flex items-center gap-4">
        {/* Selection count */}
        <div className="text-sm font-medium text-slate-700">
          <span className="text-blue-600">{selectedCount}</span> aide{selectedCount > 1 ? 's' : ''} selectionne{selectedCount > 1 ? 'es' : 'e'}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200" />

        {/* Select All / Deselect All */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="text-slate-600"
          >
            {allSelected ? (
              <>
                <Square className="h-4 w-4 mr-1" />
                Aucune
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4 mr-1" />
                Toutes
              </>
            )}
          </Button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPDF}
            disabled={selectedCount === 0}
          >
            <FileText className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button
            size="sm"
            onClick={onSendEmail}
            disabled={selectedCount === 0}
          >
            <Mail className="h-4 w-4 mr-1" />
            Email
          </Button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200" />

        {/* Cancel */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

export default SelectionToolbar;
