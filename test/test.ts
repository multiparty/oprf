import { OPRF } from '../src/index';
import { expect } from 'chai';
// import * as crypto from "crypto";
import elliptic = require('elliptic');
import _sodium = require('libsodium-wrappers-sumo');
import BN = require('bn.js')


const scalarKey = 'a20a9b3c5f5b83a326f50a71e296c2c0161a2660b501e538fe88fb2e740dd3f'
const curve = elliptic.ec;
// const ec = new curve('curve25519');

const eddsa = elliptic.eddsa;
const ed = new eddsa('ed25519');


const prime: BN = (new BN(2)).pow(new BN(252)).add(new BN('27742317777372353535851937790883648493'));


function endToEnd(input: string): void {
  // output from OPRF
  const maskedA = OPRF.maskInput(input);
  const saltedPoint = OPRF.saltInput(maskedA.maskedPoint, scalarKey);
  const unmasked = OPRF.unmaskInput(saltedPoint, maskedA.mask);

  // PRF with same key
  const hashed = OPRF.hashToPoint(input);
  const point = ed.decodePoint(hashed);
  const scalar = new BN(scalarKey);
  const correct = ed.encodePoint(point.mul(scalar));

  expect(unmasked).to.deep.equals(correct);
}

describe ('Scalar multiplication', () => {

  it('Multiplicative inverse', async function() {
    await _sodium.ready;
    OPRF.init(_sodium);

    const scalar = new BN('2');
    const result = scalar.mul(scalar.invm(prime)).mod(prime).toString();

    expect(result).to.equal('1');
  });

  it('Order plus 1', async function() {
    await _sodium.ready;
    OPRF.init(_sodium);

    const orderPlus1 = prime.add(new BN('1'));

    const hashed = OPRF.hashToPoint('hello world');
    const point = ed.decodePoint(hashed);

    const p = point.mul(orderPlus1);

    const original = ed.encodePoint(point);
    const plus1 = ed.encodePoint(p);

    expect(original).to.deep.equals(plus1);
    // expect(ed.encodePoint(p).to.deep.equals(ed.encodePoint(point)));
    // expect(p.encode('hex')).to.equal(point.encode('hex'));

  });

});

describe('End-to-end', () => {

  it('Deterministic', async function() {
    await _sodium.ready;
    OPRF.init(_sodium);

    endToEnd('hello world');
  });
});

