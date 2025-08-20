import { useState, useEffect } from "react";
import { HeaderFont } from "./utils";

export const AUTH_TOKEN_KEY = "auth_token";

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [taskList, setTaskList] = useState<Task[]>(DEBUG_INITIAL_STATE);

  function addTask(title: string) {
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      completed: false,
    };
    setTaskList((prevTasks) => [...prevTasks, newTask]);
  }

  useEffect(() => {
    // determine if logged in or not
    const auth_token = localStorage.getItem(AUTH_TOKEN_KEY);
    setIsLoggedIn(auth_token == null);
  }, []);

  return (
    <>
      <div>
        <h1 style={{ fontFamily: HeaderFont, fontSize: "32px" }}>Task List</h1>
        <div>
          {isLoggedIn ? (
            <div>
              <ul>
                {taskList.map((task) => (
                  <li key={task.id}>
                    {task.title} - {task.completed ? "Completed" : "Pending"}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div>Please log in to view your tasks.</div>
          )}
        </div>
      </div>
    </>
  );
}
