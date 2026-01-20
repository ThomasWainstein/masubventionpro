import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  AlertCircle,
  File,
  FileImage,
} from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import { DOCUMENT_CATEGORIES, ProfileDocument } from '@/types';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) {
    return FileImage;
  }
  return FileText;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getCategoryLabel(category: string): string {
  const cat = DOCUMENT_CATEGORIES.find((c) => c.value === category);
  return cat ? cat.label : category;
}

export function DocumentUpload() {
  const { documents, loading, uploading, error, uploadDocument, deleteDocument } = useDocuments();
  const [selectedCategory, setSelectedCategory] = useState<ProfileDocument['category']>('other');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('Le fichier est trop volumineux (max 10 Mo)');
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Type de fichier non supporte. Formats acceptes: PDF, images, Word');
      return;
    }

    try {
      await uploadDocument(file, selectedCategory);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Etes-vous sur de vouloir supprimer ce document ?')) {
      return;
    }

    setDeletingId(documentId);
    try {
      await deleteDocument(documentId);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
        <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-blue-600" />
          Ajouter un document
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="category" className="text-sm font-medium">
              Categorie du document
            </Label>
            <Select
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value as ProfileDocument['category'])}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selectionnez une categorie" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Telechargement...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Choisir un fichier
              </>
            )}
          </Button>
          <span className="text-sm text-slate-500">
            PDF, images, Word (max 10 Mo)
          </span>
        </div>

        {(uploadError || error) && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {uploadError || error}
          </div>
        )}
      </div>

      {/* Documents List */}
      <div>
        <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
          <File className="h-5 w-5 text-slate-400" />
          Mes documents ({documents.length})
        </h3>

        {documents.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun document telecharge</p>
            <p className="text-sm text-slate-400 mt-1">
              Ajoutez des documents pour completer votre dossier
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const FileIcon = getFileIcon(doc.file_type);
              const isDeleting = deletingId === doc.id;

              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <FileIcon className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {doc.file_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {getCategoryLabel(doc.category)} • {formatFileSize(doc.file_size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                    disabled={isDeleting}
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentUpload;
