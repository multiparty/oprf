# OPRF
[![npm version](https://badge.fury.io/js/oprf.svg)](https://badge.fury.io/js/oprf)
[![Build Status](https://travis-ci.org/multiparty/oprf.svg?branch=master)](https://travis-ci.org/multiparty/oprf)
[![Coverage Status](https://coveralls.io/repos/github/multiparty/oprf/badge.svg?branch=master)](https://coveralls.io/github/multiparty/oprf?branch=master)

#### Oblivious pseudo-random function over an elliptic curve (Ristretto255)

## Installation
For node.js, use:

```bash
npm install oprf
```

For the browser, include a script tag targeting either `dist/oprf.js` or `dist/oprf.slim.js`.

## Bundle vs slim

For browsers, we provide two built files: `dist/oprf.js` and `dist/oprf.slim.js`.

The first includes both OPRF bundled with [libsodium-wrappers-sumo](https://github.com/jedisct1/libsodium.js) version 0.7.6. The second includes only OPRF.

You can use the slim version for cases where your browser-side code uses a more recent version of libsodium, or if you want
to load libsodium asynchronously to reduce page load time.

The API for both versions is identical, except that the slim OPRF constructor expects a sodium instance to be passed in
as a parameter, while the bundled constructor does not expect any parameters.

In node.js, the slim OPRF is not exposed.

```javascript
const OPRF = require('oprf');
const oprf = new OPRF(); // will require('libsodium-wrappers-sumo');
```

## Initialization
OPRF is not safe to use until sodium is done loading.

```Typescript
const oprf = new OPRF();
await oprf.ready; // wait for dependencies to load
```

## Security Guarantees
A client has input _x_ while a server holds key _k_. The client receives the output of *f<sub>k</sub>(x)* for some pseudorandom function family *f<sub>k</sub>*. The server learns nothing.

The implementation uses [Ristretto255](https://libsodium.gitbook.io/doc/advanced/point-arithmetic/ristretto), and does not suffer from small cofactor attacks.

## Public Interface
Contains a masked point and the mask that was applied to it
```Typescript
export interface IMaskedData {
  readonly point: Uint8Array;
  readonly mask: Uint8Array;
}
```

## Public Functions

**hashToPoint**: maps string input to a point on the elliptic curve
```Typescript
public hashToPoint(input: string): Uint8Array
```

**isValidPoint**: returns whether the given point exists on the elliptic curve
```Typescript
public isValidPoint(point: Uint8Array): boolean
```

**maskInput**: hashes string input as a point on an elliptic curve and applies a random mask to it
```Typescript
public maskInput(input: string): IMaskedData
```

**maskPoint**: applies a random mask to an elliptic curve point
```Typescript
public maskPoint(point: Uint8Array): IMaskedData
```

**unmaskPoint**: applies the multiplicative inverse of the mask to the masked point
```Typescript
public unmaskPoint(maskedPoint: Uint8Array, mask: Uint8Array): Uint8Array
```

**generateRandomScalar**: generates a uniform random 32-byte number in [1, order of curve)
```Typescript
public generateRandomScalar(): Uint8Array
```

**scalarMult**: salts a point using a key as a scalar
```Typescript
public scalarMult(point: Uint8Array, key: Uint8Array): Uint8Array
```

**encodePoint**: encodes a point representation to a string with either 'ASCII' or 'UTF-8' encoding
```Typescript
public encodePoint(point: Uint8Array, encoding: string): string
```

**decodePoint**: decode elliptic curve point from a string
```Typescript
public decodePoint(code: string, encoding: string): Uint8Array
```

**addPoints**: add two points on an elliptic curve
```Typescript
public addPoints(pointA: Uint8Array, pointB: Uint8Array): Uint8Array
```

**subtractPoints**: subtract two points on an elliptic curve
```Typescript
public subtractPoints(pointA: Uint8Array, pointB: Uint8Array): Uint8Array
```

## OPRF Steps
1.) **Client**: hash input and mask it using a randomly generated 32-byte number
```Typescript
const input = 'hello world';
const masked = oprf.maskInput(input);

// Send masked.point to server,
// Do not send masked.mask to the server.
send(oprf.encodePoint(masked.point, 'UTF-8'));
```

2.) **Server**: salt the masked point using a secret key
```Typescript
// Note: your actual secret key should be fixed.
// Do not generate a new scalar for each OPRF
// application unless you have a specific use case for doing so.
const secretKey = oprf.generateRandomScalar();

const maskedPoint = oprf.decodePoint(receive(), 'UTF-8');
const salted = oprf.scalarMult(maskedPoint, secretKey);

// Send salted back to the client
send(oprf.encodePoint(salted, 'UTF-8'));
```

3.) **Client**: unmask the salted point from the server to get a high-entropy output
```Typescript
// Make sure that masked.mask corresponds to the original mask used.
// Otherwise, this will not give you the correct output.
const salted = oprf.decodePoint(receive(), 'UTF-8');
const unmasked = oprf.unmaskPoint(salted, masked.mask);
```


-----
Implementation inspired by Burns et. al.
https://pdfs.semanticscholar.org/5d33/ea1d3fda454875a6a6ee7c535c80c74af512.pdf
