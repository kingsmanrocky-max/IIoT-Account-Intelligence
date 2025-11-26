import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { podcastAPI, PodcastOptions } from '@/lib/api';

// Fetch podcast for a report (with polling when generating)
export function usePodcast(reportId: string) {
  return useQuery({
    queryKey: ['podcast', reportId],
    queryFn: async () => {
      try {
        return await podcastAPI.getPodcast(reportId);
      } catch (error: any) {
        // If 404, return null instead of throwing (podcast doesn't exist yet)
        if (error?.response?.status === 404) {
          return { data: { success: true, data: null } };
        }
        throw error;
      }
    },
    refetchInterval: (query) => {
      const podcast = query.state.data?.data?.data;
      const status = podcast?.status;

      // Poll every 5 seconds while generating
      if (status && ['PENDING', 'GENERATING_SCRIPT', 'GENERATING_AUDIO', 'MIXING'].includes(status)) {
        return 5000;
      }

      // If no podcast exists yet (null), poll less frequently (every 10 seconds)
      // This handles the case where user is viewing a completed report and a podcast gets generated
      if (podcast === null || podcast === undefined) {
        return 10000;
      }

      return false;
    },
    retry: (failureCount, error: any) => {
      // Don't retry 404s (no podcast exists) - this is expected when no podcast has been created
      if (error?.response?.status === 404) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    },
    // Always refetch on window focus to catch completed podcasts
    refetchOnWindowFocus: true,
    // Mark data as stale after 5 seconds so it refetches on focus
    staleTime: 5000,
  });
}

// Fetch podcast status only (lighter weight for status checks)
export function usePodcastStatus(reportId: string, enabled = true) {
  return useQuery({
    queryKey: ['podcast-status', reportId],
    queryFn: () => podcastAPI.getStatus(reportId),
    enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.data?.status;
      if (status && ['PENDING', 'GENERATING_SCRIPT', 'GENERATING_AUDIO', 'MIXING'].includes(status)) {
        return 3000;
      }
      return false;
    },
  });
}

// Generate podcast mutation
export function useGeneratePodcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, options }: { reportId: string; options: PodcastOptions }) =>
      podcastAPI.generate(reportId, options),
    onSuccess: (_, { reportId }) => {
      // Invalidate podcast query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['podcast', reportId] });
      queryClient.invalidateQueries({ queryKey: ['podcast-status', reportId] });
    },
  });
}

// Delete podcast mutation
export function useDeletePodcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => podcastAPI.delete(reportId),
    onSuccess: (_, reportId) => {
      queryClient.invalidateQueries({ queryKey: ['podcast', reportId] });
    },
  });
}

// Fetch templates (cached, rarely changes)
export function usePodcastTemplates() {
  return useQuery({
    queryKey: ['podcast-templates'],
    queryFn: () => podcastAPI.getTemplates(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
