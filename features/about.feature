Feature: About page

  # SRC: https://github.com/percebus/hello-spec-kit/issues/9
  Scenario Outline: A visitor learns about the show
    Given the about page
    When it loads
    Then the <section> section is visible

    # SRC: https://github.com/percebus/hello-spec-kit/issues/31
    And it has some description

    Examples:
      | section   |
      | Purpose   |
      | Topics    |
      | For whom  |
      | Your host |

  # SRC: https://github.com/percebus/hello-spec-kit/issues/20
  Scenario: About page imagery has equivalent text
    Given the about page
    And the "Your host" section
    When it loads
    Then there is alt text available
    And it reads "Illustrated portrait of Mara Velez, the host of Signal & Story."
