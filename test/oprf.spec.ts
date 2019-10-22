import { OPRF } from '../src/oprf';

import { expect } from 'chai';
import elliptic = require('elliptic');
import _sodium = require('libsodium-wrappers-sumo');
import BN = require('bn.js')
import sinon = require('sinon');

const scalarKey = 'a20a9b3c5f5b83a326f50a71e296c2c0161a2660b501e538fe88fb2e740dd3f';
const eddsa = elliptic.eddsa;
const ed = new eddsa('ed25519');
const prime: BN = (new BN(2)).pow(new BN(252)).add(new BN('27742317777372353535851937790883648493'));
const NUM_STRESS_TESTS = 50;

// End-to-end test of OPRF functionality using random input and random key
function endToEnd(input: string, oprf: OPRF): void {
  const key = oprf.generateRandomScalar();

  const masked = oprf.maskInput(input);
  const saltedPoint = oprf.scalarMult(masked.point, key);

  const unmasked = oprf.unmaskInput(saltedPoint, masked.mask);

  const hashed = oprf.hashToPoint(input);
  const point = ed.decodePoint(hashed);
  const scalar = new BN(key);
  const correct = ed.encodePoint(point.mul(scalar));

  expect(unmasked).to.deep.equals(correct);
}

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

function getRandom(max: number): number {
  return Math.floor(Math.random() * Math.floor(max));
}

describe('Elliptic Curve Unit Tests', () => {

  // Multiplicative inverse should produce the mathematically correct result
  it('Multiplicative inverse', async function () {
    // actual mod, not remainder
    const scalar = new BN('2');
    const result = scalar.mul(scalar.invm(prime)).mod(prime).toString();

    expect(result).to.equal('1');
  });

  // The elliptic curve point at point * (order + 1) should loop back to the original point
  it('Order plus 1', async function () {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);

    const orderPlus1 = prime.add(new BN('1'));

    const hashed = oprf.hashToPoint('hello world');
    const point = ed.decodePoint(hashed);

    const p = point.mul(orderPlus1);
    const original = ed.encodePoint(point);
    const plus1 = ed.encodePoint(p);

    expect(original).to.deep.equals(plus1);
  });

  it('Encoding and decoding a point should not change original input', async function () {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);

    const point: number[] = oprf.hashToPoint(createRandString());
    const decoded = oprf.decodePoint(point);
    const encoded: number[] = oprf.encodePoint(decoded);

    for (let i = 0; i < point.length; i++) {
      expect(point[i]).to.equal(encoded[i]);
    }
  });


  it('hashToPoint calls generic_hash on libsodium with ed25519 length', async function () {
    await _sodium.ready;
    const spy = sinon.spy(_sodium, 'crypto_generichash');

    const oprf = new OPRF(_sodium);
    oprf.hashToPoint(createRandString());
    expect(spy.calledOnce).to.equal(true);
    expect(spy.args[0][0]).to.equal(_sodium.libsodium._crypto_core_ed25519_uniformbytes());
  });

  it('Scalars should be distinct', async function () {
    await _sodium.ready;

    const oprf = new OPRF(_sodium);

    expect(oprf.generateRandomScalar())
      .to.not.deep.equals(oprf.generateRandomScalar())
      .to.not.deep.equals(oprf.generateRandomScalar());
  });
});

describe('End-to-End', () => {
  it('Stress', async function () {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);

    for (let i = 0; i < NUM_STRESS_TESTS; i++) {
      endToEnd(createRandString(), oprf);
    }
  });

  it('End-to-end on specified input, set scalar key, and known result', async function () {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);
    const input = 'abcdefghijklmnopr';

    // OPRF
    const masked = oprf.maskInput(input);
    const salted = oprf.scalarMult(masked.point, scalarKey);
    const unmasked = oprf.unmaskInput(salted, masked.mask);

    // scalar mult of input and key
    const hashedPoint = oprf.hashToPoint(input);
    const result = oprf.scalarMult(hashedPoint, scalarKey);

    const known_result = [67, 211, 62, 241, 3, 58, 144, 120, 39, 14, 255, 148, 90, 209, 115, 56, 238, 5, 58, 143, 33, 206, 223, 209, 240, 173, 177, 214, 71, 88, 131, 222];
    expect(unmasked).to.deep.equals(result).to.deep.equals(known_result);
  });

  it('End-to-end on specified input and random scalar key', async function () {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);
    const input = 'abcdefghijklmnopr';

    // OPRF
    const masked = oprf.maskInput(input);
    const salted = oprf.scalarMult(masked.point, scalarKey);
    const unmasked = oprf.unmaskInput(salted, masked.mask);

    // scalar mult of input and key
    const hashedPoint = oprf.hashToPoint(input);
    const result = oprf.scalarMult(hashedPoint, scalarKey);

    expect(unmasked).to.deep.equals(result);
  });
});

describe('Expected Behavior', () => {

  it('Point hashing expected to be deterministic', async function () {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);
    const input = 'abcdefghijklmnoprq';

    const hashed = oprf.hashToPoint(input);
    const known_output = [81, 144, 103, 12, 155, 158, 222, 243, 119, 150, 177, 39, 111, 91, 24, 163, 29, 216, 137, 4, 133, 127, 49, 203, 175, 125, 202, 249, 108, 166, 36, 45];

    expect(hashed).to.deep.equals(known_output);
  });


  it('Inputs map to distinct results', async function () {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);
    const input1 = 'abcdefghijklmnoprq';
    const input2 = 'abcdefgq';

    const masked1 = oprf.maskInput(input1);
    const salted1 = oprf.scalarMult(masked1.point, scalarKey);
    const unmasked1 = oprf.unmaskInput(salted1, masked1.mask);

    const masked2 = oprf.maskInput(input2);
    const salted2 = oprf.scalarMult(masked2.point, scalarKey);
    const unmasked2 = oprf.unmaskInput(salted2, masked2.mask);
    // Result from using incorrect mask for unmasking
    const incorrectMaskOutput = oprf.unmaskInput(salted2, masked1.mask);

    // Salted points should be distinct
    expect(salted1).to.not.deep.equals(salted2);

    // All results should be distinct
    expect(unmasked1).to.not.deep.equals(unmasked2);
    expect(incorrectMaskOutput).to.not.deep.equals(unmasked1);
    expect(incorrectMaskOutput).to.not.deep.equals(unmasked2);
  });

  it('Different keys should produce different results on same input', async function () {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);
    const input1 = 'derp';

    const key1 = 'a20a9b3c5f5b83a326f50a71e296c2c0161a2660b501e538fe88fb2e740dd3f';
    const key2 = 'a38ced06f7cf1d2b235ffa81f165924cecddac544c0d915d13cffbe47ea29b5';

    const masked = oprf.maskInput(input1);

    const salted1 = oprf.scalarMult(masked.point, key1);
    const salted2 = oprf.scalarMult(masked.point, key2);

    const unmasked1 = oprf.unmaskInput(salted1, masked.mask);
    const unmasked2 = oprf.unmaskInput(salted2, masked.mask);

    expect(unmasked1).to.not.deep.equals(unmasked2);
  });

  it('Outputs on same input and key should always be deterministic', async function () {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);
    const input = 'derp';

    const key = 'a20a9b3c5f5b83a326f50a71e296c2c0161a2660b501e538fe88fb2e740dd3f';

    // Three tests on same input and key, masks are random
    const masked1 = oprf.maskInput(input);
    const masked2 = oprf.maskInput(input);
    const masked3 = oprf.maskInput(input);

    const salted1 = oprf.scalarMult(masked1.point, key);
    const salted2 = oprf.scalarMult(masked2.point, key);
    const salted3 = oprf.scalarMult(masked3.point, key);

    const unmasked1 = oprf.unmaskInput(salted1, masked1.mask);
    const unmasked2 = oprf.unmaskInput(salted2, masked2.mask);
    const unmasked3 = oprf.unmaskInput(salted3, masked3.mask);

    const known_output = [221, 1, 0, 60, 186, 172, 201, 218, 147, 12, 254, 230, 80, 113, 61, 205, 21, 27, 0, 213, 57, 192, 34, 56, 82, 185, 185, 153, 8, 250, 191, 19];

    expect(unmasked1).to.deep.equals(unmasked2).to.deep.equals(unmasked3).to.deep.equals(known_output);
  });
});

describe('Error Cases', () => {
  it('Empty input', async function () {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);

    expect(() => endToEnd('', oprf)).to.throw('Empty input string.');
  });

  it('Point not on curve', async function () {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);

    const point = [1];

    expect(() => oprf.scalarMult(point, scalarKey)).to.throw('Input is not a valid ED25519 point.');
  });

  it('Incorrect mask for unmasking', async function () {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);
    const input = 'abcdefghijklmnopr';
    // OPRF
    const masked = oprf.maskInput(input);
    const salted = oprf.scalarMult(masked.point, scalarKey);

    const masked_fake = oprf.maskInput('abcdef');
    const unmasked = oprf.unmaskInput(salted, masked_fake.mask);

    // scalar mult of input and key
    const hashedPoint = oprf.hashToPoint(input);
    const result = oprf.scalarMult(hashedPoint, scalarKey);

    expect(unmasked).to.not.deep.equals(result);
  });
});
