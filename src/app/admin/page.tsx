'use client';

import { useCallback, useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
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
import { UserPlus, Check, X, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/db-users';

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

// Modules × Roles permission matrix (static, informational)
const MODULES = [
  'Dashboard',
  'CRM',
  'Campanhas',
  'Conversas',
  'Conformidade',
  'Relatórios',
  'Admin',
];

const PERMISSIONS: Record<string, Record<string, boolean>> = {
  Dashboard:    { admin: true,  coordenador: true,  cabo: true,  voluntario: true  },
  CRM:          { admin: true,  coordenador: true,  cabo: true,  voluntario: false },
  Campanhas:    { admin: true,  coordenador: true,  cabo: false, voluntario: false },
  Conversas:    { admin: true,  coordenador: true,  cabo: true,  voluntario: true  },
  Conformidade: { admin: true,  coordenador: true,  cabo: false, voluntario: false },
  'Relatórios': { admin: true,  coordenador: true,  cabo: false, voluntario: false },
  Admin:        { admin: true,  coordenador: false, cabo: false, voluntario: false },
};

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
        const newUser = await res.json();
        setUsers(prev => [newUser, ...prev]);
        setForm(EMPTY_FORM);
        setInviteOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }, [form]);

  // Update role inline
  const updateRole = useCallback(async (userId: string, role: string) => {
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, role }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: role as User['role'] } : u));
    }
    setEditingRole(null);
  }, []);

  // Toggle enabled/disabled
  const toggleEnabled = useCallback(async (user: User) => {
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, enabled: !user.enabled }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, enabled: !u.enabled } : u));
    }
  }, []);

  // Remove user
  const removeUser = useCallback(async (user: User) => {
    const res = await fetch(`/api/users?id=${user.id}`, { method: 'DELETE' });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
    }
    setConfirmRemove(null);
  }, []);

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
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        Carregando…
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        Nenhum usuário cadastrado. Use "Convidar usuário" para adicionar.
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
                  {MODULES.map(mod => (
                    <TableRow key={mod} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{mod}</TableCell>
                      {['admin', 'coordenador', 'cabo', 'voluntario'].map(role => (
                        <TableCell key={role} className="text-center">
                          {PERMISSIONS[mod]?.[role] ? (
                            <Check className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Permissões personalizadas por usuário disponíveis em breve.
            </p>
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

      {/* Confirm Remove Dialog */}
      <Dialog open={!!confirmRemove} onOpenChange={open => !open && setConfirmRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar remoção</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover <strong>{confirmRemove?.name}</strong>? O usuário perderá acesso imediatamente.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmRemove && removeUser(confirmRemove)}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarLayout>
  );
}
