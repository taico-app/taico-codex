import 'dotenv/config';
import { TaskEntity } from "../../backend/src/tasks/task.entity.js";
import { AgentApiClient } from "./Traff.js";
import { assignHandler } from "./assignHandler.js";
import { TasksListener } from "./ws.js";
import { BASE_URL } from "./helpers/config.js";
import { ClaudeAgentRunner } from './runners/ClaudeAgentRunner.js';


/*
What triggers a run?
- Task must be assigned
- The assignee must be an agent
- The agent must be configured to trigger on the task status
- For now, to manage throughput, that agent cannot have any other active sessions. How do we check this?
*/

const agentApiClient = new AgentApiClient(BASE_URL);

async function processTask(task: TaskEntity, loopBack: (message: string) => void) {
  try {

    // Task must be assigned
    if (!task.assigneeActorId) {
      console.log(`[⏰] task not assigned. Skip.`)
      return;
    }
    if (!task.assigneeActor) {
      console.log(`[⏰] could not find actor for ${task.assigneeActorId}. Skip.`)
      return;
    }

    // Assignee must be an agent
    const agent = await agentApiClient.getAgent(task.assigneeActor?.slug);
    if (!agent) {
      console.log(`[⏰] didn't find agent '${task.assigneeActorId}'. Skip.`);
      return;
    }

    // Agent must react to this task status
    if (!agent.statusTriggers.includes(task.status)) {
      console.log(`[⏰] agent '${task.assigneeActorId}' doesn't react to status '${task.status}'. Skip.`);
      return;
    }

    console.log("GET TO WORK MOTHERFUCKER!");
    assignHandler({
      taskId: task.id,
      agent: agent,
      repo: "https://github.com/galarzafrancisco/ai-monorepo.git",
      messageHandler: loopBack
    });

  } catch(error) {
    console.error(`Error processing event`, error);
  }
}

// Connects to the backend
const listener = new TasksListener(
  BASE_URL,
  (task: TaskEntity, loopBack) => {
    console.log("🔔 task trigger received");
    processTask(task, loopBack);
  }
)
