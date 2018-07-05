

import BN = require('bn.js');
import elliptic = require('elliptic');
import * as tools from './tools';

export interface IMaskedData {
  readonly point: number[];
  readonly mask: BN;
}

export class OPRF {
  private sodium = null;

  private eddsa = elliptic.eddsa;
  private ed = new this.eddsa('ed25519');
  private prime: BN = (new BN(2)).pow(new BN(252)).add(new BN('27742317777372353535851937790883648493'));

  constructor(sodium) {
      this.sodium = sodium;
  }

  /**
   * Hash to point
   * @param {string} input
   * @returns {number[]} array of numbers representing a point on the curve ed25519
   */
  public hashToPoint(input: string): number[] {
    let hash = this.stringToBinary(input);

    const addressPool = [];
    const result = new tools.AllocatedBuf(this.sodium.libsodium._crypto_core_ed25519_uniformbytes());
    const resultAddress = result.address;
    addressPool.push(resultAddress);

    hash = tools._any_to_Uint8Array(addressPool, hash, 'hash');
    const hashAddress = tools._to_allocated_buf_address(hash);
    addressPool.push(hashAddress);

    this.sodium.libsodium._crypto_core_ed25519_from_uniform(resultAddress, hashAddress);
    const res = tools._format_output(result, 'uint8array');

    tools._free_all(addressPool);

    return Array.from(res);
  }

  public maskInput(input: string): IMaskedData {

    const hashed = this.hashToPoint(input);

    const point = this.ed.decodePoint(hashed);

    const maskBuffer: Uint8Array = this.sodium.randombytes_buf(32);

    const mask: BN = this.bytesToBN(maskBuffer).mod(this.prime);

    const maskedPoint = this.ed.encodePoint(point.mul(mask));

    return {point: maskedPoint, mask};

  }

  /**
   *
   * @param maskedPoint hex string representing masked point
   * @param key private key of server
   * @returns {string} salted point in hex format
   */
  public saltInput(maskedPoint: number[], key: string): number[] {

    // check that key is 32 bytes
    const scalar: BN = new BN(key);

    const point = this.ed.decodePoint(maskedPoint);

    return this.ed.encodePoint(point.mul(scalar));
  }

  public unmaskInput(salted: number[], mask: BN): number[] {

    const point = this.ed.decodePoint(salted);

    const inv = mask.invm(this.prime);

    const unmasked = point.mul(inv);

    return this.ed.encodePoint(unmasked);

  }

  private stringToBinary(input: string): string {
    let result = [];

    for (let i = 0; i < input.length; i++) {
        const binaryArr = this.numToBin(input.charCodeAt(i));
        result = result.concat(binaryArr);
    }

    let resultString = '';
    for (const res of result) {
        resultString += res;
    }

    return resultString;
  }

  private numToBin(n) {
    const result = [];

    while (n > 0) {
        const bit = Math.floor(n % 2) !== 0 ? 1 : 0;
        result.unshift(bit);

        n = Math.floor(n / 2);
    }

    while (result.length !== 8) {
        result.unshift(0);
    }
    return result;
  }

  private bytesToBN(bytes): BN {

    let result = new BN('0');

    for (let i = bytes.length - 1; i >= 0; i--) {
        const b = new BN(bytes[i]);

        result = result.or(b).shln(i * 8);
    }
    return result;
  }

}