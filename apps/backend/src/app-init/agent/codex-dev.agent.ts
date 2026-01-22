import { CreateAgentInput } from "src/agents/dto/service/agents.service.types";
import { AgentType } from "src/agents/enums";
import { TaskStatus } from "src/tasks/enums";

export const createCodexDev: CreateAgentInput = {
  slug: 'codex-dev',
  name: 'Codex developer',
  type: AgentType.CODEX,
  description: 'Codex with a developer persona',
  systemPrompt: 'Execute the /start-task command with the dev persona',
  statusTriggers: [TaskStatus.NOT_STARTED],
  allowedTools: [],
  isActive: true,
  concurrencyLimit: 1,
}