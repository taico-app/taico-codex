import { CreateAgentInput } from 'src/agents/dto/service/agents.service.types';
import { getAgentAvatarUrlById } from 'src/agents/agent-avatar.library';
import { AgentType } from 'src/agents/enums';
import { TaskStatus } from 'src/tasks/enums';
import { ASSISTANT_PROMPT } from '../prompts/prompts';
import { GPT_5_5 } from '../models/models';

export const createGeneralHelper: CreateAgentInput = {
  slug: 'helper',
  name: 'General Helper',
  type: AgentType.CODEX,
  providerId: GPT_5_5.providerId,
  modelId: GPT_5_5.modelId,
  avatarUrl: getAgentAvatarUrlById('openai'),
  description: 'General helper for task execution.',
  systemPrompt: ASSISTANT_PROMPT,
  statusTriggers: [TaskStatus.NOT_STARTED],
  tagTriggers: [],
  allowedTools: [],
  isActive: true,
  concurrencyLimit: 1,
};
