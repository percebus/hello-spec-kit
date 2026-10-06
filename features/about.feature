Feature: About page

  Scenario Outline: A visitor learns about the show
    Given the about page
    When it loads
    Then the <section> section is visible

    Examples:
      | section   |
      | Purpose   |
      | Topics    |
      | For whom  |
      | Your host |
