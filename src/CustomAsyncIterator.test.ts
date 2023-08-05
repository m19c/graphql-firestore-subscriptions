/* eslint-disable @typescript-eslint/ban-types */
import { faker } from '@faker-js/faker';

import { PubSubEngine } from 'graphql-subscriptions';
import { CustomAsyncIterator } from './CustomAsyncIterator';
import { $$asyncIterator } from 'iterall';

describe('CustomAsyncIterator', () => {
  let currentSubscriptionId: number;
  let ps: PubSubEngine;
  let broadcast: Function;
  let ai: CustomAsyncIterator<any>;
  let topic: string;

  beforeEach(() => {
    currentSubscriptionId = 0;
    ps = {
      subscribe: jest.fn((_, onMessage) => {
        broadcast = onMessage;
        currentSubscriptionId += 1;
        return Promise.resolve(currentSubscriptionId);
      }),
      unsubscribe: jest.fn(),
    } as any as PubSubEngine;
    topic = faker.string.uuid();
    ai = new CustomAsyncIterator(ps, topic);
  });

  test('it converts a single topic to an array of topics', () => {
    const topic = faker.word.adjective();
    const topicAI = new CustomAsyncIterator(ps, topic);

    expect((topicAI as any).topics).toMatchObject([topic]);
  });

  it('accepts multiple topics', () => {
    const topicA = faker.word.adjective();
    const topicB = faker.word.adjective();
    const topicAI = new CustomAsyncIterator(ps, [topicA, topicB]);

    expect((topicAI as any).topics).toMatchObject([topicA, topicB]);
  });

  test('empties the queue', () => {
    (ai as any).unsubscribeTopics = jest.fn();

    expect((ai as any).isListening).toBeTruthy();

    (ai as any).emptyQueue([currentSubscriptionId]);
    expect((ai as any).isListening).toBeFalsy();
    expect((ai as any).pullQueue).toHaveLength(0);
    expect((ai as any).pushQueue).toHaveLength(0);
  });

  test('broadcast events', async () => {
    const eventA = faker.word.adjective();
    const eventB = faker.word.adjective();

    broadcast(eventA);
    broadcast(eventB);

    expect(await ai.next()).toMatchObject({ value: eventA, done: false });
    expect(await ai.next()).toMatchObject({ value: eventB, done: false });
    expect(await ai.return()).toMatchObject({ value: undefined, done: true });
    expect((ai as any).isListening).toBeFalsy();
    expect((ai as any).pullQueue).toHaveLength(0);
    expect((ai as any).pushQueue).toHaveLength(0);
    expect(ps.unsubscribe).toHaveBeenCalled();
  });

  test('it returns without listener', async () => {
    (ai as any).isListening = false;
    expect(await ai.next()).toMatchObject({ value: undefined, done: true });
  });

  test('is able to throw an error', async () => {
    const message = faker.word.words();

    expect.assertions(1);
    try {
      await ai.throw(new Error(message));
    } catch (err) {
      expect(err).toMatchObject({ message });
    }
  });

  test('is an async iterator', () => {
    expect((ai as any)[$$asyncIterator]()).toBe(ai);
  });

  test('resolves immediately', async () => {
    const event = faker.word.words();

    setTimeout(() => {
      broadcast(event);
    }, 50);
    expect(await ai.next()).toMatchObject({ value: event, done: false });
  });

  test('emptyQueue: resolves all next calls immediately', async () => {
    setTimeout(() => {
      (ai as any).emptyQueue([currentSubscriptionId]);
    }, 100);
    expect(await ai.next()).toMatchObject({ value: undefined, done: true });
  });
});
