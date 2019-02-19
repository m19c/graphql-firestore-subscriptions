import * as faker from 'faker';
import {
  Firestore,
  CollectionReference,
  DocumentChange,
  QuerySnapshot,
  DocumentChangeType,
} from '@google-cloud/firestore';

import * as util from './util';

const createFSSnapshotChange = (type: DocumentChangeType, data: Object): DocumentChange => {
  const change = {
    type,
    doc: {
      data: jest.fn(() => data),
    } as any,
  } as DocumentChange;

  return change;
};

const createFSCollectionSnapshot = (...changes: DocumentChange[]): QuerySnapshot => {
  const snapshot = {
    docChanges: jest.fn(() => {
      return changes;
    }),
  } as any;

  return snapshot;
};

type FakeCollection = CollectionReference & { trigger: (snapshot: QuerySnapshot) => any };

const createFSCollection = (id: string): FakeCollection => {
  let onSnapshotHandler: Function;
  const collection = {
    id,
    onSnapshot: jest.fn(
      (onSnapshot: (snapshot: QuerySnapshot) => any) => (onSnapshotHandler = onSnapshot)
    ),
  } as any;

  collection.trigger = (snapshot: QuerySnapshot) => {
    if (typeof onSnapshotHandler === 'function') {
      onSnapshotHandler(snapshot);
    }
  };

  return collection;
};

const createFS = (...collections: CollectionReference[]): Firestore => {
  const fs = {
    collection: jest.fn((path: string) => {
      return collections.filter(item => item.id === path).shift() || null;
    }),
  } as any;

  return fs;
};

describe('util', () => {
  test('createTypeFilter returns function', () => {
    const typeFilter = util.createTypeFilter('added', 'modified');

    expect(typeFilter(({ type: 'removed' } as any) as DocumentChange)).toBeFalsy();
    expect(typeFilter(({ type: 'added' } as any) as DocumentChange)).toBeTruthy();
    expect(typeFilter(({ type: 'modified' } as any) as DocumentChange)).toBeTruthy();
  });

  let collection: FakeCollection;
  let topic: string;
  let broadcast: jest.Mock;
  let fs: Firestore;

  beforeEach(() => {
    collection = createFSCollection(faker.random.uuid());
    topic = faker.random.uuid();
    broadcast = jest.fn();
    fs = createFS(collection);
  });

  afterEach(() => {
    broadcast.mockReset();
  });

  test('filters the changes', () => {
    const filter: util.Filter = jest.fn(change => change.doc.data().test === true);
    const [_, handler] = util.createFallThroughHandler(fs, {
      collection: collection.id,
      topic,
      filter,
    });

    const broadcast = jest.fn();
    handler(broadcast);

    collection.trigger(
      createFSCollectionSnapshot(
        createFSSnapshotChange('added', {
          test: true,
        })
      )
    );
    collection.trigger(
      createFSCollectionSnapshot(
        createFSSnapshotChange('added', {
          test: false,
        })
      )
    );
    expect(broadcast).toHaveBeenCalledTimes(1);
  });

  test('works with the default transformer', () => {
    const [_, handler] = util.createFallThroughHandler(fs, {
      collection: collection.id,
      topic,
      filter: ['removed'],
    });
    const data = { id: faker.random.uuid() };
    const broadcast = jest.fn();
    handler(broadcast);

    collection.trigger(createFSCollectionSnapshot(createFSSnapshotChange('removed', data)));
    expect(broadcast).toHaveBeenCalledWith(data);
  });

  test('works with a custom transformer', () => {
    const [_, handler] = util.createFallThroughHandler(fs, {
      collection: collection.id,
      topic,
      filter: ['removed'],
      transform: change => ({
        ...change.doc.data(),
        awesome: true,
      }),
    });
    const data = { id: faker.random.uuid() };
    const broadcast = jest.fn();
    handler(broadcast);

    collection.trigger(createFSCollectionSnapshot(createFSSnapshotChange('removed', data)));
    expect(broadcast).toHaveBeenCalledWith({
      ...data,
      awesome: true,
    });
  });

  test('works with the document transformer', () => {
    const [_, handler] = util.createFallThroughHandler(fs, {
      collection: collection.id,
      topic,
      filter: ['removed'],
      transform: util.TransformStrategy.DOCUMENT,
    });
    const data = { id: faker.random.uuid() };
    const broadcast = jest.fn();
    handler(broadcast);

    const change = createFSSnapshotChange('removed', data);
    collection.trigger(createFSCollectionSnapshot(change));

    const [[obtainedChange]] = broadcast.mock.calls;
    expect(obtainedChange).toHaveProperty('data');
  });

  test('createFallThroughHandlerFromMap works as expected', () => {
    const topicA = faker.random.uuid();
    const topicB = faker.random.uuid();
    const options: util.FallThroughHandlerBaseOptions = {
      collection: collection.id,
    };

    const result = util.createFallThroughHandlerFromMap(fs, {
      [topicA]: options,
      [topicB]: options,
    });

    expect(result).toHaveLength(2);
    expect(result[0][0]).toEqual(topicA);
    expect(typeof result[0][1]).toEqual('function');
    expect(result[1][0]).toEqual(topicB);
    expect(typeof result[1][1]).toEqual('function');
  });
});
