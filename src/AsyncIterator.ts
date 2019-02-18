import { $$asyncIterator } from 'iterall';
import { PubSubEngine } from 'graphql-subscriptions';

export class FBAsyncIterator<T> implements AsyncIterator<T> {
  private pubSub: PubSubEngine;
  private topics: string[];
  private pullQueue: Function[] = [];
  private pushQueue: any[] = [];
  private subscriptions: Promise<number[]>;
  private isListening: boolean = true;

  constructor(pubSub: PubSubEngine, topics: string | string[]) {
    this.pubSub = pubSub;
    this.topics = typeof topics === 'string' ? [topics] : topics;
    this.subscriptions = this.createTopicSubscriptions();
  }

  private createTopicSubscriptions() {
    return Promise.all(
      this.topics.map(topic => this.pubSub.subscribe(topic, this.pushValue.bind(this), {}))
    );
  }

  private unsubscribeTopics(subscriptionIds: number[]) {
    for (const subscriptionId of subscriptionIds) {
      this.pubSub.unsubscribe(subscriptionId);
    }
  }

  public async next() {
    await this.subscriptions;
    return this.isListening ? this.pullValue() : this.return();
  }

  public async return() {
    this.emptyQueue(await this.subscriptions);
    return { value: undefined as any, done: true };
  }

  public async throw(error: any) {
    this.emptyQueue(await this.subscriptions);
    return Promise.reject(error);
  }

  public [$$asyncIterator]() {
    return this;
  }

  private async pushValue(event: any) {
    await this.subscriptions;
    if (this.pullQueue.length !== 0) {
      (this.pullQueue as any).shift()({ value: event, done: false });
    } else {
      this.pushQueue.push(event);
    }
  }

  private pullValue(): Promise<IteratorResult<any>> {
    return new Promise(resolve => {
      if (this.pushQueue.length !== 0) {
        resolve({ value: this.pushQueue.shift(), done: false });
      } else {
        this.pullQueue.push(resolve);
      }
    });
  }

  private emptyQueue(subscriptionIds: number[]) {
    if (this.isListening) {
      this.isListening = false;

      this.unsubscribeTopics(subscriptionIds);
      this.pullQueue.forEach(resolve => resolve({ value: undefined, done: true }));
      this.pullQueue.length = 0;
      this.pushQueue.length = 0;
    }
  }
}
