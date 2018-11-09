import BN = require('bn.js');
import elliptic = require('elliptic');
import { AllocatedBuf, Tools } from './tools';

export interface IMaskedData {
  readonly point: number[];
  readonly mask: BN;
}

export class OPRF {
  private sodium = null;
  private tools: Tools = null;

  private eddsa = elliptic.eddsa;
  private ed = new this.eddsa('ed25519');
  private prime: BN = (new BN(2)).pow(new BN(252)).add(new BN('27742317777372353535851937790883648493'));

  constructor(sodium) {
    this.sodium = sodium;
    this.tools = new Tools(sodium);
  }

  /**
   * Hash to point
   * @param {string} input
   * @returns {number[]} array of numbers representing a point on the curve ed25519
   */
  public hashToPoint(input: string): number[] {
    let hash = this.sodium.crypto_generichash(
      this.sodium.libsodium._crypto_core_ed25519_uniformbytes(),
      this.sodium.from_string(input)
    );

    const addressPool = [];
    const result = new AllocatedBuf(this.sodium, this.sodium.libsodium._crypto_core_ed25519_uniformbytes());
    const resultAddress = result.address;
    addressPool.push(resultAddress);

    hash = this.tools.any_to_Uint8Array(addressPool, hash, 'hash');
    const hashAddress = this.tools.to_allocated_buf_address(hash);
    addressPool.push(hashAddress);

    this.sodium.libsodium._crypto_core_ed25519_from_uniform(resultAddress, hashAddress);
    const res = this.tools.format_output(result, 'uint8array');

    this.tools.free_all(addressPool);

    return Array.from(res);
  }

  /**
   * Generates a random 32-byte array of numbers
   * @returns {BN}
   */
  public generateRandomScalar(): BN {
    let m: Uint8Array = null;
    do {
      m = this.sodium.randombytes_buf(32);
    } while (m >= this.prime);

    return this.bytesToBN(m);
  }

  /**
   * Hashes input as a point on an elliptic curve and applies a random mask to it
   * @param input
   * @returns {IMaskedData} the original input in the form of a masked point and the mask
   */
  public maskInput(input: string): IMaskedData {

    if (input.length <= 0) {
      throw new Error('Empty input string.');
    }

    const hashed: number[] = this.hashToPoint(input);
    // elliptic.js point
    const point = this.ed.decodePoint(hashed);
    const maskBuffer: Uint8Array = this.sodium.randombytes_buf(32);
    const mask: BN = this.bytesToBN(maskBuffer).mod(this.prime);
    // elliptic.js point
    const maskedPoint = this.ed.encodePoint(point.mul(mask));

    return {point: maskedPoint, mask};
  }

  /**
   * Returns whether the given point exists on the elliptic curve
   * @param p point input
   */
  public isValidPoint(p: number[]): number {

    const point = new Uint8Array(p);

    return this.sodium.libsodium._crypto_core_ed25519_is_valid_point(point);
  }

  /**
   * Salts a point using a key as a scalar
   * @param p hex string representing a masked point
   * @param key private key of server
   * @returns {string} salted point in hex format
   */
  public scalarMult(p: number[], key: string): number[] {

    if (this.isValidPoint(p) === 0) {
      throw new Error('Input is not a valid ED25519 point.');
    }

    const scalar: BN = new BN(key);
    // elliptic.js point
    const point = this.ed.decodePoint(p);

    return this.ed.encodePoint(point.mul(scalar));
  }

  /**
   * Converts an elliptic.js point to number array representation
   * @param p elliptic point object
   * @returns point as a number array
   */
  public encodePoint(p: any): number[] {
    return this.ed.encodePoint(p);
  }

  /**
   * Converts a number array to elliptic.js point object representation
   * @param {number[]} p - point in number array representation
   * @returns point as an elliptic point object
   */
  public decodePoint(p: number[]): any {
    return this.ed.decodePoint(p);
  }

  /**
   * Applies the multiplicative inverse of the mask to the masked point
   * @param salted a salted point
   * @param mask the original mask that was applied
   * @returns {number[]} the resulting value from the OPRF
   */
  public unmaskInput(maskedPoint: number[], mask: BN): number[] {

    const point = this.ed.decodePoint(maskedPoint);
    const inv = mask.invm(this.prime);
    const unmasked = point.mul(inv);

    return this.ed.encodePoint(unmasked);
  }

  /**
   * Converts an array of numbers to its big number representation
   * @param bytes
   * @returns {BN} big number representation of number array
   */
  private bytesToBN(bytes: Uint8Array): BN {

    let result = new BN('0');
    for (let i = bytes.length - 1; i >= 0; i--) {
      const b = new BN(bytes[i]);

      result = result.or(b).shln(i * 8);
    }

    return result;
  }
}
