export interface IMaskedData {
  readonly point: Uint8Array;
  readonly mask: Uint8Array;
}

/**
 * Main entry point for using slim OPRF.
 *
 * This is not exposed directly in node.js or bundled OPRF.
 * Look at {@link OPRF} instead, which has identical API.
 *
 */
export class OPRFSlim {
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
  public sodium = null;

  /**
   * Construct a new OPRF instance
   * @param {sodium} sodium - the libsodium wrappers sumo instance desired (version > 0.7.6)
   */
  constructor(sodium) {
    this.ready = sodium.ready;
    this.sodium = sodium;
  }

  /**
   * Hash to point
   * @param {string} input
   * @returns {number[]} array of numbers representing a point on the curve ed25519
   */
  public hashToPoint(input: string): Uint8Array {
    const hash = this.sodium.crypto_generichash(this.sodium.crypto_core_ristretto255_HASHBYTES, this.sodium.from_string(input));
    return this.sodium.crypto_core_ristretto255_from_hash(hash);
  }

  /**
   * Generates a random number uniform in [1, ORDER OF CURVE).
   * @returns {Uint8Array}
   */
  public generateRandomScalar(): Uint8Array {
    return this.sodium.crypto_core_ristretto255_scalar_random();
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
   * Adds pointA and pointB together on an elliptic curve and returns the sum
   * @param {Uint8Array} pointA
   * @param {Uint8Array} pointB
   * @returns {Uint8Array} sum of pointA and pointB
   */
  public addPoints(pointA: Uint8Array, pointB: Uint8Array): Uint8Array {
    return this.sodium.crypto_core_ristretto255_add(pointA, pointB);
  }

  /**
   * Subtracts pointB from pointA and returns the difference
   * @param {Uint8Array} pointA
   * @param {Uint8Array} pointB
   * @returns {Uint8Array} difference between pointA and pointB
   */
  public subtractPoints(pointA: Uint8Array, pointB: Uint8Array): Uint8Array {
    return this.sodium.crypto_core_ristretto255_sub(pointA, pointB);
  }

  /**
   * Masks a point with a random mask and returns both masked point and mask
   * @param {Uint8Array} point
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
    const maskInv: Uint8Array = this.sodium.crypto_core_ristretto255_scalar_invert(mask);
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

    return this.sodium.crypto_scalarmult_ristretto255(key, point);
  }

  /**
   * Returns whether the given point exists on the elliptic curve
   * @param {Uint8Array} point
   * @returns {boolean} true if the point is a valid point, false otherwise
   */
  public isValidPoint(point: Uint8Array): boolean {
    return this.sodium.crypto_core_ristretto255_is_valid_point(point);
  }

  /**
   * Encodes a point representation to a string with either 'ASCII' or 'UTF-8' encoding
   * @param {Uint8Array} point - the point to encode
   * @param {string} [encoding=UTF-8] - can be either 'UTF-8', or 'ASCII' (extended ASCII)
   * @returns {string} a compact string representing the point
   */
  public encodePoint(point: Uint8Array, encoding: string): string {
    const offset = encoding === 'ASCII' ? 1 : 2;

    if (point.length % offset !== 0) {
      // this should never happen currently as libsodium's ristretto implementation uses even size byte arrays
      throw new Error('point size does not align with encoding unit size, please use ASCII encoding!');
    }

    const code = [];
    for (let i = 0; i < point.length; i += offset) {
      if (encoding === 'ASCII') {
        code[i] = point[i];
      } else {
        // UTF-8 (or rather USC-2) has 2 bytes per character, so combine 2 Uint8 values into one, shifting one a byte
        code[i] = point[i] | (point[i + 1] << 8);
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
    const decode = [];
    for (let i = 0; i < code.length; i++) {
      const character = code.charCodeAt(i);
      const decodeChar = [];

      // Mask is not required for ASCII, but UTF-8 has second point encoded at 0xFF00
      decodeChar.push(character & 0xFF);
      if (encoding !== 'ASCII') {
        // 2-byte characters, get second point
        decodeChar.push(character >> 8);
      }

      decode.push.apply(decode, decodeChar);
    }

    return Uint8Array.from(decode);
  }
}
