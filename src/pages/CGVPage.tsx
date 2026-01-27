import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ShoppingCart, RefreshCw, AlertTriangle, Scale, Clock, Mail, ArrowLeft, Euro } from 'lucide-react';

const CGVPage = () => {
  const lastUpdated = '2026-01-01';

  // Company information
  const company = {
    name: 'ECOEMIT SOLUTIONS',
    tradeName: 'MaSubventionPro',
    legalForm: 'SARL',
    siren: '987 787 918',
    address: '102 Quai Louis Bleriot, 75016 Paris, France',
    email: 'contact@masubventionpro.com',
    supportEmail: 'support@masubventionpro.com',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Conditions Générales de Vente - MaSubventionPro</title>
        <meta name="description" content="Conditions générales de vente de MaSubventionPro - Modalités de souscription et de paiement" />
        <link rel="canonical" href="https://masubventionpro.com/cgv" />
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
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Conditions Générales de Vente</h1>
          <p className="text-slate-500">Dernière mise à jour : {lastUpdated}</p>
        </div>

        {/* Introduction */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Scale className="h-5 w-5 text-blue-600" />
            Préambule
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles
            entre ECOEMIT SOLUTIONS et ses clients pour l'utilisation des services proposés sur la
            plateforme MaSubventionPro. Toute souscription à nos services implique l'acceptation sans
            réserve des présentes CGV.
          </p>
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-sm text-slate-700">
              <strong>Vendeur :</strong> {company.name} ({company.legalForm})
            </p>
            <p className="text-sm text-slate-700">
              <strong>SIREN :</strong> {company.siren}
            </p>
            <p className="text-sm text-slate-700">
              <strong>Adresse :</strong> {company.address}
            </p>
          </div>
        </div>

        {/* Services Description */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Services proposés
          </h2>
          <p className="text-slate-600 mb-4">
            MaSubventionPro est une plateforme d'information et de mise en relation qui utilise
            l'intelligence artificielle pour vous aider à découvrir les aides et subventions
            correspondant à votre profil d'entreprise. La plateforme propose :
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
            <li>Accès à une base de données de plus de 10 000 aides et subventions françaises et européennes</li>
            <li>Analyse de profil d'entreprise et mise en correspondance intelligente par IA</li>
            <li>Rapports PDF détaillés avec scores d'éligibilité personnalisés</li>
            <li>Assistant IA expert pour répondre à vos questions sur les aides</li>
            <li>Moteur de recherche avancé avec filtres (région, secteur, montant, type d'aide)</li>
            <li>Alertes mensuelles personnalisées sur les nouvelles opportunités</li>
          </ul>

          {/* Important disclaimer */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mt-4">
            <p className="text-amber-800 text-sm font-medium">
              <strong>Important :</strong> MaSubventionPro est un service d'information et de recherche.
              Nous ne déposons pas de dossiers de demande de subvention en votre nom et ne garantissons
              pas l'obtention des aides identifiées. L'éligibilité effective dépend des critères propres
              à chaque organisme financeur.
            </p>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Euro className="h-5 w-5 text-blue-600" />
            Tarifs
          </h2>

          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-slate-800">Formules d'abonnement</h3>

            <div className="grid gap-4">
              {/* Découverte */}
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-slate-900">Découverte</h4>
                    <p className="text-sm text-slate-600">Accès 30 jours - 1 simulation complète</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">49 €</p>
                    <p className="text-xs text-slate-500">HT</p>
                  </div>
                </div>
              </div>

              {/* Business */}
              <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-slate-900">Business</h4>
                    <p className="text-sm text-slate-600">Abonnement 12 mois - Accès illimité</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">189 €</p>
                    <p className="text-xs text-slate-500">HT / an</p>
                  </div>
                </div>
              </div>

              {/* Premium */}
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-slate-900">Premium Groupe</h4>
                    <p className="text-sm text-slate-600">Abonnement 12 mois - 5 sociétés incluses</p>
                    <p className="text-xs text-slate-500 mt-1">+99 € par pack de 5 sociétés supplémentaires</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">549 €</p>
                    <p className="text-xs text-slate-500">HT / an</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Devise</h3>
              <p className="text-slate-600">
                Tous les prix sont exprimés en euros (EUR) hors taxes (HT). La TVA française au taux
                en vigueur (20%) s'applique en sus.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Moyens de paiement</h3>
              <p className="text-slate-600">
                Le paiement s'effectue par carte bancaire (Visa, Mastercard) ou prélèvement SEPA
                via notre prestataire de paiement sécurisé Stripe. Stripe est certifié PCI-DSS
                niveau 1, le plus haut niveau de certification dans l'industrie des paiements.
              </p>
            </div>
          </div>
        </div>

        {/* Subscription Terms */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Abonnement
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Durée</h3>
              <p className="text-slate-600">
                L'offre Découverte est valable 30 jours à compter de la date de paiement.
                Les offres Business et Premium sont souscrites pour une durée de 12 mois.
                L'abonnement prend effet à la date de validation du paiement.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Renouvellement</h3>
              <p className="text-slate-600">
                Les abonnements Business et Premium sont reconduits tacitement pour une durée
                identique à la période initiale (12 mois), sauf résiliation par l'une des parties.
                Vous serez notifié par email 30 jours avant le renouvellement automatique.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Résiliation</h3>
              <p className="text-slate-600">
                Vous pouvez résilier votre abonnement à tout moment depuis les paramètres de
                votre compte ou en nous contactant par email. La résiliation prendra effet à
                la fin de la période d'abonnement en cours. Aucun remboursement au prorata ne
                sera effectué pour la période restante, sauf exercice du droit de rétractation.
              </p>
            </div>
          </div>
        </div>

        {/* Right of Withdrawal */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-blue-600" />
            Droit de rétractation
          </h2>
          <p className="text-slate-600 mb-4">
            Conformément à l'article L221-18 du Code de la consommation, vous disposez d'un droit
            de rétractation.
          </p>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
            <h3 className="font-semibold text-blue-800 mb-2">Délai de rétractation</h3>
            <p className="text-blue-700 text-sm">
              Vous disposez d'un délai de <strong>14 jours</strong> à compter de la souscription
              pour exercer votre droit de rétractation, sans avoir à justifier de motifs ni à
              payer de pénalités.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Comment exercer ce droit</h3>
              <p className="text-slate-600">
                Pour exercer votre droit de rétractation, vous devez nous notifier votre décision
                par email à <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline">{company.email}</a> ou
                par courrier à notre adresse postale, en indiquant clairement votre volonté de
                vous rétracter.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Remboursement</h3>
              <p className="text-slate-600">
                En cas de rétractation, nous vous rembourserons tous les paiements reçus dans un
                délai maximum de 14 jours à compter de la réception de votre demande, en utilisant
                le même moyen de paiement que celui utilisé pour la transaction initiale.
              </p>
            </div>
          </div>
        </div>

        {/* Liability */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-blue-600" />
            Responsabilité
          </h2>
          <p className="text-slate-600 mb-4">
            ECOEMIT SOLUTIONS s'engage à fournir un service de qualité. Toutefois, notre
            responsabilité est limitée dans les cas suivants :
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
            <li>Les informations sur les subventions sont fournies à titre indicatif et peuvent évoluer. Nous nous efforçons de maintenir les données à jour mais ne pouvons garantir leur exhaustivité.</li>
            <li>Nous ne garantissons pas une disponibilité ininterrompue du service. Des maintenances planifiées ou des incidents techniques peuvent survenir.</li>
            <li>Nous ne sommes pas responsables des décisions prises par les organismes financeurs (État, Régions, Communes, Europe, BPI France, etc.).</li>
            <li>L'obtention d'une subvention dépend de critères propres à chaque organisme et de la qualité de votre dossier de demande.</li>
            <li>Notre responsabilité totale est limitée au montant que vous avez payé pour nos services au cours des 12 derniers mois.</li>
          </ul>
        </div>

        {/* Governing Law */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Droit applicable et litiges</h2>
          <div className="space-y-4">
            <p className="text-slate-600">
              Les présentes CGV sont soumises au droit français. Tout litige relatif à leur
              interprétation ou à leur exécution relève de la compétence des tribunaux français.
            </p>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Règlement des litiges</h3>
              <p className="text-slate-600">
                En cas de litige, nous vous invitons à nous contacter préalablement pour tenter
                de trouver une solution amiable à l'adresse : {company.email}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Médiation</h3>
              <p className="text-slate-600">
                Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, vous
                pouvez recourir gratuitement au service de médiation de la consommation. Le
                médiateur "droit de la consommation" dont nous relevons est : CNPM - MÉDIATION -
                CONSOMMATION. En cas de litige, vous pouvez déposer votre réclamation sur le site :
                <a href="https://cnpm-mediation-consommation.eu" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                  https://cnpm-mediation-consommation.eu
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-blue-600" />
            Contact
          </h2>
          <p className="text-slate-600 mb-4">
            Pour toute question relative aux présentes CGV ou à votre abonnement, vous pouvez
            nous contacter :
          </p>
          <div className="space-y-2 text-sm">
            <p className="text-slate-700">
              <strong>Service commercial :</strong>{' '}
              <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline">
                {company.email}
              </a>
            </p>
            <p className="text-slate-700">
              <strong>Support client :</strong>{' '}
              <a href={`mailto:${company.supportEmail}`} className="text-blue-600 hover:underline">
                {company.supportEmail}
              </a>
            </p>
            <p className="text-slate-700">
              <strong>Adresse :</strong> {company.address}
            </p>
          </div>
        </div>

        {/* Related Links */}
        <div className="flex flex-wrap gap-4">
          <Link to="/mentions-legales" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Mentions légales
          </Link>
          <Link to="/cgu" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Conditions d'utilisation
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

export default CGVPage;
