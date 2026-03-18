'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  HelpCircle, 
  FileText, 
  Video, 
  MessageCircle, 
  ExternalLink,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HelpLink {
  id: string;
  title: string;
  description?: string;
  href: string;
  icon?: 'file' | 'video' | 'chat';
  external?: boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const DEFAULT_HELP_LINKS: HelpLink[] = [
  {
    id: 'setup-wizard',
    title: 'Setup Wizard',
    description: 'Configure o sistema passo a passo',
    href: '/wizard',
    icon: 'file',
  },
  {
    id: 'chips-setup',
    title: 'Configurar Chips',
    description: 'Conecte chips WhatsApp',
    href: '/chips',
    icon: 'file',
  },
  {
    id: 'campaigns-guide',
    title: 'Criar Campanhas',
    description: 'Tutorial de campanhas',
    href: '/campanhas/nova',
    icon: 'video',
  },
  {
    id: 'groups-manage',
    title: 'Gerenciar Grupos',
    description: 'Criar e manter grupos',
    href: '/grupos',
    icon: 'file',
  },
];

const DEFAULT_FAQ: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'Como conectar um chip WhatsApp?',
    answer: 'Vá para a página de Chips, clique em "Adicionar Chip" e siga as instruções para escanear o QR Code com o WhatsApp do chip.',
  },
  {
    id: 'faq-2',
    question: 'O que é failover de chip?',
    answer: 'Failover é a troca automática de mensagens de um chip com problemas para outro chip saudável. Isso garante que suas mensagens sejam enviadas mesmo se um chip falhar.',
  },
  {
    id: 'faq-3',
    question: 'Como criar grupos overflow?',
    answer: 'Quando um grupo atinge 90% da capacidade, o sistema alerta. Vá para a página de Grupos e crie um novo grupo para o mesmo segmento.',
  },
  {
    id: 'faq-4',
    question: 'Posso agendar campanhas?',
    answer: 'Sim! Ao criar uma campanha, você pode definir uma data e horário para envio automático. A campanha será enviada no momento agendado.',
  },
  {
    id: 'faq-5',
    question: 'Como importar eleitores?',
    answer: 'Vá para Importar, faça upload de um arquivo CSV, mapeie as colunas e confirme a importação. O sistema criará um novo segmento automaticamente.',
  },
  {
    id: 'faq-6',
    question: 'O que significam os status dos chips?',
    answer: 'Verde = Saudável e conectado. Amarelo = Atenção (problemas menores). Vermelho = Erro ou desconectado. Cinza = Status desconhecido.',
  },
];

interface HelpPanelProps {
  links?: HelpLink[];
  faq?: FAQItem[];
  supportEmail?: string;
}

export function HelpPanel({ 
  links = DEFAULT_HELP_LINKS, 
  faq = DEFAULT_FAQ,
  supportEmail = 'suporte@eel.app',
}: HelpPanelProps) {
  const [showFAQ, setShowFAQ] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<Set<string>>(new Set());

  const toggleFAQ = (id: string) => {
    setExpandedFAQ((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getIcon = (iconType?: string) => {
    switch (iconType) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'chat':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Card data-tooltip="help-panel">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          Ajuda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Links */}
        <div className="space-y-2">
          {links.map((link) => {
            const content = (
              <>
                <div className="text-muted-foreground">
                  {getIcon(link.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block truncate">
                    {link.title}
                  </span>
                  {link.description && (
                    <span className="text-xs text-muted-foreground truncate block">
                      {link.description}
                    </span>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                {link.external && (
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                )}
              </>
            );

            if (link.external) {
              return (
                <a
                  key={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group"
                >
                  {content}
                </a>
              );
            }

            return (
              <Link
                key={link.id}
                href={link.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                {content}
              </Link>
            );
          })}
        </div>

        {/* FAQ Toggle */}
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setShowFAQ(!showFAQ)}
        >
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Perguntas Frequentes
          </span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', showFAQ && 'rotate-180')} />
        </Button>

        {/* FAQ List */}
        {showFAQ && (
          <div className="space-y-1 border rounded-lg divide-y">
            {faq.map((item) => {
              const isExpanded = expandedFAQ.has(item.id);
              
              return (
                <div key={item.id} className="overflow-hidden">
                  <button
                    onClick={() => toggleFAQ(item.id)}
                    className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                  >
                    <ChevronRight 
                      className={cn(
                        'h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform',
                        isExpanded && 'rotate-90'
                      )} 
                    />
                    <span className="text-sm font-medium">{item.question}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 pl-9">
                      <p className="text-sm text-muted-foreground">
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Contact Support */}
        <div className="pt-3 border-t">
          <a
            href={`mailto:${supportEmail}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail className="h-4 w-4" />
            <span>Contatar suporte</span>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export type { HelpLink as HelpLinkType, FAQItem as FAQItemType };