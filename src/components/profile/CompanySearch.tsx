import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Building, MapPin, Users, Loader2, X, Activity } from 'lucide-react';
import { searchCompanies, CompanySearchResult } from '@/lib/companySearch';

interface CompanySearchProps {
  onCompanySelect: (company: CompanySearchResult) => void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
}

export function CompanySearch({
  onCompanySelect,
  placeholder = 'Rechercher par nom, SIREN ou SIRET...',
  className = '',
  initialValue = '',
}: CompanySearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanySearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const handleSearch = async () => {
    if (!query || query.trim().length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const searchResults = await searchCompanies(query.trim(), 8);
      setResults(searchResults);
      setShowResults(true);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Erreur lors de la recherche. Veuillez reessayer.');
      setResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);

    if (selectedCompany) {
      setSelectedCompany(null);
    }

    setResults([]);
    setShowResults(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleCompanySelect = (company: CompanySearchResult) => {
    setSelectedCompany(company);
    setQuery(company.name);
    setShowResults(false);
    onCompanySelect(company);
  };

  const clearSelection = () => {
    setSelectedCompany(null);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

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
          {results.map((company) => (
            <div
              key={company.siren}
              className="p-3 hover:bg-emerald-50 cursor-pointer border-b last:border-b-0 transition-colors"
              onClick={() => handleCompanySelect(company)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Building className="h-4 w-4 text-blue-600 flex-shrink-0" />
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
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    SIREN: {company.siren}
                  </span>
                  {company.companyCategory && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
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
          ))}
        </div>
      )}

      {/* No Results Message */}
      {showResults && results.length === 0 && !isSearching && query.length >= 3 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-center">
          <Search className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-600">Aucune entreprise trouvee pour "{query}"</p>
          <p className="text-xs text-slate-500 mt-1">Essayez avec :</p>
          <ul className="text-xs text-slate-500 mt-1">
            <li>Le nom de l'entreprise</li>
            <li>Le numero SIREN (9 chiffres)</li>
            <li>Le numero SIRET (14 chiffres)</li>
          </ul>
        </div>
      )}

      {/* Selected Company Info */}
      {selectedCompany && (
        <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Building className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900">{selectedCompany.name}</p>
              <p className="text-sm text-slate-600">
                SIRET: {selectedCompany.siret} | {selectedCompany.city}
              </p>
              {selectedCompany.nafLabel && (
                <p className="text-sm text-slate-500">{selectedCompany.nafLabel}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanySearch;
