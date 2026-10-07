Feature: Landing page

  # SRC: https://github.com/percebus/hello-spec-kit/issues/12
  Scenario Outline: A visitor recognizes the show and its featured episode
    Given the landing page
    When the landing page loads
    Then <element> is visible
    Examples:
    | element                  |
    | podcast identity         |
    | concise show description |
    | featured episode         |

  # SRC: https://github.com/percebus/hello-spec-kit/issues/17
  Scenario Outline: The featured episode provides complete listening context
    Given the landing page
    And the featured episode
    When the feature episode loads
    Then it provides playback controls
    And it shows <element>
    Examples:
    | element          |
    | title            |
    | artwork          |
    | publication date |
    | duration         |
    | summary          |

  # SRC: https://github.com/percebus/hello-spec-kit/issues/14
  Scenario: A visitor opens the Episodes page from Home
    Given the Home page
    When they click on Episodes
    Then they arrive at the episodes page
