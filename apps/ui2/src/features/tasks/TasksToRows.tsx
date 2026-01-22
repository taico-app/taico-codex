import { useNavigate } from "react-router-dom";
import { DataRowAnimation, DataRowContainer } from "../../ui/primitives";
import { useTasksCtx } from "./TasksProvider"
import { Task } from "./types";
import { TaskRow } from "./TaskRow";

export function TasksToRows({ tasks, enteringIds, exitingTasks }: { tasks: Task[], enteringIds: Set<string>, exitingTasks: Task[] }): JSX.Element {
  const navigate = useNavigate();
  const { activityByTaskId } = useTasksCtx();

  // Merge tasks and exitingTasks, sorted by updatedAt (descending) to maintain original order
  const exitingIdSet = new Set(exitingTasks.map(t => t.id));

  const allTasks = [...tasks, ...exitingTasks].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <DataRowContainer>
      {allTasks.map(task => {
        const isExiting = exitingIdSet.has(task.id);
        const isEntering = enteringIds.has(task.id);

        let animation: DataRowAnimation | undefined;
        if (isExiting) animation = 'exiting';
        else if (isEntering) animation = 'entering';

        const activity = activityByTaskId[task.id];

        return (
          <TaskRow
            key={isExiting ? `exiting-${task.id}` : task.id}
            task={task}
            animation={animation}
            pulseKey={activity?.ts}
            onClick={() => navigate(`/tasks/task/${task.id}`)}
          />
        );
      })}
    </DataRowContainer>
  )
}
