# OPRF
[![npm version](https://badge.fury.io/js/oprf.svg)](https://badge.fury.io/js/oprf) 
[![Build Status](https://travis-ci.org/multiparty/oprf.svg?branch=master)](https://travis-ci.org/multiparty/oprf)
[![Coverage Status](https://coveralls.io/repos/github/multiparty/oprf/badge.svg?branch=master)](https://coveralls.io/github/multiparty/oprf?branch=master)

#### Oblivious pseudo-random function over an elliptic curve (ED25519)


## Installation
```npm install oprf```

## Initialization 
The sumo version of libsodium must be used
```Typescript
await _sodium.ready;
const oprf = new OPRF(_sodium);
```

## Security Guarantees
A client has input _x_ while a server holds key _k_. The client receives the output of *f<sub>k</sub>(x)* for some pseudorandom function family *f<sub>k</sub>*. The server learns nothing.


## Dependencies
* [elliptic](https://github.com/indutny/elliptic)
* [libsodium.js](https://github.com/jedisct1/libsodium.js)

## Public Interface
Contains a masked point and the mask that was applied to it
```Typescript
export interface IMaskedData {
  readonly point: number[];
  readonly mask: BN;
}
```

## Public Functions
**hashToPoint**: maps string input to a point on the elliptic curve
```Typescript
public hashToPoint(input: string): number[]
```
**maskInput**: hashes string input as a point on an elliptic curve and applies a random mask to it
```Typescript
public maskInput(input: string): maskedData
```
**generateRandomScalar**: generates a random 32-byte array of numbers
```Typescript
public generateRandomScalar(): BN
```
**isValidPoint**: returns whether the given point exists on the elliptic curve
```Typescript
public isValidPoint(p: number[]): number
```
**encodePoint**: converts an elliptic.js point representation to number array representation
```Typescript
public encodePoint(p: any): number[]
```
**decodePoint**: converts a number array to elliptic.js point object representation
```Typescript
public decodePoint(p: number[]): any 
```
**unmaskInput**: applies the multiplicative inverse of the mask to the masked point
```Typescript
public unmaskInput(maskedPoint: number[], mask: BN): number[]
```

## OPRF Steps
1.) **Client**: hash input and mask it using a randomly generated 32-byte number
```Typescript
const input = 'hello world';
const masked = oprf.maskInput(input);

// Send masked.point to server. Do not send masked.mask to the server since it can easily unmask your original input.
```

2.) **Server**: salt the masked point using a secret key
```Typescript
// Note: your actual secret key should be a static 32-byte Uint8Array. Do not generate a new scalar for each OPRF unless you have a specific use case for doing so.
const secretKey = oprf.generateRandomScalar(); 
const salted = oprf.scalarMult(maskedPoint, secretKey);

// Send salted back to the client
```
3.) **Client**: unmask the salted point from the server to get a high-entropy output
```Typescript
// Make sure that masked.mask corresponds to the original mask used. 
// Otherwise, this will not give you the correct output. 
const unmasked = oprf.unmaskInput(salted, masked.mask);
```


-----
Implementation inspired by Burns et. al.
https://pdfs.semanticscholar.org/5d33/ea1d3fda454875a6a6ee7c535c80c74af512.pdf
