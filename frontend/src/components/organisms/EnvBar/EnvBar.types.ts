import type { RuntimeEnv } from '@src/utils/runtimeEnv';

export type NonProdEnv = Exclude<RuntimeEnv, 'prod'>;
