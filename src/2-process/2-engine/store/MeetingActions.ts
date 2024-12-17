import type { Meeting, MeetingParticipant } from '@/1-data/type/Meeting';
import type { NetworkedStoreOptions } from '@/2-process/1-utility/1-universal/NetworkedStore';

export interface MeetingStoreState {
  meeting: Meeting | null;
}

export const MeetingCapability = {
  JOIN_MEETING: async (
    meeting: Meeting,
    participant: MeetingParticipant
  ): Promise<void> => {
    meeting.participants.push(participant);
  },

  LEAVE_MEETING: async (
    meeting: Meeting,
    participantId: string
  ): Promise<void> => {
    meeting.participants = meeting.participants.filter(
      (p) => p.id !== participantId
    );
  },

  UPDATE_PHASE: async (meeting: Meeting, phase: number): Promise<void> => {
    meeting.currentPhase = phase;
  },

  START_MEETING: async (meeting: Meeting, startTime: number): Promise<void> => {
    meeting.startTime = startTime;
    meeting.isActive = true;
  },

  STOP_MEETING: async (meeting: Meeting): Promise<void> => {
    meeting.isActive = false;
  },
} as const;

export type MeetingCapabilities = typeof MeetingCapability;

interface ActionContext {
  state: MeetingStoreState;
}

// Helper to create store options with meeting actions
export function createMeetingStoreOptions(
  meeting: Meeting
): NetworkedStoreOptions<MeetingStoreState> {
  return {
    id: 'meeting-store',
    state: () => ({ meeting }),
    actions: {
      'meeting/join': async function (
        this: ActionContext,
        payload: { participant: MeetingParticipant }
      ): Promise<void> {
        if (!this.state.meeting) return;
        await MeetingCapability.JOIN_MEETING(
          this.state.meeting,
          payload.participant
        );
      },

      'meeting/leave': async function (
        this: ActionContext,
        payload: { participantId: string }
      ): Promise<void> {
        if (!this.state.meeting) return;
        await MeetingCapability.LEAVE_MEETING(
          this.state.meeting,
          payload.participantId
        );
      },

      'meeting/updatePhase': async function (
        this: ActionContext,
        payload: { phase: number }
      ): Promise<void> {
        if (!this.state.meeting) return;
        await MeetingCapability.UPDATE_PHASE(this.state.meeting, payload.phase);
      },

      'meeting/start': async function (
        this: ActionContext,
        payload: { startTime: number }
      ): Promise<void> {
        if (!this.state.meeting) return;
        await MeetingCapability.START_MEETING(
          this.state.meeting,
          payload.startTime
        );
      },

      'meeting/stop': async function (this: ActionContext): Promise<void> {
        if (!this.state.meeting) return;
        await MeetingCapability.STOP_MEETING(this.state.meeting);
      },
    },
  };
}
