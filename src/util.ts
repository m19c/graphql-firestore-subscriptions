import {
  DocumentChange,
  DocumentData,
  QueryDocumentSnapshot,
  DocumentChangeType,
  Firestore,
} from '@google-cloud/firestore';
import { Handler } from './PubSub';

export type Filter = (change: DocumentChange) => boolean;

export function createTypeFilter(...types: DocumentChangeType[]): Filter {
  return (change: DocumentChange) => types.includes(change.type);
}

export enum TransformStrategy {
  DOCUMENT = 'doc',
  DATA = 'data',
}

export type TransformFunction = (change: DocumentChange) => any;

export interface FallThroughHandlerBaseOptions {
  collection: string;
  transform?: TransformStrategy | TransformFunction;
  filter?: DocumentChangeType[] | Filter;
}

export interface FallThroughHandlerOptions extends FallThroughHandlerBaseOptions {
  topic: string;
}

export function createFallThroughHandler(
  fs: Firestore,
  overwriteOptions: FallThroughHandlerOptions
): [string, Handler] {
  const options = { ...overwriteOptions };

  if (!options.transform) {
    options.transform = TransformStrategy.DATA;
  }

  if (Array.isArray(options.filter)) {
    options.filter = createTypeFilter(...options.filter);
  }

  return [
    options.topic,
    broadcast =>
      fs.collection(options.collection).onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
          if (typeof options.filter === 'function' && !options.filter(change)) {
            return;
          }

          let payload: DocumentChange | QueryDocumentSnapshot | DocumentData = change;

          if (typeof options.transform === 'string') {
            if (options.transform === TransformStrategy.DATA) {
              payload = change.doc.data();
            } else if (options.transform === TransformStrategy.DOCUMENT) {
              payload = change.doc;
            }
          }

          if (typeof options.transform === 'function') {
            payload = options.transform(change);
          }

          broadcast(payload);
        });
      }),
  ];
}

export interface FallThroughHandlerFromMapOptions {
  [topic: string]: FallThroughHandlerBaseOptions;
}

export function createFallThroughHandlerFromMap(
  fs: Firestore,
  options: FallThroughHandlerFromMapOptions
): [string, Handler][] {
  return Object.keys(options).map(topic =>
    createFallThroughHandler(fs, {
      topic,
      ...(options[topic] as FallThroughHandlerBaseOptions),
    })
  );
}
