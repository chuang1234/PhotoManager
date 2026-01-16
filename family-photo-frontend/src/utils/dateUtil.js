import moment from "moment/moment";

export const formatTime = (timeStr) => {
  if (!timeStr) return null;
  return moment(timeStr).format("YYYY-MM-DD HH:mm:ss");
};
