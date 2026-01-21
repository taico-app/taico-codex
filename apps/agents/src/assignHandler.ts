/*
Reacts to a task being assigned

Input:
- task id
- git repo
- agent id
*/

import { AgentResponseDto } from "../../backend/src/agents/dto/agent-response.dto.js";
import { runAgentStream as opencodeRun } from "./runners/OpenCodeAgentRunner.js";
import { AgentRunner } from "./runners/AgentRunner.js";
import { ClaudeAgentRunner } from "./runners/ClaudeAgentRunner.js";
import { getSession, setSession } from "./helpers/sessionStore.js";
import { prepareWorkspace } from "./helpers/prepareWorkspace.js";

/*
Workflow:
- fetch agent. Output:
  - prompt
- fetch session with agent ID and task ID. It might not exist.

- make temp dir in {BASE}/{TASK_ID}/{AGENT_ID}
- clone repo in the temp dir

Session ID exists?
- Start agent resuming session
- Start agent with new session & store session

*/

export type AssignHandlerProps = {
  taskId: string,
  agent: AgentResponseDto,
  repo: string,
  messageHandler: (message: string) => void | Promise<void>,
}
export async function assignHandler({ taskId, agent, repo, messageHandler }) {

  const { systemPrompt: prompt, slug: agentId } = agent;

  // Load session
  const sessionId = getSession(agentId, taskId);

  const { repoDir } = await prepareWorkspace(taskId, agentId, repo);
  let runner: AgentRunner;
  if (agent.type === 'claude') {
    runner = new ClaudeAgentRunner();
    // } else if (agent.type === 'opencode') {
    //   runner = opencodeRun;
  } else {
    return {
      sessionId: sessionId ?? null,
      workDir: repoDir,
      result: `Agent of type ${agent.type} does not have a runner. Skipping.`,
    }
  }

  const result = await runner.run(
    {
      taskId,
      prompt: `${prompt} task: ${taskId}`,
      cwd: repoDir,
      resume: sessionId ?? undefined,
    },
    {
      // Persist immediately when init arrives
      onSession: async (sid) => {
        if (!sessionId) {
          setSession(agentId, taskId, sid);
        }
      },
      // Optional: stream events to logs / websocket / task updates
      onEvent: (message: string) => {
        console.log(message);
        messageHandler(message);
      }
    });

  return {
    sessionId: sessionId ?? null,
    workDir: repoDir,
    result: result.result,
  };
}
