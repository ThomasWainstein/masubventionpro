import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Building2, User, Server, Scale, Mail, ExternalLink, ArrowLeft } from 'lucide-react';

const MentionsLegalesPage = () => {
  const lastUpdated = '2026-01-01';

  // Company information - ECOEMIT SOLUTIONS (same entity as subvention360)
  const company = {
    name: 'ECOEMIT SOLUTIONS',
    tradeName: 'MaSubventionPro',
    legalForm: 'Société à responsabilité limitée (SARL)',
    siren: '987 787 918',
    siret: '987 787 918 00018',
    vatNumber: 'FR89987787918',
    rcs: 'Paris',
    capital: '2 000 €',
    address: '102 Quai Louis Bleriot, 75016 Paris, France',
    creationDate: '27 février 2024',
    manager: 'Thomas Wainstein',
    managerTitle: 'Gérant',
    email: 'contact@masubventionpro.com',
    dpoEmail: 'contact@masubventionpro.com',
    website: 'https://masubventionpro.com',
  };

  // Hosting provider information
  const hosting = {
    name: 'Vercel Inc.',
    address: '340 S Lemon Ave #4133, Walnut, CA 91789, USA',
    website: 'https://vercel.com',
  };

  // Database hosting
  const database = {
    name: 'Supabase Inc.',
    address: '970 Toa Payoh North, #07-04, Singapore 318992',
    website: 'https://supabase.com',
    note: 'Données hébergées en Union Européenne (région eu-central-1, Francfort, Allemagne). Certifié SOC 2 Type 2.',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Mentions Légales - MaSubventionPro</title>
        <meta name="description" content="Mentions légales de MaSubventionPro - Informations sur l'éditeur et l'hébergeur du site" />
        <link rel="canonical" href="https://masubventionpro.com/mentions-legales" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Mentions Légales</h1>
          <p className="text-slate-500">Dernière mise à jour : {lastUpdated}</p>
        </div>

        {/* Introduction */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Scale className="h-5 w-5 text-blue-600" />
            Informations légales
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Conformément aux dispositions des articles 6-III et 19 de la Loi n° 2004-575 du 21 juin 2004
            pour la Confiance dans l'économie numérique (LCEN), nous portons à la connaissance des
            utilisateurs et visiteurs du site les informations suivantes.
          </p>
        </div>

        {/* Company Information */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-blue-600" />
            Éditeur du site
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Raison sociale</p>
              <p className="font-semibold text-slate-900">{company.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Nom commercial</p>
              <p className="text-slate-700">{company.tradeName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Forme juridique</p>
              <p className="text-slate-700">{company.legalForm}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">SIREN</p>
              <p className="text-slate-700">{company.siren}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">SIRET</p>
              <p className="text-slate-700">{company.siret}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">N° TVA Intracommunautaire</p>
              <p className="text-slate-700">{company.vatNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Immatriculation RCS</p>
              <p className="text-slate-700">RCS {company.rcs}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Capital social</p>
              <p className="text-slate-700">{company.capital}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Date de création</p>
              <p className="text-slate-700">{company.creationDate}</p>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-200">
            <p className="text-sm font-medium text-slate-500">Siège social</p>
            <p className="text-slate-700">{company.address}</p>
          </div>
        </div>

        {/* Publication Director */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-blue-600" />
            Directeur de la publication
          </h2>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-slate-500">Nom</p>
              <p className="font-semibold text-slate-900">{company.manager}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Qualité</p>
              <p className="text-slate-700">{company.managerTitle}</p>
            </div>
          </div>
        </div>

        {/* Hosting Provider */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Server className="h-5 w-5 text-blue-600" />
            Hébergeur
          </h2>

          {/* Frontend hosting */}
          <div className="mb-6">
            <h3 className="font-medium text-slate-800 mb-2">Hébergement de l'application</h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-slate-500">Hébergeur</p>
                <p className="font-semibold text-slate-900">{hosting.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Adresse</p>
                <p className="text-slate-700">{hosting.address}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Site web</p>
                <a
                  href={hosting.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  {hosting.website}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Database hosting */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="font-medium text-slate-800 mb-2">Hébergement des données</h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-slate-500">Hébergeur</p>
                <p className="font-semibold text-slate-900">{database.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Adresse</p>
                <p className="text-slate-700">{database.address}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Localisation des données</p>
                <p className="text-slate-700">{database.note}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Site web</p>
                <a
                  href={database.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  {database.website}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-blue-600" />
            Contact
          </h2>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-slate-500">Email général</p>
              <a
                href={`mailto:${company.email}`}
                className="text-blue-600 hover:underline"
              >
                {company.email}
              </a>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Délégué à la Protection des Données (DPO)</p>
              <a
                href={`mailto:${company.dpoEmail}`}
                className="text-blue-600 hover:underline"
              >
                {company.dpoEmail}
              </a>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Site web</p>
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                {company.website}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Intellectual Property */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Propriété intellectuelle</h2>
          <p className="text-slate-600 leading-relaxed">
            L'ensemble de ce site relève de la législation française et internationale sur le droit
            d'auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés,
            y compris pour les documents téléchargeables et les représentations iconographiques et
            photographiques. La reproduction de tout ou partie de ce site sur un support électronique
            quel qu'il soit est formellement interdite sauf autorisation expresse du directeur de la
            publication.
          </p>
          <p className="text-slate-600 leading-relaxed mt-4">
            La base de données des aides publiques est fournie par subvention360, propriété d'ECOEMIT
            SOLUTIONS. Toute reproduction, extraction ou réutilisation non autorisée de cette base de
            données est interdite conformément aux articles L.341-1 et suivants du Code de la propriété
            intellectuelle.
          </p>
        </div>

        {/* Related Links */}
        <div className="flex flex-wrap gap-4">
          <Link to="/cgu" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Conditions d'utilisation
          </Link>
          <Link to="/cgv" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            CGV
          </Link>
          <Link to="/privacy" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Politique de confidentialité
          </Link>
          <Link to="/cookies" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Politique de cookies
          </Link>
          <Link to="/ai-transparency" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Transparence IA
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MentionsLegalesPage;
