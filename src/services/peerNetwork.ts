import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

const isTestEnvironment = process.env.NODE_ENV === "test";

if (isTestEnvironment && typeof window !== "undefined") {
  (window as any).peerInstances = (window as any).peerInstances || [];
}


type Action = {
  type: string;
  payload: object | undefined;
};

type Update = {
  type: string;
  payload: object | undefined;
};

type PublisherSubscriber = {
  connection: DataConnection;
  send: (update: Update) => void;
};

type Publisher = {
  peer: Peer;
  subscribers: Map<string, PublisherSubscriber>;
  publish: (update: Update) => void;
  disconnect: () => void;
  id: string;
};

type Subscriber = {
  peer: Peer;
  publisher: DataConnection | null;
  subscribe: (channelId: string) => void;
  dispatchAction: (action: Action) => void;
  unsubscribe: () => void;
  id: string;
};

const createPeer = (id: string): Peer => {
  const peer = new Peer(id);
  if (isTestEnvironment && typeof window !== "undefined") {
    (window as any).peerInstances.push(peer);
  }
  return peer;
};

const createPublisher = (channelId: string): Publisher => {
  const peer = createPeer(channelId);
  const subscribers = new Map<string, PublisherSubscriber>();

  const handleConnection = (conn: DataConnection): void => {
    conn.on('open', () => {
      subscribers.set(conn.peer, {
        connection: conn,
        send: (update: Update) => conn.send(update),
      });
      console.log(`Subscriber connected: ${conn.peer}`);
    });

    conn.on('data', (data) => {
      console.log('Received action from subscriber:', data);
      handleAction(data as Action);
    });

    conn.on('close', () => {
      subscribers.delete(conn.peer);
      console.log(`Subscriber disconnected: ${conn.peer}`);
    });
  };

  const handleAction = (action: Action): void => {
    console.log('Processing action:', action);
    const update: Update = {
      type: 'storeUpdate',
      payload: {
        /* updated store data */
      },
    };
    publish(update);
  };

  const publish = (update: Update): void => {
    for (const [, subscriber] of subscribers) {
      subscriber.send(update);
    }
  };

  const disconnect = (): void => {
    peer.disconnect();
    subscribers.clear();
  };

  peer.on('connection', handleConnection);

  return {
    peer,
    subscribers,
    publish,
    disconnect,
    id: channelId,
  };
};

const createSubscriber = (subscriberId: string): Subscriber => {
  const peer = createPeer(subscriberId);
  let publisher: DataConnection | null = null;

  const handleUpdate = (update: Update): void => {
    console.log('Processing update:', update);
  };

  const subscribe = (channelId: string): void => {
    publisher = peer.connect(channelId);

    publisher.on('open', () => {
      console.log('Connected to publisher');
    });

    publisher.on('data', (update) => {
      console.log('Received update from publisher:', update);
      handleUpdate(update as Update);
    });

    publisher.on('close', () => {
      console.log('Disconnected from publisher');
      publisher = null;
    });
  };

  const dispatchAction = (action: Action): void => {
    if (publisher) {
      publisher.send(action);
    } else {
      console.error('Not connected to a publisher');
    }
  };

  const unsubscribe = (): void => {
    if (publisher) {
      publisher.close();
    }
    peer.disconnect();
  };

  return {
    peer,
    publisher,
    subscribe,
    dispatchAction,
    unsubscribe,
    id: subscriberId,
  };
};

export { createPublisher, createSubscriber };
