# OPRF
#### Oblivious pseudo-random function over an elliptic curve (ED25519)


## Installation
```npm install oprf```

## Dependencies
* elliptic.js: https://github.com/indutny/elliptic
* libsodium.js: https://github.com/jedisct1/libsodium.js

## Steps
1.) Client: hash input and mask it using a randomly generated 32-byte number
```Typescript
function maskInput(input: string): maskedData
```
2.) Server: salt the masked point using a secret key
```Typescript
function saltInput(maskedPoint: Array<Number>, key: string): Array<Number>
```
3.) Client: unmask the salted point from the server to get a high-entropy output
```Typescript
function unmaskInput(salted: Array<Number>, mask: BN): Array<Number>
```
