export interface Scenario {
  id: string;
  title: string;
  description: string | null;
  conflictCharacter: string;
  machineName: string;
  relationship: string;
  servicenature: string;
  objective: string;
  machineMotivation: string;
  keypoints: string;
  difficulty: number;
  soldierGender: string;
  gradeRequirements: string | null;
  skills: string | null;
  active: boolean;
}

export interface SimSession {
  id: string;
  scenarioId: string;
  mode: string;
  status: string;
  messages: string | null;
  score: number | null;
  feedback: string | null;
  skillsRating: string | null;
  grade: string | null;
  startedAt: string;
  completedAt: string | null;
  scenario: { title: string; conflictCharacter: string; machineName: string; difficulty: number };
  user?: { name: string; image: string | null; team: number | null };
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}
