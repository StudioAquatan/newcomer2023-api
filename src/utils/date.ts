import { DateTime } from 'luxon';

declare const dateString: unique symbol;
export type SQLDateString = string & { [dateString]: never };

export const asSQLDate = (str: string) => str as SQLDateString;

export const fromDateString = (str: SQLDateString) => DateTime.fromSQL(str);
// SQLite datetime implementation only uses UTC
export const toDateString = (date: DateTime) =>
  date.toUTC().toSQL({ includeOffset: false }) as SQLDateString;
