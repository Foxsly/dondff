/** A single event sourced from an external provider, matched by name across providers. */
export interface EventSyncEvent {
  /** The ID the external provider uses for this event (e.g. FanDuel event ID). */
  externalId: string;
  /** Which provider this event came from (e.g. "FANDUEL"). */
  externalSource: string;
  /** Canonical event name after normalisation and cross-provider matching. */
  name: string;
  /** ISO date string for the first day of the event. */
  startDate: string;
  /** ISO date string for the last day of the event. */
  endDate: string;
}

/**
 * A group of events that belong to the same tournament/competition.
 * Events from different providers (FanDuel, ESPN) that represent the
 * same real-world competition are grouped under a single canonical name.
 */
export interface EventSyncGroup {
  /** Canonical tournament name shared by all events in this group. */
  name: string;
  /** The provider-specific event entries matched under this group. */
  events: EventSyncEvent[];
}

export interface IEventSyncStrategy {
  /**
   * Fetch and match events from external providers for this sport.
   *
   * Each sport uses different provider APIs (e.g. golf: FanDuel + ESPN PGA
   * schedule, NFL: Sleeper season). Events are matched by name across
   * providers; unmatched events are excluded from the result.
   *
   * @returns Groups of matched events under canonical names. Each group
   * contains provider-specific entries (externalId, source, dates) that
   * all refer to the same real-world competition.
   */
  fetchSyncData(): Promise<EventSyncGroup[]>;
}
