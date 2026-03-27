export const months = {
  jan: "ינואר", feb: "פברואר", mar: "מרץ", apr: "אפריל",
  may: "מאי", jun: "יוני", jul: "יולי", aug: "אוגוסט",
  sep: "ספטמבר", oct: "אוקטובר", nov: "נובמבר", dec: "דצמבר",
} as const;

export const days = {
  sun: "ראשון", mon: "שני", tue: "שלישי", wed: "רביעי",
  thu: "חמישי", fri: "שישי", sat: "שבת",
} as const;

export const greetings = {
  morning: "בוקר טוב",
  afternoon: "צהריים טובים",
  evening: "ערב טוב",
  night: "לילה טוב",
} as const;

export const timeAgo = {
  now: "עכשיו",
  minutesAgo: "לפני {n} דק׳",
  hoursAgo: "לפני {n} שע׳",
} as const;
