"use strict";
/**
 * Hypersave SDK
 * Official TypeScript/JavaScript SDK for the Hypersave API
 *
 * @packageDocumentation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isErrorType = exports.isHypersaveError = exports.createErrorFromStatus = exports.ParseError = exports.ServerError = exports.NetworkError = exports.TimeoutError = exports.RateLimitError = exports.NotFoundError = exports.ValidationError = exports.AuthenticationError = exports.HypersaveError = exports.default = exports.HypersaveClient = void 0;
// Main client
var client_js_1 = require("./client.js");
Object.defineProperty(exports, "HypersaveClient", { enumerable: true, get: function () { return client_js_1.HypersaveClient; } });
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(client_js_1).default; } });
// Error classes
var errors_js_1 = require("./errors.js");
Object.defineProperty(exports, "HypersaveError", { enumerable: true, get: function () { return errors_js_1.HypersaveError; } });
Object.defineProperty(exports, "AuthenticationError", { enumerable: true, get: function () { return errors_js_1.AuthenticationError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return errors_js_1.ValidationError; } });
Object.defineProperty(exports, "NotFoundError", { enumerable: true, get: function () { return errors_js_1.NotFoundError; } });
Object.defineProperty(exports, "RateLimitError", { enumerable: true, get: function () { return errors_js_1.RateLimitError; } });
Object.defineProperty(exports, "TimeoutError", { enumerable: true, get: function () { return errors_js_1.TimeoutError; } });
Object.defineProperty(exports, "NetworkError", { enumerable: true, get: function () { return errors_js_1.NetworkError; } });
Object.defineProperty(exports, "ServerError", { enumerable: true, get: function () { return errors_js_1.ServerError; } });
Object.defineProperty(exports, "ParseError", { enumerable: true, get: function () { return errors_js_1.ParseError; } });
Object.defineProperty(exports, "createErrorFromStatus", { enumerable: true, get: function () { return errors_js_1.createErrorFromStatus; } });
Object.defineProperty(exports, "isHypersaveError", { enumerable: true, get: function () { return errors_js_1.isHypersaveError; } });
Object.defineProperty(exports, "isErrorType", { enumerable: true, get: function () { return errors_js_1.isErrorType; } });
//# sourceMappingURL=index.js.map