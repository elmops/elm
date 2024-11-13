import type {
  Meeting,
  MeetingTemplate,
  MeetingParticipant,
} from '@/1-data/1-schema/MeetingType';

import { useMeetingStore } from '@/1-data/3-state/MeetingStore';
import { useAgentStore } from '@/1-data/3-state/AgentStore';

import { logger } from '@/2-process/1-utility/Logging';

import { MeetingServer } from '@/2-process/2-engine/MeetingServer';
import { MeetingClient } from '@/2-process/2-engine/MeetingClient';

interface MeetingStoreState {
  currentMeeting: Meeting | null;
  isHost: boolean;
  isConnecting: boolean;
  error: string | null;
}

export class MeetingService {
  private server: MeetingServer | null = null;
  private client: MeetingClient | null = null;
  private store = useMeetingStore();
  private agentStore = useAgentStore();
  private cleanupHandler: (() => void) | null = null;

  constructor() {
    // Add window unload handler
    this.cleanupHandler = () => {
      this.leaveMeeting().catch((error) => {
        logger.error('Error during cleanup:', error);
      });
    };
    window.addEventListener('beforeunload', this.cleanupHandler);
  }

  async hostMeeting(template: MeetingTemplate): Promise<string> {
    try {
      this.store.setConnecting(true);

      // Create the meeting in the store with host as first participant
      const meeting = this.store.createMeeting(template);
      meeting.participants = [
        {
          id: this.agentStore.agent.id,
          name: this.agentStore.agent.name ?? 'Anonymous',
          isHost: true,
        },
      ];
      const meetingId = meeting.id;

      // Initialize the server
      this.server = new MeetingServer(meetingId, {
        id: 'meeting',
        state: (): MeetingStoreState => ({
          currentMeeting: meeting,
          isHost: true,
          isConnecting: false,
          error: null,
        }),
        actions: {
          updateMeeting: function (
            this: MeetingStoreState,
            updatedMeeting: Meeting
          ) {
            this.currentMeeting = updatedMeeting;
          },
          addParticipant: function (
            this: MeetingStoreState,
            participant: MeetingParticipant
          ) {
            if (this.currentMeeting) {
              this.currentMeeting.participants.push(participant);
            }
          },
          removeParticipant: function (
            this: MeetingStoreState,
            participantId: string
          ) {
            if (this.currentMeeting) {
              this.currentMeeting.participants =
                this.currentMeeting.participants.filter(
                  (p) => p.id !== participantId
                );
            }
          },
        },
      });

      // Start the server
      await this.server.start();
      logger.log(`Meeting server started with ID: ${meetingId}`);

      return meetingId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to host meeting';
      this.store.setError(errorMessage);
      throw error;
    } finally {
      this.store.setConnecting(false);
    }
  }

  async joinMeeting(meetingId: string): Promise<void> {
    try {
      this.store.setConnecting(true);

      // Initialize the client
      this.client = new MeetingClient(meetingId, {
        id: 'meeting',
        state: (): MeetingStoreState => ({
          currentMeeting: null,
          isHost: false,
          isConnecting: false,
          error: null,
        }),
      });

      // Connect to the meeting
      await this.client.connect();

      // Get the networked store
      const networkedStore = this.client.getStore();

      // Add self as participant
      await networkedStore.dispatch({
        type: 'addParticipant',
        payload: {
          id: this.agentStore.agent.id,
          name: this.agentStore.agent.name,
          isHost: false,
        },
      });

      // Subscribe to store updates
      networkedStore.subscribe((update) => {
        if (update.state.currentMeeting) {
          this.store.updateMeeting(update.state.currentMeeting);
        }
      });

      logger.log(`Connected to meeting: ${meetingId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to join meeting';
      this.store.setError(errorMessage);
      throw error;
    } finally {
      this.store.setConnecting(false);
    }
  }

  async leaveMeeting(): Promise<void> {
    try {
      if (this.client) {
        // Remove self from participants before disconnecting
        const networkedStore = this.client.getStore();
        await networkedStore.dispatch({
          type: 'removeParticipant',
          payload: this.agentStore.agent.id,
        });
        await this.client.disconnect();
        this.client = null;
      }

      if (this.server) {
        await this.server.stop();
        this.server = null;
      }

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
export const meetingService = new MeetingService();
