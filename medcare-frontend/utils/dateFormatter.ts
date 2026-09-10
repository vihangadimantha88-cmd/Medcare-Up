
// utils/dateFormatter.ts

export const formatDateTime = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  
  return date.toLocaleString("en-LK", {
    timeZone: "Asia/Colombo", // 100% Sri Lanka Time
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};