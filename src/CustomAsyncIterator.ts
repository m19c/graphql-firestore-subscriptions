import { $$asyncIterator } from 'iterall';
import { PubSubEngine } from 'graphql-subscriptions';

type HandlerFunc<T> = (_: { value: T; done: boolean }) => void;

export class CustomAsyncIterator<T, TReturn = unknown, TNext = undefined> implements AsyncIterator<T, TReturn, TNext> {
  private pubSub: PubSubEngine;
  private topics: string[];
  private pullQueue: HandlerFunc<T>[] = [];
  private pushQueue: T[] = [];
  private subscriptions: Promise<number[]>;
  private isListening = true;

  /**
   * Creates an instance of CustomAsyncIterator.
   *
   * @param pubSub PubSubEngine instance
   * @param topics Topics to subscribe
   */
  constructor(pubSub: PubSubEngine, topics: string | string[]) {
    this.pubSub = pubSub;
    this.topics = typeof topics === 'string' ? [topics] : topics;
    this.subscriptions = this.createTopicSubscriptions();
  }

  /**
   * Creates subscriptions for each topic.
   *
   * @returns Promise<number[]> Subscription ids
   */
  private createTopicSubscriptions() {
    return Promise.all(this.topics.map(topic => this.pubSub.subscribe(topic, this.pushValue.bind(this), {})));
  }

  /**
   * Unsubscribes from each topic.
   *
   * @param subscriptionIds Subscription ids
   */
  private unsubscribeTopics(subscriptionIds: number[]) {
    for (const subscriptionId of subscriptionIds) {
      this.pubSub.unsubscribe(subscriptionId);
    }
  }

  /**
   * Next value.
   *
   * @returns Promise<IteratorResult<T>>
   */
  public async next() {
    await this.subscriptions;
    return this.isListening ? this.pullValue() : this.return();
  }

  /**
   * Returns done.
   * @returns Promise<IteratorResult<T>>
   */
  public async return(_?: TReturn | PromiseLike<TReturn>): Promise<IteratorResult<T, TReturn>> {
    this.emptyQueue(await this.subscriptions);
    return { value: undefined as TReturn, done: true };
  }

  /**
   * Throws error.
   *
   * @param error Error
   */
  public async throw(error: unknown): Promise<IteratorResult<T, TReturn>> {
    this.emptyQueue(await this.subscriptions);
    return Promise.reject(error);
  }

  /**
   * Fully async iterator.
   *
   * @returns The async iterator
   */
  public [$$asyncIterator]() {
    return this;
  }

  /**
   * Pushes value to queue.
   *
   * @param event Event
   */
  private async pushValue(event: T) {
    await this.subscriptions;
    if (this.pullQueue.length > 0) {
      const handler = this.pullQueue.shift();
      if (typeof handler !== 'function') {
        throw new Error('handler is not a function');
      }

      handler({ value: event, done: false });
      return;
    }

    this.pushQueue.push(event);
  }

  /**
   * Pulls value from queue.
   *
   * @returns Promise<IteratorResult<T>>
   */
  private pullValue(): Promise<IteratorResult<T, TReturn>> {
    return new Promise(resolve => {
      if (this.pushQueue.length !== 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        resolve({ value: this.pushQueue.shift()!, done: false });
        return;
      }

      this.pullQueue.push(resolve as HandlerFunc<T>);
    });
  }

  /**
   * Empties the queue.
   *
   * @param subscriptionIds Subscription ids
   */
  private emptyQueue(subscriptionIds: number[]) {
    if (!this.isListening) {
      return;
    }

    this.isListening = false;
    this.unsubscribeTopics(subscriptionIds);
    this.pullQueue.forEach(resolve => resolve({ value: undefined as T, done: true }));
    this.pullQueue.length = 0;
    this.pushQueue.length = 0;
  }
}
