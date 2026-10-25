import { prisma } from '@/lib/prisma';
import {
  DEFAULT_FACTORIES,
  FactoryOption,
  sortFactoryOptions,
} from '@/lib/factory-utils';

export async function getFactoryOptions(options: { includeInactive?: boolean } = {}): Promise<FactoryOption[]> {
  const { includeInactive = true } = options;

  try {
    let factories = await prisma.factory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    if (factories.length === 0) {
      await prisma.factory.createMany({
        data: DEFAULT_FACTORIES.map(({ code, name, color, sortOrder }) => ({
          code,
          name,
          color,
          sortOrder,
        })),
        skipDuplicates: true,
      });
      factories = await prisma.factory.findMany({
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      });
    }

    const optionsList = sortFactoryOptions(factories);
    return includeInactive ? optionsList : optionsList.filter((factory) => factory.isActive);
  } catch (error) {
    console.error('Error loading factory options:', error);
    return DEFAULT_FACTORIES.filter((factory) => includeInactive || factory.isActive);
  }
}
