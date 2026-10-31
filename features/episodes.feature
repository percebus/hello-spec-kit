Feature: Episodes page

  # SRC: https://github.com/percebus/hello-spec-kit/issues/11
  Scenario: A visitor finds exactly 20 distinct episodes
    Given a visitor opens the episodes page
    When the episodes page loads
    Then exactly 20 distinct episodes are available

  # SRC: https://github.com/percebus/hello-spec-kit/issues/16
  Scenario: Starting another episode stops the current episode
    Given a visitor opens the episodes page
    And the first episode is playing
    When the visitor starts the second episode
    Then the first episode is paused
    And only the newly selected episode is playing
