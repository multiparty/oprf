import { OPRF } from '../src/index';
import { expect } from 'chai';
import * as crypto from "crypto";
import elliptic = require('elliptic');
import _sodium = require('libsodium-wrappers');
import BN = require('bn.js')


const scalarKey = 'a20a9b3c5f5b83a326f50a71e296c2c0161a2660b501e538fe88fb2e740dd3f'
const curve = elliptic.ec;
const ec = new curve('curve25519');
const prime: BN = (new BN(2)).pow(new BN(252)).add(new BN('27742317777372353535851937790883648493'));


describe('End-to-End Tests', () => {

  it('Deterministic', async function() {
    await _sodium.ready;
    OPRF.init(_sodium);

    var input = 'hello world'
    var maskedA = OPRF.maskInput(input);
    var saltedPoint = OPRF.saltInput(maskedA.maskedPoint, scalarKey);
    var unmasked = OPRF.unmaskInput(saltedPoint, maskedA.mask);
    
    const hash = crypto.createHash('sha256');

    hash.update(input);
    const point = ec.keyFromPublic(hash.digest('hex')).getPublic();

    const scalar = new BN(scalarKey);
    const correct = point.mul(scalar).encode('hex');

    // expect(unmasked).to.equal(correct)

  });

  it('Scalar multiplication - basic', async function() {
    await _sodium.ready;
    OPRF.init(_sodium);

    const scalar = new BN('2');
    const result = scalar.mul(scalar.invm(prime)).mod(prime).toString();

    expect(result).to.equal('1');

  });

  it('Scalar multiplication correctness', async function() {
    await _sodium.ready;
    OPRF.init(_sodium);

    const orderPlus1 = prime.add(new BN('1'));

    var point = ec.genKeyPair().getPublic();

    const p = point.mul(orderPlus1);

    expect(p.encode('hex')).to.equal(point.encode('hex'));

  });
});

