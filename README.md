# elm


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
