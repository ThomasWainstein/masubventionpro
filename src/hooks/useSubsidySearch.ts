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
  application_url,
  source_url,
  is_active
`;

export interface SearchFilters {
  query: string;
  regions: string[];
  fundingTypes: string[];
  minAmount?: number;
  maxAmount?: number;
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
  });

  const buildQuery = useCallback((filters: SearchFilters, page: number) => {
    let query = supabase
      .from('subsidies')
      .select(SUBSIDY_COLUMNS, { count: 'exact' })
      .eq('is_active', true);

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

    // Amount filters
    if (filters.minAmount) {
      query = query.gte('amount_max', filters.minAmount);
    }
    if (filters.maxAmount) {
      query = query.lte('amount_min', filters.maxAmount);
    }

    // Order by deadline (soonest first), then by amount
    query = query
      .order('deadline', { ascending: true, nullsFirst: false })
      .order('amount_max', { ascending: false, nullsFirst: true });

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
