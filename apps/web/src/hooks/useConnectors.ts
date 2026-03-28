import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useConnectors() {
  return useQuery({
    queryKey: ['connectors'],
    queryFn: () => api.connectors.list(),
    staleTime: Infinity, // connectors don't change
  });
}
