/** IANA timezones supported by this runtime, for timezone pickers. */
export function timeZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["UTC"];
  }
}
