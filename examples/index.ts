import PubSub from '../dist';

enum Topic {
  NEW_COMMENT = 'NEW_COMMENT',
}

const ps = new PubSub();

ps.registerHandler(Topic.NEW_COMMENT, () => {
  // listen for firestore changes & return a unsubscribe function
  return () => true;
});
