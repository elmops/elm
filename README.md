# elm

## TODOs
- go file by file and refactor step by step into the proper file structure
  - What is peerNework.ts? What does it do?

## Later
- Refactor the timers to be count up timers




## Schema


I'm building a simple set of types for a Meeting facilitation software.

Transform = PureFunction

type TimePool: number  // milliseconds

Agent
  id: string
  name: string
  roles: Role[]
  speakingTimeQuota: TimePool

type Action = Action[] | Transform

Meeting
  participants: Agent[]
  phases: MeetingPhase[]
  duration: TimePool

Role
  permissions: Action[]

GlobalRole = Role & {
  type: "global"
}

MeetingRole = Role & {
  type: "meeting"
  context: MeetingPhase[]
}


MeetingPhase
  executionProcedure: Action[]
  roles: MeetingRole[]  // For example in round robin, one person is speaker, others are listeners
  duration: TimePool

// countdown
type Timer = Action & {
  timeQuota: TimePool
  // more practical implementation details later
}

Vote
  agent: Agent
  proposal: Proposal

Proposal
  form: Role[]
  content: Action
  people: Action

interface Form {
  role: Role  // The role assigned to participants in that phase
  duration: TimePool
}


// Set up meeting room








































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
  






### v2

Context
  ContextType
  Subcontexts->Context[]



Agent->Context(Type=Agent)
  Roles->Permission[]

Permission
  Context
  Action



Meeting->Context(Type=Organization)
  Attendants->Agent[]
  Phases->Activity[]



Action
  Context->[Nature, Agent[], ?Organization]
  Process->Action[] | Transform

Activity->Action  # this is an action in Context(Type=Organization)
  Duration->Timer





## Data
ContextType
  Nature->[Space, Time]
  Agent
  Organization

Action
  Vote
  Time

Meta-Action
  Configure Context
  Assign Roles
  Create Roles

Activity
  Meeting
  Setup
  Fudge
  Voting









### backup

Agent
  Role
    Permission->Action
    Meta-Permission->Action
      Assign Roles
      Create Roles
      ...
Activity
  Duration->Timer
  Process->Action
    Voting
    Fudge
Meeting
  Attendant->Agent
  Phases
    Phase->Activity
Action
  Context
  Procedure

Activities
  Meeting
  Setup
  Fudge
  Voting
  



## Structure
    src/
      data/
        universal/  # Abstraction
          UserSchema.ts
          ProductSchema.ta
        particular/ # Model
          UserModel.ts
          ProductModel.ts
        individual/ # State
          UserStore.ts
          ProductStore.ts
          PresentationStore.ts
          Routes.ts

      process/
        universal/  # Utility
          Logging.ts
          Authentication.ts
          EventBus.ts
          Router.ts
          CommunicationService.ts  # Including Data Access
        particular/ # Engine
          VotingEngine.ts
          TimerEngine.ts
          PresentationEngine.ts
        individual/ # Manager
          adapter/
            WebRTCEventChannel.ts
            LocalEventChannel.ts
          manager/
            OrderProcessManager.ts
            UserRegistrationManager.ts
            PresentationManager.ts

      presentation/
        universal/  # Pattern
          layout/
            SplitPaneLayout.vue
            TabLayout.vue
            CardLayout.vue
            Stack.vue
            Inset.vue
            InsetSquished.vue
            Inline.vue
          interaction-pattern/
            Draggable.vue
            ZoomableCanvas.vue
            CollaborativeEditor.vue
          headless-design-system/
            Button.vue
            Input.vue
            Modal.vue
            Card.vue
            Dropdown.vue
            Toggle.vue
        particular/ # Component
          custom-component/
            MeetingControlPanel.vue
            ActivityProgressBar.vue
            CustomVotingDisplay.vue
          composite-component/
            VotingInterface.vue
            TimerDisplay.vue
            ParticipantGrid.vue
        individual/ # View
          page/
            HomePage.vue
            MeetingRoomPage.vue
            ActivityDashboardPage.vue
          style/
            universal/
              DefaultTheme.scss
              DarkTheme.scss
            particular/
              ButtonStyle.scss
              InputStyle.scss
              ModalStyle.scss
              CardStyle.scss
              DropdownStyle.scss
              ToggleStyle.scss



## old
    src/
      inward/ [Abstract Concepts]
        universal/ (IU) [Foundational Entities]
          User.ts
          Meeting.ts
          Activity.ts

        particular/ (IP) [State and Behavior]
          UserStore.ts
          MeetingStore.ts
          ActivityStore.ts
          VotingEngine.ts
          TimerEngine.ts

        individual/ (II) [Workflow Orchestration]
          MeetingManager.ts
          VotingManager.ts
          ActivityManager.ts

      mediation/ [Business Processes]
        universal/ (MU) [Core Infrastructure]
          EventBus.ts
          Logging.ts
          Authentication.ts

        particular/ (MP) [Service Definitions]
          CommunicationService.ts
          AnalyticsService.ts
          IntegrationService.ts

        individual/ (MI) [Service Implementation]
          WebRTCAdapter.ts
          LocalCommunicationAdapter.ts
          GoogleAnalyticsAdapter.ts
          MiroIntegrationAdapter.ts

      outward/ [User Interactions]
        universal/ (OU) [Application Framework]
          App.vue
          Router.ts

        particular/ (OP) [Refined Interaction Patterns]
          DesignSystem/
            Button.vue
            Input.vue
            Modal.vue
            Card.vue
            Dropdown.vue
            Toggle.vue
          InteractionPatterns/
            DraggableList.vue
            ZoomableCanvas.vue
            CollaborativeEditor.vue
          CompositeComponents/
            VotingInterface.vue
            TimerDisplay.vue
            ParticipantGrid.vue
          Layouts/
            SplitPaneLayout.vue
            TabLayout.vue
            CardLayout.vue

        individual/ (OI) [Application-Specific Views]
          Pages/
            HomePage.vue
            MeetingRoomPage.vue
            ActivityDashboardPage.vue
          CustomComponents/
            MeetingControlPanel.vue
            ActivityProgressBar.vue
            CustomVotingDisplay.vue
          Themes/
            DefaultTheme.scss
            DarkTheme.scss
            CustomBrandTheme.scss
          Styles/
            ButtonStyles.scss
            InputStyles.scss
            ModalStyles.scss
            CardStyles.scss
            DropdownStyles.scss
            ToggleStyles.scss


- Quantify the level of complexity


Now we're going to change the participants to list the connected clients, including the host
- In order to do that we need to create a person for the host, and give them executor privileges. 
- Then the executor has permission to control the server.
- The join room needs a name field.


1. Initialize Local Pinia Store
2. Create person