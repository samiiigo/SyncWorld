"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionsEnv = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    FIREBASE_PROJECT_ID: zod_1.z.string().min(1),
});
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    const missingKeys = parsedEnv.error.issues.map((issue) => issue.path.join('.'));
    throw new Error(`Missing or invalid functions env vars: ${missingKeys.join(', ')}`);
}
exports.functionsEnv = parsedEnv.data;
