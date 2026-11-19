'use client';

import { type Profile, type ProfileUpdate, updateProfile } from '@mybela/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/session';
import { calorieInsightsQueryKey, dailySummaryQueryKey, profileQueryKey } from '../home/queries';

/**
 * Saves Health & goals changes (F3) with `PATCH /profile`. It waits for the answer instead of
 * queueing offline, because the new calorie target it returns is shown right away. Everything
 * planned around the target is refreshed afterwards.
 */
export function useUpdateProfile() {
  const userId = useSession()?.user.id;
  const queryClient = useQueryClient();
  return useMutation<Profile, Error, ProfileUpdate>({
    mutationFn: updateProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey(userId), profile);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: dailySummaryQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: calorieInsightsQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: ['meal-suggestions', userId] }),
      ]);
    },
  });
}
