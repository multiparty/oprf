import elliptic = require('elliptic');
import BN = require('bn.js');

export namespace OPRF{

  const curve = elliptic.ec;
  const ec = new curve('curve25519');
  const prime = (new BN(2)).pow(new BN(252)).add(new BN('27742317777372353535851937790883648493'));


  export function randomizeInput(input: string) {
    var mask = new Uint8Array(32);
    window.crypto.getRandomValues(mask);
  }

}