import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { MaSubventionProProfile } from '@/types';

interface ProfileContextType {
  profile: MaSubventionProProfile | null;
  loading: boolean;
  error: string | null;
  hasProfile: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<MaSubventionProProfile>) => Promise<void>;
  createProfile: (data: Partial<MaSubventionProProfile>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<MaSubventionProProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('masubventionpro_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No profile found - this is expected for new users
          setProfile(null);
        } else {
          throw fetchError;
        }
      } else {
        setProfile(data);
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const createProfile = async (data: Partial<MaSubventionProProfile>) => {
    if (!user) throw new Error('Non authentifie');

    try {
      setError(null);

      const { data: newProfile, error: createError } = await supabase
        .from('masubventionpro_profiles')
        .insert({
          user_id: user.id,
          company_name: data.company_name || user.user_metadata?.company_name || 'Mon entreprise',
          sector: data.sector,
          sub_sector: data.sub_sector,
          region: data.region,
          department: data.department,
          employees: data.employees,
          annual_turnover: data.annual_turnover,
          year_created: data.year_created,
          legal_form: data.legal_form,
          certifications: data.certifications || [],
          project_types: data.project_types || [],
        })
        .select()
        .single();

      if (createError) throw createError;

      setProfile(newProfile);
    } catch (err: any) {
      console.error('Error creating profile:', err);
      setError(err.message || 'Erreur lors de la creation du profil');
      throw err;
    }
  };

  const updateProfile = async (data: Partial<MaSubventionProProfile>) => {
    if (!user || !profile) throw new Error('Pas de profil a mettre a jour');

    try {
      setError(null);

      const { data: updatedProfile, error: updateError } = await supabase
        .from('masubventionpro_profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfile(updatedProfile);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Erreur lors de la mise a jour du profil');
      throw err;
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        error,
        hasProfile: !!profile,
        refreshProfile,
        updateProfile,
        createProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
