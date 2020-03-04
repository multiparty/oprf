// @ts-ignore
/**
 * @hidden
 */
import sodium = require('libsodium-wrappers-sumo');
/**
 * @hidden
 */
import { OPRFSlim } from './oprf.slim';

/**
 * Main entry point for node.js, as well as browser applications using bundled OPRF
 */
class OPRF extends OPRFSlim {
  constructor() {
    super(sodium);
  }
}

export = OPRF;
