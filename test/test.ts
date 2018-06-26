import { OPRF } from '../src/index';
import { expect } from 'chai';

describe('Unit tests', () => {
  it('Deterministic', async function() {
    var maskedA = OPRF.addEntropy('hello');
    var maskedB = OPRF.addEntropy('hello');
    
    expect(maskedA).to.equal(maskedB);
  });
});

