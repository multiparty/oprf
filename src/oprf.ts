import elliptic = require('elliptic');
import BN = require('bn.js');
import * as crypto from "crypto";

// import crypto = require('crypto');

export namespace OPRF{

  const curve = elliptic.ec;
  const ec = new curve('curve25519');
  const prime: BN = (new BN(2)).pow(new BN(252)).add(new BN('27742317777372353535851937790883648493'));


  export function addEntropy(input: string): any {
    var point = ec.genKeyPair().getPublic();
    const maskBuffer: Buffer = crypto.randomBytes(32);

     
    // TODO: test if bytes to BN is working on buffer
    const mask: BN = bytesToBN(maskBuffer).mod(prime);

    const maskedPoint = point.mul(mask).encode('hex');

    return maskedPoint;

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