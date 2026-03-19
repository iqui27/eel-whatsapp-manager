'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Camera, Check, Lock, Mail, Minus, Shield, User } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionActor {
  userId: string | null;
  name: string;
  email: string | null;
  role: 'admin' | 'coordenador' | 'cabo' | 'voluntario';
  regionScope: string | null;
  permissions: string[];
  enabled: boolean;
  source: 'user' | 'bootstrap';
  label: string;
}

interface SessionResponse {
  actor: SessionActor;
  permissions: string[];
  availablePermissions: string[];
  pageAccess: Record<string, boolean>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  coordenador: 'Coordenador',
  cabo: 'Cabo Eleitoral',
  voluntario: 'Voluntário',
};

const ROLE_CLASSES: Record<string, string> = {
  admin: 'bg-purple-500/10 text-purple-600 border-purple-200',
  coordenador: 'bg-blue-500/10 text-blue-600 border-blue-200',
  cabo: 'bg-green-500/10 text-green-600 border-green-200',
  voluntario: 'bg-muted text-muted-foreground border-border',
};

const PERMISSION_GROUPS = [
  { label: 'Dashboard', perms: ['dashboard.view'] },
  { label: 'CRM', perms: ['crm.view', 'crm.edit'] },
  { label: 'Campanhas', perms: ['campaigns.view', 'campaigns.manage'] },
  { label: 'Segmentação', perms: ['segmentation.view', 'segmentation.manage'] },
  { label: 'Conversas', perms: ['conversations.view', 'conversations.reply'] },
  { label: 'Compliance', perms: ['compliance.view', 'compliance.manage'] },
  { label: 'Relatórios', perms: ['reports.view', 'reports.export'] },
  { label: 'Operações', perms: ['operations.view', 'operations.manage'] },
  { label: 'Admin', perms: ['admin.manage'] },
];

const AVATAR_STORAGE_KEY = 'eel_user_avatar';

// ─── Avatar Component ─────────────────────────────────────────────────────────

function ProfileAvatar({
  name,
  avatarUrl,
  onPhotoUpload,
}: {
  name: string;
  avatarUrl: string | null;
  onPhotoUpload: (dataUrl: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = name
    ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 2 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onPhotoUpload(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative group">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="h-16 w-16 rounded-full object-cover border-2 border-border"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold border-2 border-border">
          {initials}
        </div>
      )}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
      >
        <Camera className="h-5 w-5 text-white" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.status === 401) { router.push('/login'); return; }
      if (res.ok) {
        const data: SessionResponse = await res.json();
        setSession(data);
        setDisplayName(data.actor.name);
        setEmail(data.actor.email ?? '');
      }
    } catch {
      toast.error('Erro ao carregar perfil');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => { void loadSession(); }, [loadSession]);

  // Load saved avatar from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (saved) setAvatarUrl(saved);
  }, []);

  const handleSaveProfile = async () => {
    if (!displayName.trim()) return;
    setIsSaving(true);
    try {
      const body: Record<string, string> = { name: displayName.trim() };
      if (email.trim() && email.trim() !== session?.actor.email) {
        body.email = email.trim();
      }

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success('Perfil atualizado');
        // Reload session to reflect changes
        void loadSession();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao atualizar perfil');
      }
    } catch {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = (dataUrl: string) => {
    setAvatarUrl(dataUrl);
    localStorage.setItem(AVATAR_STORAGE_KEY, dataUrl);
    toast.success('Foto atualizada');
  };

  const handleRemovePhoto = () => {
    setAvatarUrl(null);
    localStorage.removeItem(AVATAR_STORAGE_KEY);
    toast.success('Foto removida');
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 4) { toast.error('Senha deve ter mínimo 4 caracteres'); return; }
    if (newPassword !== confirmPassword) { toast.error('As senhas não coincidem'); return; }
    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        toast.success('Senha alterada com sucesso');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao alterar senha');
      }
    } catch {
      toast.error('Erro ao alterar senha');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const actor = session?.actor;
  const isBootstrap = actor?.source === 'bootstrap';
  const hasChanges = displayName !== actor?.name || (email && email !== (actor?.email ?? ''));

  if (isLoading) {
    return (
      <SidebarLayout currentPage="perfil" pageTitle="Meu Perfil">
        <div className="p-6 space-y-4">
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="h-64 animate-pulse rounded-xl bg-muted" />
            <div className="h-64 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout currentPage="perfil" pageTitle="Meu Perfil">
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie seus dados e credenciais de acesso</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Profile Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações</CardTitle>
              <CardDescription>Seus dados de acesso ao sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Avatar + role */}
              <div className="flex items-center gap-4">
                <ProfileAvatar
                  name={displayName || actor?.name || ''}
                  avatarUrl={avatarUrl}
                  onPhotoUpload={handlePhotoUpload}
                />
                <div className="space-y-1">
                  <Badge variant="outline" className={cn('text-xs', ROLE_CLASSES[actor?.role ?? 'voluntario'])}>
                    {ROLE_LABELS[actor?.role ?? 'voluntario']}
                  </Badge>
                  {actor?.regionScope && (
                    <p className="text-xs text-muted-foreground">{actor.regionScope}</p>
                  )}
                  {avatarUrl && (
                    <button
                      onClick={handleRemovePhoto}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Remover foto
                    </button>
                  )}
                </div>
              </div>

              {/* Name edit */}
              <div className="space-y-1.5">
                <Label htmlFor="display-name">
                  <User className="inline h-3.5 w-3.5 mr-1" />
                  Nome
                </Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Seu nome de exibição"
                />
              </div>

              {/* Email (editable) */}
              <div className="space-y-1.5">
                <Label htmlFor="profile-email">
                  <Mail className="inline h-3.5 w-3.5 mr-1" />
                  Email
                </Label>
                {isBootstrap ? (
                  <div className="flex h-10 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 mr-2 shrink-0" />
                    Sessão bootstrap (sem email)
                  </div>
                ) : (
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                )}
              </div>

              {/* Session indicator */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Sessão ativa
                {isBootstrap && <span className="text-xs">(bootstrap)</span>}
              </div>

              <Button
                size="sm"
                disabled={isSaving || !displayName.trim() || !hasChanges}
                onClick={() => void handleSaveProfile()}
              >
                {isSaving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </CardContent>
          </Card>

          {/* Right: Password + Permissions */}
          <div className="space-y-6">
            {/* Password Change */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alterar Senha</CardTitle>
                <CardDescription>Senha de acesso ao sistema (mínimo 4 caracteres)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="current-pw">Senha atual</Label>
                  <Input id="current-pw" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-pw">Nova senha</Label>
                  <Input id="new-pw" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pw">Confirmar nova senha</Label>
                  <Input id="confirm-pw" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
                <Button size="sm" disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword} onClick={() => void handleChangePassword()}>
                  {isChangingPassword ? 'Alterando...' : 'Alterar senha'}
                </Button>
              </CardContent>
            </Card>

            {/* Permissions Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Permissões
                </CardTitle>
                <CardDescription>Acesso concedido pelo seu papel + permissões extras</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {PERMISSION_GROUPS.map(group => {
                    const hasAny = group.perms.some(p => session?.permissions.includes(p));
                    return (
                      <div key={group.label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                        <span className="text-sm">{group.label}</span>
                        {hasAny ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Minus className="h-3.5 w-3.5 text-muted-foreground/40" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
