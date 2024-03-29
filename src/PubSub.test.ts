/* eslint-disable @typescript-eslint/no-empty-function */
import { faker } from '@faker-js/faker';

import { Handler, PubSub } from './PubSub';
import { CustomAsyncIterator } from './CustomAsyncIterator';

describe('PubSub', () => {
  let ps: PubSub;

  beforeEach(() => (ps = new PubSub()));

  test('getNextSubscriptionId works as expected', () => {
    expect((ps as any).getNextSubscriptionId()).toEqual(1);
    expect((ps as any).getNextSubscriptionId()).toEqual(2);
    expect((ps as any).getNextSubscriptionId()).toEqual(3);
    expect((ps as any).getNextSubscriptionId()).toEqual(4);
  });

  describe('registerHandler', () => {
    test('throws an error if the topic is already present', () => {
      const topic = faker.string.uuid();
      ps.registerHandler(topic, () => () => {});

      expect.assertions(1);
      try {
        ps.registerHandler(topic, () => () => {});
      } catch (err) {
        expect(err).toBeTruthy();
      }
    });

    test('registers the handler', () => {
      const topic = faker.string.uuid();
      const handler = () => () => {};

      expect(ps.registerHandler(topic, handler)).toBe(ps);
      expect((ps as any).handlers.get(topic)).toBe(handler);
    });
  });

  describe('subscribe', () => {
    test('throws an error if there is no topic-handler present', () => {
      const topic = faker.string.uuid();

      expect.assertions(1);
      try {
        ps.subscribe(topic, () => {});
      } catch (err) {
        expect(err).toBeTruthy();
      }
    });

    test('it stores the subscription properties', async () => {
      const topic = faker.string.uuid();
      const unsubscribe = () => {};
      const handler = () => unsubscribe;

      ps.registerHandler(topic, handler);
      const subscriptionId = await ps.subscribe(topic, () => {});

      expect((ps as any).subscriptions.get(topic)).toStrictEqual({
        topic,
        subscriptionId,
        unsubscribe,
        args: undefined,
      });
    });
  });

  describe('unsubscribe', () => {
    test('returns undefined if there is no unsubscribe-function present', () => {
      expect(ps.unsubscribe(faker.number.int())).toBeUndefined();
    });

    test('it calls the unsubscribe-function & deletes the subscription', async () => {
      const topic = faker.string.uuid();
      const unsubscribe = jest.fn();
      const handler = () => unsubscribe;

      ps.registerHandler(topic, handler);
      const subscriptionId = await ps.subscribe(topic, () => {});

      expect((ps as any).subscriptions.has(topic)).toBeTruthy();

      ps.unsubscribe(subscriptionId);

      expect(unsubscribe).toHaveBeenCalled();
      expect((ps as any).subscriptions.has(topic)).toBeFalsy();
    });

    test('throws an error if the unsubscribe-function returns false', async () => {
      const topic = faker.string.uuid();
      const unsubscribe = jest.fn(() => false);
      const handler = () => unsubscribe;

      ps.registerHandler(topic, handler);
      const subscriptionId = await ps.subscribe(topic, () => {});

      expect.assertions(1);
      try {
        ps.unsubscribe(subscriptionId);
      } catch (err) {
        expect(err).toBeTruthy();
      }
    });
  });

  test('publish returns undefined', async () => {
    expect(await ps.publish(faker.string.uuid(), {})).toBeUndefined();
  });

  test('asyncIterator returns an instance of AsyncIterator', () => {
    const topic = faker.string.uuid();
    ps.registerHandler(topic, () => () => {});
    expect(ps.asyncIterator(topic)).toBeInstanceOf(CustomAsyncIterator);
  });

  test('createAsyncIterator passes args to handler', async () => {
    const topic1 = faker.string.uuid();

    interface MyData {
      word: string;
    }
    const data: MyData = { word: faker.word.adjective() };

    // create the handers and register it
    const handler: Handler<MyData> = (_broadcast, options) => {
      expect(options).toEqual(expect.objectContaining({ args: { word: data.word } }));
      return () => {};
    };
    ps.registerHandler(topic1, handler);
    ps.createAsyncIterator(topic1, data);
    expect((ps as any).subscriptions.get(topic1).args).toBeTruthy();
    await ps.subscribe(topic1, () => {});

    // test for an array of topics
    const topic2 = [faker.string.uuid(), faker.string.uuid(), faker.string.uuid()];
    topic2.forEach(topic => {
      ps.registerHandler(topic, handler);
    });
    ps.createAsyncIterator(topic2, data);
    topic2.forEach(async topic => {
      expect((ps as any).subscriptions.get(topic).args).toBeTruthy();
      await ps.subscribe(topic, () => {});
    });
  });
});
