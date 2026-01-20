import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSubsidySearch, SearchFilters } from '@/hooks/useSubsidySearch';
import { SubsidyCard } from '@/components/search/SubsidyCard';
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
  Search,
  X,
  Loader2,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { FRENCH_REGIONS, FUNDING_TYPES, BUSINESS_SECTORS } from '@/types';

// Amount presets for the filter
const AMOUNT_PRESETS = [
  { value: '', label: 'Tous les montants' },
  { value: '0-10000', label: "Jusqu'a 10 000 EUR" },
  { value: '10000-50000', label: '10 000 - 50 000 EUR' },
  { value: '50000-200000', label: '50 000 - 200 000 EUR' },
  { value: '200000-1000000', label: '200 000 - 1 000 000 EUR' },
  { value: '1000000+', label: 'Plus de 1 000 000 EUR' },
];

// Sort options
const SORT_OPTIONS = [
  { value: 'deadline', label: 'Date limite (proche)' },
  { value: 'amount_desc', label: 'Montant (decroissant)' },
  { value: 'amount_asc', label: 'Montant (croissant)' },
  { value: 'relevance', label: 'Pertinence' },
] as const;

// Helper to parse amount preset
function parseAmountPreset(preset: string): { min?: number; max?: number } {
  if (!preset) return {};
  if (preset === '1000000+') return { min: 1000000 };
  const [min, max] = preset.split('-').map(Number);
  return { min, max };
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { search, loadMore, results, total, hasMore, loading, error } = useSubsidySearch();

  // Local filter state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedRegions, setSelectedRegions] = useState<string[]>(
    searchParams.get('regions')?.split(',').filter(Boolean) || []
  );
  const [selectedFundingTypes, setSelectedFundingTypes] = useState<string[]>(
    searchParams.get('types')?.split(',').filter(Boolean) || []
  );
  const [selectedSectors, setSelectedSectors] = useState<string[]>(
    searchParams.get('sectors')?.split(',').filter(Boolean) || []
  );
  const [amountPreset, setAmountPreset] = useState(searchParams.get('amount') || '');
  const [sortBy, setSortBy] = useState<SearchFilters['sortBy']>(
    (searchParams.get('sort') as SearchFilters['sortBy']) || 'deadline'
  );
  const [showFilters, setShowFilters] = useState(false);

  // Saved subsidies (placeholder - will be implemented in SavedSubsidiesPage)
  const [savedSubsidies, setSavedSubsidies] = useState<Set<string>>(new Set());

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const { min: minAmount, max: maxAmount } = parseAmountPreset(amountPreset);
      const filters: SearchFilters = {
        query,
        regions: selectedRegions,
        fundingTypes: selectedFundingTypes,
        sectors: selectedSectors,
        minAmount,
        maxAmount,
        sortBy,
      };
      search(filters);

      // Update URL params
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (selectedRegions.length) params.set('regions', selectedRegions.join(','));
      if (selectedFundingTypes.length) params.set('types', selectedFundingTypes.join(','));
      if (selectedSectors.length) params.set('sectors', selectedSectors.join(','));
      if (amountPreset) params.set('amount', amountPreset);
      if (sortBy !== 'deadline') params.set('sort', sortBy);
      setSearchParams(params, { replace: true });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, selectedRegions, selectedFundingTypes, selectedSectors, amountPreset, sortBy]);

  // Initial search on mount
  useEffect(() => {
    const { min: minAmount, max: maxAmount } = parseAmountPreset(searchParams.get('amount') || '');
    const filters: SearchFilters = {
      query: searchParams.get('q') || '',
      regions: searchParams.get('regions')?.split(',').filter(Boolean) || [],
      fundingTypes: searchParams.get('types')?.split(',').filter(Boolean) || [],
      sectors: searchParams.get('sectors')?.split(',').filter(Boolean) || [],
      minAmount,
      maxAmount,
      sortBy: (searchParams.get('sort') as SearchFilters['sortBy']) || 'deadline',
    };
    search(filters);
  }, []);

  const handleToggleSave = useCallback((subsidyId: string) => {
    setSavedSubsidies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subsidyId)) {
        newSet.delete(subsidyId);
      } else {
        newSet.add(subsidyId);
      }
      return newSet;
    });
    // TODO: Actually save to database
  }, []);

  const clearFilters = () => {
    setQuery('');
    setSelectedRegions([]);
    setSelectedFundingTypes([]);
    setSelectedSectors([]);
    setAmountPreset('');
    setSortBy('deadline');
  };

  const activeFilterCount =
    (selectedRegions.length > 0 ? 1 : 0) +
    (selectedFundingTypes.length > 0 ? 1 : 0) +
    (selectedSectors.length > 0 ? 1 : 0) +
    (amountPreset ? 1 : 0);

  const hasActiveFilters = query || activeFilterCount > 0;

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Rechercher des aides - MaSubventionPro</title>
      </Helmet>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rechercher des aides</h1>
        <p className="text-slate-600 mt-1">
          Trouvez les subventions et financements adaptes a votre entreprise
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Rechercher par mot-cle..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="h-12 gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtres
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Region Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Region
              </label>
              <Select
                value={selectedRegions[0] || ''}
                onValueChange={(value) => setSelectedRegions(value ? [value] : [])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toutes les regions</SelectItem>
                  {FRENCH_REGIONS.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Funding Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type de financement
              </label>
              <Select
                value={selectedFundingTypes[0] || ''}
                onValueChange={(value) => setSelectedFundingTypes(value ? [value] : [])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les types</SelectItem>
                  {FUNDING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sector Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Secteur d'activite
              </label>
              <Select
                value={selectedSectors[0] || ''}
                onValueChange={(value) => setSelectedSectors(value ? [value] : [])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les secteurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les secteurs</SelectItem>
                  {BUSINESS_SECTORS.map((sector) => (
                    <SelectItem key={sector.value} value={sector.value}>
                      {sector.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Montant
              </label>
              <Select
                value={amountPreset}
                onValueChange={setAmountPreset}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les montants" />
                </SelectTrigger>
                <SelectContent>
                  {AMOUNT_PRESETS.map((preset) => (
                    <SelectItem key={preset.value || 'all'} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Trier par
              </label>
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as SearchFilters['sortBy'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Date limite" />
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

          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-600">
                <X className="h-4 w-4 mr-1" />
                Effacer les filtres
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {loading && results.length === 0 ? (
            'Recherche en cours...'
          ) : (
            <>
              <span className="font-semibold text-slate-900">{total}</span> aide
              {total !== 1 ? 's' : ''} trouvee{total !== 1 ? 's' : ''}
            </>
          )}
        </p>
      </div>

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

      {/* Results */}
      {loading && results.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Aucune aide trouvee</h3>
          <p className="text-slate-600 mt-2 max-w-md mx-auto">
            Essayez de modifier vos criteres de recherche ou d'elargir vos filtres
          </p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              Effacer les filtres
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((subsidy) => (
            <SubsidyCard
              key={subsidy.id}
              subsidy={subsidy}
              isSaved={savedSubsidies.has(subsidy.id)}
              onToggleSave={handleToggleSave}
            />
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-4">
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
                  'Charger plus de resultats'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchPage;
