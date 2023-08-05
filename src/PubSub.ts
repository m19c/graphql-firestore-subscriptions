/* eslint-disable @typescript-eslint/ban-types */
import { PubSubEngine } from 'graphql-subscriptions';

import { CustomAsyncIterator } from './CustomAsyncIterator';

type Listener = (...args: unknown[]) => any;
export type Broadcaster = (data: unknown) => void;
export type Unsubscribe = () => any | boolean;
export type Handler<T = unknown> = (broadcast: Broadcaster, options?: { args: T }) => Unsubscribe;
export type Subscription = { topic: string; subscriptionId?: number; args?: unknown; unsubscribe?: Unsubscribe };

/**
 * @class
 * @see https://github.com/apollographql/graphql-subscriptions/blob/master/src/event-emitter-to-async-iterator.ts
 */
export class PubSub implements PubSubEngine {
  private handlers: Map<string, Handler> = new Map();
  private nextSubscriptionId = 0;
  private subscriptions: Map<string, Subscription> = new Map();

  private getNextSubscriptionId(): number {
    this.nextSubscriptionId += 1;
    return this.nextSubscriptionId;
  }

  private getSubscriptionById(subscriptionId: number): Subscription | undefined {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.subscriptionId === subscriptionId) {
        return subscription;
      }
    }
    return undefined;
  }

  public registerHandler<T>(topic: string, handler: Handler<T>): PubSub {
    if (this.handlers.has(topic)) {
      throw new Error(`Duplication: there is already a handler for the topic ${topic} present`);
    }

    this.handlers.set(topic, handler as Handler);
    return this;
  }

  public subscribe(topic: string, onMessage: Listener, options?: Object): Promise<number> {
    const handler = this.handlers.get(topic);

    if (handler == null) {
      throw new Error(`Cannot subscribe to topic ${topic} - no handlers`);
    }

    let subscription = this.subscriptions.get(topic) ?? ({} as Subscription);
    const subscriptionId = this.getNextSubscriptionId();
    subscription = {
      topic,
      subscriptionId,
      args: subscription?.args,
      unsubscribe: handler(onMessage, { ...options, args: subscription?.args }),
    };
    this.subscriptions.set(topic, subscription);

    return Promise.resolve(subscriptionId);
  }

  public unsubscribe(subscriptionId: number) {
    const subscription = this.getSubscriptionById(subscriptionId);

    if (subscription == null || subscription?.unsubscribe == null) {
      return;
    }

    const wasSuccessful = subscription.unsubscribe();
    this.subscriptions.delete(subscription.topic);

    if (typeof wasSuccessful === 'boolean' && !wasSuccessful) {
      throw new Error(`Unable to unsubscribe ${subscriptionId}`);
    }
  }

  // ignoring because it's a required implementation function
  // eslint-disable-next-line
  public async publish(topic: string, payload: unknown): Promise<void> {
    // noop
  }

  public createAsyncIterator<T>(topics: string | string[], args: T): AsyncIterator<T> {
    ([] as string[]).concat(topics).forEach(topic => {
      this.subscriptions.set(topic, {
        topic,
        subscriptionId: undefined,
        args,
        unsubscribe: undefined,
      });
    });
    return this.asyncIterator(topics);
  }

  asyncIterator<T>(topics: string | string[]): AsyncIterator<T> {
    return new CustomAsyncIterator<T>(this, topics);
  }
}
