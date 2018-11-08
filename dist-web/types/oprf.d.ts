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
     * @param p point input
     */
    isValidPoint(p: number[]): number;
    /**
     * Salts a point using a key as a scalar
     * @param p hex string representing a masked point
     * @param key private key of server
     * @returns {string} salted point in hex format
     */
    scalarMult(p: number[], key: string): number[];
    /**
     * Converts an elliptic.js point to number array representation
     * @param p elliptic point object
     * @returns point as a number array
     */
    encodePoint(p: any): number[];
    /**
     * Converts a number array to elliptic.js point object representation
     * @param {number[]} p - point in number array representation
     * @returns point as an elliptic point object
     */
    decodePoint(p: number[]): any;
    /**
     * Applies the multiplicative inverse of the mask to the masked point
     * @param salted a salted point
     * @param mask the original mask that was applied
     * @returns {number[]} the resulting value from the OPRF
     */
    unmaskInput(maskedPoint: number[], mask: BN): number[];
    /**
     * Converts an array of numbers to its big number representation
     * @param bytes
     * @returns {BN} big number representation of number array
     */
    private bytesToBN;
}
