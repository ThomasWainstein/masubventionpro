import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabase';
import { Subsidy, getSubsidyTitle, getSubsidyDescription } from '@/types';
import { useSavedSubsidies } from '@/hooks/useSavedSubsidies';
import { Button } from '@/components/ui/button';
import OrganizationLogo from '@/components/subsidy/OrganizationLogo';
import {
  ArrowLeft,
  Calendar,
  Euro,
  MapPin,
  Building2,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Loader2,
  AlertCircle,
  Globe,
  Clock,
  Tag,
  Download,
  AlertTriangle,
  Flag,
  Users,
  CheckCircle,
  Briefcase,
  FileText,
  Banknote,
  Phone,
  Mail,
  FileDown,
  Link as LinkIcon,
  Target,
  PiggyBank,
  FolderOpen,
} from 'lucide-react';
import { exportSubsidyToPDF } from '@/lib/pdfExport';
import {
  getEntityTypeBadges,
  hasContacts,
  hasProjectTypes,
  hasFundingAgencies,
  hasComplementaryForms,
  hasComplementarySources,
  hasAidObjective,
} from '@/lib/subsidyUtils';

export function SubsidyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [subsidy, setSubsidy] = useState<Subsidy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportingLink, setReportingLink] = useState(false);
  const [linkReported, setLinkReported] = useState(false);

  // Use the saved subsidies hook for database persistence
  const { isSaved: checkIsSaved, toggleSave, loading: savingLoading } = useSavedSubsidies();
  const isSaved = id ? checkIsSaved(id) : false;

  // Check if link is broken
  const isLinkBroken = subsidy?.link_status === 'invalid' || subsidy?.link_status === 'reported';

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

  // Handle save button click
  const handleToggleSave = async () => {
    if (!id) return;
    try {
      await toggleSave(id);
    } catch (err) {
      console.error('Error toggling save:', err);
    }
  };

  // Handle report broken link
  const handleReportBrokenLink = async () => {
    if (!id || reportingLink || linkReported) return;

    try {
      setReportingLink(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/validate-subsidy-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: true, subsidyId: id }),
      });

      if (response.ok) {
        setLinkReported(true);
      }
    } catch (err) {
      console.error('Error reporting broken link:', err);
    } finally {
      setReportingLink(false);
    }
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
          <h2 className="text-xl font-semibold text-red-800">Aide non trouvée</h2>
          <p className="text-red-700 mt-2">{error || 'Cette aide n\'existe pas ou a été supprimée.'}</p>
          <Link to="/app/search">
            <Button className="mt-4">Retour à la recherche</Button>
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
        Retour aux résultats
      </Button>

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h1>
              {subsidy.agency && (
                <div className="flex items-center gap-3 mt-3 text-slate-600">
                  <OrganizationLogo
                    organizationName={subsidy.agency}
                    logoUrl={subsidy.logo_url}
                    size="lg"
                  />
                  <span className="text-lg">{subsidy.agency}</span>
                </div>
              )}
              {/* Entity Type Eligibility Badges */}
              {(() => {
                const badges = getEntityTypeBadges(subsidy);
                if (badges.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {badges.map((badge, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${badge.colorClasses}`}
                      >
                        {badge.type === 'association' && <Users className="h-4 w-4" />}
                        {badge.type === 'entreprise' && <Building2 className="h-4 w-4" />}
                        {badge.label}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
            <Button
              variant="outline"
              onClick={handleToggleSave}
              disabled={savingLoading}
              className={isSaved ? 'text-blue-600 border-blue-600' : ''}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="mr-2 h-4 w-4" />
                  Sauvegardée
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
                    ? `Jusqu'à ${formatAmount(subsidy.amount_max)}`
                    : `À partir de ${formatAmount(subsidy.amount_min)}`}
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

        {/* Aid Objective */}
        {hasAidObjective(subsidy) && subsidy.aid_objet?.trim() !== description && (
          <div className="p-6 md:p-8 border-t border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Objectif de l'aide
            </h2>
            <p className="text-slate-600 whitespace-pre-wrap bg-blue-50 p-4 rounded-lg border border-blue-100">
              {subsidy.aid_objet!.trim()}
            </p>
          </div>
        )}

        {/* Eligibility Section */}
        {(subsidy.aid_conditions?.trim() || subsidy.aid_benef?.trim() || subsidy.decoded_profils?.length || subsidy.effectif?.trim() || subsidy.age_entreprise?.trim() || subsidy.jeunes || subsidy.femmes || subsidy.seniors || subsidy.handicapes) && (
          <div className="p-6 md:p-8 border-t border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Éligibilité
            </h2>
            <div className="space-y-4">
              {/* Eligibility conditions */}
              {subsidy.aid_conditions?.trim() && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    Conditions d'éligibilité
                  </h3>
                  <p className="text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
                    {subsidy.aid_conditions.trim()}
                  </p>
                </div>
              )}

              {/* Beneficiaries */}
              {subsidy.aid_benef?.trim() && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    Bénéficiaires
                  </h3>
                  <p className="text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
                    {subsidy.aid_benef.trim()}
                  </p>
                </div>
              )}

              {/* Beneficiary profiles */}
              {subsidy.decoded_profils && subsidy.decoded_profils.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Profils éligibles</h3>
                  <div className="flex flex-wrap gap-2">
                    {subsidy.decoded_profils.map((profil, i) => (
                      <span
                        key={i}
                        className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
                      >
                        {profil.label || profil.code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Company criteria */}
              {(subsidy.effectif?.trim() || subsidy.age_entreprise?.trim()) && (
                <div className="flex flex-wrap gap-4">
                  {subsidy.effectif?.trim() && (
                    <div className="bg-slate-50 px-4 py-2 rounded-lg">
                      <span className="text-sm text-slate-500">Effectif: </span>
                      <span className="font-medium text-slate-700">{subsidy.effectif.trim()}</span>
                    </div>
                  )}
                  {subsidy.age_entreprise?.trim() && (
                    <div className="bg-slate-50 px-4 py-2 rounded-lg">
                      <span className="text-sm text-slate-500">Âge entreprise: </span>
                      <span className="font-medium text-slate-700">{subsidy.age_entreprise.trim()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Target audiences */}
              {(subsidy.jeunes || subsidy.femmes || subsidy.seniors || subsidy.handicapes) && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Publics prioritaires</h3>
                  <div className="flex flex-wrap gap-2">
                    {subsidy.jeunes && (
                      <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm">
                        Jeunes
                      </span>
                    )}
                    {subsidy.femmes && (
                      <span className="bg-pink-50 text-pink-700 px-3 py-1 rounded-full text-sm">
                        Femmes
                      </span>
                    )}
                    {subsidy.seniors && (
                      <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm">
                        Seniors
                      </span>
                    )}
                    {subsidy.handicapes && (
                      <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm">
                        Personnes handicapées
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Project Types */}
              {hasProjectTypes(subsidy) && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                    <FolderOpen className="h-4 w-4 text-indigo-600" />
                    Types de projets éligibles
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {subsidy.decoded_projets!.map((projet, i) => (
                      <span
                        key={i}
                        className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm"
                      >
                        {projet.label || projet.code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Budget & Funding Section */}
        {(subsidy.aid_montant?.trim() || subsidy.decoded_natures?.length || subsidy.duree_projet?.trim()) && (
          <div className="p-6 md:p-8 border-t border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-600" />
              Financement
            </h2>
            <div className="space-y-4">
              {/* Detailed funding info */}
              {subsidy.aid_montant?.trim() && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Détails du financement</h3>
                  <p className="text-slate-600 whitespace-pre-wrap bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                    {subsidy.aid_montant.trim()}
                  </p>
                </div>
              )}

              {/* Funding types */}
              {subsidy.decoded_natures && subsidy.decoded_natures.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Types de financement</h3>
                  <div className="flex flex-wrap gap-2">
                    {subsidy.decoded_natures.map((nature, i) => (
                      <span
                        key={i}
                        className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm"
                      >
                        {nature.label || nature.code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Project duration */}
              {subsidy.duree_projet?.trim() && (
                <div className="bg-slate-50 px-4 py-2 rounded-lg inline-block">
                  <span className="text-sm text-slate-500">Durée du projet: </span>
                  <span className="font-medium text-slate-700">{subsidy.duree_projet.trim()}</span>
                </div>
              )}

              {/* Funding Agencies */}
              {hasFundingAgencies(subsidy) && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                    <PiggyBank className="h-4 w-4 text-emerald-600" />
                    Financeurs
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {subsidy.decoded_financeurs!.map((financeur, i) => (
                      <span
                        key={i}
                        className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm border border-emerald-200"
                      >
                        {financeur.label || financeur.code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Eligible Operations */}
        {subsidy.aid_operations_el?.trim() && (
          <div className="p-6 md:p-8 border-t border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-600" />
              Opérations éligibles
            </h2>
            <p className="text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
              {subsidy.aid_operations_el.trim()}
            </p>
          </div>
        )}

        {/* Validation Process */}
        {subsidy.aid_validation?.trim() && (
          <div className="p-6 md:p-8 border-t border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Processus de validation</h2>
            <p className="text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
              {subsidy.aid_validation.trim()}
            </p>
          </div>
        )}

        {/* Additional Info */}
        <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Informations complémentaires</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subsidy.start_date && (
              <div>
                <dt className="text-sm text-slate-500 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Date de début
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
                <dt className="text-sm text-slate-500">Catégories</dt>
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

        {/* Contacts Section */}
        {hasContacts(subsidy) && (
          <div className="p-6 md:p-8 border-t border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              Contacts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subsidy.contacts!.map((contact, index) => (
                <div
                  key={index}
                  className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                >
                  {contact.nom && (
                    <h3 className="font-medium text-slate-900 mb-2">{contact.nom}</h3>
                  )}
                  <div className="space-y-2">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <Mail className="h-4 w-4" />
                        {contact.email}
                      </a>
                    )}
                    {contact.telephone && (
                      <a
                        href={`tel:${contact.telephone}`}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <Phone className="h-4 w-4" />
                        {contact.telephone}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents & Formulaires */}
        {hasComplementaryForms(subsidy) && (
          <div className="p-6 md:p-8 border-t border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileDown className="h-5 w-5 text-emerald-600" />
              Documents et Formulaires
            </h2>
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
              <p className="text-slate-700 whitespace-pre-wrap">
                {subsidy.complements_formulaires!.trim()}
              </p>
            </div>
          </div>
        )}

        {/* Ressources Complementaires */}
        {hasComplementarySources(subsidy) && (
          <div className="p-6 md:p-8 border-t border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-blue-600" />
              Ressources complémentaires
            </h2>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-slate-700 whitespace-pre-wrap">
                {subsidy.complements_sources!.trim()}
              </p>
            </div>
          </div>
        )}

        {/* Broken Link Warning */}
        {isLinkBroken && (
          <div className="mx-6 md:mx-8 mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Lien potentiellement invalide</p>
              <p className="text-sm text-amber-700 mt-1">
                Ce lien a été signalé comme ne fonctionnant plus.
                Nous vous recommandons de vérifier directement sur le site officiel.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 md:p-8 border-t border-slate-100 flex flex-wrap gap-4">
          {subsidy.application_url && (
            <a
              href={subsidy.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-none"
            >
              <Button
                className={`w-full md:w-auto ${isLinkBroken ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
              >
                {isLinkBroken && <AlertTriangle className="mr-2 h-4 w-4" />}
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
          <Button
            variant="outline"
            onClick={() => exportSubsidyToPDF(subsidy)}
            className="flex-1 md:flex-none"
          >
            <Download className="mr-2 h-4 w-4" />
            Exporter PDF
          </Button>

          {/* Report broken link button */}
          {subsidy.application_url && !isLinkBroken && (
            <Button
              variant="ghost"
              onClick={handleReportBrokenLink}
              disabled={reportingLink || linkReported}
              className="text-slate-500 hover:text-amber-600"
            >
              <Flag className="mr-2 h-4 w-4" />
              {linkReported ? 'Signalé' : reportingLink ? 'Signalement...' : 'Signaler lien cassé'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubsidyDetailPage;
