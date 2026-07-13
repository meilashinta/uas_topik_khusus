export interface TicketEvent {
  eventId: string;
  eventType: string;
  ticketId: string;
  ticketNumber: string;
  timestamp: string;
  [key: string]: any;
}
