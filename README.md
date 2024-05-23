# template-embedded-wallet-verification
verify the ownership of an embedded wallet using a backend nonce storing server, with the option to include an expiry

## simplified steps
- user login with web2 provider (e.g. google)
- request nonce from server stored alongisde wallet address
- generate nonce and store on off-chain compute
- generate signature from waas sdk
- send signature with session id, nonce, and wallet address to backend
- verify signature in backend against sequence api 
- (optional) expiry check of timestamped nonce
- return response

## sequence diagrams
### generate nonce
![generate nonce](/generate_nonce.png)

### verify signature
![verify signature](verify_signature.png)

### (optional) verify signature with time expiry 
![verify signature time expiry](verify_signature_time_expiry.png)
