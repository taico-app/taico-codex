import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface, type Interface } from "node:readline";
import { BaseAgentRunner } from "./BaseAgentRunner.js";
import { EXECUTION_ID_HEADER } from "../helpers/config.js";
import {
  AgentModelConfig,
  AgentRunContext,
  Model,
  RuntimeMcpServerConfig,
  TokenUsage,
} from "./AgentRunner.js";
import { InterruptedExecutionError } from "../task-execution-errors.js";

type JsonObject = Record<string, any>;

type JsonRpcMessage = {
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};

type PendingRequest = {
  method: string;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type CodexAppServerClient = {
  request<T>(method: string, params?: JsonObject): Promise<T>;
  notify(method: string, params?: JsonObject): void;
  onNotification(listener: (message: JsonRpcMessage) => void | Promise<void>): () => void;
  close(): void;
};

type CodexMentionInput = {
  name: string;
  path: string;
};

const REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_MODEL: Model = {
  providerId: 'openai',
  modelId: 'gpt-5.5',
};

function stopProcessTree(proc: ChildProcessWithoutNullStreams): void {
  if (proc.exitCode !== null || proc.signalCode !== null) {
    return;
  }

  if (process.platform === 'win32' && proc.pid) {
    const result = spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F'], {
      windowsHide: true,
    });
    if (!result.error && result.status === 0) {
      return;
    }
  }

  if (process.platform !== 'win32' && proc.pid) {
    try {
      process.kill(-proc.pid, 'SIGTERM');
    } catch {
      proc.kill('SIGTERM');
    }

    setTimeout(() => {
      if (proc.exitCode !== null || proc.signalCode !== null || !proc.pid) {
        return;
      }
      try {
        process.kill(-proc.pid, 'SIGKILL');
      } catch {
        proc.kill('SIGKILL');
      }
    }, 1_000).unref();
    return;
  }

  proc.kill('SIGTERM');
}

export class CodexAgentRunner extends BaseAgentRunner {
  readonly kind = 'codex';

  private readonly model: Model;
  private client: CodexAppServerClient | null = null;
  private activeThreadId: string | null = null;
  private activeTurnId: string | null = null;
  private interruptRequested = false;

  constructor(modelConfig: AgentModelConfig = {}) {
    super();
    this.model = {
      providerId: modelConfig.providerId ?? DEFAULT_MODEL.providerId,
      modelId: modelConfig.modelId ?? DEFAULT_MODEL.modelId,
    };
  }

  override getModel(): Model {
    return this.model;
  }

  async cancel(): Promise<void> {
    this.interruptRequested = true;
    if (this.client && this.activeThreadId && this.activeTurnId) {
      try {
        await this.client.request('turn/interrupt', {
          threadId: this.activeThreadId,
          turnId: this.activeTurnId,
        });
        return;
      } catch (error) {
        console.warn('[CodexAgentRunner] Failed to interrupt turn:', error);
      }
    }

    this.client?.close();
  }

  protected async runInternal(
    ctx: AgentRunContext,
    emit: (msg: string) => Promise<void>,
    setSession: (id: string) => Promise<void>,
    onError?: (error: { message: string; rawMessage?: any }) => void | Promise<void>,
    onToolCall?: (toolName: string) => void | Promise<void>,
    onTokenUsage?: (usage: TokenUsage) => void | Promise<void>,
  ): Promise<string> {
    if (ctx.abortSignal?.aborted) {
      throw new InterruptedExecutionError('Codex agent execution was interrupted before start');
    }

    this.interruptRequested = false;
    let finalResult = '';
    let removeAbortListener: (() => void) | undefined;

    try {
      this.client = await createCodexAppServerClient({
        cwd: ctx.cwd,
        command: normalizeStringOption(ctx.options?.codexCommand) ?? 'codex',
        args: normalizeStringArrayOption(ctx.options?.codexArgs) ?? ['app-server'],
      });

      await this.client.request('initialize', {
        clientInfo: {
          name: 'taico_worker',
          title: 'Taico Worker',
          version: '0.1.0',
        },
        capabilities: {
          experimentalApi: true,
        },
      });
      this.client.notify('initialized', {});

      const turnCompleted = new Promise<string>((resolve, reject) => {
        const unsubscribe = this.client!.onNotification(async (message) => {
          try {
            const formatted = formatCodexNotification(message, ctx.agentSlug);
            for (const event of formatted.events) {
              await emit(event);
            }
            for (const toolName of formatted.toolCalls) {
              await onToolCall?.(toolName);
            }
            if (formatted.usage) {
              await onTokenUsage?.(formatted.usage);
            }
            if (formatted.finalResult) {
              finalResult = formatted.finalResult;
            }

            if (message.method === 'turn/started') {
              const turnId = normalizeRequiredString(
                message.params?.turn?.id,
                'turn.id',
              );
              this.activeTurnId = turnId;
            }

            if (message.method === 'turn/completed') {
              unsubscribe();
              const status = normalizeNullableString(message.params?.turn?.status);
              if (this.interruptRequested || status === 'interrupted') {
                reject(new InterruptedExecutionError('Codex agent execution was interrupted'));
                return;
              }
              resolve(finalResult);
            }
          } catch (error) {
            unsubscribe();
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });
      });

      if (ctx.abortSignal) {
        const onAbort = () => {
          void this.cancel();
        };
        ctx.abortSignal.addEventListener('abort', onAbort, { once: true });
        removeAbortListener = () => ctx.abortSignal?.removeEventListener('abort', onAbort);
      }

      const threadResult = await this.client.request<{ thread?: { id?: unknown } }>(
        ctx.resume ? 'thread/resume' : 'thread/start',
        {
          ...(ctx.resume ? { threadId: ctx.resume } : {}),
          model: this.model.modelId,
          modelProvider: this.model.providerId,
          cwd: ctx.cwd,
          approvalPolicy: normalizeStringOption(ctx.options?.approvalPolicy) ?? 'never',
          sandbox: normalizeCodexSandbox(ctx.options?.sandbox),
          serviceName: 'taico_worker',
          config: buildCodexConfig(ctx),
        },
      );

      const threadId = normalizeRequiredString(threadResult.thread?.id, 'thread.id');
      this.activeThreadId = threadId;
      await setSession(threadId);

      await this.client.request('turn/start', {
        threadId,
        input: buildCodexInput(ctx.prompt, normalizeCodexMentions(ctx.options?.codexMentions)),
        model: this.model.modelId,
        cwd: ctx.cwd,
        approvalPolicy: normalizeStringOption(ctx.options?.approvalPolicy) ?? 'never',
      });

      return await turnCompleted;
    } catch (error) {
      if (this.interruptRequested) {
        throw new InterruptedExecutionError('Codex agent execution was interrupted');
      }

      if (onError && error instanceof Error) {
        await onError({
          message: error.message,
          rawMessage: error,
        });
      }
      throw error;
    } finally {
      removeAbortListener?.();
      this.client?.close();
      this.client = null;
      this.activeThreadId = null;
      this.activeTurnId = null;
    }
  }
}

async function createCodexAppServerClient({
  cwd,
  command,
  args,
}: {
  cwd: string;
  command: string;
  args: string[];
}): Promise<CodexAppServerClient> {
  const proc = spawn(command, args, {
    cwd,
    detached: process.platform !== 'win32',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env,
  });
  const pending = new Map<number, PendingRequest>();
  const notificationListeners = new Set<(message: JsonRpcMessage) => void | Promise<void>>();
  let nextId = 1;
  let closed = false;
  let stderr = '';
  let readline: Interface | undefined;

  const close = () => {
    if (closed) {
      return;
    }
    closed = true;
    readline?.close();
    for (const [id, request] of pending) {
      clearTimeout(request.timer);
      request.reject(new Error(`Codex app-server closed during ${request.method} (id=${id}).`));
    }
    pending.clear();
    stopProcessTree(proc);
  };

  await new Promise<void>((resolve, reject) => {
    const fail = (error: Error) => {
      close();
      reject(error);
    };

    proc.once('spawn', resolve);
    proc.once('error', (error) => {
      fail(error);
    });
    proc.once('exit', (code, signal) => {
      if (!closed) {
        fail(
          new Error(
            `Codex app-server exited before startup (code=${code}, signal=${signal})${stderr.trim() ? `\n${stderr}` : ''}`,
          ),
        );
      }
    });
  });

  readline = createInterface({ input: proc.stdout });
  readline.on('line', (line) => {
    let message: JsonRpcMessage;

    try {
      message = JSON.parse(line) as JsonRpcMessage;
    } catch {
      return;
    }

    if (typeof message.id === 'number' && pending.has(message.id)) {
      const request = pending.get(message.id)!;
      pending.delete(message.id);
      clearTimeout(request.timer);

      if (message.error) {
        request.reject(
          new Error(
            `Codex app-server ${request.method} failed: ${message.error.message ?? 'Unknown error'}`,
          ),
        );
        return;
      }

      request.resolve(message.result);
      return;
    }

    if (typeof message.id === 'number' && typeof message.method === 'string') {
      respondToServerRequest(proc, message);
      return;
    }

    if (typeof message.method === 'string') {
      for (const listener of notificationListeners) {
        void Promise.resolve(listener(message)).catch((error) => {
          console.warn('[CodexAgentRunner] Notification listener failed:', error);
        });
      }
    }
  });

  proc.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  proc.once('exit', () => {
    close();
  });

  return {
    request<T>(method: string, params?: JsonObject): Promise<T> {
      if (closed) {
        return Promise.reject(new Error('Codex app-server is closed.'));
      }

      const id = nextId++;
      const message = params === undefined ? { id, method } : { id, method, params };

      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Codex app-server request ${method} timed out.`));
        }, REQUEST_TIMEOUT_MS);

        pending.set(id, {
          method,
          resolve,
          reject,
          timer,
        });

        proc.stdin.write(`${JSON.stringify(message)}\n`);
      });
    },
    notify(method: string, params?: JsonObject): void {
      if (closed) {
        return;
      }
      const message = params === undefined ? { method } : { method, params };
      proc.stdin.write(`${JSON.stringify(message)}\n`);
    },
    onNotification(listener) {
      notificationListeners.add(listener);
      return () => {
        notificationListeners.delete(listener);
      };
    },
    close,
  };
}

function respondToServerRequest(
  proc: ChildProcessWithoutNullStreams,
  message: JsonRpcMessage,
): void {
  if (typeof message.id !== 'number') {
    return;
  }

  if (message.method === 'item/commandExecution/requestApproval') {
    proc.stdin.write(`${JSON.stringify({ id: message.id, result: { decision: 'acceptForSession' } })}\n`);
    return;
  }

  if (message.method === 'item/fileChange/requestApproval') {
    proc.stdin.write(`${JSON.stringify({ id: message.id, result: { decision: 'acceptForSession' } })}\n`);
    return;
  }

  if (message.method === 'item/tool/requestUserInput') {
    proc.stdin.write(
      `${JSON.stringify({
        id: message.id,
        result: {
          answers: buildAcceptAnswers(message.params?.questions),
        },
      })}\n`,
    );
    return;
  }

  if (message.method === 'mcpServer/elicitation/request') {
    proc.stdin.write(
      `${JSON.stringify({
        id: message.id,
        result: {
          action: 'accept',
          content: null,
          _meta: null,
        },
      })}\n`,
    );
    return;
  }

  if (message.method === 'item/permissions/requestApproval') {
    proc.stdin.write(
      `${JSON.stringify({
        id: message.id,
        result: {
          permissions: {
            network: message.params?.permissions?.network ?? undefined,
            fileSystem: message.params?.permissions?.fileSystem ?? undefined,
          },
          scope: 'session',
        },
      })}\n`,
    );
    return;
  }

  if (message.method === 'applyPatchApproval' || message.method === 'execCommandApproval') {
    proc.stdin.write(`${JSON.stringify({ id: message.id, result: { decision: 'approved_for_session' } })}\n`);
    return;
  }

  proc.stdin.write(
    `${JSON.stringify({
      id: message.id,
      error: {
        code: -32601,
        message: `Unsupported Codex app-server request: ${message.method}`,
      },
    })}\n`,
  );
}

function buildAcceptAnswers(questions: unknown): Record<string, { answers: string[] }> {
  if (!Array.isArray(questions)) {
    return {};
  }

  return Object.fromEntries(
    questions
      .filter((question): question is { id: string; options?: Array<{ label?: unknown }> | null } =>
        typeof question?.id === 'string',
      )
      .map((question) => {
        const labels = (question.options ?? [])
          .map((option) => option.label)
          .filter((label): label is string => typeof label === 'string');
        const acceptLabel =
          labels.find((label) => /^accept$/i.test(label)) ??
          labels.find((label) => /accept|approve|allow/i.test(label)) ??
          labels[0] ??
          'Accept';

        return [question.id, { answers: [acceptLabel] }];
      }),
  );
}

function buildCodexConfig(ctx: AgentRunContext): JsonObject {
  const mcpServers =
    ctx.mcpServers ?? {
      tasks: {
        type: 'http' as const,
        url: `${ctx.baseUrl}/api/v1/tasks/tasks/mcp`,
        headers: {
          Authorization: `Bearer ${ctx.accessToken}`,
          [EXECUTION_ID_HEADER]: ctx.executionId,
        },
      },
      context: {
        type: 'http' as const,
        url: `${ctx.baseUrl}/api/v1/context/blocks/mcp`,
        headers: {
          Authorization: `Bearer ${ctx.accessToken}`,
          [EXECUTION_ID_HEADER]: ctx.executionId,
        },
      },
    };

  const codexMcpServers = Object.fromEntries(
    Object.entries(mcpServers).map(([serverName, serverConfig]) => [
      serverName,
      toCodexMcpServerConfig(serverConfig),
    ]),
  );

  return {
    mcp_servers: codexMcpServers,
  };
}

function toCodexMcpServerConfig(serverConfig: RuntimeMcpServerConfig): JsonObject {
  if (serverConfig.type === 'http') {
    return {
      url: serverConfig.url,
      http_headers: serverConfig.headers,
      required: true,
    };
  }

  return {
    command: serverConfig.command,
    args: serverConfig.args,
    required: true,
  };
}

function formatCodexNotification(
  message: JsonRpcMessage,
  agentSlug?: string,
): {
  events: string[];
  toolCalls: string[];
  usage: TokenUsage | null;
  finalResult: string | null;
} {
  const agentLabel = agentSlug ? `@${agentSlug}` : 'Assistant';
  const events: string[] = [];
  const toolCalls: string[] = [];
  let finalResult: string | null = null;
  const params = message.params;

  if (message.method === 'item/completed') {
    const item = params?.item;
    if (item?.type === 'agentMessage' && typeof item.text === 'string' && item.text.trim()) {
      finalResult = item.text;
      events.push(`💬 ${agentLabel}: ${item.text}`);
    } else if (item?.type === 'reasoning') {
      events.push(`💬 ${agentLabel}: Thinking...`);
    } else if (item?.type === 'commandExecution') {
      const command = normalizeNullableString(item.command) ?? 'command';
      events.push(`🔧 ${agentLabel} Command ${item.status ?? 'completed'}: ${command}`);
    } else if (item?.type === 'fileChange') {
      events.push(`🔧 ${agentLabel} File changes ${item.status ?? 'completed'}`);
    } else if (item?.type === 'mcpToolCall') {
      const toolName = `${item.server ?? 'mcp'}.${item.tool ?? 'tool'}`;
      events.push(`🔧 ${agentLabel} Tool response: ${toolName}`);
    }
  }

  if (message.method === 'item/started') {
    const item = params?.item;
    if (item?.type === 'mcpToolCall') {
      const toolName = `${item.server ?? 'mcp'}.${item.tool ?? 'tool'}`;
      toolCalls.push(toolName);
      events.push(`🔧 ${agentLabel} Tool call: ${toolName}`);
    } else if (item?.type === 'commandExecution') {
      const command = normalizeNullableString(item.command) ?? 'command';
      toolCalls.push('commandExecution');
      events.push(`🔧 ${agentLabel} Command: ${command}`);
    }
  }

  if (message.method === 'error') {
    const errorMessage = normalizeNullableString(params?.message) ?? JSON.stringify(params);
    events.push(`❌ ${agentLabel} Error: ${errorMessage}`);
  }

  return {
    events,
    toolCalls,
    usage: extractCodexTokenUsage(message),
    finalResult,
  };
}

function extractCodexTokenUsage(message: JsonRpcMessage): TokenUsage | null {
  if (message.method !== 'thread/tokenUsage/updated') {
    return null;
  }

  const total = message.params?.tokenUsage?.total;
  if (!total || typeof total !== 'object') {
    return null;
  }

  const inputTokens = toTokenCount(total.inputTokens);
  const outputTokens = toTokenCount(total.outputTokens);
  let totalTokens = toTokenCount(total.totalTokens);

  if (
    totalTokens === null &&
    inputTokens !== null &&
    outputTokens !== null
  ) {
    totalTokens = inputTokens + outputTokens;
  }

  if (inputTokens === null && outputTokens === null && totalTokens === null) {
    return null;
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

function normalizeRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Codex app-server returned invalid ${field}.`);
  }

  return value;
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function normalizeStringOption(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function normalizeStringArrayOption(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    return null;
  }

  return value;
}

function normalizeCodexMentions(value: unknown): CodexMentionInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      item &&
      typeof item === 'object' &&
      'name' in item &&
      'path' in item &&
      typeof item.name === 'string' &&
      typeof item.path === 'string' &&
      item.name.trim() &&
      item.path.trim()
    ) {
      return [
        {
          name: item.name.trim(),
          path: item.path.trim(),
        },
      ];
    }

    return [];
  });
}

function buildCodexInput(prompt: string, mentions: CodexMentionInput[]): JsonObject[] {
  const mentionText = mentions.map((mention) => `$${mention.name}`).join(' ');
  const text = mentionText ? `${mentionText}\n\n${prompt}` : prompt;

  return [
    {
      type: 'text',
      text,
      text_elements: [],
    },
    ...mentions.map((mention) => ({
      type: 'mention',
      name: mention.name,
      path: mention.path,
    })),
  ];
}

function normalizeCodexSandbox(value: unknown): string {
  const sandbox = normalizeStringOption(value) ?? 'workspace-write';

  switch (sandbox) {
    case 'readOnly':
    case 'read-only':
      return 'read-only';
    case 'workspaceWrite':
    case 'workspace-write':
      return 'workspace-write';
    case 'dangerFullAccess':
    case 'danger-full-access':
      return 'danger-full-access';
    default:
      return sandbox;
  }
}

function toTokenCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.trunc(value);
}
