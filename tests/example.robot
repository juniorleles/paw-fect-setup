*** Settings ***
Library    Browser
Test Teardown    Run Keywords
...    Run Keyword And Ignore Error    Take Screenshot
...    AND    Run Keyword And Ignore Error    Close Browser

*** Variables ***
${BASE_URL}    https://stage.magiczap.io/

*** Test Cases ***
Abrir site e validar título
    [Tags]    smoke
    New Browser    chromium    headless=True
    New Page       ${BASE_URL}
    ${title}=      Get Title
    Should Contain    ${title}    Lovable App
    Close Browser

Fluxo completo (regression)
    [Tags]    regression
    # aqui seus passos completos…
    Log    exemplo