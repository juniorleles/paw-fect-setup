*** Settings ***
Library    Browser

*** Test Cases ***
Abrir site e validar título
    New Browser    chromium    headless=True
    New Page       https://www.magiczap.io/
    ${title}=      Get Title
    Should Contain    ${title}    Lovable App
    Close Browser
    
Fluxo completo (regression)
    [Tags]    regression
    # aqui seus passos completos…
    Log    exemplo