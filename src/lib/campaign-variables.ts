import type { Config, Voter } from '@/db';

export type CampaignVariableSource = 'voter' | 'candidate' | 'runtime';

export type CampaignVariableKey =
  | '{nome}'
  | '{bairro}'
  | '{interesse}'
  | '{zona}'
  | '{secao}'
  | '{data}'
  | '{candidato}';

export type CandidateProfileContext = Pick<
  Partial<Config>,
  'candidateDisplayName' | 'candidateOffice' | 'candidateParty' | 'candidateRegion'
>;

export type CampaignVariableDefinition = {
  key: CampaignVariableKey;
  label: string;
  source: CampaignVariableSource;
  description: string;
  previewValue: string;
};

export const SUPPORTED_CAMPAIGN_VARIABLES: CampaignVariableDefinition[] = [
  {
    key: '{nome}',
    label: 'Nome',
    source: 'voter',
    description: 'Nome do eleitor.',
    previewValue: 'Maria',
  },
  {
    key: '{bairro}',
    label: 'Bairro',
    source: 'voter',
    description: 'Bairro cadastrado no CRM.',
    previewValue: 'Centro',
  },
  {
    key: '{interesse}',
    label: 'Interesse',
    source: 'voter',
    description: 'Primeira tag ou interesse principal do eleitor.',
    previewValue: 'Saúde',
  },
  {
    key: '{zona}',
    label: 'Zona',
    source: 'voter',
    description: 'Zona eleitoral do eleitor.',
    previewValue: '101',
  },
  {
    key: '{secao}',
    label: 'Seção',
    source: 'voter',
    description: 'Seção eleitoral do eleitor.',
    previewValue: '22',
  },
  {
    key: '{data}',
    label: 'Data',
    source: 'runtime',
    description: 'Data da execução da campanha ou do agendamento em preview.',
    previewValue: new Date('2026-03-09T12:00:00Z').toLocaleDateString('pt-BR'),
  },
  {
    key: '{candidato}',
    label: 'Candidato',
    source: 'candidate',
    description: 'Nome exibido do candidato configurado em Ajustes.',
    previewValue: 'Nome do candidato',
  },
];

const CAMPAIGN_VARIABLE_BY_KEY = new Map(
  SUPPORTED_CAMPAIGN_VARIABLES.map((variable) => [variable.key, variable]),
);

const CAMPAIGN_VARIABLE_PATTERN = /\{[a-zA-Z0-9_]+\}/g;

export type ValidateTemplateVariablesOptions = {
  candidateProfile?: CandidateProfileContext | null;
  hasVoterData?: boolean;
};

export type ValidateTemplateVariablesResult = {
  variables: string[];
  supportedVariables: CampaignVariableKey[];
  unsupportedVariables: string[];
  unresolvedVariables: CampaignVariableKey[];
  isValid: boolean;
  canResolve: boolean;
};

export type BuildCampaignContextOptions = {
  candidateProfile?: CandidateProfileContext | null;
  voter?: Partial<Voter> | null;
  scheduledAt?: Date | string | null;
  now?: Date;
};

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : '';
}

function dedupeValues<T extends string>(values: readonly T[]) {
  return [...new Set(values)] as T[];
}

function formatCampaignDate(value: Date | string | null | undefined, fallback: Date) {
  if (!value) {
    return fallback.toLocaleDateString('pt-BR');
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback.toLocaleDateString('pt-BR');
  }

  return date.toLocaleDateString('pt-BR');
}

export function getCampaignVariableDefinition(key: string) {
  return CAMPAIGN_VARIABLE_BY_KEY.get(key as CampaignVariableKey) ?? null;
}

export function isCandidateProfileConfigured(candidateProfile?: CandidateProfileContext | null) {
  return normalizeText(candidateProfile?.candidateDisplayName).length > 0;
}

export function extractVariables(template: string) {
  const matches = template.match(CAMPAIGN_VARIABLE_PATTERN) ?? [];
  return [...new Set(matches)];
}

export function validateTemplateVariables(
  template: string,
  options: ValidateTemplateVariablesOptions = {},
): ValidateTemplateVariablesResult {
  const variables = extractVariables(template);
  const supportedVariables = variables.filter(
    (variable): variable is CampaignVariableKey => CAMPAIGN_VARIABLE_BY_KEY.has(variable as CampaignVariableKey),
  );
  const unsupportedVariables = variables.filter(
    (variable) => !CAMPAIGN_VARIABLE_BY_KEY.has(variable as CampaignVariableKey),
  );
  const unresolvedVariables = supportedVariables.filter((variable) => {
    const definition = CAMPAIGN_VARIABLE_BY_KEY.get(variable);

    if (!definition) {
      return false;
    }

    if (definition.source === 'candidate') {
      return !isCandidateProfileConfigured(options.candidateProfile);
    }

    if (definition.source === 'voter') {
      return options.hasVoterData === false;
    }

    return false;
  });

  return {
    variables,
    supportedVariables,
    unsupportedVariables,
    unresolvedVariables,
    isValid: unsupportedVariables.length === 0,
    canResolve: unsupportedVariables.length === 0 && unresolvedVariables.length === 0,
  };
}

export function validateCampaignTemplates(
  templates: Array<string | null | undefined>,
  options: ValidateTemplateVariablesOptions = {},
): ValidateTemplateVariablesResult {
  return templates.reduce<ValidateTemplateVariablesResult>(
    (accumulator, template) => {
      const current = validateTemplateVariables(template ?? '', options);

      return {
        variables: dedupeValues([...accumulator.variables, ...current.variables]),
        supportedVariables: dedupeValues([
          ...accumulator.supportedVariables,
          ...current.supportedVariables,
        ]),
        unsupportedVariables: dedupeValues([
          ...accumulator.unsupportedVariables,
          ...current.unsupportedVariables,
        ]),
        unresolvedVariables: dedupeValues([
          ...accumulator.unresolvedVariables,
          ...current.unresolvedVariables,
        ]),
        isValid: accumulator.isValid && current.isValid,
        canResolve: accumulator.canResolve && current.canResolve,
      };
    },
    {
      variables: [],
      supportedVariables: [],
      unsupportedVariables: [],
      unresolvedVariables: [],
      isValid: true,
      canResolve: true,
    },
  );
}

export function buildCampaignPreviewContext(options: BuildCampaignContextOptions = {}) {
  const now = options.now ?? new Date();
  const firstInterest = options.voter?.tags?.[0];

  return {
    '{nome}': normalizeText(options.voter?.name) || getCampaignVariableDefinition('{nome}')!.previewValue,
    '{bairro}':
      normalizeText(options.voter?.neighborhood) || getCampaignVariableDefinition('{bairro}')!.previewValue,
    '{interesse}': normalizeText(firstInterest) || getCampaignVariableDefinition('{interesse}')!.previewValue,
    '{zona}': normalizeText(options.voter?.zone) || getCampaignVariableDefinition('{zona}')!.previewValue,
    '{secao}': normalizeText(options.voter?.section) || getCampaignVariableDefinition('{secao}')!.previewValue,
    '{data}': formatCampaignDate(options.scheduledAt, now),
    '{candidato}':
      normalizeText(options.candidateProfile?.candidateDisplayName)
      || getCampaignVariableDefinition('{candidato}')!.previewValue,
  } satisfies Record<CampaignVariableKey, string>;
}

export function buildCampaignRuntimeContext(options: BuildCampaignContextOptions = {}) {
  const now = options.now ?? new Date();
  const firstInterest = options.voter?.tags?.[0];

  return {
    '{nome}': normalizeText(options.voter?.name),
    '{bairro}': normalizeText(options.voter?.neighborhood),
    '{interesse}': normalizeText(firstInterest),
    '{zona}': normalizeText(options.voter?.zone),
    '{secao}': normalizeText(options.voter?.section),
    '{data}': formatCampaignDate(options.scheduledAt, now),
    '{candidato}': normalizeText(options.candidateProfile?.candidateDisplayName),
  } satisfies Record<CampaignVariableKey, string>;
}

export function resolveCampaignTemplate(
  template: string,
  context: Partial<Record<CampaignVariableKey, string>>,
) {
  return template.replace(CAMPAIGN_VARIABLE_PATTERN, (variable) => context[variable as CampaignVariableKey] ?? variable);
}

export function formatCampaignVariableList(variables: readonly string[]) {
  return variables.join(', ');
}

export function getTemplateValidationMessage(validation: ValidateTemplateVariablesResult) {
  if (validation.unsupportedVariables.length > 0) {
    return `Variáveis não suportadas: ${formatCampaignVariableList(validation.unsupportedVariables)}.`;
  }

  if (validation.unresolvedVariables.includes('{candidato}')) {
    return 'Configure o perfil do candidato em Ajustes antes de usar {candidato}.';
  }

  if (validation.unresolvedVariables.length > 0) {
    return `Variáveis sem contexto configurado: ${formatCampaignVariableList(validation.unresolvedVariables)}.`;
  }

  return null;
}
