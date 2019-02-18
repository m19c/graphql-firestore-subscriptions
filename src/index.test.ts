import { PubSub as OriginalPubSub } from './PubSub';
import PubSub from './';

describe('index', () => {
  test('returns PubSub', () => {
    expect(PubSub).toBe(OriginalPubSub);
  });
});
