import { PubSubEngine } from 'graphql-subscriptions';
import { AbstractTopicHandler } from './AbstractTopicHandler';

import { AsyncIterator } from './AsyncIterator';

type Listener = (...args: any[]) => any;

interface ClassType<T = any> {
  new (...args: any[]): T;
}

/**
 * @class
 * @see https://github.com/apollographql/graphql-subscriptions/blob/master/src/event-emitter-to-async-iterator.ts
 */
export class PubSub implements PubSubEngine {
  private handlers: Map<string, ClassType<AbstractTopicHandler>> = new Map();
  private nextSubscriptionId: number = 0;
  private subscriptions: Map<number, AbstractTopicHandler> = new Map();

  private getNextSubscriptionId(): number {
    this.nextSubscriptionId += 1;
    return this.nextSubscriptionId;
  }

  public registerHandler(topic: string, handler: ClassType<AbstractTopicHandler>): PubSub {
    if (this.handlers.has(topic)) {
      throw new Error(`Duplication: there is already a handler for the topic ${topic} present`);
    }

    this.handlers.set(topic, handler);
    return this;
  }

  public subscribe(topic: string, onMessage: Listener, options?: Object): Promise<number> {
    const Handler = this.handlers.get(topic);

    if (!Handler) {
      throw new Error(`Cannot subscribe to topic ${topic} - no handlers`);
    }

    const subscriptionId = this.getNextSubscriptionId();

    const handler = new Handler(topic);
    handler.subscribe(onMessage);
    this.subscriptions.set(subscriptionId, handler);

    return Promise.resolve(subscriptionId);
  }

  public unsubscribe(subscriptionId: number) {
    const handler = this.subscriptions.get(subscriptionId);

    if (!handler) {
      return;
    }

    const wasSuccessful = handler.unsubscribe();

    if (!wasSuccessful) {
      throw new Error(`Unable to unsubscribe ${subscriptionId}`);
    }
  }

  public async publish(topic: string, payload: any) {
    // noop
  }

  asyncIterator<T>(topics: string | string[]): AsyncIterator<T> {
    return new AsyncIterator<T>(this, topics);
  }
}
