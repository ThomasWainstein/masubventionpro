import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { FileText, Scale, Shield, Clock, CreditCard, ArrowLeft, Users, Ban, AlertCircle, Bot, Brain, UserCheck, MessageSquareWarning } from 'lucide-react';

const CGUPage = () => {
  const lastUpdated = '2026-01-01';

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Conditions Générales d'Utilisation - MaSubventionPro</title>
        <meta name="description" content="Conditions générales d'utilisation de MaSubventionPro - Règles d'utilisation du service" />
        <link rel="canonical" href="https://masubventionpro.com/cgu" />
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
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Conditions Générales d'Utilisation</h1>
          <p className="text-slate-500">Dernière mise à jour : {lastUpdated}</p>
        </div>

        {/* Introduction */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-blue-600" />
            Introduction
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation
            de la plateforme MaSubventionPro et de ses services. En accédant ou en utilisant notre
            plateforme, vous acceptez d'être lié par ces conditions. Si vous n'acceptez pas ces
            conditions, vous ne devez pas utiliser notre service.
          </p>
        </div>

        {/* Service Description */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Notre Service</h2>
          <p className="text-slate-600 mb-4">
            MaSubventionPro fournit des services de découverte et de mise en correspondance
            d'aides publiques pour les entreprises grâce à l'intelligence artificielle :
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
            <li>Accès à une base de données de plus de 10 000 aides et subventions françaises et européennes (Commune, Région, National, Europe)</li>
            <li>Analyse de profil d'entreprise et mise en correspondance intelligente par IA</li>
            <li>Génération de rapports PDF détaillés avec scores d'éligibilité</li>
            <li>Assistant IA expert pour répondre à vos questions sur les aides publiques</li>
            <li>Alertes personnalisées sur les nouvelles opportunités correspondant à votre profil</li>
          </ul>
        </div>

        {/* AI Transparency - EU AI Act Article 52 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Bot className="h-5 w-5 text-blue-600" />
            Transparence de l'Intelligence Artificielle
          </h2>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
            <p className="text-blue-800 text-sm">
              <strong>Conformité Règlement UE 2024/1689 (AI Act) :</strong> Cette section vous informe
              sur le fonctionnement, les limites et vos droits concernant notre système d'intelligence
              artificielle.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-purple-500" />
                Comment fonctionne notre IA
              </h3>
              <p className="text-sm text-slate-600 mb-2">
                Notre système utilise l'intelligence artificielle (Mistral AI, fournisseur français) pour :
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 ml-4">
                <li>Analyser votre profil d'entreprise (SIREN, secteur d'activité, région, effectifs, chiffre d'affaires)</li>
                <li>Comparer automatiquement avec les critères de plus de 10 000 dispositifs d'aide</li>
                <li>Générer des scores de correspondance et des probabilités de succès estimées</li>
                <li>Répondre à vos questions via l'assistant conversationnel</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
                <MessageSquareWarning className="h-4 w-4 text-amber-500" />
                Limites importantes de l'IA
              </h3>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <ul className="list-disc list-inside space-y-1 text-sm text-amber-800">
                  <li><strong>L'IA peut faire des erreurs</strong> dans l'évaluation de votre éligibilité</li>
                  <li>Les scores et probabilités sont <strong>indicatifs</strong> et ne garantissent pas l'éligibilité réelle</li>
                  <li>Les critères des aides publiques <strong>changent régulièrement</strong> et peuvent ne pas être à jour</li>
                  <li>L'IA <strong>ne remplace pas</strong> l'avis d'un conseiller expert ou de l'organisme financeur</li>
                  <li>Vous devez toujours <strong>vérifier les informations</strong> auprès des sources officielles</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
                <UserCheck className="h-4 w-4 text-green-500" />
                Vos droits et contrôle humain
              </h3>
              <p className="text-sm text-slate-600 mb-2">
                Conformément au Règlement européen sur l'IA, vous disposez des droits suivants :
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 ml-4">
                <li><strong>Droit à l'explication :</strong> Demander des explications sur une recommandation spécifique</li>
                <li><strong>Droit au contrôle humain :</strong> Demander une vérification par un expert humain</li>
                <li><strong>Droit de contestation :</strong> Signaler une recommandation incorrecte ou trompeuse</li>
                <li><strong>Droit de non-utilisation :</strong> Utiliser notre moteur de recherche manuel sans IA</li>
              </ul>
              <p className="text-sm text-slate-600 mt-2">
                Pour exercer ces droits, contactez-nous à{' '}
                <a href="mailto:support@masubventionpro.com" className="text-blue-600 hover:underline">
                  support@masubventionpro.com
                </a>
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Pour plus d'informations sur notre système d'IA, consultez notre{' '}
                <Link to="/ai-transparency" className="text-blue-600 hover:underline">
                  page dédiée à la transparence IA
                </Link>.
              </p>
            </div>
          </div>
        </div>

        {/* User Obligations */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-blue-600" />
            Obligations de l'utilisateur
          </h2>
          <p className="text-slate-600 mb-4">
            En utilisant MaSubventionPro, vous vous engagez à :
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
            <li>Fournir des informations exactes et complètes lors de l'inscription et de la création de votre profil entreprise</li>
            <li>Maintenir la confidentialité de vos identifiants de connexion et de votre mot de passe</li>
            <li>Nous informer immédiatement de toute utilisation non autorisée de votre compte</li>
            <li>Respecter toutes les lois et réglementations applicables en France et en Europe</li>
            <li>Utiliser le service de manière responsable et éthique</li>
            <li>Ne pas tenter de contourner les mesures de sécurité ou d'accès du service</li>
          </ul>
        </div>

        {/* Prohibited Uses */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Ban className="h-5 w-5 text-red-600" />
            Utilisations interdites
          </h2>
          <p className="text-slate-600 mb-4">
            Il est strictement interdit de :
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
            <li>Utiliser le service à des fins illégales ou frauduleuses</li>
            <li>Tenter d'extraire, de copier ou de redistribuer la base de données des aides</li>
            <li>Utiliser des robots, scrapers ou autres outils automatisés pour accéder au service</li>
            <li>Transmettre des virus, malwares ou autres codes malveillants</li>
            <li>Usurper l'identité d'une autre personne ou entreprise</li>
            <li>Revendre, sous-licencier ou commercialiser l'accès au service sans autorisation</li>
            <li>Utiliser le service pour constituer une base de données concurrente</li>
          </ul>
        </div>

        {/* Intellectual Property */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-blue-600" />
            Propriété intellectuelle
          </h2>
          <p className="text-slate-600 mb-4">
            Tout le contenu et la technologie de notre plateforme sont protégés par des droits
            de propriété intellectuelle.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Votre contenu</h3>
              <p className="text-sm text-slate-600">
                Vous conservez la propriété du contenu que vous téléchargez (documents, informations
                d'entreprise). En utilisant notre service, vous nous accordez une licence limitée
                pour utiliser ces données uniquement dans le but de vous fournir nos services.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Notre contenu</h3>
              <p className="text-sm text-slate-600">
                Tout le contenu de la plateforme, y compris les logiciels, la base de données des
                aides, les algorithmes d'IA, les rapports générés et la documentation, reste notre
                propriété exclusive ou celle de nos partenaires (subvention360). Toute reproduction,
                extraction ou réutilisation non autorisée est interdite.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Base de données</h3>
              <p className="text-sm text-slate-600">
                La base de données des aides publiques est protégée par le droit sui generis des
                bases de données (articles L.341-1 et suivants du Code de la propriété intellectuelle).
                Toute extraction substantielle est interdite.
              </p>
            </div>
          </div>
        </div>

        {/* Account & Subscription */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-blue-600" />
            Compte et abonnement
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Création de compte</h3>
              <p className="text-sm text-slate-600">
                Pour utiliser nos services, vous devez créer un compte avec une adresse email
                valide. Vous êtes responsable de la confidentialité de votre mot de passe et
                de toutes les activités effectuées sous votre compte.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Tarification</h3>
              <p className="text-sm text-slate-600">
                Les tarifs actuels sont disponibles sur notre page Tarifs et peuvent être mis
                à jour avec un préavis de 30 jours. Les modifications de tarifs ne s'appliquent
                pas aux abonnements en cours.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Paiements</h3>
              <p className="text-sm text-slate-600">
                Les paiements sont traités de manière sécurisée via Stripe. Pour les détails
                sur les remboursements et le droit de rétractation, veuillez consulter nos{' '}
                <Link to="/cgv" className="text-blue-600 hover:underline">Conditions Générales de Vente</Link>.
              </p>
            </div>
          </div>
        </div>

        {/* Limitation of Liability */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Limitation de responsabilité
          </h2>
          <p className="text-slate-600 mb-4">
            Notre responsabilité est limitée comme suit :
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
            <li>
              <strong>Pas de garantie d'obtention :</strong> Nous ne garantissons pas l'exactitude
              ou l'exhaustivité des informations sur les subventions. Vous êtes responsable de
              vérifier tous les détails et exigences auprès des organismes financeurs.
            </li>
            <li>
              <strong>Décisions tierces :</strong> Nous ne sommes pas responsables des décisions
              prises par les organismes financeurs (État, Régions, Communes, Europe, BPI France, etc.).
            </li>
            <li>
              <strong>Disponibilité :</strong> Nous nous efforçons de maintenir le service
              disponible 24h/24, mais nous ne garantissons pas une disponibilité ininterrompue.
            </li>
            <li>
              <strong>Limitation des dommages :</strong> Notre responsabilité totale est limitée
              au montant que vous avez payé pour nos services au cours des 12 derniers mois.
            </li>
          </ul>
        </div>

        {/* Termination */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-blue-600" />
            Résiliation
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Résiliation par vous</h3>
              <p className="text-sm text-slate-600">
                Vous pouvez résilier votre compte à tout moment en nous contactant ou en utilisant
                les paramètres de votre compte. La résiliation prend effet à la fin de la période
                d'abonnement en cours.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Résiliation par nous</h3>
              <p className="text-sm text-slate-600">
                Nous pouvons suspendre ou résilier votre compte en cas de violation des présentes
                conditions, d'utilisation frauduleuse, ou pour d'autres raisons commerciales
                légitimes avec un préavis de 30 jours (sauf en cas de violation grave).
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Effets de la résiliation</h3>
              <p className="text-sm text-slate-600">
                En cas de résiliation, votre accès au service sera désactivé. Vous pouvez demander
                l'export de vos données avant la fermeture de votre compte. Certaines données
                peuvent être conservées conformément à nos obligations légales.
              </p>
            </div>
          </div>
        </div>

        {/* Governing Law */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Scale className="h-5 w-5 text-blue-600" />
            Droit applicable
          </h2>
          <p className="text-slate-600">
            Les présentes conditions sont régies par le droit français. Tout litige relatif
            à leur interprétation ou à leur exécution relève de la compétence exclusive des
            tribunaux français. Conformément à la réglementation européenne, vous pouvez également
            recourir à la plateforme de règlement en ligne des litiges (RLL) de la Commission
            européenne à l'adresse :{' '}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              https://ec.europa.eu/consumers/odr
            </a>
          </p>
        </div>

        {/* Modifications */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Modifications des conditions</h2>
          <p className="text-slate-600">
            Nous nous réservons le droit de modifier les présentes conditions à tout moment.
            En cas de modification substantielle, nous vous en informerons par email au moins
            30 jours avant l'entrée en vigueur des nouvelles conditions. Votre utilisation
            continue du service après cette date vaudra acceptation des conditions modifiées.
          </p>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Contact</h2>
          <p className="text-slate-600 mb-4">
            Pour toute question concernant ces conditions d'utilisation, vous pouvez nous contacter :
          </p>
          <div className="space-y-2 text-sm">
            <p className="text-slate-700">
              <strong>Email :</strong>{' '}
              <a href="mailto:contact@masubventionpro.com" className="text-blue-600 hover:underline">
                contact@masubventionpro.com
              </a>
            </p>
            <p className="text-slate-700">
              <strong>Adresse :</strong> ECOEMIT SOLUTIONS, 102 Quai Louis Bleriot, 75016 Paris, France
            </p>
          </div>
        </div>

        {/* Related Links */}
        <div className="flex flex-wrap gap-4">
          <Link to="/mentions-legales" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Mentions légales
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

export default CGUPage;
