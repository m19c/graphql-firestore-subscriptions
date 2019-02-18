import { PubSubEngine } from 'graphql-subscriptions';

import { CustomAsyncIterator } from './CustomAsyncIterator';

type Listener = (...args: any[]) => any;
type Unsubscribe = () => any | boolean;
type Handler = (broadcast: Function, options?: Object) => Unsubscribe;

/**
 * @class
 * @see https://github.com/apollographql/graphql-subscriptions/blob/master/src/event-emitter-to-async-iterator.ts
 */
export class PubSub implements PubSubEngine {
  private handlers: Map<string, Handler> = new Map();
  private nextSubscriptionId: number = 0;
  private subscriptions: Map<number, Unsubscribe> = new Map();

  private getNextSubscriptionId(): number {
    this.nextSubscriptionId += 1;
    return this.nextSubscriptionId;
  }

  public registerHandler(topic: string, handler: Handler): PubSub {
    if (this.handlers.has(topic)) {
      throw new Error(`Duplication: there is already a handler for the topic ${topic} present`);
    }

    this.handlers.set(topic, handler);
    return this;
  }

  public subscribe(topic: string, onMessage: Listener, options?: Object): Promise<number> {
    const handler = this.handlers.get(topic);

    if (!handler) {
      throw new Error(`Cannot subscribe to topic ${topic} - no handlers`);
    }

    const subscriptionId = this.getNextSubscriptionId();
    this.subscriptions.set(subscriptionId, handler(onMessage, options));

    return Promise.resolve(subscriptionId);
  }

  public unsubscribe(subscriptionId: number) {
    const unsubscribe = this.subscriptions.get(subscriptionId);

    if (!unsubscribe) {
      return;
    }

    const wasSuccessful = unsubscribe();
    this.subscriptions.delete(subscriptionId);

    if (typeof wasSuccessful === 'boolean' && !wasSuccessful) {
      throw new Error(`Unable to unsubscribe ${subscriptionId}`);
    }
  }

  public async publish(topic: string, payload: any): Promise<void> {
    // noop
  }

  asyncIterator<T>(topics: string | string[]): AsyncIterator<T> {
    return new CustomAsyncIterator<T>(this, topics);
  }
}
