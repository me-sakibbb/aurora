import type { QueryClient } from '@tanstack/react-query';
import { registerCycleMutations } from '../features/cycle/queries';
import { registerFoodMutations } from '../features/food/log-queries';

/**
 * Registers every "must not lose it" write by key, before paused mutations are restored and
 * replayed: a mutation saved offline can only resume if its function is known (see
 * docs/architecture.md).
 */
export function registerMutationDefaults(queryClient: QueryClient) {
  registerCycleMutations(queryClient);
  registerFoodMutations(queryClient);
}
