import OPRF = require('../src/oprf');
import { expect } from 'chai';

const NUM_STRESS_TESTS = 500;

// End-to-end test of OPRF functionality using random input and random key
function endToEnd(input: string, oprf: OPRF): void {
  // End-2-End protocol
  const maskedPoint = oprf.maskInput(input);
  const encodedP1 = oprf.encodePoint(maskedPoint.point, 'UTF-8');

  const decodedP1 = oprf.decodePoint(encodedP1, 'UTF-8');
  const key = oprf.generateRandomScalar();
  const saltedPoint = oprf.scalarMult(decodedP1, key);
  const encodedP2 = oprf.encodePoint(saltedPoint, 'ASCII');

  const decodedP2 = oprf.decodePoint(encodedP2, 'ASCII');
  const unmaskedPoint = oprf.unmaskPoint(decodedP2, maskedPoint.mask);

  // Specification
  const point = oprf.hashToPoint(input);
  const correct = oprf.scalarMult(point, key);

  expect(unmaskedPoint).to.deep.equals(correct);
}

// Random value in range
function getRandom(max: number): number {
  return Math.floor(Math.random() * Math.floor(max));
}

// Create a random string to use as input
function createRandString(): string {
  const alphabet: string[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
  let str: string = '';
  for (let i: number = 0; i < getRandom(128); i++) {
    const index: number = getRandom(alphabet.length);
    str += alphabet[index];
  }

  if (str === '') {
    str = 'XXXXXX';
  }
  return str;
}

describe('Elliptic Curve Unit Tests', () => {
  // The elliptic curve point at point * (order + 1) should loop back to the original point
  it('Multiplication by inverse', async function () {
    const oprf = new OPRF();
    await oprf.ready;

    const r = oprf.generateRandomScalar();
    const rInv = oprf.sodium.crypto_core_ristretto255_scalar_invert(r);

    const point = oprf.hashToPoint('hello world');
    const multiplied = oprf.scalarMult(oprf.scalarMult(point, r), rInv);

    expect(multiplied).to.deep.equals(point);
  });

  // P * r + P * k = P * (r + k) (mod order)
  it('Scalar multiplication distributivity', async function () {
    const oprf = new OPRF();
    await oprf.ready;

    const r = oprf.generateRandomScalar();
    const k = oprf.generateRandomScalar();
    const rPlusK = oprf.sodium.crypto_core_ristretto255_scalar_add(r, k);

    const point = oprf.hashToPoint('mary had a little lamb');
    const p1 = oprf.scalarMult(point, r);
    const p2 = oprf.scalarMult(point, k);
    const result = oprf.sodium.crypto_core_ristretto255_add(p1, p2);
    const correct = oprf.scalarMult(point, rPlusK);

    expect(result).to.deep.equals(correct);
  });

  // Encoding/Decoding
  it('ASCII Encoding/Decoding', async function () {
    const oprf = new OPRF();
    await oprf.ready;

    const point = oprf.hashToPoint(createRandString());
    const encoded = oprf.encodePoint(point, 'ASCII');
    const decoded = oprf.decodePoint(encoded, 'ASCII');

    expect(decoded).to.deep.equals(point);
  });
  it('UTF-8 Encoding/Decoding', async function () {
    const oprf = new OPRF();
    await oprf.ready;

    const point = oprf.hashToPoint(createRandString());
    const encoded = oprf.encodePoint(point, 'UTF-8');
    const decoded = oprf.decodePoint(encoded, 'UTF-8');

    expect(decoded).to.deep.equals(point);
  });
  it('UTF-8 Encode/Decode of Unaligned Buffers', async function () {
    const oprf = new OPRF();
    await oprf.ready;

    const randByte = Math.floor(Math.random() * Math.pow(2, 8));
    const evenBuffer = oprf.generateRandomScalar();
    const oddBuffer = new Uint8Array(Array.from(evenBuffer).concat([randByte]));

    expect(function () {
      oprf.encodePoint(oddBuffer, 'UTF-8');
    }).to.throw();
  });
it('UTF-8 Encoding/Decoding', async function () {
    const oprf = new OPRF();
    await oprf.ready;

    const point = oprf.hashToPoint(createRandString());
    const encoded = oprf.encodePoint(point, 'UTF-8');
    const decoded = oprf.decodePoint(encoded, 'UTF-8');

    expect(decoded).to.deep.equals(point);
  });

  it('Point Addition', async function () {
    const oprf = new OPRF();
    await oprf.ready;

    const r = oprf.generateRandomScalar();
    const k = oprf.generateRandomScalar();
    const correct = oprf.sodium.crypto_core_ristretto255_add(r, k);

    const result = oprf.addPoints(r, k);

    expect(result).to.deep.equals(correct);
    expect(oprf.subtractPoints(result, k)).to.deep.equals(r);
  });

  it('Point Subtraction', async function () {
    const oprf = new OPRF();
    await oprf.ready;

    const r = oprf.generateRandomScalar();
    const k = oprf.generateRandomScalar();
    const correct = oprf.sodium.crypto_core_ristretto255_sub(r, k);

    const result = oprf.subtractPoints(r, k);

    expect(result).to.deep.equals(correct);
    expect(oprf.addPoints(result, k)).to.deep.equals(r);
  });
});

describe('End-to-End', () => {
  it('Stress', async function () {
    const oprf = new OPRF();
    await oprf.ready;

    for (let i = 0; i < NUM_STRESS_TESTS; i++) {
      endToEnd(createRandString(), oprf);
    }
  });

  it('End-to-end on specified input, set scalar key, and known result', async function () {
    const oprf = new OPRF();
    await oprf.ready;

    const input = 'abcdefghijklmnopr';
    const key = oprf.sodium.from_hex('0a20a9b3c5f5b83a326f50a71e296c2c0161a2660b501e538fe88fb2e740dd3f');

    // OPRF
    const masked = oprf.maskInput(input);
    const salted = oprf.scalarMult(masked.point, key);
    const unmasked = oprf.unmaskPoint(salted, masked.mask);

    // scalar mult of input and key
    const hashedPoint = oprf.hashToPoint(input);
    const result = oprf.scalarMult(hashedPoint, key);

    const knownResult = oprf.sodium.from_hex('6a587ae064543aaa8b36127bcc4309d59aeb563045526cee4d90cbc145bccb47');
    expect(unmasked).to.deep.equals(result).to.deep.equals(knownResult);
  });

  it('End-to-end on specified input and random scalar key', async function () {
    const oprf = new OPRF();
    await oprf.ready;

    const input = 'abcdefghijklmnopr';
    const key = oprf.generateRandomScalar();

    // OPRF
    const masked = oprf.maskInput(input);
    const salted = oprf.scalarMult(masked.point, key);
    const unmasked = oprf.unmaskPoint(salted, masked.mask);

    // scalar mult of input and key
    const hashedPoint = oprf.hashToPoint(input);
    const result = oprf.scalarMult(hashedPoint, key);

    expect(unmasked).to.deep.equals(result);
  });
});

describe('Expected Behavior', () => {
  it('Point hashing expected to be deterministic', async function () {
    const oprf = new OPRF();
    await oprf.ready;

    const input = 'abcdefghijklmnoprq';

    const hashed1 = oprf.hashToPoint(input);
    const hashed2 = oprf.hashToPoint(input);

    const knownOutput = oprf.sodium.from_hex('7c97ba1eeb795bb011ebd9cc62abfc44a91437d390fce61e9eeb1f707e63ca1d');
    expect(hashed1).to.deep.equals(hashed2).to.deep.equals(knownOutput);
  });

  it('Inputs map to distinct results', async function () {
    const oprf = new OPRF();
    await oprf.ready;

    const input1 = 'abcdefghijklmnoprq';
    const input2 = 'abcdefgq';
    const key = oprf.sodium.from_hex('0a20a9b3c5f5b83a326f50a71e296c2c0161a2660b501e538fe88fb2e740dd3f');

    const masked1 = oprf.maskInput(input1);
    const salted1 = oprf.scalarMult(masked1.point, key);
    const unmasked1 = oprf.unmaskPoint(salted1, masked1.mask);

    const masked2 = oprf.maskInput(input2);
    const salted2 = oprf.scalarMult(masked2.point, key);
    const unmasked2 = oprf.unmaskPoint(salted2, masked2.mask);

    // All results should be distinct
    expect(unmasked1).to.not.deep.equals(unmasked2);
  });

  it('Different keys should produce different results on same input', async function () {
    const oprf = new OPRF();
    await oprf.ready;
    const input1 = 'derp';

    const key1 = oprf.sodium.from_hex('0a20a9b3c5f5b83a326f50a71e296c2c0161a2660b501e538fe88fb2e740dd3f');
    const key2 = oprf.sodium.from_hex('0a38ced06f7cf1d2b235ffa81f165924cecddac544c0d915d13cffbe47ea29b5');

    const masked = oprf.maskInput(input1);

    const salted1 = oprf.scalarMult(masked.point, key1);
    const salted2 = oprf.scalarMult(masked.point, key2);

    const unmasked1 = oprf.unmaskPoint(salted1, masked.mask);
    const unmasked2 = oprf.unmaskPoint(salted2, masked.mask);

    expect(unmasked1).to.not.deep.equals(unmasked2);
  });

  it('Outputs on same input and key should always be deterministic', async function () {
    const oprf = new OPRF();
    await oprf.ready;
    const input = 'derp';

    const key = oprf.sodium.from_hex('0a20a9b3c5f5b83a326f50a71e296c2c0161a2660b501e538fe88fb2e740dd3f');

    // Three tests on same input and key, masks are random
    const masked1 = oprf.maskInput(input);
    const masked2 = oprf.maskInput(input);
    const masked3 = oprf.maskInput(input);

    const salted1 = oprf.scalarMult(masked1.point, key);
    const salted2 = oprf.scalarMult(masked2.point, key);
    const salted3 = oprf.scalarMult(masked3.point, key);

    const unmasked1 = oprf.unmaskPoint(salted1, masked1.mask);
    const unmasked2 = oprf.unmaskPoint(salted2, masked2.mask);
    const unmasked3 = oprf.unmaskPoint(salted3, masked3.mask);

    const knownOutput = oprf.sodium.from_hex('349c14096f18644ef85c8f1d3da6d709b1e91d851221817cee7a22cd5d83a824');
    expect(unmasked1).to.deep.equals(unmasked2).to.deep.equals(unmasked3).to.deep.equals(knownOutput);
  });
});

describe('Error Cases', () => {
  it('Empty input', async function () {
    const oprf = new OPRF();
    await oprf.ready;

    expect(() => endToEnd('', oprf)).to.throw('Empty input string.');
  });

  it('Point not on curve', async function () {
    const oprf = new OPRF();
    await oprf.ready;

    const point = Uint8Array.from([1]);
    const key = oprf.sodium.from_hex('0a20a9b3c5f5b83a326f50a71e296c2c0161a2660b501e538fe88fb2e740dd3f');

    expect(() => oprf.scalarMult(point, key)).to.throw('Input is not a valid Ristretto255 point.');
  });

  it('Incorrect mask for unmasking', async function () {
    const oprf = new OPRF();
    await oprf.ready;

    const input = 'abcdefghijklmnopr';
    const key = oprf.sodium.from_hex('0a20a9b3c5f5b83a326f50a71e296c2c0161a2660b501e538fe88fb2e740dd3f');
    const randomMask = oprf.generateRandomScalar();

    // OPRF
    const masked = oprf.maskInput(input);
    const salted = oprf.scalarMult(masked.point, key);
    const unmasked = oprf.unmaskPoint(salted, randomMask);

    // scalar mult of input and key
    const hashedPoint = oprf.hashToPoint(input);
    const result = oprf.scalarMult(hashedPoint, key);

    expect(unmasked).to.not.deep.equals(result);
  });
});
