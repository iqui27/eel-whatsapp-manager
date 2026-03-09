'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Conversation, ConversationMessage } from '@/db/schema';
import { appendUniqueMessage, buildConversationStreamCursor, upsertConversationList, useConversationStream } from '@/lib/use-conversation-stream';
import { AlertTriangle, Bot, MessageSquare, Send, User, Zap } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberta',
  assigned: 'Atribuída',
  waiting: 'Aguardando',
  resolved: 'Resolvida',
  bot: 'Bot',
};

const QUICK_REPLIES = [
  'Recebido. Vou validar e retorno em seguida.',
  'Estou assumindo este atendimento agora.',
  'Encaminhei para a coordenação responsável.',
];

export default function MobileInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/conversations');
      if (!res.ok) return;
      const data: Conversation[] = await res.json();
      setConversations(data);
      if (!selectedId && data[0]) {
        setSelectedId(data[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`);
    if (!res.ok) return;
    const data: ConversationMessage[] = await res.json();
    setMessages(data);
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
  }, [loadMessages, selectedId]);

  const urgentConversations = useMemo(() => (
    conversations.filter((conversation) => (
      (conversation.priority ?? 0) > 0
      || conversation.status === 'open'
      || Boolean(conversation.handoffReason)
    ))
  ), [conversations]);

  const selectedConversation = urgentConversations.find((conversation) => conversation.id === selectedId) ?? null;

  const initialCursor = useMemo(
    () => buildConversationStreamCursor(urgentConversations, messages),
    [messages, urgentConversations],
  );

  useConversationStream({
    enabled: true,
    initialCursor,
    onConversationUpsert: (conversation) => {
      setConversations((current) => upsertConversationList(current, conversation));
      if (!selectedId) {
        setSelectedId(conversation.id);
      }
    },
  });

  useConversationStream({
    enabled: Boolean(selectedId),
    conversationId: selectedId ?? undefined,
    initialCursor,
    onMessageCreated: (message) => {
      if (selectedId && message.conversationId === selectedId) {
        setMessages((current) => appendUniqueMessage(current, message));
      }
    },
  });

  const updateConversation = useCallback(async (status: Conversation['status']) => {
    if (!selectedConversation) return;
    const res = await fetch('/api/conversations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedConversation.id, status }),
    });
    if (!res.ok) return;
    setConversations((current) => current.map((conversation) => (
      conversation.id === selectedConversation.id
        ? { ...conversation, status }
        : conversation
    )));
  }, [selectedConversation]);

  const sendReply = useCallback(async (content: string) => {
    if (!selectedConversation || !content.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'agent', content: content.trim() }),
      });
      if (!res.ok) return;
      const message: ConversationMessage = await res.json();
      setMessages((current) => appendUniqueMessage(current, message));
      setReply('');
    } finally {
      setSending(false);
    }
  }, [selectedConversation]);

  return (
    <SidebarLayout currentPage="conversas" pageTitle="Inbox Prioritária">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Inbox Prioritária</h1>
            <p className="text-sm text-muted-foreground">
              Fila mobile para urgências, handoff e respostas rápidas em campo.
            </p>
          </div>
          <Badge variant="outline" className="inline-flex items-center gap-1.5 border-amber-200 bg-amber-500/10 text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            {urgentConversations.length} prioritárias
          </Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fila urgente</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[560px]">
                <div className="space-y-2 p-3">
                  {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
                  {!loading && urgentConversations.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma conversa urgente no momento.</p>
                  )}
                  {urgentConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedId(conversation.id)}
                      className={cn(
                        'w-full rounded-xl border px-3 py-3 text-left transition-colors',
                        selectedId === conversation.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background hover:bg-muted/40',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{conversation.voterName}</p>
                          <p className="text-xs text-muted-foreground">{conversation.voterPhone}</p>
                        </div>
                        {(conversation.priority ?? 0) > 0 && <Zap className="h-4 w-4 text-amber-500" />}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{STATUS_LABELS[conversation.status ?? 'open']}</Badge>
                        {conversation.handoffReason && (
                          <span className="text-[11px] text-muted-foreground">{conversation.handoffReason}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedConversation ? selectedConversation.voterName : 'Selecione uma conversa'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedConversation ? (
                <p className="text-sm text-muted-foreground">Escolha uma conversa da fila à esquerda para responder.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => void updateConversation('assigned')}>Assumir</Button>
                    <Button size="sm" variant="outline" onClick={() => void updateConversation('waiting')}>Aguardar</Button>
                    <Button size="sm" variant="outline" onClick={() => void updateConversation('resolved')}>Resolver</Button>
                  </div>

                  <ScrollArea className="h-[320px] rounded-xl border border-border bg-muted/20 p-3">
                    <div className="space-y-3">
                      {messages.map((message) => {
                        const isAgent = message.sender === 'agent';
                        const isBot = message.sender === 'bot';
                        return (
                          <div key={message.id} className={cn('flex gap-2', isAgent ? 'justify-end' : 'justify-start')}>
                            {!isAgent && (
                              <div className={cn(
                                'mt-1 flex h-7 w-7 items-center justify-center rounded-full',
                                isBot ? 'bg-blue-500/10 text-blue-600' : 'bg-muted text-muted-foreground',
                              )}>
                                {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                              </div>
                            )}
                            <div className={cn(
                              'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                              isAgent ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground',
                            )}>
                              {message.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {QUICK_REPLIES.map((content) => (
                      <Button key={content} size="sm" variant="outline" className="justify-start text-left text-xs" onClick={() => void sendReply(content)}>
                        <MessageSquare className="h-3.5 w-3.5" />
                        {content}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      rows={4}
                      placeholder="Digite uma resposta rápida para o eleitor"
                      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <Button className="w-full gap-2" onClick={() => void sendReply(reply)} disabled={sending || !reply.trim()}>
                      <Send className="h-4 w-4" />
                      {sending ? 'Enviando...' : 'Enviar resposta'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}
