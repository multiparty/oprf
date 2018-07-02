import elliptic = require('elliptic');
import BN = require('bn.js');
import * as tools from './tools';

export interface maskedData {
  readonly maskedPoint: Array<Number>, 
  readonly mask: BN
}

export namespace OPRF{
  let sodium = null;

  const eddsa = elliptic.eddsa;
  const ed = new eddsa('ed25519');
  const prime: BN = (new BN(2)).pow(new BN(252)).add(new BN('27742317777372353535851937790883648493'));

  export function init(_sodium): void{
    sodium = _sodium;
  }

  export function hashToPoint(input: string): Array<Number>{
    let hash = stringToBinary(input);
 
    let addressPool = [];
    let result = new tools.AllocatedBuf(sodium.libsodium._crypto_core_ed25519_uniformbytes());
    const resultAddress = result.address;
    addressPool.push(resultAddress);
  
    hash = tools._any_to_Uint8Array(addressPool, hash, 'hash');
    let hashAddress = tools._to_allocated_buf_address(hash);
    addressPool.push(hashAddress);
  
    sodium.libsodium._crypto_core_ed25519_from_uniform(resultAddress, hashAddress);
    const res = tools._format_output(result, 'uint8array');
  
    tools._free_all(addressPool);

    return Array.from(res);
  }


  export function maskInput(input: string): maskedData {

    const hashed = hashToPoint(input);

    const point = ed.decodePoint(hashed);

    const maskBuffer: Uint8Array = sodium.randombytes_buf(32);

    const mask: BN = bytesToBN(maskBuffer).mod(prime);

    const maskedPoint = ed.encodePoint(point.mul(mask));
    
    return {maskedPoint, mask};

  }

  /**
   * 
   * @param maskedPoint hex string representing masked point
   * @param key private key of server
   * @returns {string} salted point in hex format 
   */
  export function saltInput(maskedPoint: Array<Number>, key: string): Array<Number> {
    
    const scalar: BN = new BN(key);

    const point = ed.decodePoint(maskedPoint)

    return ed.encodePoint(point.mul(scalar));
  }

  export function unmaskInput(salted: Array<Number>, mask: BN): Array<Number> {
    
    const point = ed.decodePoint(salted);

    const inv = mask.invm(prime);

    const unmasked = point.mul(inv);

    return ed.encodePoint(unmasked);

  }


  function stringToBinary(input: string): string {
    var result = [];
  
    for (var i = 0; i < input.length; i++) {
      var binaryArr = numToBin(input.charCodeAt(i));
      result = result.concat(binaryArr);
    }
  
    var resultString = ""
    for (var i = 0; i < result.length; i++) {
      resultString += result[i];
    }
    return resultString;
  }
  

function numToBin(n) {
  var result = [];

  while (n > 0) {
    var bit = Math.floor(n % 2) != 0 ? 1 : 0;
    result.unshift(bit);

    n = Math.floor(n/2);
  }

  while (result.length != 8) {
    result.unshift(0);
  }
  return result;
}

  function bytesToBN(bytes): BN {

    let result = new BN('0');
  
    for (let i = bytes.length - 1; i >= 0; i--) {
      var b = new BN(bytes[i]);
  
      result = result.or(b).shln(i*8)
    }
  
    return result;
  }

}