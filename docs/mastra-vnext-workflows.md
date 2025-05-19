# Mastra vNext Workflows Documentation

## Overview

### Getting Started
To use vNext workflows, first import the necessary functions from the vNext module:

```typescript
import { createWorkflow, createStep } from "@mastra/core/workflows/vNext";
import { z } from "zod"; // For schema validation
```

### Key Concepts
vNext workflows consist of:
- **Schemas**: Type definitions for inputs and outputs using Zod
- **Steps**: Individual units of work with defined inputs and outputs
- **Workflows**: Orchestrations of steps with defined execution patterns. A workflow is also a step and can be used as such in other workflows.
- **Workflow execution flow**: How steps are executed and connected to each other

Schemas are defined using Zod both for inputs and outputs of steps and workflows. Schemas can also dictate what data does a step take when resuming from a suspended state, as well as what contextual information should be passed when suspending a step's execution.

The inputs and outputs of steps that are connected together should match: the inputSchema of a step should be the same as the outputSchema of the previous step, for instance. The same is true, when using workflows as steps in other workflows, the workflow's inputSchema should match the outputSchema of the step it is used as.

Steps are run using an `execute` function that receives a context object with inputs from the previous step and/or resume data if the step is being resumed from a suspended state. The `execute` function should return a value that matches its outputSchema.

Primitives such as `.then()`, `.parallel()` and `.branch()` describe the execution flow of workflows, and how the steps within them are connected. Running workflows (whether standalone or as a step), their execution is dictated by their execution flow instead of an `execute` function. The final result of a workflow will always be the result of its last step, which should match the workflow's outputSchema.

#### Creating Steps
```typescript
const myStep = createStep({
  id: "my-step",
  description: "Does something useful",
  inputSchema: z.object({
    inputValue: z.string(),
  }),
  outputSchema: z.object({
    outputValue: z.string(),
  }),
  resumeSchema: z.object({
    resumeValue: z.string(),
  }),
  suspendSchema: z.object({
    suspendValue: z.string(),
  }),
  execute: async ({
    inputData,
    mastra,
    getStepResult,
    getInitData,
    runtimeContext,
  }) => {
    const otherStepOutput = getStepResult(step2);
    const initData = getInitData<typeof workflow>(); // typed as the workflow input schema
    return {
      outputValue: `Processed: ${inputData.inputValue}, ${initData.startValue} (runtimeContextValue: ${runtimeContext.get("runtimeContextValue")})`,
    };
  },
});
```

#### Creating Workflows
```typescript
const myWorkflow = createWorkflow({
  id: "my-workflow",
  inputSchema: z.object({
    startValue: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  steps: [step1, step2, step3], // Declare steps used in this workflow
}).then(step1).then(step2).then(step3).commit();

const mastra = new Mastra({
  vnext_workflows: {
    myWorkflow,
  },
});

const run = mastra.vnext_getWorkflow("myWorkflow").createRun();
```

The `steps` property in the workflow options provides type safety for accessing step results. When you declare the steps used in your workflow, TypeScript will ensure type safety when accessing `result.steps`:

```typescript
// With steps declared in workflow options
const workflow = createWorkflow({
  id: "my-workflow",
  inputSchema: z.object({}),
  outputSchema: z.object({}),
  steps: [step1, step2], // TypeScript knows these steps exist
}).then(step1).then(step2).commit();

const result = await workflow.createRun().start({ inputData: {} });
if (result.status === "success") {
  console.log(result.result); // only exists if status is success
} else if (result.status === "failed") {
  console.error(result.error); // only exists if status is failed, this is an instance of Error
  throw result.error;
} else if (result.status === "suspended") {
  console.log(result.suspended); // only exists if status is suspended
}

// TypeScript knows these properties exist and their types
console.log(result.steps.step1.output); // Fully typed
console.log(result.steps.step2.output); // Fully typed
```

Workflow definition requires:
- `id`: Unique identifier for the workflow
- `inputSchema`: Zod schema defining workflow input
- `outputSchema`: Zod schema defining workflow output
- `steps`: Array of steps used in the workflow (optional, but recommended for type safety)

#### Re-using steps and nested workflows
You can re-use steps and nested workflows by cloning them:

```typescript
const clonedStep = cloneStep(myStep, { id: "cloned-step" });
const clonedWorkflow = cloneWorkflow(myWorkflow, { id: "cloned-workflow" });
```

This way you can use the same step or nested workflow in the same workflow multiple times.

```typescript
import {
  createWorkflow,
  createStep,
  cloneStep,
  cloneWorkflow,
} from "@mastra/core/workflows/vNext";

const myWorkflow = createWorkflow({
  id: "my-workflow",
  steps: [step1, step2, step3],
});
myWorkflow.then(step1).then(step2).then(step3).commit();

const parentWorkflow = createWorkflow({
  id: "parent-workflow",
  steps: [myWorkflow, step4],
});
parentWorkflow
  .then(myWorkflow)
  .then(step4)
  .then(cloneWorkflow(myWorkflow, { id: "cloned-workflow" }))
  .then(cloneStep(step4, { id: "cloned-step-4" }))
  .commit();
```

#### Running Workflows
After defining a workflow, run it with:

```typescript
// Create a run instance
const run = myWorkflow.createRun();

// Start the workflow with input data
const result = await run.start({
  inputData: {
    startValue: "initial data",
  },
});

// Access the results
console.log(result.steps); // All step results
console.log(result.steps["step-id"].output); // Output from a specific step

if (result.status === "success") {
  console.log(result.result); // The final result of the workflow, result of the last step (or `.map()` output, if used as last step)
} else if (result.status === "suspended") {
  const resumeResult = await run.resume({
    step: result.suspended[0], // there is always at least one step id in the suspended array, in this case we resume the first suspended execution path
    resumeData: {
      /* user input */
    },
  });
} else if (result.status === "failed") {
  console.error(result.error); // only exists if status is failed, this is an instance of Error
}
```

#### Workflow Execution Result Schema
The result of running a workflow (either from `start()` or `resume()`) follows this TypeScript interface:

```typescript
export type WorkflowResult<...> =
  | {
      status: 'success';
      result: z.infer<TOutput>;
      steps: {
        [K in keyof StepsRecord<TSteps>]: StepsRecord<TSteps>[K]['outputSchema'] extends undefined
          ? StepResult<unknown>
          : StepResult<z.infer<NonNullable<StepsRecord<TSteps>[K]['outputSchema']>>>;
      };
    }
  | {
      status: 'failed';
      steps: {
        [K in keyof StepsRecord<TSteps>]: StepsRecord<TSteps>[K]['outputSchema'] extends undefined
          ? StepResult<unknown>
          : StepResult<z.infer<NonNullable<StepsRecord<TSteps>[K]['outputSchema']>>>;
      };
      error: Error;
    }
  | {
      status: 'suspended';
      steps: {
        [K in keyof StepsRecord<TSteps>]: StepsRecord<TSteps>[K]['outputSchema'] extends undefined
          ? StepResult<unknown>
          : StepResult<z.infer<NonNullable<StepsRecord<TSteps>[K]['outputSchema']>>>;
      };
      suspended: [string[], ...string[][]];
    };
```

##### Result Properties Explained
1. **status**: Indicates the final state of the workflow execution
   - `'success'`: Workflow completed successfully
   - `'failed'`: Workflow encountered an error
   - `'suspended'`: Workflow is paused waiting for user input
2. **result**: Contains the final output of the workflow, typed according to the workflow's `outputSchema`
3. **suspended**: Optional array of step IDs that are currently suspended. Only present when `status` is `'suspended'`
4. **steps**: A record containing the results of all executed steps
   - Keys are step IDs
   - Values are `StepResult` objects containing the step's output
   - Type-safe based on each step's `outputSchema`
5. **error**: Optional error object present when `status` is `'failed'`

#### Watching Workflow Execution
You can also watch workflow execution:

```typescript
const run = myWorkflow.createRun();

// Add a watcher to monitor execution
run.watch(event => {
  console.log('Step completed:', event.payload.currentStep.id);
});

// Start the workflow
const result = await run.start({ inputData: {...} });
```

The `event` object has the following schema:

```typescript
type WatchEvent = {
  type: "watch";
  payload: {
    currentStep?: {
      id: string;
      status: "running" | "completed" | "failed" | "suspended";
      output?: Record<string, any>;
      payload?: Record<string, any>;
    };
    workflowState: {
      status: "running" | "success" | "failed" | "suspended";
      steps: Record<
        string,
        {
          status: "running" | "completed" | "failed" | "suspended";
          output?: Record<string, any>;
          payload?: Record<string, any>;
        }
      >;
      result?: Record<string, any>;
      error?: Record<string, any>;
      payload?: Record<string, any>;
    };
  };
  eventTimestamp: Date;
};
```

The `currentStep` property is only present when the workflow is running. When the workflow is finished the status on `workflowState` is changed, as well as the `result` and `error` properties. At the same time the `currentStep` property is removed.

---

## Flow Control

### Sequential Flow
Chain steps to execute in sequence using `.then()`:

```typescript
myWorkflow.then(step1).then(step2).then(step3).commit();
```

The output from each step is automatically passed to the next step if schemas match. If the schemas don't match, you can use the `map` function to transform the output to the expected schema.
Step chaining is type-safe and checked at compile time.

### Parallel Execution
Execute steps in parallel using `.parallel()`:

```typescript
myWorkflow.parallel([step1, step2]).then(step3).commit();
```

This executes all steps in the array concurrently, then continues to the next step after all parallel steps complete.

You can also execute entire workflows in parallel:

```typescript
myWorkflow
  .parallel([nestedWorkflow1, nestedWorkflow2])
  .then(finalStep)
  .commit();
```

Parallel steps receive previous step results as input. Their outputs are passed into the next step input as an object where the key is the step id and the value is the step output, for example the above example outputs an object with two keys `nestedWorkflow1` and `nestedWorkflow2` with the outputs of the respective workflows as values.

### Conditional Branching
Create conditional branches using `.branch()`:

```typescript
myWorkflow
  .then(initialStep)
  .branch([
    [async ({ inputData }) => inputData.value > 50, highValueStep],
    [async ({ inputData }) => inputData.value > 10 && inputData.value <= 50, lowValueStep],
    [async ({ inputData }) => inputData.value <= 10, extremelyLowValueStep],
  ])
  .then(finalStep)
  .commit();
```

Branch conditions are evaluated sequentially, and all steps with matching conditions are executed in parallel. If `inputData.value` is `5` then both `lowValueStep` and `extremelyLowValueStep` will be run.

Each conditional step (like `highValueStep` or `lowValueStep`) receives as input the output of the previous step (`initialStep` in this case). The output of each matching conditional step is collected. The next step after the branch (`finalStep`) receives an object containing the outputs of all the steps that were run in the branch. The keys of this object are the step IDs, and the values are the outputs of those steps (`{ lowValueStep: <output of lowValueStep>, extremelyLowValueStep: <output of extremelyLowValueStep> }`). 

### Loops
vNext supports two types of loops. When looping a step (or nested workflow or any other step-compatible construct), the `inputData` of the loop is the output of the previous step initially, but any subsequent `inputData` is the output of the loop step itself. Thus for looping, the initial loop state should either match the previous step output or be derived using the `map` function.

**Do-While Loop**: Executes a step repeatedly while a condition is true.

```typescript
myWorkflow
  .dowhile(incrementStep, async ({ inputData }) => inputData.value < 10)
  .then(finalStep)
  .commit();
```

**Do-Until Loop**: Executes a step repeatedly until a condition becomes true.

```typescript
myWorkflow
  .dountil(incrementStep, async ({ inputData }) => inputData.value >= 10)
  .then(finalStep)
  .commit();
```

```typescript
const workflow = createWorkflow({
  id: "increment-workflow",
  inputSchema: z.object({
    value: z.number(),
  }),
  outputSchema: z.object({
    value: z.number(),
  }),
})
  .dountil(incrementStep, async ({ inputData }) => inputData.value >= 10)
  .then(finalStep);
```

### Foreach
Foreach is a step that executes a step for each item in an array type input.

```typescript
const mapStep = createStep({
  id: "map",
  description: "Maps (+11) on the current value",
  inputSchema: z.object({
    value: z.number(),
  }),
  outputSchema: z.object({
    value: z.number(),
  }),
  execute: async ({ inputData }) => {
    return { value: inputData.value + 11 };
  },
});

const finalStep = createStep({
  id: "final",
  description: "Final step that prints the result",
  inputSchema: z.array(z.object({ value: z.number() })),
  outputSchema: z.object({
    finalValue: z.number(),
  }),
  execute: async ({ inputData }) => {
    return { finalValue: inputData.reduce((acc, curr) => acc + curr.value, 0) };
  },
});

const counterWorkflow = createWorkflow({
  steps: [mapStep, finalStep],
  id: "counter-workflow",
  inputSchema: z.array(z.object({ value: z.number() })),
  outputSchema: z.object({
    finalValue: z.number(),
  }),
});

counterWorkflow.foreach(mapStep).then(finalStep).commit();

const run = counterWorkflow.createRun();
const result = await run.start({
  inputData: [{ value: 1 }, { value: 22 }, { value: 333 }],
});

if (result.status === "success") {
  console.log(result.result); // only exists if status is success
} else if (result.status === "failed") {
  console.error(result.error); // only exists if status is failed, this is an instance of Error
}
```

The loop executes the step for each item in the input array in sequence one at a time. The optional `concurrency` option allows you to execute steps in parallel with a limit on the number of concurrent executions.

```typescript
counterWorkflow.foreach(mapStep, { concurrency: 2 }).then(finalStep).commit();
```

### Nested Workflows
vNext supports composing workflows by nesting them:

```typescript
const nestedWorkflow = createWorkflow({
  id: 'nested-workflow',
  inputSchema: z.object({...}),
  outputSchema: z.object({...}),
})
  .then(step1)
  .then(step2)
  .commit();

const mainWorkflow = createWorkflow({
  id: 'main-workflow',
  inputSchema: z.object({...}),
  outputSchema: z.object({...}),
})
  .then(initialStep)
  .then(nestedWorkflow)
  .then(finalStep)
  .commit();
```

In the above example, the `nestedWorkflow` is used as a step in the `mainWorkflow`, where the `inputSchema` of `nestedWorkflow` matches the `outputSchema` of `initialStep`, and the `outputSchema` of `nestedWorkflow` matches the `inputSchema` of `finalStep`.

Nested workflows are the main (and only) way compose execution flows beyond simple sequential execution. When using `.branch()` or `.parallel()` to compose execution flows, executing more than just one step necessarily requires a nested workflow, and as a byproduct, a description of how these steps are to be executed.

```typescript
const planBothWorkflow = createWorkflow({
  id: "plan-both-workflow",
  inputSchema: forecastSchema,
  outputSchema: z.object({
    activities: z.string(),
  }),
  steps: [planActivities, planIndoorActivities, sythesizeStep],
})
  .parallel([planActivities, planIndoorActivities])
  .then(sythesizeStep)
  .commit();

const weatherWorkflow = createWorkflow({
  id: "weather-workflow-step3-concurrency",
  inputSchema: z.object({
    city: z.string().describe("The city to get the weather for"),
  }),
  outputSchema: z.object({
    activities: z.string(),
  }),
  steps: [fetchWeather, planBothWorkflow, planActivities],
})
  .then(fetchWeather)
  .branch([
    [
      async ({ inputData }) => {
        return inputData?.precipitationChance > 20;
      },
      planBothWorkflow,
    ],
    [
      async ({ inputData }) => {
        return inputData?.precipitationChance <= 20;
      },
      planActivities,
    ],
  ]);
```

Nested workflows only have their final result (result of the last step) as their step output.

---

## Input Data Mapping

Input data mapping allows explicit mapping of values for the inputs of the next step. These values can come from a number of sources:

- The outputs of a previous step
- The runtime context
- A constant value
- The initial input of the workflow

```typescript
myWorkflow
  .then(step1)
  .map({
    transformedValue: {
      step: step1,
      path: "nestedValue",
    },
    runtimeContextValue: {
      runtimeContextPath: "runtimeContextValue",
      schema: z.number(),
    },
    constantValue: {
      value: 42,
      schema: z.number(),
    },
    initDataValue: {
      initData: myWorkflow,
      path: "startValue",
    },
  })
  .then(step2)
  .commit();
```

There are many cases where `.map()` can be useful in matching inputs to outputs, whether it's renaming outputs to match inputs or mapping complex data structures or other previous step outputs.

### Renaming outputs
One use case for input mappings is renaming outputs to match inputs:

```typescript
const step1 = createStep({
  id: "step1",
  inputSchema: z.object({
    inputValue: z.string(),
  }),
  outputSchema: z.object({
    outputValue: z.string(),
  }),
  execute: async ({ inputData }) => {
    return { outputValue: inputData.inputValue };
  },
});

const step2 = createStep({
  id: "step2",
  inputSchema: z.object({
    unexpectedName: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async ({ inputData }) => {
    return { result: inputData.outputValue };
  },
});
const workflow = createWorkflow({
  id: "my-workflow",
  steps: [step1, step2],
  inputSchema: z.object({
    inputValue: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
});

workflow
  .then(step1)
  .map({
    unexpectedName: {
      step: step1,
      path: "outputValue",
    },
  })
  .then(step2)
  .commit();
```

### Using workflow inputs as later step inputs

```typescript
const step1 = createStep({
  id: "step1",
  inputSchema: z.object({
    inputValue: z.string(),
  }),
  outputSchema: z.object({
    outputValue: z.string(),
  }),
  execute: async ({ inputData }) => {
    return { outputValue: inputData.inputValue };
  },
});

const step2 = createStep({
  id: "step2",
  inputSchema: z.object({
    outputValue: z.string(),
    initialValue: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async ({ inputData }) => {
    return { result: inputData.outputValue };
  },
});

const workflow = createWorkflow({
  id: "my-workflow",
  steps: [step1, step2],
  inputSchema: z.object({
    inputValue: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
});

workflow
  .then(step1)
  .map({
    outputValue: {
      step: step1,
      path: "outputValue",
    },
    initialValue: {
      initData: workflow,
      path: "inputValue",
    },
  })
  .then(step2)
  .commit();
```

### Using multiple outputs of previous steps

```typescript
const step1 = createStep({
  id: "step1",
  inputSchema: z.object({
    inputValue: z.string(),
  }),
  outputSchema: z.object({
    outputValue: z.string(),
  }),
  execute: async ({ inputData }) => {
    return { outputValue: inputData.inputValue };
  },
});

const step2 = createStep({
  id: "step2",
  inputSchema: z.object({
    outputValue: z.string(),
    initialValue: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async ({ inputData }) => {
    return { result: inputData.outputValue };
  },
});

const step3 = createStep({
  id: "step3",
  inputSchema: z.object({
    currentResult: z.string(),
    intermediateValue: z.string(),
    initialValue: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async ({ inputData }) => {
    return {
      result:
        inputData.result +
        " " +
        inputData.intermediateValue +
        " " +
        inputData.initialValue,
    };
  },
});

const workflow = createWorkflow({
  id: "my-workflow",
  steps: [step1, step2],
  inputSchema: z.object({
    inputValue: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
});

workflow
  .then(step1)
  .then(step2)
  .map({
    initialValue: {
      initData: workflow,
      path: "inputValue",
    },
    currentResult: {
      step: step2,
      path: "result",
    },
    intermediateValue: {
      step: step1,
      path: "outputValue",
    },
  })
  .then(step3)
  .commit();
```

---

## Suspend and Resume

Complex workflows often need to pause execution while waiting for external input or resources.

Mastra's suspend and resume features let you pause workflow execution at any step, persist the workflow snapshot to storage, and resume execution from the saved snapshot when ready.
This entire process is automatically managed by Mastra. No config needed, or manual step required from the user.

Storing the workflow snapshot to storage (LibSQL by default) means that the workflow state is permanently preserved across sessions, deployments, and server restarts. This persistence is crucial for workflows that might remain suspended for minutes, hours, or even days while waiting for external input or resources.

### When to Use Suspend/Resume
Common scenarios for suspending workflows include:
- Waiting for human approval or input
- Pausing until external API resources become available
- Collecting additional data needed for later steps
- Rate limiting or throttling expensive operations
- Handling event-driven processes with external triggers

### How to suspend a step
```typescript
const humanInputStep = createStep({
  id: "human-input",
  inputSchema: z.object({
    suggestions: z.array(z.string()),
    vacationDescription: z.string(),
  }),
  resumeSchema: z.object({
    selection: z.string(),
  }),
  suspendSchema: z.object({}),
  outputSchema: z.object({
    selection: z.string().describe("The selection of the user"),
    vacationDescription: z.string(),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    if (!resumeData?.selection) {
      await suspend({});
      return {
        selection: "",
        vacationDescription: inputData?.vacationDescription,
      };
    }
    return {
      selection: resumeData.selection,
      vacationDescription: inputData?.vacationDescription,
    };
  },
});
```

### How to resume step execution
#### Identifying suspended state
When running a workflow, its state can be one of the following:
- `running` - The workflow is currently running
- `suspended` - The workflow is suspended
- `success` - The workflow has completed
- `failed` - The workflow has failed

When the state is `suspended`, you can identify any and all steps that have been suspended by looking at the `suspended` property of the workflow.

```typescript
const run = counterWorkflow.createRun();
const result = await run.start({ inputData: { startValue: 0 } });

if (result.status === "suspended") {
  const resumedResults = await run.resume({
    step: result.suspended[0],
    resumeData: { newValue: 0 },
  });
}
```

In this case, the logic resumes whatever is the first step reported as suspended.

The `suspended` property is of type `string[][]`, where every array is a path to a step that has been suspended, the first element being the step id on the main workflow. If that step is a workflow itself, the second element is the step id on the nested workflow that was suspended, unless it is a workflow itself, in which case the third element is the step id on the nested workflow that was suspended, and so on.

#### Resume
```typescript
// After getting user input
const result = await workflowRun.resume({
  step: userInputStep, // or 'myStepId' as a string
  resumeData: {
    userSelection: "User's choice",
  },
});
```

To resume a suspended nested workflow:

```typescript
const result = await workflowRun.resume({
  step: [nestedWorkflow, userInputStep], // or ['nestedWorkflowId', 'myStepId'] as a string array
  resumeData: {
    userSelection: "User's choice",
  },
});
```

---

## Using Workflows with Agents and Tools

### Agent as a step
vNext workflows can use Mastra agents directly as steps using `createStep(agent)`:

```typescript
// Agent defined elsewhere
const myAgent = new Agent({
  name: "myAgent",
  instructions: "...",
  model: openai("gpt-4"),
});

// Create Mastra instance with agent
const mastra = new Mastra({
  agents: {
    myAgent,
  },
  vnext_workflows: {
    myWorkflow,
  },
});

// Use agent in workflow
myWorkflow
  .then(preparationStep)
  .map({
    prompt: {
      step: preparationStep,
      path: "formattedPrompt",
    },
  })
  .then(createStep(myAgent)) // Use agent directly as a step
  .then(processResultStep)
  .commit();
```

### Tools as a step
vNext workflows can use Mastra tools directly as steps using `createStep(tool)`:

```typescript
const myTool = createTool({
  id: "my-tool",
  description: "My tool",
  inputSchema: z.object({}),
  outputSchema: z.object({}),
  execute: async ({ inputData }) => {
    return { result: "success" };
  },
});

myWorkflow.then(createStep(myTool)).then(finalStep).commit();
```

### Workflow as a tool in an agent

```typescript
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { createWorkflow, createStep } from "@mastra/core/workflows/vNext";

const weatherWorkflow = createWorkflow({
  steps: [fetchWeather, planActivities],
  id: "weather-workflow-step1-single-day",
  inputSchema: z.object({
    city: z.string().describe("The city to get the weather for"),
  }),
  outputSchema: z.object({
    activities: z.string(),
  }),
})
  .then(fetchWeather)
  .then(planActivities);

const activityPlannerTool = createTool({
  id: "get-weather-specific-activities",
  description: "Get weather-specific activities for a city",
  inputSchema: z.object({
    city: z.string(),
  }),
  outputSchema: z.object({
    activities: z.array(z.string()),
  }),
  execute: async ({ context, mastra }) => {
    const plannerWorkflow = mastra?.vnext_getWorkflow("my-workflow");
    if (!plannerWorkflow) {
      throw new Error("Planner workflow not found");
    }

    const run = plannerWorkflow.createRun();
    const results = await run.start({
      triggerData: {
        city: context.city,
      },
    });
    const planActivitiesStep = results.results["plan-activities"];
    if (planActivitiesStep.status === "success") {
      return planActivitiesStep.output;
    }

    return {
      activities: "No activities found",
    };
  },
});

const activityPlannerAgent = new Agent({
  name: "activityPlannerAgent",
  model: openai("gpt-4o"),
  instructions: `
  You are an activity planner. You have access to a tool that will help you get weather-specific activities for any city. The tool uses agents to plan the activities, you just need to provide the city. Whatever information you get back, return it as is and add your own thoughts on top of it.
  `,
  tools: { activityPlannerTool },
});

export const mastra = new Mastra({
  vnext_workflows: {
    "my-workflow": myWorkflow,
  },
  agents: {
    activityPlannerAgent,
  },
}); 