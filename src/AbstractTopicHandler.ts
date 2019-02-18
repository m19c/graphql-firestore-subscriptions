export abstract class AbstractTopicHandler<T = string> {
  constructor(readonly topic: T) {}

  public abstract subscribe(broadcast: Function, options?: Object): AbstractTopicHandler;
  public abstract unsubscribe(): boolean;
}
