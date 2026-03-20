export interface TaskUser {
  id: string;
  name: string;
  image: string | null;
}

export interface TaskResponse {
  id: string;
  content: string;
  createdAt: string;
  user: TaskUser;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string;
  startDate: string;
  endDate: string | null;
  dueDate: string | null;
  allDay: boolean;
  priority: string;
  recurring: boolean;
  status: string;
  userId: string | null;
  user: TaskUser | null;
  responses: TaskResponse[];
}

export interface TaskFormData {
  title: string;
  description: string;
  category: string;
  startDate: string;
  startTime: string;
  endTime: string;
  dueDate: string;
  priority: string;
  allDay: boolean;
}
