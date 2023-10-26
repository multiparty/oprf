"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
// @ts-ignore
/**
 * @hidden
 */
var sodium = require("libsodium-wrappers-sumo");
/**
 * @hidden
 */
var oprf_slim_1 = require("./oprf.slim");
/**
 * Main entry point for node.js, as well as browser applications using bundled OPRF
 */
var OPRF = /** @class */ (function (_super) {
    __extends(OPRF, _super);
    function OPRF() {
        return _super.call(this, sodium) || this;
    }
    return OPRF;
}(oprf_slim_1.OPRFSlim));
module.exports = OPRF;
