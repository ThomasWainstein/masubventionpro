import React, { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Upload, Image as ImageIcon, X, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyLogoUploadModalProps {
  open: boolean;
  onClose: () => void;
  profileId: string;
  currentLogoUrl?: string | null;
  onLogoUpdated: (logoUrl: string | null) => void;
}

const CompanyLogoUploadModal: React.FC<CompanyLogoUploadModalProps> = ({
  open,
  onClose,
  profileId,
  currentLogoUrl,
  onLogoUpdated
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Update preview when modal opens or currentLogoUrl changes
  React.useEffect(() => {
    if (open) {
      setPreviewUrl(currentLogoUrl || null);
      setError(null);
    }
  }, [open, currentLogoUrl]);

  // File validation constants
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg'];

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Type de fichier non autorisé. Utilisez: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    if (file.size > MAX_SIZE) {
      return `Le fichier est trop volumineux. Taille maximale: 2MB`;
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Get current user ID for RLS policy compliance
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Vous devez être connecté pour télécharger un logo');
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${profileId}/logo-${Date.now()}.${fileExt}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-logos')
        .getPublicUrl(fileName);

      // Update profile with logo URL
      const { error: updateError } = await supabase
        .from('masubventionpro_profiles')
        .update({ logo_url: publicUrl })
        .eq('id', profileId);

      if (updateError) throw updateError;

      setPreviewUrl(publicUrl);
      onLogoUpdated(publicUrl);

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 500);

    } catch (err: any) {
      console.error('Error uploading logo:', err);
      setError(err.message || 'Erreur lors du téléchargement');
      setPreviewUrl(currentLogoUrl || null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, [profileId]);

  // Handle paste from clipboard
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          uploadFile(file);
          e.preventDefault();
        }
        break;
      }
    }
  }, [profileId]);

  // Setup paste listener
  React.useEffect(() => {
    if (!open) return;

    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const handlePasteEvent = (e: Event) => handlePaste(e as ClipboardEvent);

    dropZone.addEventListener('paste', handlePasteEvent);
    dropZone.setAttribute('tabindex', '0');
    // Auto-focus for paste support
    dropZone.focus();

    return () => {
      dropZone.removeEventListener('paste', handlePasteEvent);
    };
  }, [open, handlePaste]);

  const handleRemoveLogo = async () => {
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('masubventionpro_profiles')
        .update({ logo_url: null })
        .eq('id', profileId);

      if (updateError) throw updateError;

      setPreviewUrl(null);
      onLogoUpdated(null);
    } catch (err: any) {
      console.error('Error removing logo:', err);
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-blue-600" />
            Logo de l'Entreprise
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Drop zone */}
          <div
            ref={dropZoneRef}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
              dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {previewUrl ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Logo de l'entreprise"
                      className="max-h-32 max-w-full object-contain rounded"
                    />
                    {!uploading && (
                      <Button
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 bg-red-600 hover:bg-red-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveLogo();
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                {!uploading && (
                  <p className="text-sm text-slate-500">
                    Cliquez, glissez ou collez une image pour remplacer
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className={cn(
                    "rounded-full p-4",
                    dragActive ? "bg-blue-100" : "bg-slate-100"
                  )}>
                    <Upload className={cn(
                      "h-8 w-8",
                      dragActive ? "text-blue-600" : "text-slate-400"
                    )} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">
                    {dragActive
                      ? "Déposez l'image ici"
                      : "Télécharger le logo"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Cliquez, glissez-déposez ou collez (Ctrl+V)
                  </p>
                  <p className="text-xs text-slate-500">
                    PNG, JPG, SVG jusqu'à 2MB
                  </p>
                </div>
              </div>
            )}

            {uploading && (
              <div className="mt-4 space-y-2">
                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Téléchargement... {uploadProgress}%
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
          </div>

          {/* Format requirements */}
          <div className="text-xs text-slate-500 space-y-1">
            <p className="font-medium">Formats acceptés:</p>
            <p>PNG, JPG, WebP, SVG • Max 2 MB • Min 200x200px</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyLogoUploadModal;
