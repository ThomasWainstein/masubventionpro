import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { MaSubventionProProfile } from '@/types';

const ACTIVE_PROFILE_KEY = 'msp_active_profile_id';

interface ProfileContextType {
  profile: MaSubventionProProfile | null;
  profiles: MaSubventionProProfile[];
  loading: boolean;
  error: string | null;
  hasProfile: boolean;
  activeProfileId: string | null;
  setActiveProfile: (profileId: string) => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<MaSubventionProProfile>) => Promise<void>;
  createProfile: (data: Partial<MaSubventionProProfile>) => Promise<MaSubventionProProfile>;
  deleteProfile: (profileId: string) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<MaSubventionProProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACTIVE_PROFILE_KEY);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derive active profile from profiles array
  const profile = profiles.find(p => p.id === activeProfileId) || profiles[0] || null;

  const fetchProfiles = async () => {
    if (!user) {
      setProfiles([]);
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
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setProfiles(data || []);

      // If we have profiles but no active one, set the first one
      if (data && data.length > 0 && !activeProfileId) {
        setActiveProfileId(data[0].id);
        localStorage.setItem(ACTIVE_PROFILE_KEY, data[0].id);
      }
      // If active profile doesn't exist in data, reset to first
      else if (data && data.length > 0 && activeProfileId && !data.find(p => p.id === activeProfileId)) {
        setActiveProfileId(data[0].id);
        localStorage.setItem(ACTIVE_PROFILE_KEY, data[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching profiles:', err);
      setError(err.message || 'Erreur lors du chargement des profils');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [user]);

  const setActiveProfile = useCallback((profileId: string) => {
    setActiveProfileId(profileId);
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  }, []);

  const refreshProfile = async () => {
    await fetchProfiles();
  };

  const createProfile = async (data: Partial<MaSubventionProProfile>): Promise<MaSubventionProProfile> => {
    if (!user) throw new Error('Non authentifié');

    try {
      setError(null);

      const { data: newProfile, error: createError } = await supabase
        .from('masubventionpro_profiles')
        .insert({
          user_id: user.id,
          company_name: data.company_name || user.user_metadata?.company_name || 'Mon entreprise',
          siret: data.siret,
          siren: data.siren,
          naf_code: data.naf_code,
          naf_label: data.naf_label,
          sector: data.sector,
          sub_sector: data.sub_sector,
          region: data.region,
          department: data.department,
          city: data.city,
          postal_code: data.postal_code,
          address: data.address,
          employees: data.employees,
          annual_turnover: data.annual_turnover,
          year_created: data.year_created,
          legal_form: data.legal_form,
          company_category: data.company_category,
          website_url: data.website_url,
          description: data.description,
          certifications: data.certifications || [],
          project_types: data.project_types || [],
          // New fields
          convention_collective: data.convention_collective,
          dirigeants: data.dirigeants,
          nombre_etablissements: data.nombre_etablissements,
          nombre_etablissements_ouverts: data.nombre_etablissements_ouverts,
          capital_social: data.capital_social,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add to profiles list and set as active
      setProfiles(prev => [...prev, newProfile]);
      setActiveProfileId(newProfile.id);
      localStorage.setItem(ACTIVE_PROFILE_KEY, newProfile.id);

      return newProfile;
    } catch (err: any) {
      console.error('Error creating profile:', err);
      setError(err.message || 'Erreur lors de la création du profil');
      throw err;
    }
  };

  const updateProfile = async (data: Partial<MaSubventionProProfile>) => {
    if (!user || !profile) throw new Error('Pas de profil à mettre à jour');

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

      // Update the profile in the profiles list
      setProfiles(prev => prev.map(p => p.id === profile.id ? updatedProfile : p));
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Erreur lors de la mise à jour du profil');
      throw err;
    }
  };

  const deleteProfile = async (profileId: string) => {
    if (!user) throw new Error('Non authentifié');

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('masubventionpro_profiles')
        .delete()
        .eq('id', profileId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Remove from profiles list
      const newProfiles = profiles.filter(p => p.id !== profileId);
      setProfiles(newProfiles);

      // If we deleted the active profile, switch to the first remaining one
      if (activeProfileId === profileId && newProfiles.length > 0) {
        setActiveProfileId(newProfiles[0].id);
        localStorage.setItem(ACTIVE_PROFILE_KEY, newProfiles[0].id);
      } else if (newProfiles.length === 0) {
        setActiveProfileId(null);
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
      }
    } catch (err: any) {
      console.error('Error deleting profile:', err);
      setError(err.message || 'Erreur lors de la suppression du profil');
      throw err;
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        profiles,
        loading,
        error,
        hasProfile: !!profile,
        activeProfileId,
        setActiveProfile,
        refreshProfile,
        updateProfile,
        createProfile,
        deleteProfile,
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
