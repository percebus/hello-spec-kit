Feature: Landing page

  # SRC: https://github.com/percebus/hello-spec-kit/issues/12
  # NOTE: FR-003 is covered by this
  Scenario Outline: A visitor recognizes the show and its featured episode
    Given the landing page
    When the landing page loads
    Then <element> is visible
    Examples:
    | element                    | issue | FR     |
    | podcast identity           |       |        |
    | concise show description   |       |        |
    | exactly 1 featured episode |   #27 | FR-004 |

  # SRC: https://github.com/percebus/hello-spec-kit/issues/17
  Scenario Outline: The featured episode provides complete listening context
    Given the landing page
    And the featured episode
    When the feature episode loads
    Then it provides playback controls
    And it shows <element>
    Examples:
    | element          | issues   | FR     |
    | title            | #17, #30 | FR-006 |
    | artwork          | #17, #30 | FR-006 |
    | publication date | #17, #30 | FR-006 |
    | duration         | #17, #30 | FR-006 |
    | summary          | #17, #30 | FR-006 |

  # SRC: https://github.com/percebus/hello-spec-kit/issues/17
  Scenario: A visitor can interact with the featured episode player
    Given the landing page
    And the featured episode
    When the visitor clicks the play button
    Then the episode audio playback is initiated

  # SRC: https://github.com/percebus/hello-spec-kit/issues/14
  Scenario: A visitor opens the Episodes page from Home
    Given the Home page
    When they click on Episodes
    Then they arrive at the episodes page
