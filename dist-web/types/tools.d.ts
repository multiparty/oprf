export declare class AllocatedBuf {
    length: any;
    address: any;
    constructor(length: any);
    to_Uint8Array(): Uint8Array;
    private malloc;
}
export declare class Tools {
    output_formats(): string[];
    malloc(length: any): any;
    to_allocated_buf_address(bytes: any): any;
    format_output(output: any, optionalOutputFormat: any): any;
    any_to_Uint8Array(addressPool: any, varValue: any, varName: any): any;
    is_output_format(format: any): boolean;
    free(address: any): void;
    free_all(addresses: any): void;
    free_and_throw_type_error(addressPool: any, err: any): void;
    require_defined(addressPool: any, varValue: any, varName: any): void;
}
