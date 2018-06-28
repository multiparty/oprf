import elliptic = require('elliptic');
import BN = require('bn.js');
import * as crypto from "crypto";

export interface maskedData {
  readonly maskedPoint: string, 
  readonly mask: BN
}

export namespace OPRF{
  let sodium = null;

  const curve = elliptic.ec;
  const ec = new curve('curve25519');
  const prime: BN = (new BN(2)).pow(new BN(252)).add(new BN('27742317777372353535851937790883648493'));

  export function init(_sodium): void{
    sodium = _sodium;
  }

  export function maskInput(input: string): maskedData {
 
    const hash = crypto.createHash('sha256');

    hash.update(input);

    const point = ec.keyFromPublic(hash.digest('hex')).getPublic();
    const maskBuffer: Uint8Array = sodium.randombytes_buf(32);
    // TODO: test if bytes to BN is working on buffer
    const mask: BN = bytesToBN(maskBuffer).mod(prime);

    const maskedPoint = point.mul(mask).encode('hex');

    return {maskedPoint, mask};

  }

  export function saltInput(maskedPoint: string, key: string) {
    
    const scalar = new BN(key);

    const point = ec.keyFromPublic(maskedPoint, 'hex');

    return point.getPublic().mul(scalar).encode('hex');
    
  }

  export function unmaskInput(salted: string, mask: BN): string {
    
    const point = ec.keyFromPublic(salted, 'hex');

    const inv = mask.invm(prime);

    const unmasked = point.getPublic().mul(inv);

    return unmasked.encode('hex');
  }


  export function bytesToBN(bytes): BN {

    let result = new BN('0');
  
    for (let i = bytes.length - 1; i >= 0; i--) {
      var b = new BN(bytes[i]);
  
      result = result.or(b).shln(i*8)
    }
  
    return result;
  }

}