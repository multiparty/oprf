# OPRF
[![npm version](https://badge.fury.io/js/oprf.svg)](https://badge.fury.io/js/oprf) 
#### Oblivious pseudo-random function over an elliptic curve (ED25519)



## Installation
```npm install oprf```

## Security Guarantees
A client has input _x_ while a server holds key _k_. The client receives the output of *f<sub>k</sub>(x)* for some pseudorandom function family *f<sub>k</sub>*. The server learns nothing.


## Dependencies
* [elliptic](https://github.com/indutny/elliptic)
* [libsodium.js](https://github.com/jedisct1/libsodium.js)

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


-----
Implementation inspired by Burns et. al.
https://pdfs.semanticscholar.org/5d33/ea1d3fda454875a6a6ee7c535c80c74af512.pdf
