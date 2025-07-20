import { BasePlugin } from "@capitalone/stratum-observability";
import { EventCounterPublisher } from "./event-counter-publisher";

export interface EventCounterPluginOptions {
  catalog?: Record<string, any>;
  dashboardUrl?: string;
  enableLogging?: boolean;
}

export class EventCounterPlugin extends BasePlugin<any, EventCounterPluginOptions> {
  public name = "event-counter";
  public options: Required<EventCounterPluginOptions>;
  private publisher: EventCounterPublisher;

  constructor(options: EventCounterPluginOptions = {}) {
    super();
    this.options = {
      catalog: {},
      dashboardUrl: 'http://localhost:41321',
      enableLogging: false,
      ...options
    };
    EventCounterPublisher.setLogging(this.options.enableLogging);
    this.publisher = new EventCounterPublisher(this.options.dashboardUrl, this.options.catalog);
  }

  getPublishers() {
    return [this.publisher];
  }

  onRegister() {
    if (this.options.enableLogging) {
      console.log("[EventCounterPlugin] onRegister called");
      console.log("EventCounterPlugin registered. Tracking all events with counts.");
    }
  }
}

export const EventCounterPluginFactory = (options: EventCounterPluginOptions = {}) => {
  return new EventCounterPlugin(options);
};
