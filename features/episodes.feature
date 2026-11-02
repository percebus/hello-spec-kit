Feature: Episodes page

  # SRC: https://github.com/percebus/hello-spec-kit/issues/11
  Scenario: A visitor finds exactly 20 distinct episodes
    Given a visitor opens the episodes page
    When the episodes page loads
    Then exactly 20 distinct episodes are available

  # SRC: https://github.com/percebus/hello-spec-kit/issues/18
  Scenario: A visitor scans each episode's complete details
    Given a visitor opens the episodes page
    When the visitor scans the episode collection
    Then each episode shows its complete details and playback action

  # SRC: https://github.com/percebus/hello-spec-kit/issues/15
  Scenario: A visitor identifies the selected episode during playback
    Given a visitor opens the episodes page
    And the visitor selects an episode's playback action
    When playback starts
    And the selected episode is clearly identified
    And standard playback controls are available for the selected episode
