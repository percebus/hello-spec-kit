Feature: Episodes page

  # FR-007: The episodes page displays 20 distinct episodes without external content.
  # SRC: https://github.com/percebus/hello-spec-kit/issues/11
  # SRC: https://github.com/percebus/hello-spec-kit/issues/34
  Scenario: A visitor finds exactly 20 distinct episodes
    Given a visitor opens the episodes page
    When the episodes page loads
    Then exactly 20 distinct episodes are available
    And no external content is requested

  # FR-021: Only one episode plays at a time.
  # SRC: https://github.com/percebus/hello-spec-kit/issues/16
  Scenario: Starting another episode stops the current episode
    Given a visitor opens the episodes page
    And the first episode is playing
    When the visitor starts the second episode
    Then the first episode is paused
    And the first episode is no longer identified as playing
    And only the newly selected episode is playing
    And the selected episode is clearly identified

  # SC-008: Every rendered episode card exposes complete details.
  # SRC: https://github.com/percebus/hello-spec-kit/issues/18
  # SRC: https://github.com/percebus/hello-spec-kit/issues/60
  Scenario: A visitor scans each episode's complete details
    Given a visitor opens the episodes page
    When the visitor scans the episode collection
    Then each episode shows its complete details and playback action

  # FR-014: Decorative artwork has empty alternative text when the episode
  # details are provided alongside it.
  # SRC: https://github.com/percebus/hello-spec-kit/issues/39
  # SRC: https://github.com/percebus/hello-spec-kit/issues/153
  Scenario: Episode artwork is decorative
    Given a visitor opens the episodes page
    When the visitor scans the episode collection
    Then each episode artwork has empty alternative text

  # SRC: https://github.com/percebus/hello-spec-kit/issues/152
  Scenario: Episode artwork does not embed episode numbers
    Given a visitor opens the episodes page
    When the episodes page loads
    Then episode artwork contains no embedded episode numbers

  # FR-010: The playing episode is clearly identified.
  # SRC: https://github.com/percebus/hello-spec-kit/issues/15
  # SRC: https://github.com/percebus/hello-spec-kit/issues/37
  Scenario: A visitor identifies the selected episode during playback
    Given a visitor opens the episodes page
    And the visitor selects an episode's playback action
    When playback starts
    And the selected episode is clearly identified
    And standard playback controls are available for the selected episode
