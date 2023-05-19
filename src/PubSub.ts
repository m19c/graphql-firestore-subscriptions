import { PubSubEngine } from 'graphql-subscriptions';

import { CustomAsyncIterator } from './CustomAsyncIterator';

type Listener = (...args: any[]) => any;
export type Unsubscribe = () => any | boolean;
export type Handler<T = any> = (broadcast: Function, options?: T) => Unsubscribe;

/**
 * @class
 * @see https://github.com/apollographql/graphql-subscriptions/blob/master/src/event-emitter-to-async-iterator.ts
 */
export class PubSub implements PubSubEngine {
  private handlers: Map<string, Handler> = new Map();
  private nextSubscriptionId: number = 0;
  private subscriptions: Map<number, Unsubscribe> = new Map();
  private argsForHandlers: Map<string, any> = new Map();
  private subscriptionIdsWithTopic: Map<number, any> = new Map();

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

    const args = this.argsForHandlers.get(topic);
    const subscriptionId = this.getNextSubscriptionId();
    this.subscriptions.set(subscriptionId, handler(onMessage, { ...options, ...args }));
    this.subscriptionIdsWithTopic.set(subscriptionId, topic);

    return Promise.resolve(subscriptionId);
  }

  public unsubscribe(subscriptionId: number) {
    const unsubscribe = this.subscriptions.get(subscriptionId);

    if (!unsubscribe) {
      return;
    }

    const wasSuccessful = unsubscribe();
    this.subscriptions.delete(subscriptionId);
    const topic = this.subscriptionIdsWithTopic.get(subscriptionId);
    if (topic) this.argsForHandlers.delete(topic);

    if (typeof wasSuccessful === 'boolean' && !wasSuccessful) {
      throw new Error(`Unable to unsubscribe ${subscriptionId}`);
    }
  }

  // ignoring because it's a required implementation function
  // eslint-disable-next-line
  public async publish(topic: string, payload: any): Promise<void> {
    // noop
  }

  public createAsyncIterator<T>(topics: string | string[], args: T): AsyncIterator<T> {
    if (Array.isArray(topics)) {
      topics.forEach((topic) => {
        this.argsForHandlers.set(topic, args)
      })
    } else {
      this.argsForHandlers.set(topics, args)
    }
    return this.asyncIterator(topics);
  }

  asyncIterator<T>(topics: string | string[]): AsyncIterator<T> {
    return new CustomAsyncIterator<T>(this, topics);
  }
}
