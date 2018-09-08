// Code based on https://github.com/jedisct1/libsodium.js/blob/master/wrapper/wrap-template.js
/*
Copyright (c) 2015-2018
Ahmad Ben Mrad <batikhsouri at gmail dot org>
Frank Denis <j at pureftpd dot org>
Ryan Lester <ryan at cyph dot com>

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

export class AllocatedBuf {
  public length = null;
  public address = null;
  private libsodium = null;

  constructor(sodium, length) {

    this.libsodium = sodium.libsodium;
    this.length = length;
    this.address = this.malloc(length);
  }

  public to_Uint8Array() {
    const result = new Uint8Array(this.length);
    result.set(
      this.libsodium.HEAPU8.subarray(this.address, this.address + this.length)
    );
    return result;
  }

  private malloc(length) {
    const result = this.libsodium._malloc(length);
    if (result === 0) {
      throw {
        length,
        message: '_malloc() failed',
      };
    }
    return result;
  }
}

// tslint:disable-next-line:max-classes-per-file
export class Tools {

  private sodium = null;

  constructor(sodium) {
    this.sodium = sodium;
  }

  public output_formats(): string[] {
    return ['uint8array', 'text', 'hex', 'base64'];
  }

  public malloc(length) {
    const result = this.sodium.libsodium._malloc(length);
    if (result === 0) {
      throw {
        length,
        message: '_malloc() failed',
      };
    }
    return result;
  }

  public to_allocated_buf_address(bytes) {
    const address = this.malloc(bytes.length);
    this.sodium.libsodium.HEAPU8.set(bytes, address);
    return address;
  }

  public format_output(output, optionalOutputFormat) {
    const selectedOutputFormat = optionalOutputFormat;
    if (!this.is_output_format(selectedOutputFormat)) {
      throw new Error(selectedOutputFormat + ' output format is not available');
    }
    if (output instanceof AllocatedBuf) {
      if (selectedOutputFormat === 'uint8array') {
        return output.to_Uint8Array();
      } else if (selectedOutputFormat === 'text') {
        return this.sodium.to_string(output.to_Uint8Array());
      } else if (selectedOutputFormat === 'hex') {
        return this.sodium.to_hex(output.to_Uint8Array());
      } else if (selectedOutputFormat === 'base64') {
        return this.sodium.to_base64(output.to_Uint8Array());
      } else {
        throw new Error('What is output format "' + selectedOutputFormat + '"?');
      }
    } else if (typeof output === 'object') { // Composed output. Example : key pairs
      const formattedOutput = {};
      for (const prop of output) {
        formattedOutput[prop] = this.format_output(output[prop], selectedOutputFormat);
      }
      return formattedOutput;
    } else if (typeof output === 'string') {
      return output;
    } else {
      throw new TypeError('Cannot format output');
    }
  }

  public any_to_Uint8Array(addressPool, varValue, varName) {
    this.require_defined(addressPool, varValue, varName);
    if (varValue instanceof Uint8Array) {
      return varValue;
    } else if (typeof varValue === 'string') {
      return this.sodium.from_string(varValue);
    }
    this.free_and_throw_type_error(
      addressPool,
      'unsupported input type for ' + varName
    );
  }

  public is_output_format(format) {
    const formats = this.output_formats();
    for (const form of formats) {
      if (form === format) {
        return true;
      }
    }
    return false;
  }

  public free(address) {
    this.sodium.libsodium._free(address);
  }

  public free_all(addresses) {
    if (addresses) {
      for (const address of addresses) {
        this.free(address);
      }
    }
  }

  public free_and_throw_type_error(addressPool, err) {
    this.free_all(addressPool);
    throw new TypeError(err);
  }

  public require_defined(addressPool, varValue, varName) {
    if (varValue === undefined) {
      this.free_and_throw_type_error(
        addressPool,
        varName + ' cannot be null or undefined'
      );
    }
  }
}
