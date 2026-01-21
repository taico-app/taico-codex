export type AgentRunContext = {
  /** Task / job identity */
  taskId: string;

  /** Initial input */
  prompt: string;

  /** Working directory or sandbox */
  cwd: string;

  /** Resume a previous run if supported */
  resume?: string;

  /** Arbitrary agent-specific config */
  options?: Record<string, any>;
};

export type AgentRunCallbacks = {
  /** Called once when a session/run ID is known */
  onSession?: (sessionId: string) => void | Promise<void>;

  /** Called for every human-readable event */
  onEvent?: (message: string) => void | Promise<void>;
};

export type AgentRunResult = {
  sessionId: string | null;
  events: string[];
  result: string;
};

export interface AgentRunner {
  readonly kind: string;

  run(
    ctx: AgentRunContext,
    cb?: AgentRunCallbacks
  ): Promise<AgentRunResult>;
}
