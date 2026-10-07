Feature: Landing page

  # SRC: https://github.com/percebus/hello-spec-kit/issues/12
  Scenario: A visitor recognizes the show and its featured episode
    Given the landing page
    When the landing page loads
    Then the podcast identity is visible
    And a concise show description is visible
    And exactly one featured episode is visible

  # SRC: https://github.com/percebus/hello-spec-kit/issues/17
  Scenario: The featured episode provides complete listening context
    Given the landing page
    When the landing page loads
    Then the featured episode shows its title
    And the featured episode shows its artwork
    And the featured episode shows its publication date
    And the featured episode shows its duration
    And the featured episode shows its summary
    And the featured episode provides playback controls

  # SRC: https://github.com/percebus/hello-spec-kit/issues/14
  Scenario: A visitor browses all episodes
    Given the landing page
    When the visitor follows the primary episodes call to action
    Then the episodes page loads