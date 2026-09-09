import {
  formatItakaDate,
  getItakaMessageForDate,
  type ItakaDailyMessage,
} from "../shared/itakaDailyMessage";
import { ITAKA_MESSAGES_DATA } from "../shared/itakaMessagesData";

function getSaoPauloCalendarDate(now = new Date()): Date {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});

  return new Date(Number(values.year), Number(values.month) - 1, Number(values.day), 12);
}

const messages: ItakaDailyMessage[] = ITAKA_MESSAGES_DATA.map((item) => ({
  dayOfYear: item.dayOfYear,
  phrase: item.motivational,
passage: item.odysseySummary,
  citation: item.citation,
  theme: item.theme,
}));

export async function getDailyItakaMessage(now = new Date()) {
  const calendarDate = getSaoPauloCalendarDate(now);
  return {
    dateLabel: formatItakaDate(calendarDate),
    message: getItakaMessageForDate(messages, calendarDate),
  };
}

export { getSaoPauloCalendarDate };
