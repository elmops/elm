import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPublisher, createSubscriber } from "./peerNetwork";
import Peer from "peerjs";

vi.mock("peerjs");

describe("Peer Network", () => {
  let mockPeer: any;
  let mockConnection: any;

  beforeEach(() => {
    mockConnection = {
      on: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      peer: "mockPeerId",
    };

    mockPeer = {
      on: vi.fn(),
      connect: vi.fn().mockReturnValue(mockConnection),
      disconnect: vi.fn(),
    };

    vi.mocked(Peer).mockImplementation(() => mockPeer);
  });

  describe("Publisher", () => {
    it("should create a publisher with the given channel ID", () => {
      const publisher = createPublisher("testChannel");
      expect(publisher.id).toBe("testChannel");
      expect(Peer).toHaveBeenCalledWith("testChannel");
    });

    it("should handle new connections", () => {
      const publisher = createPublisher("testChannel");
      const connectionHandler = mockPeer.on.mock.calls.find(call => call[0] === "connection")[1];
      connectionHandler(mockConnection);

      expect(mockConnection.on).toHaveBeenCalledWith("open", expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith("data", expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith("close", expect.any(Function));
    });

    it("should publish updates to all subscribers", () => {
      const publisher = createPublisher("testChannel");
      const connectionHandler = mockPeer.on.mock.calls.find(call => call[0] === "connection")[1];
      connectionHandler(mockConnection);

      const openHandler = mockConnection.on.mock.calls.find(call => call[0] === "open")[1];
      openHandler();

      const update = { type: "testUpdate", payload: { data: "test" } };
      publisher.publish(update);

      expect(mockConnection.send).toHaveBeenCalledWith(update);
    });

    it("should disconnect and clear subscribers", () => {
      const publisher = createPublisher("testChannel");
      publisher.disconnect();

      expect(mockPeer.disconnect).toHaveBeenCalled();
      expect(publisher.subscribers.size).toBe(0);
    });
  });

  describe("Subscriber", () => {
    it("should create a subscriber with the given ID", () => {
      const subscriber = createSubscriber("testSubscriber");
      expect(subscriber.id).toBe("testSubscriber");
      expect(Peer).toHaveBeenCalledWith("testSubscriber");
    });

    it("should subscribe to a publisher", () => {
      const subscriber = createSubscriber("testSubscriber");
      subscriber.subscribe("testChannel");

      expect(mockPeer.connect).toHaveBeenCalledWith("testChannel");
      expect(mockConnection.on).toHaveBeenCalledWith("open", expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith("data", expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith("close", expect.any(Function));
    });

    it("should dispatch actions to the publisher", () => {
      const subscriber = createSubscriber("testSubscriber");
      subscriber.subscribe("testChannel");

      const action = { type: "testAction", payload: { data: "test" } };
      subscriber.dispatchAction(action);

      expect(mockConnection.send).toHaveBeenCalledWith(action);
    });

    it("should unsubscribe and disconnect", () => {
      const subscriber = createSubscriber("testSubscriber");
      subscriber.subscribe("testChannel");
      subscriber.unsubscribe();

      expect(mockConnection.close).toHaveBeenCalled();
      expect(mockPeer.disconnect).toHaveBeenCalled();
    });
  });
});
