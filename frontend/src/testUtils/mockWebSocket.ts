type EventHandler<T> = ((event: T) => void) | null;

type ListenerMap = {
  open: Set<(event: Event) => void>;
  message: Set<(event: MessageEvent) => void>;
  close: Set<(event: CloseEvent) => void>;
  error: Set<(event: Event) => void>;
};

export class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: MockWebSocket[] = [];

  readonly url: string;
  readyState = MockWebSocket.CONNECTING;
  sent: string[] = [];

  onopen: EventHandler<Event> = null;
  onmessage: EventHandler<MessageEvent> = null;
  onclose: EventHandler<CloseEvent> = null;
  onerror: EventHandler<Event> = null;

  private listeners: ListenerMap = {
    open: new Set(),
    message: new Set(),
    close: new Set(),
    error: new Set(),
  };

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  static reset() {
    MockWebSocket.instances = [];
  }

  addEventListener(
    type: keyof ListenerMap,
    listener: ListenerMap[keyof ListenerMap] extends Set<infer T> ? T : never,
  ) {
    this.listeners[type].add(listener as never);
  }

  removeEventListener(
    type: keyof ListenerMap,
    listener: ListenerMap[keyof ListenerMap] extends Set<infer T> ? T : never,
  ) {
    this.listeners[type].delete(listener as never);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
  }

  emitOpen() {
    this.readyState = MockWebSocket.OPEN;
    const event = {} as Event;
    this.onopen?.(event);
    this.listeners.open.forEach((listener) => listener(event));
  }

  emitMessage(data: unknown) {
    const event = { data } as MessageEvent;
    this.onmessage?.(event);
    this.listeners.message.forEach((listener) => listener(event));
  }

  emitClose() {
    this.readyState = MockWebSocket.CLOSED;
    const event = {} as CloseEvent;
    this.onclose?.(event);
    this.listeners.close.forEach((listener) => listener(event));
  }

  emitError() {
    const event = {} as Event;
    this.onerror?.(event);
    this.listeners.error.forEach((listener) => listener(event));
  }
}
