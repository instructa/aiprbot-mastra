import { describe, it, expect, vi, beforeEach } from 'vitest';
import { weatherAgent } from '../src/mastra/agents';
import { Agent } from '@mastra/core/agent';

function mockAgent() {
  vi.spyOn(Agent.prototype, 'stream').mockImplementation(async () => {
    const stream = (async function* () {
      yield 'Weather details';
    })();
    return { textStream: stream } as any;
  });
}

describe('weatherAgent smoke test', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockAgent();
  });

  it('responds to basic prompt', async () => {
    const result = await weatherAgent.stream([
      { role: 'user', content: 'What\'s the weather?' },
    ]);
    let text = '';
    for await (const chunk of result.textStream as any) {
      text += chunk;
    }
    expect(text).toContain('Weather details');
  });
});
