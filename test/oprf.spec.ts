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


function endToEnd(input: string, oprf: OPRF): void {

  const masked = oprf.maskInput(input);
  const saltedPoint = oprf.scalarMult(masked.point, scalarKey);

  const unmasked = oprf.unmaskInput(saltedPoint, masked.mask);

  const hashed = oprf.hashToPoint(input);
  const point = ed.decodePoint(hashed);
  const scalar = new BN(scalarKey);
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

describe('Elliptic Curve Basics', () => {

  it('Multiplicative inverse', async function () {

    // actual mod, not remainder
    const scalar = new BN('2');
    const result = scalar.mul(scalar.invm(prime)).mod(prime).toString();

    expect(result).to.equal('1');
  });

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
});

describe('End-to-End', () => {
  it('Stress', async function () {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);

    const testNum = 25;
    for (var i = 0; i < testNum; i++) {
      endToEnd(createRandString(), oprf);
    }
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
});

describe('Unit tests', () => {
  it('Encode & decode point', async function () {
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
});
