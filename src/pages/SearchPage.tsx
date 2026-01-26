import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSubsidySearch, SearchFilters } from '@/hooks/useSubsidySearch';
import { useSavedSubsidies } from '@/hooks/useSavedSubsidies';
import { SubsidyGridCard } from '@/components/search/SubsidyGridCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  X,
  Loader2,
  AlertCircle,
  MapPin,
  Building2,
  FileText,
  Euro,
  Clock,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react';
import { FRENCH_REGIONS, FUNDING_TYPES, BUSINESS_SECTORS } from '@/types';

// Amount presets for the filter
const AMOUNT_PRESETS = [
  { value: '', label: 'Tous les montants' },
  { value: '0-10000', label: "Jusqu'à 10 000 €" },
  { value: '10000-50000', label: '10 000 - 50 000 €' },
  { value: '50000-200000', label: '50 000 - 200 000 €' },
  { value: '200000-1000000', label: '200 000 - 1 000 000 €' },
  { value: '1000000+', label: 'Plus de 1 000 000 €' },
];

// Sort options
const SORT_OPTIONS = [
  { value: 'relevance', label: 'Par défaut' },
  { value: 'deadline', label: 'Date limite (proche)' },
  { value: 'amount_desc', label: 'Montant (décroissant)' },
  { value: 'amount_asc', label: 'Montant (croissant)' },
] as const;

// Deadline filter options
const DEADLINE_OPTIONS = [
  { value: '', label: 'Toutes les échéances' },
  { value: '7', label: 'Cette semaine' },
  { value: '30', label: 'Ce mois-ci' },
  { value: '90', label: 'Dans 3 mois' },
  { value: '180', label: 'Dans 6 mois' },
];

// Helper to parse amount preset
function parseAmountPreset(preset: string): { min?: number; max?: number } {
  if (!preset) return {};
  if (preset === '1000000+') return { min: 1000000 };
  const [min, max] = preset.split('-').map(Number);
  return { min, max };
}

// Format date for display
function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { search, loadMore, results, total, hasMore, loading, error } = useSubsidySearch();

  // Local filter state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedRegion, setSelectedRegion] = useState<string>(
    searchParams.get('region') || ''
  );
  const [selectedFundingType, setSelectedFundingType] = useState<string>(
    searchParams.get('type') || ''
  );
  const [selectedSector, setSelectedSector] = useState<string>(
    searchParams.get('sector') || ''
  );
  const [amountPreset, setAmountPreset] = useState(searchParams.get('amount') || '');
  const [deadlineFilter, setDeadlineFilter] = useState(searchParams.get('deadline') || '');
  const [sortBy, setSortBy] = useState<SearchFilters['sortBy']>(
    (searchParams.get('sort') as SearchFilters['sortBy']) || 'relevance'
  );

  // Saved subsidies - use the database hook
  const { isSaved, toggleSave } = useSavedSubsidies();

  // Perform search
  const performSearch = useCallback(() => {
    const { min: minAmount, max: maxAmount } = parseAmountPreset(amountPreset);
    const filters: SearchFilters = {
      query,
      regions: selectedRegion ? [selectedRegion] : [],
      fundingTypes: selectedFundingType ? [selectedFundingType] : [],
      sectors: selectedSector ? [selectedSector] : [],
      minAmount,
      maxAmount,
      sortBy,
    };
    search(filters);

    // Update URL params
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (selectedRegion) params.set('region', selectedRegion);
    if (selectedFundingType) params.set('type', selectedFundingType);
    if (selectedSector) params.set('sector', selectedSector);
    if (amountPreset) params.set('amount', amountPreset);
    if (deadlineFilter) params.set('deadline', deadlineFilter);
    if (sortBy !== 'relevance') params.set('sort', sortBy);
    setSearchParams(params, { replace: true });
  }, [query, selectedRegion, selectedFundingType, selectedSector, amountPreset, deadlineFilter, sortBy]);

  // Debounced search on filter changes
  useEffect(() => {
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [selectedRegion, selectedFundingType, selectedSector, amountPreset, deadlineFilter, sortBy]);

  // Initial search on mount
  useEffect(() => {
    performSearch();
  }, []);

  // Handle search button click
  const handleSearch = () => {
    performSearch();
  };

  // Handle Enter key in search input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedRegion('');
    setSelectedFundingType('');
    setSelectedSector('');
    setAmountPreset('');
    setDeadlineFilter('');
    setSortBy('relevance');
  };

  const hasActiveFilters =
    query || selectedRegion || selectedFundingType || selectedSector || amountPreset || deadlineFilter;

  // Build active filters list for display
  const activeFilters: { type: string; label: string; value: string; onRemove: () => void }[] = [];

  if (selectedRegion) {
    activeFilters.push({
      type: 'Région',
      label: selectedRegion,
      value: selectedRegion,
      onRemove: () => setSelectedRegion(''),
    });
  }
  if (selectedSector) {
    const sectorLabel = BUSINESS_SECTORS.find(s => s.value === selectedSector)?.label || selectedSector;
    activeFilters.push({
      type: 'Secteur',
      label: sectorLabel,
      value: selectedSector,
      onRemove: () => setSelectedSector(''),
    });
  }
  if (selectedFundingType) {
    const typeLabel = FUNDING_TYPES.find(t => t.value === selectedFundingType)?.label || selectedFundingType;
    activeFilters.push({
      type: 'Dispositif',
      label: typeLabel,
      value: selectedFundingType,
      onRemove: () => setSelectedFundingType(''),
    });
  }
  if (amountPreset) {
    const amountLabel = AMOUNT_PRESETS.find(a => a.value === amountPreset)?.label || amountPreset;
    activeFilters.push({
      type: 'Montant',
      label: amountLabel,
      value: amountPreset,
      onRemove: () => setAmountPreset(''),
    });
  }
  if (deadlineFilter) {
    const deadlineLabel = DEADLINE_OPTIONS.find(d => d.value === deadlineFilter)?.label || deadlineFilter;
    activeFilters.push({
      type: 'Échéance',
      label: deadlineLabel,
      value: deadlineFilter,
      onRemove: () => setDeadlineFilter(''),
    });
  }

  // Filter chip component
  const FilterChip = ({
    icon: Icon,
    label,
    value,
    options,
    onChange,
  }: {
    icon: React.ElementType;
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  }) => {
    const selectedLabel = options.find(o => o.value === value)?.label;
    const displayLabel = value ? selectedLabel : label;
    const isActive = !!value;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-colors ${
              isActive
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{displayLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => onChange(option.value)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                  value === option.value
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Rechercher des aides - MaSubventionPro</title>
      </Helmet>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Rechercher des opportunités de financement..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-12 h-12 text-base border-slate-200"
            />
          </div>
          <Button
            onClick={handleSearch}
            className="h-12 px-6 bg-blue-600 hover:bg-blue-700"
          >
            <Search className="h-4 w-4 mr-2" />
            Rechercher
          </Button>
        </div>
      </div>

      {/* Stats Line */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-slate-600">
          Actuellement{' '}
          <span className="font-semibold text-slate-900">
            {total.toLocaleString('fr-FR')}
          </span>{' '}
          subventions disponibles
        </p>
        <p className="text-slate-500">
          Mis à jour le {formatDate(new Date())}
        </p>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-3 flex-wrap">
        <FilterChip
          icon={MapPin}
          label="Région"
          value={selectedRegion}
          options={[
            { value: '', label: 'Toutes les régions' },
            ...FRENCH_REGIONS.map(r => ({ value: r, label: r })),
          ]}
          onChange={setSelectedRegion}
        />

        <FilterChip
          icon={Building2}
          label="Secteur"
          value={selectedSector}
          options={[
            { value: '', label: 'Tous les secteurs' },
            ...[...BUSINESS_SECTORS].sort((a, b) => a.label.localeCompare(b.label, 'fr')).map(s => ({ value: s.value, label: s.label })),
          ]}
          onChange={setSelectedSector}
        />

        <FilterChip
          icon={FileText}
          label="Dispositifs"
          value={selectedFundingType}
          options={[
            { value: '', label: 'Tous les types' },
            ...FUNDING_TYPES.map(t => ({ value: t.value, label: t.label })),
          ]}
          onChange={setSelectedFundingType}
        />

        <FilterChip
          icon={Euro}
          label="Montant"
          value={amountPreset}
          options={AMOUNT_PRESETS}
          onChange={setAmountPreset}
        />

        <FilterChip
          icon={Clock}
          label="Échéance"
          value={deadlineFilter}
          options={DEADLINE_OPTIONS}
          onChange={setDeadlineFilter}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Trier par:</span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SearchFilters['sortBy'])}>
            <SelectTrigger className="w-[180px] h-9 border-slate-200">
              <ArrowUpDown className="h-3.5 w-3.5 mr-2 opacity-50" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Tags */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500">Filtres actifs:</span>
          {activeFilters.map((filter, idx) => (
            <span
              key={`${filter.type}-${filter.value}-${idx}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-200"
            >
              <span className="text-blue-500 text-xs">{filter.type}:</span>
              <span className="font-medium">{filter.label}</span>
              <button
                onClick={filter.onRemove}
                className="ml-1 p-0.5 hover:bg-blue-100 rounded-full transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <button
            onClick={clearFilters}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 ml-2"
          >
            <X className="h-4 w-4" />
            Tout effacer
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Erreur de recherche</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {loading && results.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Aucune aide trouvée</h3>
          <p className="text-slate-600 mt-2 max-w-md mx-auto">
            Essayez de modifier vos critères de recherche ou d'élargir vos filtres
          </p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              Effacer les filtres
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* 4-Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((subsidy) => (
              <SubsidyGridCard
                key={subsidy.id}
                subsidy={subsidy}
                isSaved={isSaved(subsidy.id)}
                onToggleSave={toggleSave}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-6">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loading}
                className="min-w-[200px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  'Charger plus de résultats'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SearchPage;
