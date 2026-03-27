export const months = {
  jan: "January", feb: "February", mar: "March", apr: "April",
  may: "May", jun: "June", jul: "July", aug: "August",
  sep: "September", oct: "October", nov: "November", dec: "December",
} as const;

export const days = {
  sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday",
  thu: "Thursday", fri: "Friday", sat: "Saturday",
} as const;

export const greetings = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
  night: "Good night",
} as const;

export const timeAgo = {
  now: "Now",
  minutesAgo: "{n} min ago",
  hoursAgo: "{n}h ago",
} as const;
