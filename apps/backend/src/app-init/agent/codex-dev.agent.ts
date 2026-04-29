import { CreateAgentInput } from 'src/agents/dto/service/agents.service.types';
import { getAgentAvatarUrlById } from 'src/agents/agent-avatar.library';
import { AgentType } from 'src/agents/enums';
import { TaskStatus } from 'src/tasks/enums';
import { DEV_PROMPT } from '../prompts/prompts';
import { GPT_5_5 } from '../models/models';

export const createCodexDev: CreateAgentInput = {
  slug: 'gpt-codex-dev',
  name: 'GPT Codex Developer',
  type: AgentType.CODEX,
  providerId: GPT_5_5.providerId,
  modelId: GPT_5_5.modelId,
  avatarUrl: getAgentAvatarUrlById('openai'),
  description:
    'GPT Codex with a Developer persona, running on the Codex app-server harness',
  systemPrompt: DEV_PROMPT,
  statusTriggers: [TaskStatus.NOT_STARTED],
  allowedTools: ['plugin://google-calendar@openai-curated'],
  isActive: true,
  concurrencyLimit: 1,
};
