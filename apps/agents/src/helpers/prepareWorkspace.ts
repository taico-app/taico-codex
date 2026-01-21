// workspace.ts
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ensureRepo } from "./ensureRepo.js";

const BASE_DIR =
  "/Users/franciscogalarza/tmp"; // TODO: temporary hard code. Gotta be an absolute path.

// TODO: hardcoded for now. Should come from the project associated with the task.
const REPO = "https://github.com/galarzafrancisco/ai-monorepo.git";

export async function prepareWorkspace(
  taskId: string,
  agentId: string,
) {
  console.log(`prepping workspace for agent '${agentId}' to work on task '${taskId}'`);
  const workDir = join(BASE_DIR, taskId, agentId);
  const repoDir = join(workDir, "repo");

  // Ensure directories exist
  mkdirSync(workDir, { recursive: true });

  // Ensure repo exists inside workspace
  await ensureRepo(REPO, repoDir);

  return {
    workDir,
    repoDir,
  };
}
