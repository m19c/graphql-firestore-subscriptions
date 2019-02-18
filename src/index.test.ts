import { PubSub as OriginalPubSub } from './PubSub';
import { AbstractTopicHandler as OriginalAbstractTopicHandler } from './AbstractTopicHandler';
import PubSub, { AbstractTopicHandler } from './';

describe('index', () => {
  test('returns PubSub as well as AbstractTopicHandler', () => {
    expect(PubSub).toBe(OriginalPubSub);
    expect(AbstractTopicHandler).toBe(OriginalAbstractTopicHandler);
  });
});
