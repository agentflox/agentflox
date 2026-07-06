import { modelMapping, NormalizedModelOption, ModelOption, Command } from "@agentflox/types";

export const convertModelName = (normalizedModelName: NormalizedModelOption): ModelOption => modelMapping[normalizedModelName];

