import type {
  MeetingTemplate,
  MeetingAction,
  JoinMeetingPayload,
  LeaveMeetingPayload,
} from '@/1-data/type/Meeting';

import {
  type PublicIdentity,
  secureIdentityManager,
} from '@/2-process/1-utility/1-universal/SecureIdentity';

import { WebRTCServer } from '@/2-process/1-utility/2-particular/WebRTCServer';
import { WebRTCClient } from '@/2-process/1-utility/2-particular/WebRTCClient';

import { useMeetingStore } from '@/2-process/2-engine/store/MeetingStore';
import { useAgentStore } from '@/2-process/2-engine/store/AgentStore';
import { createMeetingStoreOptions } from '@/2-process/2-engine/store/MeetingActions';
import { exportKey } from '@/2-process/1-utility/1-universal/Crypto';

export class MeetingManager {
  private server: WebRTCServer | null = null;
  private client: WebRTCClient | null = null;
  private store = useMeetingStore();
  private agentStore = useAgentStore();
  private cleanupHandler: (() => void) | null = null;

  constructor() {
    // Window unload handler
    this.cleanupHandler = () => {
      this.leaveMeeting().catch((error) => {
        console.error('Error during cleanup:', error);
      });
    };
    window.addEventListener('beforeunload', this.cleanupHandler);
  }

  async hostMeeting(template: MeetingTemplate): Promise<string> {
    try {
      const identity = secureIdentityManager.getIdentity();
      if (!identity) throw new Error('Identity not initialized');

      // Initialize server with host's identity
      const publicIdentity: PublicIdentity = {
        id: identity.id,
        publicKey: await exportKey(identity.keyPair.publicKey),
      };

      // Create meeting in store (without connection ID yet)
      const meeting = this.store.createMeeting(template);

      // Start the server and get its connection ID
      this.server = new WebRTCServer(
        publicIdentity,
        createMeetingStoreOptions(meeting)
      );

      const serverConnectionId = this.server.getConnectionId();

      // Update the meeting with the connection ID
      const updatedMeeting = {
        ...meeting,
        connectionId: serverConnectionId,
        participants: [
          {
            id: identity.id,
            name: this.agentStore.agent.name,
            isHost: true,
          },
        ],
      };
      this.store.updateMeeting(updatedMeeting);

      // Initialize and connect client to this server
      this.client = new WebRTCClient(serverConnectionId);
      await this.client.connect();

      console.log('🔥 [MeetingManager] Meeting hosted:', serverConnectionId);
      // Server will automatically assign roles after successful connection and key exchange
      return serverConnectionId; // Return the connection ID for sharing
    } catch (error) {
      console.error('Failed to host meeting:', error);
      throw error;
    }
  }

  async joinMeeting(connectionId: string): Promise<void> {
    try {
      this.store.setConnecting(true);

      // Initialize client with the provided connection ID
      if (!this.client) {
        this.client = new WebRTCClient(connectionId);

        console.log('🔥 [MeetingManager] Joining meeting:', connectionId);
        await this.client.connect();
      }

      // Wait for initial state sync
      const networkedStore = this.client.getStore();
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Store sync timeout'));
        }, 10000);

        const unsubscribe = networkedStore.subscribe(() => {
          if (networkedStore.state.meeting) {
            clearTimeout(timeout);
            unsubscribe();
            resolve();
          }
        });
      });

      // Update local store with networked state
      const { meeting } = networkedStore.state;
      this.store.updateMeeting(meeting);

      // Get identity and assign participant role
      const identity = secureIdentityManager.getIdentity();
      if (!identity) throw new Error('Identity not initialized');

      // Server will handle role assignment after verifying client's identity
      // We just need to dispatch the join action
      const joinAction: MeetingAction = {
        type: 'meeting/join',
        payload: {
          participant: {
            id: this.agentStore.agent.id,
            name: this.agentStore.agent.name,
          },
        } as JoinMeetingPayload,
      };

      await this.client.dispatch(joinAction);

      this.store.setConnecting(false);
    } catch (error) {
      this.store.setConnecting(false);
      this.store.setError(
        error instanceof Error ? error.message : 'Failed to join meeting'
      );
      console.error('Failed to join meeting:', error);
      throw error;
    }
  }

  async leaveMeeting(): Promise<void> {
    try {
      if (this.client) {
        // Dispatch leave action before disconnecting
        const leaveAction: MeetingAction = {
          type: 'meeting/leave',
          payload: {
            participantId: this.agentStore.agent.id,
          } as LeaveMeetingPayload,
        };

        await this.client.dispatch(leaveAction);
        await this.client.disconnect();
        this.client = null;
      }

      if (this.server) {
        this.server = null;
      }

      // Clear meeting state
      this.store.clearMeeting();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to leave meeting';
      this.store.setError(errorMessage);
      throw error;
    }
  }

  destroy(): void {
    if (this.cleanupHandler) {
      window.removeEventListener('beforeunload', this.cleanupHandler);
      this.cleanupHandler = null;
    }
  }

  isConnected(): boolean {
    return !!(this.server || this.client);
  }
}

// Create a singleton instance
export const meetingManager = new MeetingManager();
