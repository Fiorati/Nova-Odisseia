import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { journeyDefaults, type TravessiaState } from "@shared/travessia";

/** Estado da jornada salvo na conta, com o navegador como reserva. Todas as ações dos portais gravam por aqui. */
export function useJourneyStore() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const query = trpc.agent.journey.useQuery();
  const key = user ? `nova-odisseia-journey-v1-${user.id}` : null;
  let local: TravessiaState | null = null;
  try { local = key ? JSON.parse(localStorage.getItem(key) || "null") : null; } catch { local = null; }
  const state = ((query.data?.state as TravessiaState | undefined) ?? local ?? journeyDefaults);
  const mutation = trpc.agent.saveJourney.useMutation();
  const save = async (next: TravessiaState) => {
    if (key) localStorage.setItem(key, JSON.stringify(next));
    utils.agent.journey.setData(undefined, { state: next, updatedAt: new Date() } as never);
    await mutation.mutateAsync(next as never);
    await utils.agent.journey.invalidate();
  };
  return { state, save, saving: mutation.isPending, ready: query.isFetched };
}
