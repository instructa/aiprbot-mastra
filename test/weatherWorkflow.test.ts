import { describe, it, expect, vi, beforeEach } from 'vitest';
import { weatherWorkflow } from '../src/mastra/workflows';
import { Agent } from '@mastra/core/agent';

function mockFetch() {
  vi.stubGlobal('fetch', vi.fn(async (url: any) => {
    const urlStr = url.toString();
    if (urlStr.includes('geocoding-api.open-meteo.com')) {
      return {
        json: async () => ({ results: [{ latitude: 1, longitude: 1, name: 'Test City' }] }),
      } as any;
    }
    if (urlStr.includes('api.open-meteo.com')) {
      return {
        json: async () => ({
          daily: {
            time: ['2024-01-01'],
            temperature_2m_max: [20],
            temperature_2m_min: [10],
            precipitation_probability_mean: [30],
            weathercode: [1],
          },
        }),
      } as any;
    }
    throw new Error(`Unhandled fetch for ${urlStr}`);
  }));
}

function mockAgent() {
  vi.spyOn(Agent.prototype, 'stream').mockImplementation(async () => {
    const stream = (async function* () {
      yield 'Planned activities';
    })();
    return { textStream: stream } as any;
  });
}

describe('weatherWorkflow smoke test', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockFetch();
    mockAgent();
  });

  it('executes workflow and returns activities', async () => {
    const run = weatherWorkflow.createRun();
    const result = await run.start({ inputData: { city: 'Paris' } });
    const step = result.results['plan-activities'];
    expect(step.status).toBe('success');
    if (step.status === 'success') {
      expect(step.output.activities).toContain('Planned activities');
    }
  });
});
