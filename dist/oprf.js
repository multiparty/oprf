"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
var sodium = require("libsodium-wrappers-sumo");
var OPRF = /** @class */ (function () {
    function OPRF() {
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
    OPRF.prototype.hashToPoint = function (input) {
        var hash = sodium.crypto_generichash(sodium.crypto_core_ristretto255_HASHBYTES, sodium.from_string(input));
        return sodium.crypto_core_ristretto255_from_hash(hash);
    };
    /**
     * Generates a random number uniform in [1, ORDER OF CURVE).
     * @returns {Uint8Array}
     */
    OPRF.prototype.generateRandomScalar = function () {
        return sodium.crypto_core_ristretto255_scalar_random();
    };
    /**
     * Hashes input as a point on an elliptic curve and applies a random mask to it
     * @param {string} input
     * @returns {IMaskedData} a masked point and the mask
     */
    OPRF.prototype.maskInput = function (input) {
        if (input.length <= 0) {
            throw new Error('Empty input string.');
        }
        var point = this.hashToPoint(input);
        return this.maskPoint(point);
    };
    /**
     * Masks a point with a random mask and returns both masked point and mask
     * @param {Uint8Array} input
     * @returns {IMaskedData} a masked point and the mask
     */
    OPRF.prototype.maskPoint = function (point) {
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
    OPRF.prototype.unmaskPoint = function (maskedPoint, mask) {
        var maskInv = sodium.crypto_core_ristretto255_scalar_invert(mask);
        return this.scalarMult(maskedPoint, maskInv);
    };
    /**
     * Salts a point using a key as a scalar
     * @param {Uint8Array} point - a point (usually masked)
     * @param {Uint8Array} key - a scalar (usually PRF key)
     * @returns {Uint8Array} salted point
     */
    OPRF.prototype.scalarMult = function (point, key) {
        if (!this.isValidPoint(point)) {
            throw new Error('Input is not a valid Ristretto255 point.');
        }
        return sodium.crypto_scalarmult_ristretto255(key, point);
    };
    /**
     * Returns whether the given point exists on the elliptic curve
     * @param {Uint8Array} point
     * @returns {boolean} true if the point is a valid point, false otherwise
     */
    OPRF.prototype.isValidPoint = function (point) {
        return sodium.crypto_core_ristretto255_is_valid_point(point);
    };
    /**
     * Encodes a point representation to a string with either 'ASCII' or 'UTF-8' encoding
     * @param {Uint8Array} point - the point to encode
     * @param {string} [encoding=UTF-8] - can be either 'UTF-8', or 'ASCII' (extended ASCII)
     * @returns {string} a compact string representing the point
     */
    OPRF.prototype.encodePoint = function (point, encoding) {
        var offsets = [0x1];
        if (encoding !== 'ASCII') {
            offsets.push(0x100);
        }
        var code = [];
        for (var i = 0; i < point.length; i += offsets.length) {
            code[i] = 0;
            for (var j = 0; j < offsets.length; j++) {
                code[i] += offsets[j] * (i + j < point.length ? point[i + j] : 0);
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
    OPRF.prototype.decodePoint = function (code, encoding) {
        var masks = [0xFF];
        var shifts = [0x1];
        if (encoding !== 'ASCII') {
            masks.push(0xFF00);
            shifts.push(0x100);
        }
        var decode = [];
        for (var i = 0; i < code.length; i++) {
            var character = code.charCodeAt(i);
            var decodeChar = [];
            for (var j = 0; j < masks.length; j++) {
                decodeChar.push((character & masks[j]) / shifts[j]);
            }
            decode.push.apply(decode, decodeChar);
        }
        return Uint8Array.from(decode);
    };
    return OPRF;
}());
exports.OPRF = OPRF;
