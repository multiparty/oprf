import BN = require('bn.js');
export interface IMaskedData {
    readonly point: number[];
    readonly mask: BN;
}
export declare class OPRF {
    private sodium;
    private tools;
    private eddsa;
    private ed;
    private prime;
    constructor(sodium: any);
    /**
     * Hash to point
     * @param {string} input
     * @returns {number[]} array of numbers representing a point on the curve ed25519
     */
    hashToPoint(input: string): number[];
    /**
     * Generates a random 32-byte array of numbers
     * @returns {BN}
     */
    generateRandomScalar(): BN;
    /**
     * Hashes input as a point on an elliptic curve and applies a random mask to it
     * @param input
     * @returns {IMaskedData} the original input in the form of a masked point and the mask
     */
    maskInput(input: string): IMaskedData;
    /**
     * Returns whether the given point exists on the elliptic curve
     * @param point elliptic point input
     */
    isValidPoint(point: number[]): number;
    /**
     * Salts a point using a key as a scalar
     * @param point number array representation of a masked point
     * @param key private key of server
     * @returns {string} salted point in hex format
     */
    scalarMult(point: number[], key: string): number[];
    /**
     * Converts an elliptic.js point to number array representation
     * @param point elliptic point object
     * @returns point as a number array
     */
    encodePoint(point: any): number[];
    /**
     * Converts a number array to elliptic.js point object representation
     * @param {number[]} point - point in number array representation
     * @returns point as an elliptic point object
     */
    decodePoint(point: number[]): any;
    /**
     * Applies the multiplicative inverse of the mask to the masked point
     * @param maskedPoint a masked point
     * @param mask the original mask that was applied to the masked point
     * @returns {number[]} the resulting unmasked value
     */
    unmaskInput(maskedPoint: number[], mask: BN): number[];
    /**
     * Converts an array of numbers to its big number representation
     * @param bytes
     * @returns {BN} big number representation of number array
     */
    private bytesToBN;
}
