import { CreateAgentInput } from "src/agents/dto/service/agents.service.types";
import { AgentType } from "src/agents/enums";
import { TaskStatus } from "src/tasks/enums";

export const createOpencodeDev: CreateAgentInput = {
  slug: 'opencode-dev',
  name: 'Opencode developer',
  type: AgentType.OPENCODE,
  description: 'Opencode with a developer persona',
  systemPrompt: 'Execute the /start-task command with the dev persona',
  statusTriggers: [TaskStatus.NOT_STARTED],
  allowedTools: [],
  isActive: true,
  concurrencyLimit: 1,
}