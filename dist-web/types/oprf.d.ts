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
    generateRandomScalar(): BN;
    /**
     * Hashes input as a point on an elliptic curve and applies a random mask to it
     * @param input
     * @returns {IMaskedData} the original input in the form of a masked point and the mask
     */
    maskInput(input: string): IMaskedData;
    isValidPoint(p: number[]): number;
    /**
     * Salts a point using a key as a scalar
     * @param p hex string representing a masked point
     * @param key private key of server
     * @returns {string} salted point in hex format
     */
    saltInput(p: number[], key: string): number[];
    /**
     * Unmasks a salted value to reveal the original input value salted with a private key
     * @param salted a salted point
     * @param mask the original mask that was applied
     * @returns {number[]} the resulting value from the OPRF
     */
    unmaskInput(salted: number[], mask: BN): number[];
    /**
     * Converts the input to a binary string
     * @param input
     * @returns {string} a string of 0's and 1's representing the original input
     */
    private stringToBinary;
    /**
     * Converts a number to its binary representation
     * @param n
     */
    private numToBin;
    /**
     * Converts an array of numbers to its big number representation
     * @param bytes
     * @returns {BN} big number representation of number array
     */
    private bytesToBN;
}
