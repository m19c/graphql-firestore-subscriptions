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

    test('it stores the unsubscribe function', async () => {
      const topic = faker.string.uuid();
      const unsubscribe = () => {};
      const handler = () => unsubscribe;

      ps.registerHandler(topic, handler);
      const subscriptionId = await ps.subscribe(topic, () => {});

      expect((ps as any).subscriptions.get(subscriptionId)).toBe(unsubscribe);
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

      expect((ps as any).subscriptions.has(subscriptionId)).toBeTruthy();

      ps.unsubscribe(subscriptionId);

      expect(unsubscribe).toHaveBeenCalled();
      expect((ps as any).subscriptions.has(subscriptionId)).toBeFalsy();
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

    test('deletes arguments from unsubscribed topic', async () => {
      const topic = faker.string.uuid();
      
      // define my data
      interface MyData { word: string; }
      const data: MyData = { word: faker.word.adjective() }
      
      // create the handers and register it
      const handler: Handler<MyData> = (broadcast, args) => {
        expect(args).toEqual(expect.objectContaining({ word: data.word }))
        return () => {}
      }
      ps.registerHandler(topic, handler);
      ps.createAsyncIterator(topic, data)
  
      // Call the handler with the subscribe
      const subscriptionId = await ps.subscribe(topic, () => {});
      ps.unsubscribe(subscriptionId);
      expect((ps as any).argsForHandlers.has(topic)).toBe(false)
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
    
    interface MyData { word: string; }
    const data: MyData = { word: faker.word.adjective() }
    
    // create the handers and register it
    const handler: Handler<MyData> = (broadcast, args) => {
      expect(args).toEqual(expect.objectContaining({ word: data.word }))
      return () => {}
    }
    ps.registerHandler(topic1, handler);
    ps.createAsyncIterator(topic1, data)
    expect((ps as any).argsForHandlers.has(topic1)).toBe(true)
    await ps.subscribe(topic1, () => {});

    // test for an array of topics
    const topic2 = [faker.string.uuid(), faker.string.uuid(), faker.string.uuid()];
    topic2.forEach((topic) => {
      ps.registerHandler(topic, handler);
    })
    ps.createAsyncIterator(topic2, data)
    topic2.forEach(async (topic) => {
      expect((ps as any).argsForHandlers.has(topic)).toBe(true)
      await ps.subscribe(topic, () => {});
    })
  });
});
