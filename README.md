# graphql-firestore-subscriptions

> 🚨 Important note!
> Changing the primary NodeJS Package Manager account results in the new package name `@m19c/graphql-firestore-subscriptions`.

_graphql-firestore-subscriptions_ implements the `PubSubEngine` interface from the [graphql-subscriptions](https://github.com/apollographql/graphql-subscriptions) package.

Unlike other databases, Google's Firestore comes across with real time updates. Therefore, it is not required to publish events to a queue or a pub-sub.
However, there is still something to do to get the data to the clients. In graphql-firestore-subscriptions those tasks are called handlers. They are subscribing a specific topic and broadcast whatever you want over an AsyncIterator which is compatible with graphql-subscriptions.

## Usage

First of all, you have to install the _graphql-firestore-subscriptions_ package using **yarn** or **npm** by calling either `yarn add @m19c/graphql-firestore-subscriptions` or `npm i --save @m19c/graphql-firestore-subscriptions`.

### Create a new _graphql-firestore-subscription_ instance

```typescript
import PubSub from "@m19c/graphql-firestore-subscriptions"

const ps = new PubSub()
```

### Adding handlers

A handler gets two arguments:

- The `broadcast` function itself to send new data
- An object with options

Note, that the handler **MUST** return a _unsubscribe_ function.

```typescript
ps.registerHandler(() => {
  // subscribe to a topic
  return () => {
    // unsubscribe
  }
})
```

The unsubscribe function can either return void or a boolean value. If a boolean value is returned by the unsubscribe function, the `PubSubEngine` will throw an error if the return value is falsey.

### Advanced handlers

Unlike other _graphql-subscriptions_, `graphql-firestore-subscriptions` requires a handler for each topic you are about to subscribe.
To make the handler-creation as easy as possibile graphql-firestore-subscriptions comes across with a bunch of utility functions.

The following example shows a simple fall-through handler which takes document changes of a collection to broadcast this changes immediately.

```typescript
import PubSub, {
  createFallThroughHandler,
} from "@m19c/graphql-firestore-subscriptions"
import db from "../path/to/firestore/conenction"

// ...

enum Topic {
  NEW_COMMENT = "NEW_COMMENT",
}

ps.registerHandler(
  ...createFallThroughHandler(db, {
    topic: Topic.NEW_COMMENT,
    collection: "comment",
    filter: ["added"],
  })
)
```

You can also create multiple fall-through handlers at once:

```typescript
import PubSub, {
  createFallThroughHandlerFromMap,
} from "@m19c/graphql-firestore-subscriptions"
import db from "../path/to/firestore/connection"

// ...

enum Topic {
  NEW_COMMENT = "NEW_COMMENT",
  UPDATE_COMMENT = "UPDATE_COMMENT",
}

createFallThroughHandlerFromMap(db, {
  [Topic.NEW_COMMENT]: {
    collection: "comment",
    filter: ["added"],
  },
  [Topic.UPDATE_COMMENT]: {
    collection: "comment",
    filter: ["modified"],
  },
}).forEach((topic, handler) => ps.registerHandler(topic, handler))
```

See API for additional information about how `createFallThroughHandlerFromMap` / `createFallThroughHandler` work.

### Full example

```typescript
import PubSub from "@m19c/graphql-firestore-subscriptions"
import db from "../path/to/firestore/connection"

enum Topic {
  NEW_COMMENT = "NEW_COMMENT",
}

const ps = new PubSub()

ps.registerHandler(Topic.NEW_COMMENT, (broadcast) =>
  // Note, that `onSnapshot` returns a unsubscribe function which
  // returns void.
  db.collection("comments").onSnapshot((snapshot) => {
    snapshot
      .docChanges()
      .filter((change) => change.type === "added")
      .map((item) => broadcast(item.doc.data()))
  })
)

const iterator = ps.asyncIterator(Topic.NEW_COMMENT)
const addedComment = await iterator.next()

// ...
```

### With apollo-server-graphql

Define a _GraphQL_ schema with a `Subscription` type.

```graphql
schema {
  query: Query
  mutation: Mutation
  subscription: Subscription
}

type Subscription {
  newComment: Comment
}

type Comment {
  message: String
}
```

Now, implement the resolver:

```typescript
export const resolvers = {
  Subscription: {
    newComment: {
      subscribe: () => ps.asyncIterator(Topic.NEW_COMMENT),
    },
  },
}
```

Calling `asyncIterator(topics: string | string[])` or `createAsyncIterator<T>(topics: string | string[], args: T)` will subscribe to the given topics and will return an AsyncIterator bound to the `PubSubEngine` of **graphql-firestore-subscriptions**.
Everytime, a handler calls the obtained `broadcast`-function, the `PubSubEngine` of **graphql-firestore-subscriptions** will publish the event.

You can implement the resolver with passing arguments to the subscription

```typescript
export const resolvers = {
  Subscription: {
    newComment: {
      subscribe: (parent, args, context) =>
        ps.createAsyncIterator(Topic.NEW_COMMENT, args),
    },
  },
}
```

You will be able to access those arguments within the registered handler.

```typescript
type MyData = { userId: string }

const handler: Handler<MyData> = (broadcast, options) => {
  // options is of type { args: MyData }
  const { args } = options

  // Note, that `onSnapshot` returns a unsubscribe function which
  // returns void.
  return db
    .collection("comments")
    .where("userId", "==", args.userId)
    .onSnapshot((snapshot) => {
      snapshot
        .docChanges()
        .filter((change) => change.type === "added")
        .map((item) => broadcast(item.doc.data()))
    })
}

ps.registerHandler(Topic.NEW_COMMENT, handler)
```

## API

### createFallThroughHandler

```typescript
function createFallThroughHandler(
  fs: Firestore,
  overwriteOptions: FallThroughHandlerOptions
): [string, Handler]
```

#### Options

| Name           | Type                                  | Description                                                   |
| -------------- | ------------------------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| `topic`\*      | `string`                              | -                                                             |
| `collection`\* | `string`                              | The firebase collection                                       |
| `transform`    | `TransformStrategy                    | (change: DocumentChange) => any`                              | Called to transform the broadcast-payload |
| `filter`       | `(change: DocumentChange) => boolean` | Called to filter document changes before they are broadcasted |

> \* required

### createFallThroughHandlerFromMap

```typescript
function createFallThroughHandlerFromMap(
  fs: Firestore,
  options: FallThroughHandlerFromMapOptions
): [string, Handler][]
```

#### Options

| Name  | Type                      | Description                                                  |
| ----- | ------------------------- | ------------------------------------------------------------ |
| topic | `[topic: string]: Object` | See createFallThroughHandler#Options for a complete overview |

## Contribute

Something is broken? The documentation is incorrect? You're missing a feature? ...and you wanna help? That's great.

The following steps are describing the way from an idea / bug / ... to a pull-request.

1. Fork this repository
1. Apply the changes
1. Write tests (you can execute the current tests by calling `npm run test:unit` OR `npm run test:unit:watch`)
1. If necessary, update the documentation
1. Open a pull-request
1. :tada:
