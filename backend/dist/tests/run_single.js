"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ats_engine_1 = require("../ats_engine");
const fs_1 = __importDefault(require("fs"));
const inputPath = process.argv[2];
if (!inputPath || !fs_1.default.existsSync(inputPath)) {
    console.error("Input file missing");
    process.exit(1);
}
const data = JSON.parse(fs_1.default.readFileSync(inputPath, 'utf8'));
const res = (0, ats_engine_1.calculateDeterministicATSScore)(data.resume, data.jd);
console.log(JSON.stringify(res));
