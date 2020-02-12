// @ts-ignore
import sodium = require('libsodium-wrappers-sumo');

export interface IMaskedData {
  readonly point: Uint8Array;
  readonly mask: Uint8Array;
}

export class OPRF {
  /**
   * Promise that is resolved when the libsodium wrappers have been loaded
   * It is unsafe to use OPRF before this promise is resolved
   * @property {Promise}
   */
  public ready: Promise<null> = null;

  /**
   * Exposes sodium wrappers sumo
   * @property {sodium}
   */
  public sodium: sodium = null;

  constructor() {
    this.ready = sodium.ready;
    this.sodium = sodium;
  }

  /**
   * Hash to point
   * @param {string} input
   * @returns {number[]} array of numbers representing a point on the curve ed25519
   */
  public hashToPoint(input: string): Uint8Array {
    const hash = sodium.crypto_generichash(sodium.crypto_core_ristretto255_HASHBYTES, sodium.from_string(input));
    return sodium.crypto_core_ristretto255_from_hash(hash);
  }

  /**
   * Generates a random number uniform in [1, ORDER OF CURVE).
   * @returns {Uint8Array}
   */
  public generateRandomScalar(): Uint8Array {
    return sodium.crypto_core_ristretto255_scalar_random();
  }

  /**
   * Hashes input as a point on an elliptic curve and applies a random mask to it
   * @param {string} input
   * @returns {IMaskedData} a masked point and the mask
   */
  public maskInput(input: string): IMaskedData {
    if (input.length <= 0) {
      throw new Error('Empty input string.');
    }

    const point: Uint8Array = this.hashToPoint(input);
    return this.maskPoint(point);
  }

  /**
   * Masks a point with a random mask and returns both masked point and mask
   * @param {Uint8Array} input
   * @returns {IMaskedData} a masked point and the mask
   */
  public maskPoint(point: Uint8Array): IMaskedData {
    const mask: Uint8Array = this.generateRandomScalar();
    const maskedPoint = this.scalarMult(point, mask);
    return {point: maskedPoint, mask};
  }

  /**
   * Applies the multiplicative inverse of the mask to the masked point
   * @param {Uint8Array} maskedPoint - a masked point
   * @param {Uint8Array} mask - the original mask that was applied to the masked point
   * @returns {Uint8Array} the resulting unmasked value
   */
  public unmaskPoint(maskedPoint: Uint8Array, mask: Uint8Array): Uint8Array {
    const maskInv: Uint8Array = sodium.crypto_core_ristretto255_scalar_invert(mask);
    return this.scalarMult(maskedPoint, maskInv);
  }

  /**
   * Salts a point using a key as a scalar
   * @param {Uint8Array} point - a point (usually masked)
   * @param {Uint8Array} key - a scalar (usually PRF key)
   * @returns {Uint8Array} salted point
   */
  public scalarMult(point: Uint8Array, key: Uint8Array): Uint8Array {
    if (!this.isValidPoint(point)) {
      throw new Error('Input is not a valid Ristretto255 point.');
    }

    return sodium.crypto_scalarmult_ristretto255(key, point);
  }

  /**
   * Returns whether the given point exists on the elliptic curve
   * @param {Uint8Array} point
   * @returns {boolean} true if the point is a valid point, false otherwise
   */
  public isValidPoint(point: Uint8Array): boolean {
    return sodium.crypto_core_ristretto255_is_valid_point(point);
  }

  /**
   * Encodes a point representation to a string with either 'ASCII' or 'UTF-8' encoding
   * @param {Uint8Array} point - the point to encode
   * @param {string} [encoding=UTF-8] - can be either 'UTF-8', or 'ASCII' (extended ASCII)
   * @returns {string} a compact string representing the point
   */
  public encodePoint(point: Uint8Array, encoding: string): string {
    const offsets = [0x1];
    if (encoding !== 'ASCII') {
      offsets.push(0x100);
    }

    const code = [];
    for (let i = 0; i < point.length; i += offsets.length) {
      code[i] = 0;
      for (let j = 0; j < offsets.length; j++) {
        code[i] += offsets[j] * (i + j < point.length ? point[i + j] : 0);
      }
      code[i] = String.fromCharCode(code[i]);
    }

    return code.join('');
  }

  /**
   * Decodes elliptic curve point from a string
   * @param {string} code - the encoding of a point
   * @param {string} [encoding=UTF-8] - can be either 'UTF-8', or 'ASCII' (extended ASCII)
   * @returns {Uint8Array} the point
   */
  public decodePoint(code: string, encoding: string): Uint8Array {
    const masks = [0xFF];
    const shifts = [0x1];
    if (encoding !== 'ASCII') {
      masks.push(0xFF00);
      shifts.push(0x100);
    }

    const decode = [];
    for (let i = 0; i < code.length; i ++) {
      const character = code.charCodeAt(i);
      const decodeChar = [];
      for (let j = 0; j < masks.length; j++) {
        decodeChar.push((character & masks[j]) / shifts[j]);
      }

      decode.push.apply(decode, decodeChar);
    }

    return Uint8Array.from(decode);
  }
}
