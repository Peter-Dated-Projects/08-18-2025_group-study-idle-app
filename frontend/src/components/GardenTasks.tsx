import { useState } from "react";

interface TaskProps {
  id: string;
  title: string;
  completed: boolean;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

const DEBUG_INITIAL_STATE = [
  { id: "1", title: "Sample Task", completed: false },
  { id: "2", title: "Another Task", completed: true },
  { id: "3", title: "Third Task", completed: false },
];

export default function GardenTasks() {
  const [taskList, setTaskList] = useState<Task[]>(DEBUG_INITIAL_STATE);

  function addTask(title: string) {
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      completed: false,
    };
    setTaskList((prevTasks) => [...prevTasks, newTask]);
  }

  return (
    <>
      <div>Task List</div>
      <ul>
        {taskList.map((task) => (
          <li key={task.id}>
            {task.title} - {task.completed ? "Completed" : "Pending"}
          </li>
        ))}
      </ul>
    </>
  );
}
