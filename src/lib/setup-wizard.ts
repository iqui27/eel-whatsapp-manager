/**
 * Setup Wizard State Management
 * Phase 21-05 - Setup Wizard Implementation
 * 
 * Provides persistent state management for the guided setup wizard.
 * Saves progress to localStorage and optionally to DB for multi-device sync.
 */

import type { Chip, Segment, WhatsappGroup, Campaign } from '@/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WizardStep = 
  | 'chips' 
  | 'import' 
  | 'segments' 
  | 'groups' 
  | 'campaign';

export interface WizardProgress {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  skippedSteps: WizardStep[];
  startedAt: string;
  lastUpdated: string;
}

export interface WizardState {
  progress: WizardProgress;
  
  // Step 1: Chips
  chips: {
    configured: Array<{
      id: string;
      name: string;
      phone: string;
      instanceName: string;
      segmentTags: string[];
      connected: boolean;
    }>;
    qrCodeData: string | null;
  };
  
  // Step 2: Import
  import: {
    fileId: string | null;
    fileName: string | null;
    totalRows: number;
    importedRows: number;
    duplicates: number;
    tags: string[];
    completed: boolean;
  };
  
  // Step 3: Segments
  segments: {
    items: Array<{
      id: string;
      name: string;
      segmentTag: string;
      voterCount: number;
      chipId: string | null;
    }>;
    autoDetected: boolean;
  };
  
  // Step 4: Groups
  groups: {
    items: Array<{
      id: string;
      name: string;
      segmentTag: string;
      inviteUrl: string | null;
      memberCount: number;
    }>;
    admins: string[];
  };
  
  // Step 5: Campaign
  campaign: {
    id: string | null;
    name: string;
    template: string;
    segmentId: string | null;
    chipId: string | null;
    scheduled: boolean;
    scheduledAt: string | null;
  };
}

export const WIZARD_STEPS: { id: WizardStep; label: string; title: string; required: boolean }[] = [
  { id: 'chips', label: 'Chips', title: 'Configurar Chips', required: true },
  { id: 'import', label: 'Importar', title: 'Importar Eleitores', required: true },
  { id: 'segments', label: 'Segmentos', title: 'Criar Segmentos', required: true },
  { id: 'groups', label: 'Grupos', title: 'Criar Grupos', required: false },
  { id: 'campaign', label: 'Campanha', title: 'Criar Campanha', required: false },
];

const STORAGE_KEY = 'eel-setup-wizard-state';
const DB_KEY = 'wizard_state';

// ─── Default State ────────────────────────────────────────────────────────────

export function getDefaultWizardState(): WizardState {
  return {
    progress: {
      currentStep: 'chips',
      completedSteps: [],
      skippedSteps: [],
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    },
    chips: {
      configured: [],
      qrCodeData: null,
    },
    import: {
      fileId: null,
      fileName: null,
      totalRows: 0,
      importedRows: 0,
      duplicates: 0,
      tags: [],
      completed: false,
    },
    segments: {
      items: [],
      autoDetected: false,
    },
    groups: {
      items: [],
      admins: [],
    },
    campaign: {
      id: null,
      name: '',
      template: '',
      segmentId: null,
      chipId: null,
      scheduled: false,
      scheduledAt: null,
    },
  };
}

// ─── LocalStorage Operations ──────────────────────────────────────────────────

export function loadWizardState(): WizardState {
  if (typeof window === 'undefined') {
    return getDefaultWizardState();
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return getDefaultWizardState();
    }
    
    const parsed = JSON.parse(stored) as Partial<WizardState>;
    
    // Merge with defaults to handle missing fields from older versions
    return {
      ...getDefaultWizardState(),
      ...parsed,
      progress: {
        ...getDefaultWizardState().progress,
        ...parsed.progress,
      },
      chips: {
        ...getDefaultWizardState().chips,
        ...parsed.chips,
      },
      import: {
        ...getDefaultWizardState().import,
        ...parsed.import,
      },
      segments: {
        ...getDefaultWizardState().segments,
        ...parsed.segments,
      },
      groups: {
        ...getDefaultWizardState().groups,
        ...parsed.groups,
      },
      campaign: {
        ...getDefaultWizardState().campaign,
        ...parsed.campaign,
      },
    };
  } catch {
    console.warn('[setup-wizard] Failed to parse stored state, using defaults');
    return getDefaultWizardState();
  }
}

export function saveWizardState(state: WizardState): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const toStore = {
      ...state,
      progress: {
        ...state.progress,
        lastUpdated: new Date().toISOString(),
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (err) {
    console.error('[setup-wizard] Failed to save state:', err);
  }
}

export function clearWizardState(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Step Navigation Helpers ──────────────────────────────────────────────────

export function getStepIndex(step: WizardStep): number {
  return WIZARD_STEPS.findIndex(s => s.id === step);
}

export function getNextStep(current: WizardStep): WizardStep | null {
  const idx = getStepIndex(current);
  if (idx === -1 || idx >= WIZARD_STEPS.length - 1) {
    return null;
  }
  return WIZARD_STEPS[idx + 1].id;
}

export function getPreviousStep(current: WizardStep): WizardStep | null {
  const idx = getStepIndex(current);
  if (idx <= 0) {
    return null;
  }
  return WIZARD_STEPS[idx - 1].id;
}

export function isStepCompleted(state: WizardState, step: WizardStep): boolean {
  return state.progress.completedSteps.includes(step);
}

export function isStepSkipped(state: WizardState, step: WizardStep): boolean {
  return state.progress.skippedSteps.includes(step);
}

export function canProgressToStep(state: WizardState, targetStep: WizardStep): boolean {
  const targetIdx = getStepIndex(targetStep);
  
  // Can always go to completed or skipped steps
  if (isStepCompleted(state, targetStep) || isStepSkipped(state, targetStep)) {
    return true;
  }
  
  // Can go to current step
  if (state.progress.currentStep === targetStep) {
    return true;
  }
  
  // Check if all previous required steps are completed
  for (let i = 0; i < targetIdx; i++) {
    const step = WIZARD_STEPS[i];
    if (step.required && !isStepCompleted(state, step.id) && !isStepSkipped(state, step.id)) {
      return false;
    }
  }
  
  return true;
}

export function getCompletionPercentage(state: WizardState): number {
  const requiredSteps = WIZARD_STEPS.filter(s => s.required);
  const completedRequired = requiredSteps.filter(
    s => state.progress.completedSteps.includes(s.id)
  );
  
  if (requiredSteps.length === 0) return 100;
  return Math.round((completedRequired.length / requiredSteps.length) * 100);
}

export function getAllStepsCompleted(state: WizardState): boolean {
  const requiredSteps = WIZARD_STEPS.filter(s => s.required);
  return requiredSteps.every(s => state.progress.completedSteps.includes(s.id));
}

// ─── State Update Helpers ─────────────────────────────────────────────────────

export function markStepCompleted(state: WizardState, step: WizardStep): WizardState {
  if (state.progress.completedSteps.includes(step)) {
    return state;
  }
  
  const nextStep = getNextStep(step);
  
  return {
    ...state,
    progress: {
      ...state.progress,
      completedSteps: [...state.progress.completedSteps, step],
      currentStep: nextStep || state.progress.currentStep,
      lastUpdated: new Date().toISOString(),
    },
  };
}

export function markStepSkipped(state: WizardState, step: WizardStep): WizardState {
  if (state.progress.skippedSteps.includes(step)) {
    return state;
  }
  
  const nextStep = getNextStep(step);
  
  return {
    ...state,
    progress: {
      ...state.progress,
      skippedSteps: [...state.progress.skippedSteps, step],
      currentStep: nextStep || state.progress.currentStep,
      lastUpdated: new Date().toISOString(),
    },
  };
}

export function setCurrentStep(state: WizardState, step: WizardStep): WizardState {
  return {
    ...state,
    progress: {
      ...state.progress,
      currentStep: step,
      lastUpdated: new Date().toISOString(),
    },
  };
}

// ─── Validation Helpers ───────────────────────────────────────────────────────

export function validateChipsStep(state: WizardState): { valid: boolean; error?: string } {
  if (state.chips.configured.length === 0) {
    return { valid: false, error: 'Adicione pelo menos um chip configurado' };
  }
  
  const connectedChips = state.chips.configured.filter(c => c.connected);
  if (connectedChips.length === 0) {
    return { valid: false, error: 'Pelo menos um chip deve estar conectado' };
  }
  
  return { valid: true };
}

export function validateImportStep(state: WizardState): { valid: boolean; error?: string } {
  if (!state.import.completed) {
    return { valid: false, error: 'Complete a importação de eleitores' };
  }
  
  if (state.import.importedRows === 0) {
    return { valid: false, error: 'Nenhum eleitor importado' };
  }
  
  return { valid: true };
}

export function validateSegmentsStep(state: WizardState): { valid: boolean; error?: string } {
  if (state.segments.items.length === 0) {
    return { valid: false, error: 'Crie pelo menos um segmento' };
  }
  
  const segmentsWithoutChip = state.segments.items.filter(s => !s.chipId);
  if (segmentsWithoutChip.length > 0) {
    return { valid: false, error: 'Todos os segmentos devem ter um chip atribuído' };
  }
  
  return { valid: true };
}

export function validateGroupsStep(state: WizardState): { valid: boolean; error?: string } {
  // Groups are optional, but if created should have invite links
  const groupsWithoutInvite = state.groups.items.filter(g => !g.inviteUrl);
  if (state.groups.items.length > 0 && groupsWithoutInvite.length > 0) {
    return { valid: false, error: 'Todos os grupos devem ter link de convite' };
  }
  
  return { valid: true };
}

export function validateCampaignStep(state: WizardState): { valid: boolean; error?: string } {
  if (!state.campaign.name.trim()) {
    return { valid: false, error: 'Nome da campanha é obrigatório' };
  }
  
  if (!state.campaign.template.trim()) {
    return { valid: false, error: 'Mensagem da campanha é obrigatória' };
  }
  
  if (!state.campaign.segmentId) {
    return { valid: false, error: 'Selecione um segmento para a campanha' };
  }
  
  return { valid: true };
}

export function validateStep(state: WizardState, step: WizardStep): { valid: boolean; error?: string } {
  switch (step) {
    case 'chips':
      return validateChipsStep(state);
    case 'import':
      return validateImportStep(state);
    case 'segments':
      return validateSegmentsStep(state);
    case 'groups':
      return validateGroupsStep(state);
    case 'campaign':
      return validateCampaignStep(state);
    default:
      return { valid: true };
  }
}