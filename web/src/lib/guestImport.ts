export interface GuestImportRow {
  primaryName: string;
  email?: string;
  group?: string;
  phone?: string;
}

/**
 * Parses pasted guest rows: Name, Email, Group, Phone.
 * Rows copied from a spreadsheet are tab-separated; typed rows can use commas instead.
 * Blank lines are ignored and blank columns are left out.
 */
export function parseGuestRows(text: string): GuestImportRow[] {
  return text
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(line => {
      const cells = (line.includes('\t') ? line.split('\t') : line.split(',')).map(c => c.trim());
      const [primaryName = '', email, group, phone] = cells;
      const row: GuestImportRow = { primaryName };
      if (email) row.email = email;
      if (group) row.group = group;
      if (phone) row.phone = phone;
      return row;
    });
}

/** Drops blank text fields so the API treats them as "not provided". */
export function withoutBlanks<T extends Record<string, unknown>>(form: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(form).filter(([, v]) => !(typeof v === 'string' && v.trim() === '')),
  ) as Partial<T>;
}
