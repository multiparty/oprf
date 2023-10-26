"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPRFSlim = void 0;
/**
 * Main entry point for using slim OPRF.
 *
 * This is not exposed directly in node.js or bundled OPRF.
 * Look at {@link OPRF} instead, which has identical API.
 *
 */
var OPRFSlim = /** @class */ (function () {
    /**
     * Construct a new OPRF instance
     * @param {sodium} sodium - the libsodium wrappers sumo instance desired (version > 0.7.6)
     */
    function OPRFSlim(sodium) {
        /**
         * Promise that is resolved when the libsodium wrappers have been loaded
         * It is unsafe to use OPRF before this promise is resolved
         * @property {Promise}
         */
        this.ready = null;
        /**
         * Exposes sodium wrappers sumo
         * @property {sodium}
         */
        this.sodium = null;
        this.ready = sodium.ready;
        this.sodium = sodium;
    }
    /**
     * Hash to point
     * @param {string} input
     * @returns {number[]} array of numbers representing a point on the curve ed25519
     */
    OPRFSlim.prototype.hashToPoint = function (input) {
        var hash = this.sodium.crypto_generichash(this.sodium.crypto_core_ristretto255_HASHBYTES, this.sodium.from_string(input));
        return this.sodium.crypto_core_ristretto255_from_hash(hash);
    };
    /**
     * Generates a random number uniform in [1, ORDER OF CURVE).
     * @returns {Uint8Array}
     */
    OPRFSlim.prototype.generateRandomScalar = function () {
        return this.sodium.crypto_core_ristretto255_scalar_random();
    };
    /**
     * Hashes input as a point on an elliptic curve and applies a random mask to it
     * @param {string} input
     * @returns {IMaskedData} a masked point and the mask
     */
    OPRFSlim.prototype.maskInput = function (input) {
        if (input.length <= 0) {
            throw new Error('Empty input string.');
        }
        var point = this.hashToPoint(input);
        return this.maskPoint(point);
    };
    /**
     * Adds pointA and pointB together on an elliptic curve and returns the sum
     * @param {Uint8Array} pointA
     * @param {Uint8Array} pointB
     * @returns {Uint8Array} sum of pointA and pointB
     */
    OPRFSlim.prototype.addPoints = function (pointA, pointB) {
        return this.sodium.crypto_core_ristretto255_add(pointA, pointB);
    };
    /**
     * Subtracts pointB from pointA and returns the difference
     * @param {Uint8Array} pointA
     * @param {Uint8Array} pointB
     * @returns {Uint8Array} difference between pointA and pointB
     */
    OPRFSlim.prototype.subtractPoints = function (pointA, pointB) {
        return this.sodium.crypto_core_ristretto255_sub(pointA, pointB);
    };
    /**
     * Masks a point with a random mask and returns both masked point and mask
     * @param {Uint8Array} point
     * @returns {IMaskedData} a masked point and the mask
     */
    OPRFSlim.prototype.maskPoint = function (point) {
        var mask = this.generateRandomScalar();
        var maskedPoint = this.scalarMult(point, mask);
        return { point: maskedPoint, mask: mask };
    };
    /**
     * Applies the multiplicative inverse of the mask to the masked point
     * @param {Uint8Array} maskedPoint - a masked point
     * @param {Uint8Array} mask - the original mask that was applied to the masked point
     * @returns {Uint8Array} the resulting unmasked value
     */
    OPRFSlim.prototype.unmaskPoint = function (maskedPoint, mask) {
        var maskInv = this.sodium.crypto_core_ristretto255_scalar_invert(mask);
        return this.scalarMult(maskedPoint, maskInv);
    };
    /**
     * Salts a point using a key as a scalar
     * @param {Uint8Array} point - a point (usually masked)
     * @param {Uint8Array} key - a scalar (usually PRF key)
     * @returns {Uint8Array} salted point
     */
    OPRFSlim.prototype.scalarMult = function (point, key) {
        if (!this.isValidPoint(point)) {
            throw new Error('Input is not a valid Ristretto255 point.');
        }
        return this.sodium.crypto_scalarmult_ristretto255(key, point);
    };
    /**
     * Returns whether the given point exists on the elliptic curve
     * @param {Uint8Array} point
     * @returns {boolean} true if the point is a valid point, false otherwise
     */
    OPRFSlim.prototype.isValidPoint = function (point) {
        return this.sodium.crypto_core_ristretto255_is_valid_point(point);
    };
    /**
     * Encodes a point representation to a string with either 'ASCII' or 'UTF-8' encoding
     * @param {Uint8Array} point - the point to encode
     * @param {string} [encoding=UTF-8] - can be either 'UTF-8', or 'ASCII' (extended ASCII)
     * @returns {string} a compact string representing the point
     */
    OPRFSlim.prototype.encodePoint = function (point, encoding) {
        var offset = encoding === 'ASCII' ? 1 : 2;
        if (point.length % offset !== 0) {
            // this should never happen currently as libsodium's ristretto implementation uses even size byte arrays
            throw new Error('point size does not align with encoding unit size, please use ASCII encoding!');
        }
        var code = [];
        for (var i = 0; i < point.length; i += offset) {
            if (encoding === 'ASCII') {
                code[i] = point[i];
            }
            else {
                // UTF-8 (or rather USC-2) has 2 bytes per character, so combine 2 Uint8 values into one, shifting one a byte
                code[i] = point[i] | (point[i + 1] << 8);
            }
            code[i] = String.fromCharCode(code[i]);
        }
        return code.join('');
    };
    /**
     * Decodes elliptic curve point from a string
     * @param {string} code - the encoding of a point
     * @param {string} [encoding=UTF-8] - can be either 'UTF-8', or 'ASCII' (extended ASCII)
     * @returns {Uint8Array} the point
     */
    OPRFSlim.prototype.decodePoint = function (code, encoding) {
        var decode = [];
        for (var i = 0; i < code.length; i++) {
            var character = code.charCodeAt(i);
            var decodeChar = [];
            // Mask is not required for ASCII, but UTF-8 has second point encoded at 0xFF00
            decodeChar.push(character & 0xFF);
            if (encoding !== 'ASCII') {
                // 2-byte characters, get second point
                decodeChar.push(character >> 8);
            }
            decode.push.apply(decode, decodeChar);
        }
        return Uint8Array.from(decode);
    };
    return OPRFSlim;
}());
exports.OPRFSlim = OPRFSlim;
