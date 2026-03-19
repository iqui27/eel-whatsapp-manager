'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserPlus, Check, X, Pencil, KeyRound, Mail, MailCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/db-users';
import { PERMISSIONS as AVAILABLE_PERMISSIONS, resolvePermissions, type AppRole, type Permission } from '@/lib/authorization';

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
  cabo: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  voluntario: 'bg-green-500/10 text-green-600 border-green-200',
};

const MODULE_POLICIES: Array<{
  label: string;
  view: Permission;
  manage?: Permission;
}> = [
  { label: 'Dashboard', view: 'dashboard.view' },
  { label: 'CRM', view: 'crm.view', manage: 'crm.edit' },
  { label: 'Campanhas', view: 'campaigns.view', manage: 'campaigns.manage' },
  { label: 'Conversas', view: 'conversations.view', manage: 'conversations.reply' },
  { label: 'Compliance', view: 'compliance.view', manage: 'compliance.manage' },
  { label: 'Relatórios', view: 'reports.view', manage: 'reports.export' },
  { label: 'Operacional', view: 'operations.view', manage: 'operations.manage' },
  { label: 'Configurações', view: 'settings.view', manage: 'settings.manage' },
  { label: 'Admin', view: 'admin.manage' },
];

function getModuleLevel(role: AppRole, policy: typeof MODULE_POLICIES[number]) {
  const rolePermissions = resolvePermissions(role, []);
  if (policy.manage && rolePermissions.includes(policy.manage)) return 'Gerir';
  if (rolePermissions.includes(policy.view)) return 'Visualizar';
  return 'Bloqueado';
}

// ─── Invite form state ────────────────────────────────────────────────────────

interface InviteForm {
  name: string;
  email: string;
  role: string;
  regionScope: string;
}

const EMPTY_FORM: InviteForm = { name: '', email: '', role: 'voluntario', regionScope: '' };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState<InviteForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null); // userId being edited
  const [confirmRemove, setConfirmRemove] = useState<User | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<User | null>(null);
  const [permissionsDraft, setPermissionsDraft] = useState<string[]>([]);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [resendingInvite, setResendingInvite] = useState<string | null>(null); // userId

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Invite / create user
  const handleInvite = useCallback(async () => {
    if (!form.name || !form.email) return;
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Convite enviado');
        const newUser = await res.json();
        setUsers(prev => [newUser, ...prev]);
        setForm(EMPTY_FORM);
        setInviteOpen(false);
      } else {
        toast.error('Erro ao enviar convite');
      }
    } catch {
      toast.error('Erro ao enviar convite');
    } finally {
      setSaving(false);
    }
  }, [form]);

  // Update role inline
  const updateRole = useCallback(async (userId: string, role: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role }),
      });
      if (res.ok) {
        toast.success('Funcao atualizada');
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: role as User['role'] } : u));
      } else {
        toast.error('Erro ao atualizar funcao');
      }
    } catch {
      toast.error('Erro ao atualizar funcao');
    }
    setEditingRole(null);
  }, []);

  // Toggle enabled/disabled
  const toggleEnabled = useCallback(async (user: User) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, enabled: !user.enabled }),
      });
      if (res.ok) {
        toast.success('Status do usuario atualizado');
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, enabled: !u.enabled } : u));
      } else {
        toast.error('Erro ao atualizar status');
      }
    } catch {
      toast.error('Erro ao atualizar status');
    }
  }, []);

  // Remove user
  const removeUser = useCallback(async (user: User) => {
    try {
      const res = await fetch(`/api/users?id=${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Usuario removido');
        setUsers(prev => prev.filter(u => u.id !== user.id));
      } else {
        toast.error('Erro ao remover usuario');
      }
    } catch {
      toast.error('Erro ao remover usuario');
    }
    setConfirmRemove(null);
  }, []);

  const openPermissionsDialog = useCallback((user: User) => {
    setPermissionsUser(user);
    setPermissionsDraft(user.permissions ?? []);
  }, []);

  const togglePermission = useCallback((permission: string) => {
    setPermissionsDraft((prev) => (
      prev.includes(permission)
        ? prev.filter((item) => item !== permission)
        : [...prev, permission]
    ));
  }, []);

  const savePermissions = useCallback(async () => {
    if (!permissionsUser) return;

    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: permissionsUser.id, permissions: permissionsDraft }),
      });
      if (res.ok) {
        toast.success('Permissoes salvas');
        setUsers((prev) => prev.map((user) => (
          user.id === permissionsUser.id
            ? { ...user, permissions: permissionsDraft }
            : user
        )));
        setPermissionsUser(null);
      } else {
        toast.error('Erro ao salvar permissoes');
      }
    } catch {
      toast.error('Erro ao salvar permissoes');
    } finally {
      setSaving(false);
    }
  }, [permissionsDraft, permissionsUser]);

  // Resend invite email
  const resendInvite = useCallback(async (user: User) => {
    setResendingInvite(user.id);
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        toast.success(`Convite reenviado para ${user.email}`);
      } else {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        toast.error(data?.error ?? 'Erro ao reenviar convite');
      }
    } catch {
      toast.error('Erro ao reenviar convite');
    } finally {
      setResendingInvite(null);
    }
  }, []);

  // Set user password
  const handleSetPassword = useCallback(async () => {
    if (!passwordUser || !passwordValue) return;
    setSaving(true);
    try {
      const res = await fetch('/api/users/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: passwordUser.id, password: passwordValue }),
      });
      if (res.ok) {
        toast.success(`Senha de ${passwordUser.name} atualizada`);
        setPasswordUser(null);
        setPasswordValue('');
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? 'Erro ao definir senha');
      }
    } catch {
      toast.error('Erro ao definir senha');
    } finally {
      setSaving(false);
    }
  }, [passwordUser, passwordValue]);

  return (
    <SidebarLayout currentPage="admin">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-foreground">Administração</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gestão de usuários, funções e permissões de acesso</p>
          </div>
          <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Convidar usuário
          </Button>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="permissions">Permissões</TabsTrigger>
          </TabsList>

          {/* ── Users Tab ── */}
          <TabsContent value="users" className="mt-4">
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Região</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Convite</TableHead>
                    <TableHead>Permissões extras</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        Carregando…
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        Nenhum usuário cadastrado. Use &quot;Convidar usuário&quot; para adicionar.
                      </TableCell>
                    </TableRow>
                  ) : users.map(user => (
                    <TableRow key={user.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                      <TableCell>
                        {editingRole === user.id ? (
                          <Select
                            defaultValue={user.role ?? 'voluntario'}
                            onValueChange={role => updateRole(user.id, role)}
                          >
                            <SelectTrigger className="h-7 w-36 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_LABELS).map(([val, label]) => (
                                <SelectItem key={val} value={val}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn('text-xs cursor-pointer', ROLE_CLASSES[user.role ?? 'voluntario'])}
                            onClick={() => setEditingRole(user.id)}
                            title="Clique para editar função"
                          >
                            {ROLE_LABELS[user.role ?? 'voluntario']}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.regionScope ?? '—'}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleEnabled(user)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border transition-colors',
                            user.enabled
                              ? 'bg-green-500/10 text-green-600 border-green-200'
                              : 'bg-muted text-muted-foreground border-border',
                          )}
                          title="Clique para alternar status"
                        >
                          {user.enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          {user.enabled ? 'Ativo' : 'Inativo'}
                        </button>
                      </TableCell>
                      {/* Invite status */}
                      <TableCell>
                        {user.inviteAcceptedAt ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <MailCheck className="h-3.5 w-3.5" />
                            Aceito
                          </span>
                        ) : user.inviteToken ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <Mail className="h-3.5 w-3.5" />
                            Pendente
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                       <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => openPermissionsDialog(user)}
                        >
                          {(user.permissions?.length ?? 0) > 0
                            ? `${user.permissions?.length ?? 0} ativas`
                            : 'Configurar'}
                        </Button>
                      </TableCell>
                       <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 gap-1 text-xs"
                            onClick={() => setEditingRole(editingRole === user.id ? null : user.id)}
                          >
                            <Pencil className="h-3 w-3" />
                            Editar
                          </Button>
                           <Button
                             size="sm"
                             variant="ghost"
                             className="h-7 px-2 gap-1 text-xs text-amber-600 hover:text-amber-700"
                             onClick={() => { setPasswordUser(user); setPasswordValue(''); }}
                             title="Definir senha individual"
                           >
                             <KeyRound className="h-3 w-3" />
                             Senha
                           </Button>
                           {!user.inviteAcceptedAt && (
                             <Button
                               size="sm"
                               variant="ghost"
                               className="h-7 px-2 gap-1 text-xs text-blue-600 hover:text-blue-700"
                               onClick={() => void resendInvite(user)}
                               disabled={resendingInvite === user.id}
                               title="Reenviar email de convite"
                             >
                               {resendingInvite === user.id ? (
                                 <Loader2 className="h-3 w-3 animate-spin" />
                               ) : (
                                 <Mail className="h-3 w-3" />
                               )}
                               Convidar
                             </Button>
                           )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 gap-1 text-xs text-red-600 hover:text-red-700"
                            onClick={() => setConfirmRemove(user)}
                          >
                            <X className="h-3 w-3" />
                            Remover
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── Permissions Tab ── */}
          <TabsContent value="permissions" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-40">Módulo</TableHead>
                    <TableHead className="text-center">Admin</TableHead>
                    <TableHead className="text-center">Coordenador</TableHead>
                    <TableHead className="text-center">Cabo Eleitoral</TableHead>
                    <TableHead className="text-center">Voluntário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MODULE_POLICIES.map((policy) => (
                    <TableRow key={policy.label} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{policy.label}</TableCell>
                      {(['admin', 'coordenador', 'cabo', 'voluntario'] as AppRole[]).map((role) => (
                        <TableCell key={role} className="text-center">
                          <span className={cn(
                            'inline-flex rounded-full border px-2 py-0.5 text-xs',
                            getModuleLevel(role, policy) === 'Gerir'
                              ? 'border-green-200 bg-green-500/10 text-green-600'
                              : getModuleLevel(role, policy) === 'Visualizar'
                                ? 'border-blue-200 bg-blue-500/10 text-blue-600'
                                : 'border-border bg-muted text-muted-foreground',
                          )}>
                            {getModuleLevel(role, policy)}
                          </span>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium text-foreground">Permissões personalizadas</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Além do papel base, cada usuário pode receber permissões extras específicas. Isso afeta as APIs e os módulos visíveis no shell.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={open => { setInviteOpen(open); if (!open) setForm(EMPTY_FORM); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Nome</Label>
              <Input
                id="invite-name"
                placeholder="Nome completo"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="email@campanha.com.br"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Função</Label>
              <Select value={form.role} onValueChange={role => setForm(f => ({ ...f, role }))}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-region">Região <span className="text-muted-foreground">(opcional)</span></Label>
              <Input
                id="invite-region"
                placeholder="Ex: Zona Sul, Bairro X…"
                value={form.regionScope}
                onChange={e => setForm(f => ({ ...f, regionScope: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={saving || !form.name || !form.email}>
              {saving ? 'Salvando…' : 'Convidar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!permissionsUser} onOpenChange={open => !open && setPermissionsUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Permissões extras de {permissionsUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2 sm:grid-cols-2">
            {AVAILABLE_PERMISSIONS.map((permission) => {
              const active = permissionsDraft.includes(permission);
              return (
                <button
                  key={permission}
                  type="button"
                  onClick={() => togglePermission(permission)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    active
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/40',
                  )}
                >
                  {permission}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsUser(null)}>Cancelar</Button>
            <Button onClick={savePermissions} disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar permissões'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Password Dialog */}
      <Dialog
        open={!!passwordUser}
        onOpenChange={open => { if (!open) { setPasswordUser(null); setPasswordValue(''); } }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Definir senha — {passwordUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Defina uma senha individual para este usuário. Ela substituirá a senha global para este login.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="set-password-input">Nova senha</Label>
              <Input
                id="set-password-input"
                type="password"
                placeholder="mínimo 4 caracteres"
                value={passwordValue}
                onChange={e => setPasswordValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !saving && passwordValue.length >= 4 && void handleSetPassword()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPasswordUser(null); setPasswordValue(''); }}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleSetPassword()}
              disabled={saving || passwordValue.length < 4}
            >
              {saving ? 'Salvando…' : 'Salvar senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Remove Dialog */}
      <AlertDialog open={!!confirmRemove} onOpenChange={open => !open && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{confirmRemove?.name}</strong>? O usuario perdera acesso imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmRemove && void removeUser(confirmRemove)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarLayout>
  );
}
