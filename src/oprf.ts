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
    let hash: Uint8Array = this.sodium.crypto_generichash(
      this.sodium.libsodium._crypto_core_ed25519_uniformbytes(),
      this.sodium.from_string(input)
    );

    const addressPool: number[] = [];
    const result: AllocatedBuf = new AllocatedBuf(this.sodium,
      this.sodium.libsodium._crypto_core_ed25519_uniformbytes());
    const resultAddress: number = result.address;
    addressPool.push(resultAddress);

    hash = this.tools.any_to_Uint8Array(addressPool, hash, 'hash');
    const hashAddress: number = this.tools.to_allocated_buf_address(hash);
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
    let m: BN = null;
    do {
      m = this.bytesToBN(this.sodium.randombytes_buf(32));
    } while (m >= this.prime);

    return m;
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
    // point: elliptic point
    const point = this.ed.decodePoint(hashed);
    const maskBuffer: Uint8Array = this.sodium.randombytes_buf(32);
    const mask: BN = this.bytesToBN(maskBuffer).mod(this.prime);
    // maskedPoint: elliptic point
    const maskedPoint = this.ed.encodePoint(point.mul(mask));

    return {point: maskedPoint, mask};
  }

  /**
   * Returns whether the given point exists on the elliptic curve
   * @param point elliptic point input
   */
  public isValidPoint(point: number[]): number {

    const p: Uint8Array = new Uint8Array(point);

    return this.sodium.libsodium._crypto_core_ed25519_is_valid_point(p);
  }

  /**
   * Salts a point using a key as a scalar
   * @param point number array representation of a masked point
   * @param key private key of server
   * @returns {string} salted point in hex format
   */
  public scalarMult(point: number[], key: string): number[] {

    if (this.isValidPoint(point) === 0) {
      throw new Error('Input is not a valid ED25519 point.');
    }

    const scalar: BN = new BN(key);
    // point: elliptic point
    const p = this.ed.decodePoint(point);

    return this.ed.encodePoint(p.mul(scalar));
  }

  /**
   * Converts an elliptic.js point to number array representation
   * @param point elliptic point object
   * @returns point as a number array
   */
  public encodePoint(point: any): number[] {
    return this.ed.encodePoint(point);
  }

  /**
   * Converts a number array to elliptic.js point object representation
   * @param {number[]} point - point in number array representation
   * @returns point as an elliptic point object
   */
  public decodePoint(point: number[]): any {
    return this.ed.decodePoint(point);
  }

  /**
   * Applies the multiplicative inverse of the mask to the masked point
   * @param maskedPoint a masked point
   * @param mask the original mask that was applied to the masked point
   * @returns {number[]} the resulting unmasked value
   */
  public unmaskInput(maskedPoint: number[], mask: BN): number[] {
    // point: elliptic point
    const point = this.ed.decodePoint(maskedPoint);
    const inv: BN = mask.invm(this.prime);
    const unmasked: BN = point.mul(inv);

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
