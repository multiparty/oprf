'use strict';

// if (typeof window === 'undefined') {

const sodium = window.sodium;
const libsodium = sodium.libsodium;

module.exports = {
  AllocatedBuf: AllocatedBuf,
  _any_to_Uint8Array: _any_to_Uint8Array,
  _to_allocated_buf_address: _to_allocated_buf_address,
  _format_output: _format_output,
  _free_all: _free_all
};


// }


// Code modified from https://github.com/jedisct1/libsodium.js/blob/master/wrapper/wrap-template.js
function AllocatedBuf(length) {
  this.length = length;
  this.address = _malloc(length);
}

// Copy the content of a AllocatedBuf (_malloc()'d memory) into a Uint8Array
AllocatedBuf.prototype.to_Uint8Array = function () {
  let result = new Uint8Array(this.length);
  result.set(
    libsodium.HEAPU8.subarray(this.address, this.address + this.length)
  );
  return result;
};

function _format_output(output, optionalOutputFormat) {
  const selectedOutputFormat = optionalOutputFormat || output_format;
  if (!_is_output_format(selectedOutputFormat)) {
    throw new Error(selectedOutputFormat + " output format is not available");
  }
  if (output instanceof AllocatedBuf) {
    if (selectedOutputFormat === "uint8array") {
      return output.to_Uint8Array();
    } else if (selectedOutputFormat === "text") {
      return sodium.to_string(output.to_Uint8Array());
    } else if (selectedOutputFormat === "hex") {
      return sodium.to_hex(output.to_Uint8Array());
    } else if (selectedOutputFormat === "base64") {
      return sodium.to_base64(output.to_Uint8Array());
    } else {
      throw new Error("What is output format \"" + selectedOutputFormat + "\"?");
    }
  } else if (typeof output === "object") { //Composed output. Example : key pairs
    let formattedOutput = {};
    for (let prop of output) {
      formattedOutput[prop] = _format_output(output[prop], selectedOutputFormat);
    }
    return formattedOutput;
  } else if (typeof output === "string") {
    return output;
  } else {
    throw new TypeError("Cannot format output");
  }
}

function _is_output_format(format) {
  const formats = output_formats();
  for (let i = 0; i < formats.length; i++) {
    if (formats[i] === format) {
      return true;
    }
  }
  return false;
}

function output_formats() {
  return ["uint8array", "text", "hex", "base64"];
}

// _malloc() a region and initialize it with the content of a Uint8Array
function _to_allocated_buf_address(bytes) {
  let address = _malloc(bytes.length);
  libsodium.HEAPU8.set(bytes, address);
  return address;
}

function _malloc(length) {
  let result = libsodium._malloc(length);
  if (result === 0) {
    throw {
      message: "_malloc() failed",
      length: length
    };
  }
  return result;
}

function _free(address) {
  libsodium._free(address);
}

function _free_all(addresses) {
  if (addresses) {
    for (let i = 0; i < addresses.length; i++) {
      _free(addresses[i]);
    }
  }
}

function _free_and_throw_type_error(address_pool, err) {
  _free_all(address_pool);
  throw new TypeError(err);
}

function _require_defined(address_pool, varValue, varName) {
  if (varValue === undefined) {
    _free_and_throw_type_error(
      address_pool,
      varName + " cannot be null or undefined"
    );
  }
}

function _any_to_Uint8Array(address_pool, varValue, varName) {
  _require_defined(address_pool, varValue, varName);
  if (varValue instanceof Uint8Array) {
    return varValue;
  } else if (typeof varValue === "string") {
    return sodium.from_string(varValue);
  }
  _free_and_throw_type_error(
    address_pool,
    "unsupported input type for " + varName
  );
}