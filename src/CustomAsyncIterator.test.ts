import * as faker from 'faker';
import { forAwaitEach, forEach } from 'iterall';

import { PubSub } from './PubSub';
import { resolve } from 'url';

const wait = (ms: number = 500): Promise<any> => new Promise(resolve => setTimeout(resolve, ms));

describe('CustomAsyncIterator', () => {
  test('works as expected', async () => {
    const ps = new PubSub();

    const topic = faker.random.uuid();
    ps.registerHandler(topic, broadcast => {
      let index = 0;
      let timeoutId = setInterval(() => {
        index++;

        if (index < 10) {
          broadcast({ index });
        }
      }, 100);

      return () => clearInterval(timeoutId);
    });

    const ai = ps.asyncIterator(topic);
    await wait(600);
    const [subscriptionId] = await (ai as any).subscriptions;
    ps.unsubscribe(subscriptionId);

    expect((ai as any).pushQueue).toHaveLength(5);
  });
});
