"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimezoneInsights = exports.parseNaturalLanguageSchedule = exports.optimizeSchedule = exports.cleanupOrphanedRooms = exports.fireAlarms = exports.expireProposals = exports.onProposalWrite = exports.transitionRoomStatus = exports.castVote = exports.joinRoom = exports.createRoom = void 0;
const Sentry = __importStar(require("@sentry/node"));
const profiling_node_1 = require("@sentry/profiling-node");
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [
            (0, profiling_node_1.nodeProfilingIntegration)(),
        ],
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0,
    });
}
else if (process.env.NODE_ENV === 'development') {
    console.info('Sentry DSN not configured: Cloud Functions running with no-op error tracking in development.');
}
var createRoom_1 = require("./callable/createRoom");
Object.defineProperty(exports, "createRoom", { enumerable: true, get: function () { return createRoom_1.createRoom; } });
var joinRoom_1 = require("./callable/joinRoom");
Object.defineProperty(exports, "joinRoom", { enumerable: true, get: function () { return joinRoom_1.joinRoom; } });
var castVote_1 = require("./callable/castVote");
Object.defineProperty(exports, "castVote", { enumerable: true, get: function () { return castVote_1.castVote; } });
var transitionRoomStatus_1 = require("./callable/transitionRoomStatus");
Object.defineProperty(exports, "transitionRoomStatus", { enumerable: true, get: function () { return transitionRoomStatus_1.transitionRoomStatus; } });
var onProposalWrite_1 = require("./triggers/onProposalWrite");
Object.defineProperty(exports, "onProposalWrite", { enumerable: true, get: function () { return onProposalWrite_1.onProposalWrite; } });
var expireProposals_1 = require("./scheduled/expireProposals");
Object.defineProperty(exports, "expireProposals", { enumerable: true, get: function () { return expireProposals_1.expireProposals; } });
var fireAlarms_1 = require("./scheduled/fireAlarms");
Object.defineProperty(exports, "fireAlarms", { enumerable: true, get: function () { return fireAlarms_1.fireAlarms; } });
var cleanupOrphanedRooms_1 = require("./scheduled/cleanupOrphanedRooms");
Object.defineProperty(exports, "cleanupOrphanedRooms", { enumerable: true, get: function () { return cleanupOrphanedRooms_1.cleanupOrphanedRooms; } });
// AI Features
var aiFeatures_1 = require("./callable/aiFeatures");
Object.defineProperty(exports, "optimizeSchedule", { enumerable: true, get: function () { return aiFeatures_1.optimizeSchedule; } });
Object.defineProperty(exports, "parseNaturalLanguageSchedule", { enumerable: true, get: function () { return aiFeatures_1.parseNaturalLanguageSchedule; } });
Object.defineProperty(exports, "getTimezoneInsights", { enumerable: true, get: function () { return aiFeatures_1.getTimezoneInsights; } });
