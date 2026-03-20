'use client';

import { parseWhatsAppFormat } from '@/lib/whatsapp-format';
import type { FormatSegment } from '@/lib/whatsapp-format';
import { Fragment } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface WhatsAppPreviewProps {
  /** Raw message text with WhatsApp formatting markers */
  message: string;
  /** Chip profile name shown in the header (default: "WhatsApp") */
  profileName?: string;
  /** Chip profile picture URL; initials shown when absent */
  profilePictureUrl?: string;
  /** Message timestamp (defaults to current time) */
  timestamp?: Date;
  /** Delivery status (default: "read") */
  status?: 'sent' | 'delivered' | 'read';
  /** Optional media attachment URL */
  mediaUrl?: string;
  /** Type of attached media */
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  /** Additional CSS classes on the outermost container */
  className?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Extract first two uppercase letters from a profile name for the avatar. */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Format Date to HH:MM string. */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Extract domain from a URL for the link preview card. */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// ─── Status Icons ──────────────────────────────────────────────────────────────

function SingleCheck({ color = '#8696a0' }: { color?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 11"
      fill={color}
      className="h-[13px] w-[13px] shrink-0"
      aria-label="Enviado"
    >
      <path d="M11.071.653a.75.75 0 0 1 .05 1.059L5.64 8.24a.75.75 0 0 1-1.089.03L1.43 5.15a.75.75 0 1 1 1.06-1.062l2.578 2.578L10.012.704a.75.75 0 0 1 1.059-.05z" />
    </svg>
  );
}

function DoubleCheck({ color = '#8696a0' }: { color?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 11"
      fill={color}
      className="h-[13px] w-[18px] shrink-0"
      aria-label="Entregue"
    >
      {/* Left check */}
      <path d="M5.071.653a.75.75 0 0 1 .05 1.059L-.5 8.24a.75.75 0 0 1-1.089.03L-4.57 5.15a.75.75 0 1 1 1.06-1.062l2.578 2.578L4.012.704a.75.75 0 0 1 1.059-.05z" transform="translate(6,0)" />
      {/* Right check */}
      <path d="M11.071.653a.75.75 0 0 1 .05 1.059L5.64 8.24a.75.75 0 0 1-1.089.03L1.43 5.15a.75.75 0 1 1 1.06-1.062l2.578 2.578L10.012.704a.75.75 0 0 1 1.059-.05z" />
    </svg>
  );
}

function StatusIcon({ status }: { status: 'sent' | 'delivered' | 'read' }) {
  if (status === 'sent') return <SingleCheck />;
  if (status === 'delivered') return <DoubleCheck />;
  // read — blue double check
  return <DoubleCheck color="#53bdeb" />;
}

// ─── Segment Renderer ──────────────────────────────────────────────────────────

function RenderSegment({ segment }: { segment: FormatSegment }) {
  switch (segment.type) {
    case 'bold':
      return <strong className="font-bold">{segment.content}</strong>;
    case 'italic':
      return <em className="italic">{segment.content}</em>;
    case 'strikethrough':
      return <del className="line-through">{segment.content}</del>;
    case 'monospace':
      return (
        <code className="font-mono text-sm bg-black/5 px-1 rounded">{segment.content}</code>
      );
    case 'codeblock':
      return (
        <pre className="font-mono text-sm bg-black/5 px-2 py-1 rounded my-1 whitespace-pre-wrap">
          <code>{segment.content}</code>
        </pre>
      );
    case 'link':
      return (
        <a
          href={segment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline cursor-pointer"
        >
          {segment.display}
        </a>
      );
    case 'linebreak':
      return <br />;
    case 'text':
    default:
      return <>{segment.content}</>;
  }
}

// ─── Media Preview ─────────────────────────────────────────────────────────────

function MediaPreview({
  mediaUrl,
  mediaType,
}: {
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
}) {
  if (mediaType === 'image') {
    return (
      <div className="mb-1.5 overflow-hidden rounded-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt="Imagem anexada"
          className="max-h-48 w-full object-cover rounded-lg"
        />
      </div>
    );
  }

  if (mediaType === 'video') {
    return (
      <div className="relative mb-1.5 flex h-32 w-full items-center justify-center rounded-lg bg-black/20 overflow-hidden">
        <svg
          viewBox="0 0 24 24"
          fill="white"
          className="h-10 w-10 drop-shadow"
          aria-label="Video"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
        <span className="absolute bottom-1.5 left-2 text-[10px] text-white/80">Vídeo</span>
      </div>
    );
  }

  if (mediaType === 'audio') {
    return (
      <div className="mb-1.5 flex items-center gap-2 rounded-full bg-black/5 px-3 py-2">
        <svg
          viewBox="0 0 24 24"
          fill="#075E54"
          className="h-5 w-5 shrink-0"
          aria-label="Audio"
        >
          <path d="M12 3a9 9 0 0 0-9 9h2a7 7 0 1 1 14 0h2a9 9 0 0 0-9-9zM11 17v4h2v-4h-2zm-5.657-1.343L3.929 17.07A9.963 9.963 0 0 0 11 20v-2a7.94 7.94 0 0 1-5.657-2.343zM13 20a9.963 9.963 0 0 0 7.071-2.929l-1.414-1.414A7.94 7.94 0 0 1 13 18v2z" />
        </svg>
        {/* Waveform placeholder */}
        <div className="flex flex-1 items-end gap-px h-5">
          {[3, 6, 8, 5, 9, 7, 4, 8, 6, 3, 7, 9, 5, 8, 4].map((h, i) => (
            <div
              key={i}
              className="w-0.5 bg-[#075E54]/50 rounded-full"
              style={{ height: `${h * 2}px` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // document
  return (
    <div className="mb-1.5 flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2">
      <svg
        viewBox="0 0 24 24"
        fill="#075E54"
        className="h-6 w-6 shrink-0"
        aria-label="Documento"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
      </svg>
      <span className="text-xs text-gray-700 truncate">{mediaUrl.split('/').pop() ?? 'Documento'}</span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function WhatsAppPreview({
  message,
  profileName = 'WhatsApp',
  profilePictureUrl,
  timestamp,
  status = 'read',
  mediaUrl,
  mediaType,
  className,
}: WhatsAppPreviewProps) {
  const segments = parseWhatsAppFormat(message);
  const displayTime = formatTime(timestamp ?? new Date());
  const initials = getInitials(profileName);
  const hasContent = message.trim().length > 0;

  // Detect if message contains a URL for link preview card
  const firstLink = segments.find((s) => s.type === 'link') as
    | Extract<FormatSegment, { type: 'link' }>
    | undefined;

  return (
    <div
      className={`flex flex-col w-full rounded-2xl overflow-hidden border border-border shadow-sm${className ? ` ${className}` : ''}`}
      style={{ maxWidth: '320px' }}
    >
      {/* ── Header bar ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ backgroundColor: '#075E54' }}
      >
        {/* Avatar */}
        <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
          {profilePictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profilePictureUrl}
              alt={profileName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-white">{initials}</span>
          )}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight truncate">{profileName}</p>
          <p className="text-xs text-white/70">online</p>
        </div>

        {/* Phone icon */}
        <svg
          viewBox="0 0 24 24"
          fill="white"
          className="h-4 w-4 text-white/60 shrink-0 opacity-60"
          aria-hidden="true"
        >
          <path d="M6.62 10.79a15.91 15.91 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2z" />
        </svg>
      </div>

      {/* ── Chat area ── */}
      <div
        className="flex-1 p-4 overflow-y-auto min-h-[200px]"
        style={{ backgroundColor: '#ECE5DD' }}
      >
        {hasContent ? (
          <div className="flex justify-end">
            <div
              className="relative max-w-[80%] rounded-tl-2xl rounded-bl-2xl rounded-br-2xl bg-[#DCF8C6] px-3.5 py-2.5 shadow-sm"
              style={{
                /* WhatsApp tail on bottom-right */
                borderBottomRightRadius: '4px',
              }}
            >
              {/* Media preview (above text) */}
              {mediaUrl && mediaType && (
                <MediaPreview mediaUrl={mediaUrl} mediaType={mediaType} />
              )}

              {/* Formatted message text */}
              <p className="text-sm text-gray-800 leading-relaxed break-words">
                {segments.map((seg, i) => (
                  <Fragment key={i}>
                    <RenderSegment segment={seg} />
                  </Fragment>
                ))}
              </p>

              {/* Link preview card (if URL detected) */}
              {firstLink && (
                <div className="mt-1.5 rounded-md bg-white/60 px-2 py-1 text-[11px] text-gray-500 border-l-2 border-blue-500">
                  {extractDomain(firstLink.url)}
                </div>
              )}

              {/* Footer: timestamp + status */}
              <div className="flex items-center justify-end gap-1 mt-1.5">
                <span className="text-[10px] text-gray-400">{displayTime}</span>
                <StatusIcon status={status} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center pt-8">
            <p className="text-sm text-gray-400 italic">
              Digite uma mensagem para ver a prévia
            </p>
          </div>
        )}
      </div>

      {/* ── Encryption footer ── */}
      <div className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white border-t border-gray-200 shrink-0">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-3 w-3 text-gray-400 shrink-0"
          aria-hidden="true"
        >
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
        </svg>
        <span className="text-[10px] text-gray-400">
          Mensagens protegidas com criptografia de ponta a ponta
        </span>
      </div>
    </div>
  );
}
