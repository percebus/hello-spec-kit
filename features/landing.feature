Feature: Landing page

  # FR-003: 
  # The landing page MUST communicate the podcast's identity through 
  # - a show name
  #  - concise description
  #  - distinctive visual presentation
  #  - and clear content hierarchy.
  #
  # SRC: https://github.com/percebus/hello-spec-kit/issues/12
  Scenario Outline: A visitor recognizes the show and its featured episode
    Given the landing page
    When the landing page loads
    Then <element> is visible
    Examples:
    | element                    | issue |
    | podcast identity           |       |
    | concise show description   |       |
    
    # FR-004The landing page MUST display exactly one featured episode.
    | exactly 1 featured episode |   #27 |


  # FR-006: The featured episode MUST display 
  #  - a title
  #  - artwork
  #  - publication date
  #  - duration
  #  - summary
  #  - playback action
  #
  # SRC: https://github.com/percebus/hello-spec-kit/issues/17
  # SRC: https://github.com/percebus/hello-spec-kit/issues/30
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

  # TODO
  # FR-005: The featured episode MUST be one of the episodes in the complete episode catalog.
