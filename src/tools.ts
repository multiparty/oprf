declare var window;
let sodium;

if (typeof window === 'undefined') {
    // tslint:disable-next-line:no-var-requires
    sodium = require('libsodium-wrappers-sumo');
} else {
    sodium = window.sodium;
}

const libsodium = sodium.libsodium;

export class AllocatedBuf {
    public length = null;
    public address = null;

    constructor(length) {

        this.length = length;
        this.address = this.malloc(length);
    }

    public to_Uint8Array() {
        const result = new Uint8Array(this.length);
        result.set(
            libsodium.HEAPU8.subarray(this.address, this.address + this.length),
        );
        return result;
    }

    private malloc(length) {
        const result = libsodium._malloc(length);
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

    public output_formats(): string[] {
        return ['uint8array', 'text', 'hex', 'base64'];
    }

    public malloc(length) {
        const result = libsodium._malloc(length);
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
        libsodium.HEAPU8.set(bytes, address);
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
                return sodium.to_string(output.to_Uint8Array());
            } else if (selectedOutputFormat === 'hex') {
                return sodium.to_hex(output.to_Uint8Array());
            } else if (selectedOutputFormat === 'base64') {
                return sodium.to_base64(output.to_Uint8Array());
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
            return sodium.from_string(varValue);
        }
        this.free_and_throw_type_error(
            addressPool,
            'unsupported input type for ' + varName,
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
        libsodium._free(address);
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
                varName + ' cannot be null or undefined',
            );
        }
    }
}
