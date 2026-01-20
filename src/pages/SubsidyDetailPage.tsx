import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabase';
import { Subsidy, getSubsidyTitle, getSubsidyDescription } from '@/types';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Calendar,
  Euro,
  MapPin,
  Building,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Loader2,
  AlertCircle,
  Globe,
  Clock,
  Tag,
} from 'lucide-react';

export function SubsidyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [subsidy, setSubsidy] = useState<Subsidy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchSubsidy = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('subsidies')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        setSubsidy(data);
      } catch (err: any) {
        console.error('Error fetching subsidy:', err);
        setError(err.message || 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    fetchSubsidy();
  }, [id]);

  const toggleSave = () => {
    setIsSaved(!isSaved);
    // TODO: Actually save to database
  };

  // Format amount
  const formatAmount = (amount: number | null) => {
    if (amount === null) return null;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !subsidy) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 -ml-2 text-slate-600"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800">Aide non trouvee</h2>
          <p className="text-red-700 mt-2">{error || 'Cette aide n\'existe pas ou a ete supprimee.'}</p>
          <Link to="/app/search">
            <Button className="mt-4">Retour a la recherche</Button>
          </Link>
        </div>
      </div>
    );
  }

  const title = getSubsidyTitle(subsidy);
  const description = getSubsidyDescription(subsidy);

  return (
    <div className="max-w-4xl mx-auto">
      <Helmet>
        <title>{title} - MaSubventionPro</title>
      </Helmet>

      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4 -ml-2 text-slate-600"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour aux resultats
      </Button>

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h1>
              {subsidy.agency && (
                <div className="flex items-center gap-2 mt-3 text-slate-600">
                  <Building className="h-5 w-5" />
                  <span className="text-lg">{subsidy.agency}</span>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              onClick={toggleSave}
              className={isSaved ? 'text-blue-600 border-blue-600' : ''}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="mr-2 h-4 w-4" />
                  Sauvegardee
                </>
              ) : (
                <>
                  <Bookmark className="mr-2 h-4 w-4" />
                  Sauvegarder
                </>
              )}
            </Button>
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap gap-3 mt-6">
            {/* Amount */}
            {(subsidy.amount_min || subsidy.amount_max) && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg">
                <Euro className="h-5 w-5" />
                <span className="font-semibold">
                  {subsidy.amount_min && subsidy.amount_max
                    ? `${formatAmount(subsidy.amount_min)} - ${formatAmount(subsidy.amount_max)}`
                    : subsidy.amount_max
                    ? `Jusqu'a ${formatAmount(subsidy.amount_max)}`
                    : `A partir de ${formatAmount(subsidy.amount_min)}`}
                </span>
              </div>
            )}

            {/* Deadline */}
            {subsidy.deadline && (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg">
                <Calendar className="h-5 w-5" />
                <span className="font-semibold">Date limite: {formatDate(subsidy.deadline)}</span>
              </div>
            )}

            {/* Region */}
            {subsidy.region && subsidy.region.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg">
                <MapPin className="h-5 w-5" />
                <span>{subsidy.region.join(', ')}</span>
              </div>
            )}

            {/* Funding Type */}
            {subsidy.funding_type && (
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">
                <Tag className="h-5 w-5" />
                <span>{subsidy.funding_type}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="p-6 md:p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Description</h2>
          {description ? (
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-700 whitespace-pre-wrap">{description}</p>
            </div>
          ) : (
            <p className="text-slate-500 italic">Aucune description disponible</p>
          )}
        </div>

        {/* Additional Info */}
        <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Informations complementaires</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subsidy.start_date && (
              <div>
                <dt className="text-sm text-slate-500 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Date de debut
                </dt>
                <dd className="text-slate-900 font-medium mt-1">{formatDate(subsidy.start_date)}</dd>
              </div>
            )}
            {subsidy.primary_sector && (
              <div>
                <dt className="text-sm text-slate-500">Secteur</dt>
                <dd className="text-slate-900 font-medium mt-1">{subsidy.primary_sector}</dd>
              </div>
            )}
            {subsidy.categories && subsidy.categories.length > 0 && (
              <div className="md:col-span-2">
                <dt className="text-sm text-slate-500">Categories</dt>
                <dd className="flex flex-wrap gap-2 mt-2">
                  {subsidy.categories.map((cat, i) => (
                    <span
                      key={i}
                      className="bg-white border border-slate-200 px-3 py-1 rounded-full text-sm text-slate-700"
                    >
                      {cat}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Actions */}
        <div className="p-6 md:p-8 border-t border-slate-100 flex flex-wrap gap-4">
          {subsidy.application_url && (
            <a
              href={subsidy.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-none"
            >
              <Button className="w-full md:w-auto">
                Postuler maintenant
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </a>
          )}
          {subsidy.source_url && (
            <a
              href={subsidy.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-none"
            >
              <Button variant="outline" className="w-full md:w-auto">
                <Globe className="mr-2 h-4 w-4" />
                Source officielle
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubsidyDetailPage;
