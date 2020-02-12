import sodium = require('libsodium-wrappers-sumo');
export interface IMaskedData {
    readonly point: Uint8Array;
    readonly mask: Uint8Array;
}
export declare class OPRF {
    /**
     * Promise that is resolved when the libsodium wrappers have been loaded
     * It is unsafe to use OPRF before this promise is resolved
     * @property {Promise}
     */
    ready: Promise<null>;
    /**
     * Exposes sodium wrappers sumo
     * @property {sodium}
     */
    sodium: sodium;
    constructor();
    /**
     * Hash to point
     * @param {string} input
     * @returns {number[]} array of numbers representing a point on the curve ed25519
     */
    hashToPoint(input: string): Uint8Array;
    /**
     * Generates a random number uniform in [1, ORDER OF CURVE).
     * @returns {Uint8Array}
     */
    generateRandomScalar(): Uint8Array;
    /**
     * Hashes input as a point on an elliptic curve and applies a random mask to it
     * @param {string} input
     * @returns {IMaskedData} a masked point and the mask
     */
    maskInput(input: string): IMaskedData;
    /**
     * Masks a point with a random mask and returns both masked point and mask
     * @param {Uint8Array} input
     * @returns {IMaskedData} a masked point and the mask
     */
    maskPoint(point: Uint8Array): IMaskedData;
    /**
     * Applies the multiplicative inverse of the mask to the masked point
     * @param {Uint8Array} maskedPoint - a masked point
     * @param {Uint8Array} mask - the original mask that was applied to the masked point
     * @returns {Uint8Array} the resulting unmasked value
     */
    unmaskPoint(maskedPoint: Uint8Array, mask: Uint8Array): Uint8Array;
    /**
     * Salts a point using a key as a scalar
     * @param {Uint8Array} point - a point (usually masked)
     * @param {Uint8Array} key - a scalar (usually PRF key)
     * @returns {Uint8Array} salted point
     */
    scalarMult(point: Uint8Array, key: Uint8Array): Uint8Array;
    /**
     * Returns whether the given point exists on the elliptic curve
     * @param {Uint8Array} point
     * @returns {boolean} true if the point is a valid point, false otherwise
     */
    isValidPoint(point: Uint8Array): boolean;
    /**
     * Encodes a point representation to a string with either 'ASCII' or 'UTF-8' encoding
     * @param {Uint8Array} point - the point to encode
     * @param {string} [encoding=UTF-8] - can be either 'UTF-8', or 'ASCII' (extended ASCII)
     * @returns {string} a compact string representing the point
     */
    encodePoint(point: Uint8Array, encoding: string): string;
    /**
     * Decodes elliptic curve point from a string
     * @param {string} code - the encoding of a point
     * @param {string} [encoding=UTF-8] - can be either 'UTF-8', or 'ASCII' (extended ASCII)
     * @returns {Uint8Array} the point
     */
    decodePoint(code: string, encoding: string): Uint8Array;
}
