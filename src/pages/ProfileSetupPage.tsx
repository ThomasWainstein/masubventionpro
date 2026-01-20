import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { Building2 } from 'lucide-react';
import { MaSubventionProProfile } from '@/types';

export function ProfileSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createProfile } = useProfile();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: Partial<MaSubventionProProfile>) => {
    setIsLoading(true);
    try {
      await createProfile(data);
      navigate('/app');
    } catch (error) {
      console.error('Error creating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-fill with data from signup
  const initialData = {
    company_name: user?.user_metadata?.company_name || '',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8 px-4">
      <Helmet>
        <title>Configuration du profil - MaSubventionPro</title>
      </Helmet>

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Configurez votre profil entreprise
          </h1>
          <p className="text-slate-400">
            Ces informations nous permettront de vous proposer les aides les plus pertinentes
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <ProfileForm
            initialData={initialData}
            onSubmit={handleSubmit}
            submitLabel="Creer mon profil"
            isLoading={isLoading}
          />
        </div>

        {/* Skip option */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/app')}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            Passer cette etape et completer plus tard
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileSetupPage;
