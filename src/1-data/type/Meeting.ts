export interface MeetingPhase {
  name: string;
  duration: number;
  isAdminTime: boolean;
}

export interface MeetingTemplate {
  name: string;
  phases: MeetingPhase[];
}

export interface MeetingParticipant {
  id: string;
  name: string;
  isHost?: boolean;
}

export interface Meeting {
  id: string;
  connectionId?: string;
  template: MeetingTemplate;
  participants: MeetingParticipant[];
  currentPhase: number;
  startTime?: number;
  isActive: boolean;
}

export interface MeetingState {
  currentMeeting: Meeting | null;
  isHost: boolean;
  isConnecting: boolean;
  error: string | null;
}

// Meeting Action Types
export type JoinMeetingPayload = {
  participant: {
    id: string;
    name: string;
  };
};

export type LeaveMeetingPayload = {
  participantId: string;
};

export type UpdatePhasePayload = {
  phase: number;
};

export type StartMeetingPayload = {
  startTime: number;
};

export type StopMeetingPayload = {
  endTime: number;
};

export type MeetingActionType =
  | 'meeting/join'
  | 'meeting/leave'
  | 'meeting/updatePhase'
  | 'meeting/start'
  | 'meeting/stop';

export type MeetingActionPayload =
  | JoinMeetingPayload
  | LeaveMeetingPayload
  | UpdatePhasePayload
  | StartMeetingPayload
  | StopMeetingPayload;

export interface MeetingAction {
  type: MeetingActionType;
  payload: MeetingActionPayload;
}
