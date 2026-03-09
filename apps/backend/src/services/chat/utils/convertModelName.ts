import { modelMapping, NormalizedModelOption, ModelOption } from "@agentflox/types";

export const convertModelName = (normalizedModelName: NormalizedModelOption): ModelOption => modelMapping[normalizedModelName];
