import { OPRF } from '../src/oprf';
import { expect } from 'chai';
import elliptic = require('elliptic');
import _sodium = require('libsodium-wrappers-sumo');
import BN = require('bn.js')


const scalarKey = 'a20a9b3c5f5b83a326f50a71e296c2c0161a2660b501e538fe88fb2e740dd3f'

const eddsa = elliptic.eddsa;
const ed = new eddsa('ed25519');


const prime: BN = (new BN(2)).pow(new BN(252)).add(new BN('27742317777372353535851937790883648493'));


function endToEnd(input: string, oprf: OPRF): void {
    // output from OPRF
    const masked = oprf.maskInput(input);
    const saltedPoint = oprf.saltInput(masked.point, scalarKey);
    const unmasked = oprf.unmaskInput(saltedPoint, masked.mask);
    // PRF with same key
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

describe('Scalar multiplication', () => {

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

describe('End-to-end', () => {

  it('Deterministic', async function () {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);

    endToEnd('hello world', oprf);
  });

  it('stress', async function () {
    await _sodium.ready;
    const oprf = new OPRF(_sodium);

    const testNum = 100;
    for (var i = 0; i < testNum; i++) {
        endToEnd(createRandString(), oprf);
    }
  });
});

