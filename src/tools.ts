let sodium;

if (typeof window === 'undefined') {
    sodium = require('libsodium-wrappers-sumo');
} else {
    sodium = window['sodium'];
}

const libsodium = sodium.libsodium;

export class AllocatedBuf {
    public length = null;
    public address = null;

    constructor(length) {

        this.length = length;

        const tools = new Tools();
        this.address = this._malloc(length);
    }

    private _malloc(length) {
        let result = libsodium._malloc(length);
        if (result === 0) {
            throw {
                message: '_malloc() failed',
                length: length
            };
        }
        return result;
    }

    public to_Uint8Array() {
        let result = new Uint8Array(this.length);
        result.set(
            libsodium.HEAPU8.subarray(this.address, this.address + this.length)
        );
        return result;
    }
}


export class Tools {

    // constructor() {};

    public output_formats(): string[] {
        return ['uint8array', 'text', 'hex', 'base64'];
    }

    public _malloc(length) {
        let result = libsodium._malloc(length);
        if (result === 0) {
            throw {
                message: '_malloc() failed',
                length: length
            };
        }
        return result;
    }

    public _to_allocated_buf_address(bytes) {
        let address = this._malloc(bytes.length);
        libsodium.HEAPU8.set(bytes, address);
        return address;
    }

    private _is_output_format(format) {
        const formats = this.output_formats();
        for (let i = 0; i < formats.length; i++) {
            if (formats[i] === format) {
                return true;
            }
        }
        return false;
    }


    public _format_output(output, optionalOutputFormat) {
        const selectedOutputFormat = optionalOutputFormat;
        if (!this._is_output_format(selectedOutputFormat)) {
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
        } else if (typeof output === 'object') { //Composed output. Example : key pairs
            let formattedOutput = {};
            for (let prop of output) {
                formattedOutput[prop] = this._format_output(output[prop], selectedOutputFormat);
            }
            return formattedOutput;
        } else if (typeof output === 'string') {
            return output;
        } else {
            throw new TypeError('Cannot format output');
        }
    }


    private _free(address) {
        libsodium._free(address);
    }

    private _free_all(addresses) {
        if (addresses) {
            for (let i = 0; i < addresses.length; i++) {
                this._free(addresses[i]);
            }
        }
    }

    private _free_and_throw_type_error(address_pool, err) {
        this._free_all(address_pool);
        throw new TypeError(err);
    }

    private _require_defined(address_pool, varValue, varName) {
        if (varValue === undefined) {
            this._free_and_throw_type_error(
                address_pool,
                varName + ' cannot be null or undefined'
            );
        }
    }

    public _any_to_Uint8Array(address_pool, varValue, varName) {
        this._require_defined(address_pool, varValue, varName);
        if (varValue instanceof Uint8Array) {
            return varValue;
        } else if (typeof varValue === 'string') {
            return sodium.from_string(varValue);
        }
        this._free_and_throw_type_error(
            address_pool,
            'unsupported input type for ' + varName
        );
    }


}
