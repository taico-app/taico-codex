import { useNavigate } from "react-router-dom";
import { BoardCardAnimation } from "../../ui/primitives";
import { useTasksCtx } from "./TasksProvider"
import { Task } from "./types";
import { TaskCard } from "./TaskCard";

export function TasksToCards({ tasks, enteringIds, exitingTasks }: { tasks: Task[], enteringIds: Set<string>, exitingTasks: Task[] }): JSX.Element {
  const navigate = useNavigate();
  const { activityByTaskId } = useTasksCtx();

  // Merge tasks and exitingTasks, sorted by updatedAt (descending) to maintain original order
  const exitingIdSet = new Set(exitingTasks.map(t => t.id));

  const allTasks = [...tasks, ...exitingTasks].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <>
      {allTasks.map(task => {
        const isExiting = exitingIdSet.has(task.id);
        const isEntering = enteringIds.has(task.id);

        const activity = activityByTaskId[task.id];

        let animation: BoardCardAnimation | undefined;
        if (isExiting) animation = 'exiting';
        else if (isEntering) animation = 'entering';

        return (
          <TaskCard
            key={isExiting ? `exiting-${task.id}` : task.id}
            task={task}
            animation={animation}
            onClick={() => navigate(`/tasks/task/${task.id}`)}
            pulseKey={activity?.ts}
          />
        );
      })}
    </>
  )
}
