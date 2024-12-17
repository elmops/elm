# elm

## TODOs
- once a client times out we need to set them as disconnected in the clients list. If a client with the same username (for now) rejoins, we need to restore their data.
- go file by file and refactor step by step into the proper file structure
- Add summaries to modules to describe the purpose of the module for llms

## Later
- Refactor the timers to be count up timers



## Draft Schema

type TimePool: number  // milliseconds

TimeSpan = {
  start: number
  end: number
}

RateBoundary = TimeSpan | TimePool | undefined

/**
 * Capabilities are pure functions.
 */
type Capability<Args = any[], Return = any> = (
  ...args: Args
) => Promise<Return>

Agent
  id: string
  name: string
  assignments: Assignment[]     // Updated to use formal role assignments
  speakingTimeQuota: TimePool


/*
 * # Role Ontology
 * - Capabilities map to actions in our data stores.
 * - Roles and Assignments are used for permission checking.
 * - Domains create rate boundaries.
 * - Meta-Capabilities assign permissions.
 */

/**
 * A Domain emerges where rate boundaries in business processes create stable regions
 * of behavior. The Domain hierarchy reflects nested rate boundaries.
 */
Domain
  displayName: string
  capabilities: Set<Capability> // Domain-specific capabilities
  roles: Map<Symbol, Role>      // Roles available in this domain
  rateBoundary: RateBoundary    // Rate boundaries available in this domain
  subDomains: Set<Domain>       // Child domains
  parentDomain?: Domain         // Optional parent domain

Role
  displayName: string
  capabilities: Set<Capability> // Capabilities granted to this role

Assignment
  userId: string
  role: Role
  domain: Domain                // The domain this assignment is valid in



/* Meta-Capabilities */
SystemCapabilities
  ASSIGN_ROLE: Capability
  REVOKE_ROLE: Capability


/* Domains */
Meeting extends Domain
  participants: Agent[]
  phases: MeetingPhase[]

MeetingPhase extends Domain


/** Voting */
VotingPhase extends MeetingPhase
  proposals: Proposal[]
  votes: Vote[]

Vote
  agent: Agent
  proposal: Proposal

Proposal
  form: Form
  content: Capability
  people: Agent[]

Form extends MeetingPhase
  role: Role  // The role assigned to participants in that phase
}



### backup
Context
  Type
    Nature
    Agent
    Organization
  Sub-Contexts

Agent
  Subcontext
    Role
      Permission
    Meeting
      Attendant->Agent
      Phases
        Phase->Activity

Activity
  Duration->Timer
  Process->Action
    Voting
    Fudge


Action
  Context
  Procedure


Permissions
  Permission->Action
  Meta-Permission->Action
    Assign Roles
    Create Roles
    ...

Activities
  Meeting
  Setup
  Fudge
  Voting



## Example File Structure
src/
  inward/ [Abstract Concepts]
    universal/ (IU) [Foundational Entities]
      quantity.ts
      record.ts

    types/ (IP) [Particular Entities]
      Agent.ts
      Meeting.ts
      Activity.ts

    actions/ (II) [Workflow Orchestration]
      AgentActions.ts
      MeetingActions.ts
      ActivityActions.ts

  process/ [mediation]
    utility/ (MU)
      Authentication.ts
      EventBus.ts
      Logging.ts
      Permissions.ts
      main.ts

    engine/ (MP)
      GoogleAnalyticsAdapter.ts
      LocalCommunicationAdapter.ts
      MiroIntegrationAdapter.ts
      WebRTCAdapter.ts
      MeetingEngine.ts
      ActivityEngine.ts
      VotingEngine.ts
      TimerEngine.ts

    manager/ (MI) [Service]
      MeetingManager.ts
      VotingManager.ts
      ActivityManager.ts
      AnalyticsManager.ts
      IntegrationManager.ts

  presentation/ [Outward]
    universal/ (OU)
      App.vue
      Router.ts
      style.css

    particular/ (OP)
      DesignSystem/
        Button.vue
        Card.vue
        Dropdown.vue
        Input.vue
        Modal.vue
        Toggle.vue

      Layouts/
        CardLayout.vue
        SplitPaneLayout.vue
        TabLayout.vue

      InteractionPatterns/
        CollaborativeEditor.vue
        DraggableList.vue
        ZoomableCanvas.vue
      Components/
        ActivityProgressBar.vue
        CustomVotingDisplay.vue
        MeetingControlPanel.vue
        ParticipantGrid.vue
        TimerDisplay.vue
        VotingInterface.vue

    view/ (OI)
        ActivityDashboardPage.vue
        HomePage.vue
        MeetingRoomPage.vue


## Sequence Diagrams
```
sequenceDiagram
    participant u as User
    participant ui as UI

    u->>ui: loads
    ui->>ui: +Agent
    ui->>ui: Agent->genCryptoKeys()
    create participant c as Client
    ui->>c: +Client(AgentPublicKey)
    ui->>ui: show Landing

    u->>ui: click create meeting

    create participant s as Server
    ui->>s: +Server(AgentPublicKey)
    s->>ui: return server address
    s->>s: set Agent as server admin and meeting executor roles
    % server now running with nothing connected

    c->>s: Client.connect(Server, Agent)
    s->>c: sends client relevant data stores for that agent's role

    ui->>c: add relevant watchers for stores


    ui->>u: show Set up Meeting
    u->>ui: click Add Phase
    ui->>ui: onAddPhase()
    ui->>c: actions.addPhase()
    c->>s: EventBus.send(addPhase, Agent)
    s->>s: Permissions.check(addPhase, Agent)
    s->>s: actions.addPhase()
    s->>c: updated store with added phase
    c->>ui: render new store
    
% TODO
% v0.1
% DONE: create a local store to containe internal identity and server and client details
% DONE: Add asymmetrical crypto to internal identity store


- Make it so on connection, the a key exchange happens where the server sends its public key to the client, and t- Make it so each action sends a signature using the private key of the identity that is sending the action
he client sends its public key to the server
- Make it so the server verifies the signature of the identity that sent the action, and can only run actions if the signature is valid



% spin up client immediately on Landing load
% spin up server when clicking create Meeting, pass internal identity public key
% update server to expect key and return server address
% put server details in local store
% refactor meetingManager to use proper one way event delegation (client calls actions through event bus, server runs action and pushes updated store)
% add permissions to server
% add actions for existing UI affordances
% refactor UI to render meeting details from proper store
% make sure list of connected participants still works properly

% LATER
%v0.2
% As a user, I'm setting up the software
  % I want to load a meeting template, with preconfigured phases
  % I want it to be easy to set up a meeting with n people
  % I want to see Overall meeting time, Phase time, and person time

% Requirements
  % system needs to know what is total meeting time, and total phase time
  % which phases are admin time/fudge and which are person time

%v0.3
% I want to be able to configure meeting phases

%v1.0
% I want to see a meeting screen
% As an executor, I want to be able to start and stop timers

%v2.0
  % I want to be able to donate time to others and vice versa

%v3.0
  % I want to be able to vote on meeting phases
  % As an executor, I want to have voting phase guide me on how to run the meeting

% QUESTIONS
% What happens when a person runs out of time?
    % We can donate time to them
```