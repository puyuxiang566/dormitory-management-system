export interface FactoryOption {
  id: number;
  code: string;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

export const DEFAULT_FACTORIES: FactoryOption[] = [
  { id: 1, code: 'imcn', name: 'IMCN', color: '#10b981', sortOrder: 0, isActive: true },
  { id: 2, code: 'imft', name: 'IMFT', color: '#8b5cf6', sortOrder: 1, isActive: true },
  { id: 3, code: 'imaw', name: 'IMAW', color: '#f59e0b', sortOrder: 2, isActive: true },
  { id: 4, code: '职能部门', name: '职能部门', color: '#ec4899', sortOrder: 3, isActive: true },
];

export const UNKNOWN_FACTORY_COLOR = '#94a3b8';

export function normalizeFactoryCode(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed.toLowerCase() : trimmed;
}

export function sortFactoryOptions(factories: FactoryOption[]): FactoryOption[] {
  return [...factories].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id - b.id;
  });
}

export function findFactory(factories: FactoryOption[], code?: string | null): FactoryOption | undefined {
  if (!code) return undefined;
  const normalized = normalizeFactoryCode(code);
  return (
    factories.find((factory) => normalizeFactoryCode(factory.code) === normalized) ||
    factories.find((factory) => factory.name === code)
  );
}

export function getFactoryDisplayName(factories: FactoryOption[], code?: string | null): string {
  if (!code) return '未知';
  const factory = findFactory(factories, code);
  if (factory) return factory.name;
  return /^[A-Za-z0-9_-]+$/.test(code) ? code.toUpperCase() : code;
}

export function getFactoryColor(factories: FactoryOption[], code?: string | null): string {
  const factory = findFactory(factories, code);
  return factory?.color || UNKNOWN_FACTORY_COLOR;
}

export function buildFactoryNameMap(factories: FactoryOption[]): Record<string, string> {
  const map: Record<string, string> = {};
  factories.forEach((factory) => {
    map[factory.code] = factory.name;
    map[normalizeFactoryCode(factory.code)] = factory.name;
    map[factory.name] = factory.name;
    if (/^[A-Za-z0-9_-]+$/.test(factory.code)) {
      map[factory.code.toUpperCase()] = factory.name;
    }
  });
  return map;
}

export function buildFactoryColorMap(factories: FactoryOption[]): Record<string, string> {
  const map: Record<string, string> = {};
  factories.forEach((factory) => {
    map[factory.code] = factory.color;
    map[normalizeFactoryCode(factory.code)] = factory.color;
    map[factory.name] = factory.color;
    if (/^[A-Za-z0-9_-]+$/.test(factory.code)) {
      map[factory.code.toUpperCase()] = factory.color;
    }
  });
  return map;
}
