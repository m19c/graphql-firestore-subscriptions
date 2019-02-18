# graphql-firestore-subscriptions

## Install

You can install _graphql-firestore-subscriptions_ by using **yarn** or **npm**:

`npm i --save graphql-firestore-subscriptions`

OR

`yarn add graphql-firestore-subscriptions`

## Usage

```typescript
import PubSub, { AbstractTopicHandler } from 'graphql-firestore-subscriptions';
import db from '../path/to/firestore/conenction';

enum Topic {
  NEW_COMMENT = 'NEW_COMMENT',
}

const ps = new PubSub();

ps.registerHandler(Topic.NEW_COMMENT, broadcast =>
  db.collection('comments').onSnapshot(snapshot => {
    snapshot
      .docChanges()
      .filter(change => change.type === 'added')
      .map(item => broadcast(item.data()));
  })
);

// ...
```
