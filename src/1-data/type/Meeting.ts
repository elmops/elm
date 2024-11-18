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
