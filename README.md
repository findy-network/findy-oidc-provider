# findy-oidc-provider

[![test](https://github.com/findy-network/findy-oidc-provider/actions/workflows/test.yml/badge.svg)](https://github.com/findy-network/findy-oidc-provider/actions/workflows/test.yml)

Sample PoC project for integrating Aries-agent based authentication to OIDC-provider.

## Overview

```mermaid
sequenceDiagram
    participant UserAgent
    participant User
    participant RP
    participant IdP
    participant IdPAgent

    User->>RP: "Login with Findy"
    RP->>IdP: Redirect to IdP auth URL
    IdP->>IdPAgent: New invitation
    IdPAgent-->>IdP: Invitation
    Note left of IdP: Render invitation QR code
    loop Status check
        IdP->>IdP: Is verification ready?
    end
    User->>UserAgent: Use wallet to read QR code
    UserAgent->>IdP: Read invitation
    UserAgent->>IdPAgent: New pairwise connection
    IdPAgent->>IdP: Pairwise created!
    IdP->>IdPAgent: Request for proof of credential
    IdPAgent->>UserAgent: Send proof request
    UserAgent->>User: Ok to reveal attributes?
    User-->>UserAgent: Ok!
    UserAgent->>IdPAgent: Send proof
    IdPAgent->>IdPAgent: Verify proof
    IdPAgent->>IdP: Proof ok, user attributes
    Note right of IdP: Store user data to cache
    IdP->>IdP: Verification ready!
    IdP->>RP: Redirect to RP callback URL
    RP->>IdP: Fetch user info
    IdP-->>RP: User info
    RP->>RP: Login ready
    
```
