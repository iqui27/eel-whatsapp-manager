'use client';

import { useState, useRef } from 'react';
import { Camera, Pencil, Check, X, Loader2, Link as LinkIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChipProfileEditorProps {
  chip: {
    id: string;
    instanceName: string | null;
    profileName?: string | null;
    profilePictureUrl?: string | null;
    profileStatus?: string | null;
  };
  onSave?: () => void;
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined, fallback: string): string {
  const src = name ?? fallback;
  return src
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function ProfileAvatar({
  pictureUrl,
  name,
  fallback,
  size = 64,
}: {
  pictureUrl?: string | null;
  name?: string | null;
  fallback: string;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(name, fallback);

  if (pictureUrl && !imgError) {
    return (
      <img
        src={pictureUrl}
        alt={name ?? fallback}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold select-none"
      style={{ width: size, height: size, fontSize: size * 0.3 }}
    >
      {initials}
    </div>
  );
}

// ─── Photo change dialog ───────────────────────────────────────────────────────

function PhotoDialog({
  open,
  onClose,
  onSave,
  currentUrl,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (urlOrBase64: string) => Promise<void>;
  currentUrl?: string | null;
}) {
  const [urlInput, setUrlInput] = useState(currentUrl ?? '');
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUrlChange = (val: string) => {
    setUrlInput(val);
    setPreview(val.trim() || null);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPreview(result);
      setUrlInput(result); // base64 string
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const val = urlInput.trim();
    if (!val) {
      toast.error('Informe um URL ou selecione um arquivo');
      return;
    }
    setSaving(true);
    try {
      await onSave(val);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Alterar foto de perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          {preview && (
            <div className="flex justify-center">
              <img
                src={preview}
                alt="Preview"
                className="h-24 w-24 rounded-full object-cover border border-border"
                onError={() => setPreview(null)}
              />
            </div>
          )}

          {/* URL input */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5" />
              URL da imagem
            </Label>
            <Input
              type="url"
              placeholder="https://exemplo.com/foto.jpg"
              value={urlInput.startsWith('data:') ? '' : urlInput}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
          </div>

          {/* File upload */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Ou enviar arquivo
            </Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileRef.current?.click()}
            >
              Selecionar arquivo
            </Button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChipProfileEditor({ chip, onSave }: ChipProfileEditorProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(chip.profileName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);

  // Local optimistic state for profile picture
  const [localPictureUrl, setLocalPictureUrl] = useState(chip.profilePictureUrl ?? null);
  const [localName, setLocalName] = useState(chip.profileName ?? null);

  const displayName = localName ?? chip.instanceName ?? 'Chip';

  const callUpdateProfile = async (updates: {
    profileName?: string;
    profilePictureUrl?: string;
  }) => {
    const res = await fetch('/api/chips', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: chip.id,
        action: 'updateProfile',
        ...updates,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? 'Erro ao atualizar perfil');
    }
    return res.json();
  };

  // ─── Name editing ───────────────────────────────────────────────────────────

  const handleNameSave = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setEditingName(false);
      setNameInput(localName ?? '');
      return;
    }
    setSavingName(true);
    try {
      await callUpdateProfile({ profileName: trimmed });
      setLocalName(trimmed);
      toast.success('Perfil atualizado');
      setEditingName(false);
      onSave?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar perfil');
    } finally {
      setSavingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void handleNameSave();
    if (e.key === 'Escape') {
      setEditingName(false);
      setNameInput(localName ?? '');
    }
  };

  // ─── Photo saving ───────────────────────────────────────────────────────────

  const handlePhotoSave = async (urlOrBase64: string) => {
    await callUpdateProfile({ profilePictureUrl: urlOrBase64 });
    // For base64 we store the string locally for immediate preview
    setLocalPictureUrl(urlOrBase64.startsWith('data:') ? urlOrBase64 : urlOrBase64);
    toast.success('Perfil atualizado');
    onSave?.();
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const hasProfile = !!(localName ?? chip.profileName);

  return (
    <>
      <div className="rounded-xl border border-[#E8E4DD] bg-[#F8F6F1] p-4 space-y-3">
        {/* Section label + unconfigured hint */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Perfil WhatsApp
          </span>
          {!hasProfile && (
            <span className="text-[10px] text-amber-600 font-medium">
              Perfil nao configurado
            </span>
          )}
        </div>

        {/* Avatar + name row */}
        <div className="flex items-center gap-3">
          {/* Avatar with camera overlay */}
          <div className="relative group/avatar shrink-0">
            <ProfileAvatar
              pictureUrl={localPictureUrl}
              name={localName}
              fallback={chip.instanceName ?? 'Chip'}
              size={64}
            />
            <button
              onClick={() => setShowPhotoDialog(true)}
              title="Alterar foto"
              className={cn(
                'absolute inset-0 rounded-full flex items-center justify-center',
                'bg-black/0 group-hover/avatar:bg-black/40 transition-colors',
              )}
            >
              <Camera className="h-5 w-5 text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
            </button>
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={nameInput}
                  maxLength={25}
                  autoFocus
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  onBlur={() => void handleNameSave()}
                  disabled={savingName}
                  className="flex-1 h-8 rounded-md border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                  placeholder="Nome do perfil"
                />
                <button
                  onMouseDown={(e) => { e.preventDefault(); void handleNameSave(); }}
                  disabled={savingName}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent disabled:opacity-40"
                >
                  {savingName
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Check className="h-3.5 w-3.5" />
                  }
                </button>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setEditingName(false);
                    setNameInput(localName ?? '');
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="group/name flex items-center gap-1.5">
                <p className="font-semibold text-sm text-foreground truncate">
                  {displayName}
                </p>
                <button
                  onClick={() => {
                    setNameInput(localName ?? '');
                    setEditingName(true);
                  }}
                  title="Editar nome"
                  className="opacity-0 group-hover/name:opacity-100 flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {nameInput.length > 0 && editingName
                ? `${nameInput.length}/25 caracteres`
                : 'Clique no nome ou na foto para editar'
              }
            </p>
          </div>
        </div>

        {/* Status text (read-only) */}
        {chip.profileStatus && (
          <p className="text-xs text-muted-foreground italic border-t border-[#E8E4DD] pt-2">
            Status: {chip.profileStatus}
          </p>
        )}

        {/* Photo action button */}
        <button
          onClick={() => setShowPhotoDialog(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Camera className="h-3.5 w-3.5" />
          Alterar foto de perfil
        </button>
      </div>

      <PhotoDialog
        open={showPhotoDialog}
        onClose={() => setShowPhotoDialog(false)}
        onSave={handlePhotoSave}
        currentUrl={localPictureUrl}
      />
    </>
  );
}
