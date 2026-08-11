import type { HelperArgs, HelperContext, HelperResult } from '../types';

export async function insertData(_args: HelperArgs, _ctx: HelperContext): Promise<HelperResult> {
  return {
    status: 'error',
    error: 'Datasets not configured. insert_data will be available when the datasets product is enabled.',
  };
}

export async function retrieveData(_args: HelperArgs, _ctx: HelperContext): Promise<HelperResult> {
  return {
    status: 'error',
    error: 'Datasets not configured. retrieve_data will be available when the datasets product is enabled.',
  };
}

export async function retrieveAll(_args: HelperArgs, _ctx: HelperContext): Promise<HelperResult> {
  return {
    status: 'error',
    error: 'Datasets not configured. retrieve_all will be available when the datasets product is enabled.',
  };
}

export async function runStep(_args: HelperArgs, _ctx: HelperContext): Promise<HelperResult> {
  return {
    status: 'error',
    error: 'run_step is limited in v1. Prefer sequential tool steps in the builder.',
    success: false,
    result: {},
  };
}
