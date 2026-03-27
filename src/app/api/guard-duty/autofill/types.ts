export interface EligibleUser {
  id: string;
  name: string;
  nameEn?: string | null;
  team: number | null;
  image: string | null;
  roomNumber?: string | null;
}

export interface TableResult {
  title: string;
  roles: string[];
  timeSlots: string[];
  assignments: { userId: string; timeSlot: string; role: string; note?: string }[];
  stats: { totalHours: number; usersUsed: number; fairnessScore: number };
}
