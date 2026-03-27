import { common } from "./common";
import { teams } from "./teams";
import { priorities } from "./priorities";
import { months, days, greetings, timeAgo } from "./calendar";
import { nav } from "./nav";
import { auth } from "./auth";
import { profile } from "./profile";
import { dashboard, sagalStats, dashNotifications } from "./dashboard";
import { volAlerts } from "./volAlerts";
import { machines } from "./machines";
import { schedule } from "./schedule";
import { tasks } from "./tasks";
import { messages } from "./messages";
import { forms } from "./forms";
import { attendance } from "./attendance";
import { commander } from "./commander";
import { volunteers } from "./volunteers";
import { issues } from "./issues";
import { surveys } from "./surveys";
import { personOfWeek } from "./personOfWeek";
import { usersWall } from "./usersWall";
import { materials } from "./materials";
import { laundry } from "./laundry";
import { formats } from "./formats";
import { aktualia } from "./aktualia";
import { birthdays } from "./birthdays";
import { dailyQuote } from "./dailyQuote";
import { amana } from "./amana";
import { notifications } from "./notifications";
import { guardDuty } from "./guardDuty";
import { chopal } from "./chopal";
import { simulator } from "./simulator";
import { notifBell, footer, categories } from "./misc";
import { mamash } from "./mamash";

const he = {
  common,
  teams,
  priorities,
  months,
  days,
  greetings,
  timeAgo,
  nav,
  auth,
  profile,
  dashboard,
  sagalStats,
  dashNotifications,
  volAlerts,
  machines,
  schedule,
  tasks,
  messages,
  forms,
  attendance,
  commander,
  volunteers,
  issues,
  surveys,
  personOfWeek,
  usersWall,
  materials,
  laundry,
  formats,
  aktualia,
  birthdays,
  dailyQuote,
  amana,
  notifications,
  guardDuty,
  chopal,
  simulator,
  notifBell,
  footer,
  categories,
  mamash,
} as const;

export default he;

// Recursively convert all leaf values to string so en.ts can use different string literals
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

export type Dictionary = DeepStringify<typeof he>;
