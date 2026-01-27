import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Subsidy } from '@/types';

// Essential columns only (optimized query)
const SUBSIDY_COLUMNS = `
  id,
  title,
  description,
  agency,
  region,
  deadline,
  amount_min,
  amount_max,
  funding_type,
  categories,
  primary_sector,
  keywords,
  application_url,
  source_url,
  is_active
`;

export interface SearchFilters {
  query: string;
  regions: string[];
  fundingTypes: string[];
  sectors: string[];
  minAmount?: number;
  maxAmount?: number;
  sortBy: 'deadline' | 'amount_desc' | 'amount_asc' | 'relevance';
  /** Filter by entity type eligibility (association, entreprise, etc.) */
  entityType?: 'association' | 'entreprise' | null;
}

interface UseSubsidySearchReturn {
  search: (filters: SearchFilters, page?: number) => Promise<void>;
  loadMore: () => Promise<void>;
  results: Subsidy[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  currentPage: number;
  filters: SearchFilters;
}

const PAGE_SIZE = 20;

export function useSubsidySearch(): UseSubsidySearchReturn {
  const [results, setResults] = useState<Subsidy[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({
    query: '',
    regions: [],
    fundingTypes: [],
    sectors: [],
    sortBy: 'deadline',
    entityType: null,
  });

  const buildQuery = useCallback((filters: SearchFilters, page: number) => {
    let query = supabase
      .from('subsidies')
      .select(SUBSIDY_COLUMNS, { count: 'exact' })
      .eq('is_active', true);

    // Filter out expired subsidies (deadline in the past)
    // Use ISO date format for comparison
    const today = new Date().toISOString().split('T')[0];
    query = query.or(`deadline.is.null,deadline.gte.${today}`);

    // Text search on title and description
    if (filters.query && filters.query.trim()) {
      const searchTerm = `%${filters.query.trim()}%`;
      // Search in title (handle both string and JSONB)
      query = query.or(`title.ilike.${searchTerm},title->>fr.ilike.${searchTerm},description.ilike.${searchTerm},description->>fr.ilike.${searchTerm},agency.ilike.${searchTerm}`);
    }

    // Region filter
    if (filters.regions.length > 0) {
      // Region is an array column, use overlap operator
      const regionConditions = filters.regions
        .map(r => `region.cs.{${r}}`)
        .join(',');
      query = query.or(regionConditions + ',region.cs.{National}');
    }

    // Funding type filter
    if (filters.fundingTypes.length > 0) {
      query = query.in('funding_type', filters.fundingTypes);
    }

    // Sector filter
    if (filters.sectors && filters.sectors.length > 0) {
      // Search in primary_sector or categories array
      const sectorConditions = filters.sectors
        .map(s => `primary_sector.ilike.%${s}%,categories.cs.{${s}}`)
        .join(',');
      query = query.or(sectorConditions);
    }

    // Amount filters
    if (filters.minAmount) {
      query = query.gte('amount_max', filters.minAmount);
    }
    if (filters.maxAmount) {
      query = query.lte('amount_min', filters.maxAmount);
    }

    // Entity type filter (association vs entreprise)
    // Uses text search on description field to find association-eligible subsidies
    if (filters.entityType === 'association') {
      // Search for association-related keywords in description
      query = query.or(
        'description.ilike.%association%,' +
        'description.ilike.%associatif%,' +
        'description.ilike.%loi 1901%,' +
        'description.ilike.%fondation%,' +
        'description.ilike.%coopérative%,' +
        'description.ilike.%économie sociale%,' +
        'title.ilike.%association%'
      );
    }

    // Sorting
    switch (filters.sortBy) {
      case 'amount_desc':
        query = query
          .order('amount_max', { ascending: false, nullsFirst: false })
          .order('deadline', { ascending: true, nullsFirst: false });
        break;
      case 'amount_asc':
        query = query
          .order('amount_min', { ascending: true, nullsFirst: false })
          .order('deadline', { ascending: true, nullsFirst: false });
        break;
      case 'relevance':
        // For relevance, we rely on the text search quality; order by deadline as secondary
        query = query
          .order('deadline', { ascending: true, nullsFirst: false });
        break;
      case 'deadline':
      default:
        query = query
          .order('deadline', { ascending: true, nullsFirst: false })
          .order('amount_max', { ascending: false, nullsFirst: true });
        break;
    }

    // Pagination
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    return query;
  }, []);

  const search = useCallback(async (filters: SearchFilters, page: number = 0) => {
    setLoading(true);
    setError(null);
    setCurrentFilters(filters);
    setCurrentPage(page);

    try {
      const query = buildQuery(filters, page);
      const { data, error: queryError, count } = await query;

      if (queryError) {
        throw queryError;
      }

      const subsidies = (data || []) as Subsidy[];
      const totalCount = count || 0;

      if (page === 0) {
        setResults(subsidies);
      } else {
        setResults(prev => [...prev, ...subsidies]);
      }

      setTotal(totalCount);
      setHasMore(subsidies.length === PAGE_SIZE && results.length + subsidies.length < totalCount);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Erreur lors de la recherche');
      if (page === 0) {
        setResults([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    await search(currentFilters, currentPage + 1);
  }, [loading, hasMore, currentFilters, currentPage, search]);

  return {
    search,
    loadMore,
    results,
    total,
    hasMore,
    loading,
    error,
    currentPage,
    filters: currentFilters,
  };
}

export default useSubsidySearch;
