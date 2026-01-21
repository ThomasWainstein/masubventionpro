import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useProfile } from '@/contexts/ProfileContext';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { Building2, ArrowLeft, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MaSubventionProProfile } from '@/types';

export function ProfileEditPage() {
  const navigate = useNavigate();
  const { profile, loading, updateProfile, createProfile, hasProfile } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess] = useState(false);

  const handleSubmit = async (data: Partial<MaSubventionProProfile>) => {
    setIsSubmitting(true);
    try {
      if (hasProfile) {
        await updateProfile(data);
      } else {
        await createProfile(data);
      }
      // Navigate back to profile page after successful save
      navigate('/app/profile');
    } catch (error) {
      console.error('Error saving profile:', error);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Helmet>
        <title>Mon profil - MaSubventionPro</title>
      </Helmet>

      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/app')}
          className="mb-4 -ml-2 text-slate-600"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au tableau de bord
        </Button>

        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {hasProfile ? 'Modifier mon profil' : 'Creer mon profil'}
            </h1>
            <p className="text-slate-600">
              Informations sur votre entreprise pour des recommandations personnalisees
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="h-5 w-5" />
          Profil enregistre avec succes
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <ProfileForm
          initialData={profile || {}}
          onSubmit={handleSubmit}
          submitLabel={hasProfile ? 'Enregistrer les modifications' : 'Creer mon profil'}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
}

export default ProfileEditPage;
