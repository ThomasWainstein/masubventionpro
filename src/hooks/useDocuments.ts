import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { ProfileDocument } from '@/types';

interface UseDocumentsReturn {
  documents: ProfileDocument[];
  loading: boolean;
  uploading: boolean;
  error: string | null;
  uploadDocument: (file: File, category: ProfileDocument['category']) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useDocuments(): UseDocumentsReturn {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [documents, setDocuments] = useState<ProfileDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!user || !profile) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('masubventionpro_documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setDocuments(data || []);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err.message || 'Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = useCallback(
    async (file: File, category: ProfileDocument['category']) => {
      if (!user || !profile) throw new Error('Non authentifie');

      try {
        setUploading(true);
        setError(null);

        // Generate unique file path: user_id/timestamp_filename
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${user.id}/${timestamp}_${sanitizedFileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('masubventionpro-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Create database record
        const { data, error: insertError } = await supabase
          .from('masubventionpro_documents')
          .insert({
            user_id: user.id,
            profile_id: profile.id,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: filePath,
            category,
            processing_status: 'completed',
          })
          .select()
          .single();

        if (insertError) {
          // Clean up storage if database insert fails
          await supabase.storage
            .from('masubventionpro-documents')
            .remove([filePath]);
          throw insertError;
        }

        setDocuments((prev) => [data, ...prev]);
      } catch (err: any) {
        console.error('Error uploading document:', err);
        setError(err.message || 'Erreur lors du telechargement');
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [user, profile]
  );

  const deleteDocument = useCallback(
    async (documentId: string) => {
      if (!user) throw new Error('Non authentifie');

      try {
        setError(null);

        // Find the document to get storage path
        const doc = documents.find((d) => d.id === documentId);
        if (!doc) throw new Error('Document non trouve');

        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('masubventionpro-documents')
          .remove([doc.storage_path]);

        if (storageError) {
          console.warn('Storage delete warning:', storageError);
        }

        // Delete from database
        const { error: deleteError } = await supabase
          .from('masubventionpro_documents')
          .delete()
          .eq('id', documentId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      } catch (err: any) {
        console.error('Error deleting document:', err);
        setError(err.message || 'Erreur lors de la suppression');
        throw err;
      }
    },
    [user, documents]
  );

  return {
    documents,
    loading,
    uploading,
    error,
    uploadDocument,
    deleteDocument,
    refresh: fetchDocuments,
  };
}

export default useDocuments;
