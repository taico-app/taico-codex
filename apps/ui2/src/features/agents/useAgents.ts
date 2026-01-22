import { useEffect, useState } from 'react';
import { AgentsService } from './api';
import type { Agent } from './types';
import type { TaskStatus } from '../../shared/const/taskStatus';

export const useAgents = () => {
  // UI feedback
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data store
  const [agents, setAgents] = useState<Agent[]>([]);

  // Boot
  useEffect(() => {
    loadAgents();
  }, []);

  // Sort agents by updatedAt (newest first)
  const sortAgents = (agents: Agent[]): Agent[] => {
    return [...agents].sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
  };

  // Load agents
  const loadAgents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await AgentsService.agentsControllerListAgents();
      setAgents(sortAgents(response.items || []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  };

  // Load agent details
  const loadAgentDetails = async (slug: string): Promise<Agent | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const agent = await AgentsService.agentsControllerGetAgentBySlug(slug);
      return agent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent details');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Update agent
  const updateAgent = async (actorId: string, updates: { systemPrompt?: string; statusTriggers?: TaskStatus[] }): Promise<Agent | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedAgent = await AgentsService.agentsControllerPatchAgent(actorId, updates);

      // Update local state
      setAgents((prevAgents) => {
        const newAgents = prevAgents.map((agent) =>
          agent.actorId === actorId ? updatedAgent : agent
        );
        return sortAgents(newAgents);
      });

      return updatedAgent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // UI feedback
    isLoading,
    error,

    // Data
    agents,
    loadAgents,
    loadAgentDetails,
    updateAgent,
  };
};
