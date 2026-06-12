export interface EventSyncEvent {
  externalId: string;
  externalSource: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface EventSyncGroup {
  name: string;
  events: EventSyncEvent[];
}

export interface IEventSyncStrategy {
  fetchSyncData(): Promise<EventSyncGroup[]>;
}
