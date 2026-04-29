import type {
  AgentResponseDto,
  TaskResponseDto,
  ThreadResponseDto,
} from "@taico/client/v2";
import type {
  InputRequestLike,
  RunMode,
} from "./types.js";

function buildThreadContextInstructions(task: TaskResponseDto, thread: ThreadResponseDto): string[] {
  return [
    '',
    'Thread context:',
    `- This task belongs to thread "${thread.id}" (${thread.title}).`,
    `- This task is ${thread.parentTaskId === task.id ? 'the parent task' : 'an attached task'} in that thread.`,
    `- Read shared thread memory at the start via mcp__context__get_thread_state_memory with threadId "${thread.id}".`,
    `- Check sibling task status via mcp__tasks__list_tasks_by_thread with threadId "${thread.id}".`,
    `- Do not call mcp__tasks__list_tasks_by_thread with the task id "${task.id}"; it expects the thread id "${thread.id}".`,
    `- Keep decisions aligned with this shared memory and thread-level goal, not only this single task.`,
  ];
}

function buildTaskContextInstructions(task: TaskResponseDto): string[] {
  const comments = task.comments ?? [];
  const tags = task.tags ?? [];

  return [
    '',
    'Current task context:',
    `- Task id: ${task.id}`,
    `- Name: ${task.name}`,
    `- Status: ${task.status}`,
    `- Description: ${task.description || '(empty)'}`,
    `- Tags: ${tags.length > 0 ? tags.map((tag) => tag.name).join(', ') : '(none)'}`,
    `- Comments: ${comments.length > 0 ? comments.map((comment) => `${comment.commenterName}: ${comment.content}`).join(' | ') : '(none)'}`,
    '',
    'Tasks MCP notes:',
    `- To refresh this task from MCP, use mcp__tasks__fetch or mcp__tasks__get_task with taskId "${task.id}".`,
    '- mcp__tasks__list_tasks_by_thread requires a thread id, not a task id.',
  ];
}

export function buildPrompt(
  task: TaskResponseDto,
  agent: AgentResponseDto,
  mode: RunMode,
  inputRequest?: InputRequestLike,
  thread?: ThreadResponseDto | null,
) {
  const threadContextInstructions = thread
    ? buildThreadContextInstructions(task, thread)
    : [];
  const taskContextInstructions = buildTaskContextInstructions(task);

  if (mode === 'input_request' && inputRequest) {
    return [
      `You got triggered by an unanswered input request in task "${task.id}".`,
      'You were asked a question and only need to answer that question.',
      'Do not go through the normal flow and do not complete the task unless explicitly requested.',
      '',
      `Input request id: ${inputRequest.id}`,
      `Question: ${String(inputRequest.question ?? '')}`,
      '',
      ...taskContextInstructions,
      ...threadContextInstructions,
      '',
      'Fetch the task, answer the input request assigned to you, and stop there.',
    ].join('\n');
  }

  return [
    `You got triggered by new activity in task "${task.id}".`,
    'Fetch the task and proceed according to the following instructions.',
    ...taskContextInstructions,
    ...threadContextInstructions,
    '',
    agent.systemPrompt,
  ].join('\n');
}
