import PubSub from '../dist';
import { Handler } from '../src/PubSub';

enum Topic {
  NEW_COMMENT = 'NEW_COMMENT',
}

const ps = new PubSub();

type MyData = { userId: string }

const handler: Handler<MyData> = (broadcast, options) => {
    const { args } = options ?? {};
    console.dir(args); // prints out { userId: 'exampleUserId' }
    return () => true;
}

/**
 *  The TypeScript compiler can infer the generic type MyData for ps.registerHandler<MyData> 
 *  based on the type annotation of the handler variable.
 */
ps.registerHandler(Topic.NEW_COMMENT, handler);
