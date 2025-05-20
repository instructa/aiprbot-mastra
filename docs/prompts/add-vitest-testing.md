
<docs>
Running Evals in CI
Running evals in your CI pipeline helps bridge this gap by providing quantifiable metrics for measuring agent quality over time.

Setting Up CI Integration
We support any testing framework that supports ESM modules. For example, you can use Vitest , Jest  or Mocha  to run evals in your CI/CD pipeline.

src/mastra/agents/index.test.ts

import { describe, it, expect } from "vitest";
import { evaluate } from "@mastra/evals";
import { ToneConsistencyMetric } from "@mastra/evals/nlp";
import { myAgent } from "./index";
 
describe("My Agent", () => {
  it("should validate tone consistency", async () => {
    const metric = new ToneConsistencyMetric();
    const result = await evaluate(myAgent, "Hello, world!", metric);
 
    expect(result.score).toBe(1);
  });
});
You will need to configure a testSetup and globalSetup script for your testing framework to capture the eval results. It allows us to show these results in your mastra dashboard.

Framework Configuration
Vitest Setup
Add these files to your project to run evals in your CI/CD pipeline:

globalSetup.ts

import { globalSetup } from "@mastra/evals";
 
export default function setup() {
  globalSetup();
}
testSetup.ts

import { beforeAll } from "vitest";
import { attachListeners } from "@mastra/evals";
 
beforeAll(async () => {
  await attachListeners();
});
vitest.config.ts

import { defineConfig } from "vitest/config";
 
export default defineConfig({
  test: {
    globalSetup: "./globalSetup.ts",
    setupFiles: ["./testSetup.ts"],
  },
});
Storage Configuration
To store eval results in Mastra Storage and capture results in the Mastra dashboard:

testSetup.ts

import { beforeAll } from "vitest";
import { attachListeners } from "@mastra/evals";
import { mastra } from "./your-mastra-setup";
 
beforeAll(async () => {
  // Store evals in Mastra Storage (requires storage to be enabled)
  await attachListeners(mastra);
});
With file storage, evals persist and can be queried later. With memory storage, evals are isolated to the test process.
</docs>

<feature_description>
add smoke tests for our mastra workflows. especially that our agents like travel planner and weather agents are working.
</feature_description>

<target_files>
</target_files>

<libraries>
vitest
</libraries>

<expected_output>
1. all smoke tests should be green that means they should succeed. 
2. we want to test our workflows. 

</expected_output>

Task: Implement <feature_description> in `</path/to/<target_files>>`.

Details:
- Scope: Search and work mainly in `<target_files>` but don't exclude other files/folders if you need them for context.
- Libraries we're going to add/adjust: <libraries>.
- Acceptance criteria:
  - When <input/condition>, the system should <expected_output>.

Notes:
- Keep the commit isolated to this feature.