import { OPRF } from '../src/oprf';
import { expect } from 'chai';
import elliptic = require('elliptic');
import _sodium = require('libsodium-wrappers-sumo');
import BN = require('bn.js')
import sinon = require('sinon');

const scalarKey = 'a20a9b3c5f5b83a326f50a71e296c2c0161a2660b501e538fe88fb2e740dd3f'

const eddsa = elliptic.eddsa;
const ed = new eddsa('ed25519');

const prime: BN = (new BN(2)).pow(new BN(252)).add(new BN('27742317777372353535851937790883648493'));

// End-to-end test of OPRF functionality using random input and random key
function endToEnd(input: string, oprf: OPRF): void {
  const key = oprf.generateRandomScalar()

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


  it('hashToPoint calls generic_hash on libsodium', async function () {
    await _sodium.ready;
    const spy = sinon.spy(_sodium, 'crypto_generichash');

    const oprf = new OPRF(_sodium);
    oprf.hashToPoint(createRandString());
    expect(spy.called).to.equal(true);
  });

  it('Scalars should be distinct', async function () {
    await _sodium.ready;

    const oprf = new OPRF(_sodium);

    expect(oprf.generateRandomScalar()).to.not.deep.equals(oprf.generateRandomScalar()).to.not.deep.equals(oprf.generateRandomScalar());

  });
});

describe('End-to-End', () => {
  it('Stress', async function () {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);

    const testNum = 500;
    for (var i = 0; i < testNum; i++) {
      endToEnd(createRandString(), oprf);
    }
  });

  it('End-to-end on specified input, set scalar key, and known result', async function() {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);
    const input = 'abcdefghijklmnopr'

    // OPRF
    const masked = oprf.maskInput(input);
    const salted = oprf.scalarMult(masked.point, scalarKey);
    const unmasked = oprf.unmaskInput(salted, masked.mask);

    // scalar mult of input and key
    const hashedPoint = oprf.hashToPoint(input);
    const result = oprf.scalarMult(hashedPoint, scalarKey);

    const known_result = [9,134,155,93,112,89,55,30,156,209,106,30,155,11,159,200,66,97,246,95,162,156,132,211,88,94,136,150,93,54,240,115]
    expect(unmasked).to.deep.equals(result).to.deep.equals(known_result);
  });

  it('End-to-end on specified input and random scalar key', async function() {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);
    const input = 'abcdefghijklmnopr'

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

  it('Point hashing expected to be deterministic', async function() {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);
    const input = 'abcdefghijklmnoprq'

    const hashed = oprf.hashToPoint(input);
    const known_output = [206,243,179,53,28,53,28,158,167,21,11,206,210,150,189,145,98,196,66,220,215,25,92,10,13,146,85,151,34,242,70,248];

    expect(hashed).to.deep.equals(known_output);
  });


  it('Inputs map to distinct results', async function() {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);
    const input1 = 'abcdefghijklmnoprq'
    const input2 = 'abcdefgq'

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

  it('Different keys should produce different results on same input', async function() {
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

  it('Outputs on same input and key should always be deterministic', async function() {
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
    const salted3 = oprf.scalarMult(masked3.point, key)

    const unmasked1 = oprf.unmaskInput(salted1, masked1.mask);
    const unmasked2 = oprf.unmaskInput(salted2, masked2.mask);
    const unmasked3 = oprf.unmaskInput(salted3, masked3.mask);

    const known_output = [ 159,2,54,226,74,122,112,171,84,208,65,242,177,111,38,95,46,22,133,110,31,144,150,189,97,58,12,112,217,33,235,89 ]

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
    const input = 'abcdefghijklmnopr'
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
