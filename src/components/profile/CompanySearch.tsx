import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Building, MapPin, Users, Loader2, X, Activity, Heart } from 'lucide-react';
import { searchCompanies, CompanySearchResult } from '@/lib/companySearch';
import { searchAssociations, getAssociationByRNA, isRNANumber, AssociationSearchResult } from '@/lib/associationSearch';

// Extended result type that can be either a company or association
export type SearchResult = CompanySearchResult | (AssociationSearchResult & { _isAssociation: true });

interface CompanySearchProps {
  onCompanySelect: (company: CompanySearchResult) => void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
  includeAssociations?: boolean;  // Enable association search
}

/**
 * Convert AssociationSearchResult to CompanySearchResult format
 * This allows associations to be used in the same flow as companies
 */
function associationToCompanyResult(assoc: AssociationSearchResult): CompanySearchResult {
  const base: CompanySearchResult = {
    siren: assoc.siren || assoc.rna,  // Use RNA as identifier if no SIREN
    siret: assoc.siret || assoc.rna,
    name: assoc.name,
    legalForm: 'ASSO',
    nafCode: '',
    nafLabel: assoc.purpose || '',
    sector: assoc.sector || '',
    address: assoc.address,
    postalCode: assoc.postalCode,
    city: assoc.city,
    region: assoc.region,
    department: assoc.department,
    employeeRange: assoc.employeeRange || '',
    creationDate: assoc.creationDate || '',
    isActive: assoc.isActive,
    companyCategory: assoc.isRUP ? 'Association RUP' : 'Association',
    conventionCollective: [],
    dirigeants: [],
    nombreEtablissements: 1,
    nombreEtablissementsOuverts: assoc.isActive ? 1 : 0,
  };

  // Add custom association fields (accessed via type assertion when needed)
  const result = base as CompanySearchResult & {
    _rnaNumber: string;
    _associationPurpose: string | null;
    _isRUP: boolean;
    _associationType: string | null;
  };
  (result as any)._rnaNumber = assoc.rna;
  (result as any)._associationPurpose = assoc.purpose;
  (result as any)._isRUP = assoc.isRUP;
  (result as any)._associationType = assoc.nature;
  return result;
}

export function CompanySearch({
  onCompanySelect,
  placeholder = 'Rechercher par nom, SIREN, SIRET ou numéro RNA...',
  className = '',
  initialValue = '',
  includeAssociations = true,
}: CompanySearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanySearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [_searchType, setSearchType] = useState<'company' | 'association' | 'both'>('both');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query || query.trim().length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setError(null);
    const trimmedQuery = query.trim();

    try {
      // Check if query is an RNA number
      if (isRNANumber(trimmedQuery)) {
        setSearchType('association');
        const assocResult = await getAssociationByRNA(trimmedQuery);
        if (assocResult) {
          setResults([associationToCompanyResult(assocResult)]);
        } else {
          setResults([]);
        }
        setShowResults(true);
        return;
      }

      // For regular queries, search both companies and associations in parallel
      if (includeAssociations) {
        setSearchType('both');
        const [companyResults, assocResults] = await Promise.all([
          searchCompanies(trimmedQuery, 6).catch(() => [] as CompanySearchResult[]),
          searchAssociations(trimmedQuery, 4).catch(() => [] as AssociationSearchResult[]),
        ]);

        // Convert associations and merge results
        const convertedAssocs = assocResults.map(associationToCompanyResult);

        // Interleave results: companies first, then associations
        const allResults = [...companyResults, ...convertedAssocs];
        setResults(allResults);
      } else {
        setSearchType('company');
        const searchResults = await searchCompanies(trimmedQuery, 8);
        setResults(searchResults);
      }
      setShowResults(true);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Erreur lors de la recherche. Veuillez réessayer.');
      setResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  }, [query, includeAssociations]);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedCompany(null);
    setResults([]);
    setShowResults(false);
    setError(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  const handleCompanySelect = useCallback((company: CompanySearchResult) => {
    setSelectedCompany(company);
    setQuery(company.name);
    setShowResults(false);
    onCompanySelect(company);
  }, [onCompanySelect]);

  const clearSelection = useCallback(() => {
    setSelectedCompany(null);
    setQuery('');
    setResults([]);
    setShowResults(false);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`pr-10 ${selectedCompany ? 'border-emerald-500 bg-emerald-50' : ''}`}
          />

          {selectedCompany && (
            <button
              type="button"
              onClick={clearSelection}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-red-100 rounded"
            >
              <X className="h-4 w-4 text-slate-400 hover:text-red-600" />
            </button>
          )}
        </div>

        <Button
          type="button"
          onClick={handleSearch}
          disabled={!query.trim() || isSearching}
          className="gap-2"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Rechercher
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
          {results.map((company) => {
            // Check if this is an association (has RNA number)
            // @ts-expect-error - custom field for associations
            const isAssociation = company.legalForm === 'ASSO' || company._rnaNumber;
            // @ts-expect-error - custom field for associations
            const rnaNumber = company._rnaNumber as string | undefined;

            return (
              <div
                key={rnaNumber || company.siren}
                className={`p-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                  isAssociation ? 'hover:bg-purple-50' : 'hover:bg-emerald-50'
                }`}
                onClick={() => handleCompanySelect(company)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isAssociation ? (
                        <Heart className="h-4 w-4 text-purple-600 flex-shrink-0" />
                      ) : (
                        <Building className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      )}
                      <h4 className="font-medium text-sm text-slate-900 truncate">
                        {company.name}
                      </h4>
                    </div>

                    <div className="space-y-1 text-xs text-slate-500">
                      {company.address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">
                            {company.address}, {company.postalCode} {company.city}
                          </span>
                        </div>
                      )}

                      {company.nafLabel && (
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          <span className="truncate">{company.nafLabel}</span>
                        </div>
                      )}

                      {company.employeeRange && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{company.employeeRange}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {rnaNumber ? (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        RNA: {rnaNumber}
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        SIREN: {company.siren}
                      </span>
                    )}
                    {company.companyCategory && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        isAssociation ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {company.companyCategory}
                      </span>
                    )}
                    {company.isActive && (
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No Results Message */}
      {showResults && results.length === 0 && !isSearching && query.length >= 3 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-center">
          <Search className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-600">Aucun résultat trouvé pour "{query}"</p>
          <p className="text-xs text-slate-500 mt-1">Essayez avec :</p>
          <ul className="text-xs text-slate-500 mt-1">
            <li>Le nom de l'entreprise ou association</li>
            <li>Le numéro SIREN (9 chiffres)</li>
            <li>Le numéro SIRET (14 chiffres)</li>
            {includeAssociations && <li>Le numéro RNA (W + 9 chiffres)</li>}
          </ul>
        </div>
      )}

      {/* Selected Company/Association Info */}
      {selectedCompany && (() => {
        // @ts-expect-error - custom field for associations
        const isAssociation = selectedCompany.legalForm === 'ASSO' || selectedCompany._rnaNumber;
        // @ts-expect-error - custom field for associations
        const rnaNumber = selectedCompany._rnaNumber as string | undefined;

        return (
          <div className={`mt-2 p-3 border rounded-lg ${
            isAssociation ? 'bg-purple-50 border-purple-200' : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div className="flex items-start gap-3">
              {isAssociation ? (
                <Heart className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Building className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">{selectedCompany.name}</p>
                <p className="text-sm text-slate-600">
                  {rnaNumber ? `RNA: ${rnaNumber}` : `SIRET: ${selectedCompany.siret}`} | {selectedCompany.city}
                </p>
                {selectedCompany.nafLabel && (
                  <p className="text-sm text-slate-500">{selectedCompany.nafLabel}</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default CompanySearch;
