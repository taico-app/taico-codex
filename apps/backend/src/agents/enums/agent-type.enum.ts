export enum AgentType {
  CLAUDE = 'claude',
  CODEX = 'codex',
  OPENCODE = 'opencode',
  OTHER = 'other',
};

export const DEFAULT_AGENT_AVATAR: Record<AgentType, string | null> = {
  [AgentType.CLAUDE]: '/icons/claude-ai-icon.webp',
  [AgentType.CODEX]: '/icons/OpenAI-white-monoblossom.svg',
  [AgentType.OPENCODE]: '/icons/opencode-logo-dark.svg',
  [AgentType.OTHER]: null,
};