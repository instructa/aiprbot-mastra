<docs>
Here are some inspirations and examples from the docs. So that you know how to implement agents with tools:

Agent as a step
vNext workflows can use Mastra agents directly as steps using createStep(agent):

import { Mastra } from "@mastra/core";
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { createWorkflow, createStep } from "@mastra/core/workflows/vNext";
import { z } from "zod";
 
const myAgent = new Agent({
  name: "myAgent",
  instructions: "You are a helpful assistant that answers questions concisely.",
  model: openai("gpt-4o"),
});
 
// Input preparation step
const preparationStep = createStep({
  id: "preparation",
  inputSchema: z.object({
      question: z.string()
  }),
  outputSchema: z.object({
      formattedPrompt: z.string()
  }),
  execute: async ({ inputData }) => {
      return {
          formattedPrompt: `Answer this question briefly: ${inputData.question}`
      };
  }
});
 
const agentStep = createStep(myAgent)
 
// Create a simple workflow
const myWorkflow = createWorkflow({
  id: "simple-qa-workflow",
  inputSchema: z.object({
      question: z.string()
  }),
  outputSchema: z.string(),
  steps: [preparationStep, agentStep]
});
 
// Define workflow sequence
myWorkflow
  .then(preparationStep)
  .map({
    prompt: {
        step: preparationStep,
        path: "formattedPrompt",
    },
  })
  .then(agentStep)
  .commit();
 
// Create Mastra instance
const mastra = new Mastra({
  agents: {
      myAgent,
  },
  vnext_workflows: {
      myWorkflow,
  },
});
 
const workflow = mastra.vnext_getWorkflow("myWorkflow");
const run = workflow.createRun();
 
// Run the workflow with a question
const res = await run.start({
  inputData: {
      question: "What is machine learning?"
  }
});
 
if (res.status === "success") {
  console.log("Answer:", res.result);
} else if (res.status === "failed") {
  console.error("Workflow failed:", res.error);
}
 
Tools as a step
vNext workflows can use Mastra tools directly as steps using createStep(tool):

import { createTool, Mastra } from "@mastra/core";
import { createWorkflow, createStep } from "@mastra/core/workflows/vNext";
import { z } from "zod";
 
// Create a weather tool
const weatherTool = createTool({
  id: "weather-tool",
  description: "Get weather information for a location",
  inputSchema: z.object({
      location: z.string().describe("The city name")
  }),
  outputSchema: z.object({
      temperature: z.number(),
      conditions: z.string()
  }),
  execute: async ({ context: {location} }) => {
      return { 
          temperature: 22, 
          conditions: "Sunny" 
      };
  },
});
 
// Create a step that formats the input
const locationStep = createStep({
  id: "location-formatter",
  inputSchema: z.object({
      city: z.string()
  }),
  outputSchema: z.object({
      location: z.string()
  }),
  execute: async ({ inputData }) => {
      return {
          location: inputData.city
      };
  }
});
 
// Create a step that formats the output
const formatResultStep = createStep({
  id: "format-result",
  inputSchema: z.object({
      temperature: z.number(),
      conditions: z.string()
  }),
  outputSchema: z.object({
      weatherReport: z.string()
  }),
  execute: async ({ inputData }) => {
      return {
          weatherReport: `Current weather: ${inputData.temperature}°C and ${inputData.conditions}`
      };
  }
});
 
const weatherToolStep = createStep(weatherTool)
 
// Create the workflow
const weatherWorkflow = createWorkflow({
  id: "weather-workflow",
  inputSchema: z.object({
      city: z.string()
  }),
  outputSchema: z.object({
      weatherReport: z.string()
  }),
  steps: [locationStep, weatherToolStep, formatResultStep]
});
 
// Define workflow sequence
weatherWorkflow
  .then(locationStep)
  .then(weatherToolStep)
  .then(formatResultStep)
  .commit();
 
// Create Mastra instance
const mastra = new Mastra({
  vnext_workflows: {
      weatherWorkflow
  }
});
 
 
const workflow = mastra.vnext_getWorkflow("weatherWorkflow");
const run = workflow.createRun();
 
// Run the workflow
const result = await run.start({
  inputData: {
      city: "Tokyo"
  }
});
 
if (result.status === "success") {
  console.log(result.result.weatherReport);
} else if (result.status === "failed") {
  console.error("Workflow failed:", result.error);
}
 
Workflow as a tool in an agent
import { openai } from "@ai-sdk/openai";
import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { createWorkflow, createStep } from "@mastra/core/workflows/vNext";
import { z } from "zod";
 
// Define the weather fetching step
const fetchWeather = createStep({
  id: "fetch-weather",
  inputSchema: z.object({
    city: z.string().describe("The city to get the weather for")
  }),
  outputSchema: z.object({
    temperature: z.number(),
    conditions: z.string(),
    city: z.string()
  }),
  execute: async ({ inputData }) => {
    return {
      temperature: 25,
      conditions: "Sunny",
      city: inputData.city
    };
  }
});
 
// Define the activity planning step
const planActivities = createStep({
  id: "plan-activities",
  inputSchema: z.object({
    temperature: z.number(),
    conditions: z.string(),
    city: z.string()
  }),
  outputSchema: z.object({
    activities: z.array(z.string())
  }),
  execute: async ({ inputData }) => {
    mastra.getLogger()?.debug(`Planning activities for ${inputData.city} based on weather`);
    const activities = [];
    
    if (inputData.temperature > 20 && inputData.conditions === "Sunny") {
      activities.push("Visit the park", "Go hiking", "Have a picnic");
    } else if (inputData.temperature < 10) {
      activities.push("Visit a museum", "Go to a cafe", "Indoor shopping");
    } else {
      activities.push("Sightseeing tour", "Visit local attractions", "Try local cuisine");
    }
    return {
      activities
    };
  }
});
 
// Create the weather workflow
const weatherWorkflow = createWorkflow({
  id: "weather-workflow",
  inputSchema: z.object({
    city: z.string().describe("The city to get the weather for")
  }),
  outputSchema: z.object({
    activities: z.array(z.string())
  }),
  steps: [fetchWeather, planActivities]
})
.then(fetchWeather)
.then(planActivities)
.commit();
 
// Create a tool that uses the workflow
const activityPlannerTool = createTool({
  id: "get-weather-specific-activities",
  description: "Get weather-specific activities for a city based on current weather conditions",
  inputSchema: z.object({
    city: z.string().describe("The city to get activities for")
  }),
  outputSchema: z.object({
    activities: z.array(z.string())
  }),
  execute: async ({ context: { city }, mastra }) => {
    mastra.getLogger()?.debug(`Tool executing for city: ${city}`);
    
    const workflow = mastra?.vnext_getWorkflow("weatherWorkflow");
    if (!workflow) {
      throw new Error("Weather workflow not found");
    }
    
    const run = workflow.createRun();
    const result = await run.start({
      inputData: {
        city: city
      }
    });
    
    if (result.status === "success") {
      return {
        activities: result.result.activities
      };
    }
    
    throw new Error(`Workflow execution failed: ${result.status}`);
  }
});
 
// Create an agent that uses the tool
const activityPlannerAgent = new Agent({
  name: "activityPlannerAgent",
  model: openai("gpt-4o"),
  instructions: `
  You are an activity planner. You suggest fun activities based on the weather in a city.
  Use the weather-specific activities tool to get activity recommendations.
  Format your response in a friendly, conversational way.
  `,
  tools: { activityPlannerTool }
});
 
// Create the Mastra instance
const mastra = new Mastra({
  vnext_workflows: {
    weatherWorkflow
  },
  agents: {
    activityPlannerAgent
  }
});
 
const response = await activityPlannerAgent.generate("What activities do you recommend for a visit to Tokyo?");
 
console.log("\nAgent response:");
console.log(response.text);

# EXA MCP Server Install instructions

2. Add the Exa server configuration:
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["/path/to/exa-mcp-server/build/index.js"],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
Replace your-api-key-here with your actual Exa API key from dashboard.exa.ai/api-keys.

3. Available Tools & Tool Selection
The Exa MCP server includes the following tools, which can be enabled by adding the --tools:

web_search_exa: Performs real-time web searches with optimized results and content extraction.
research_paper_search: Specialized search focused on academic papers and research content.
company_research: Comprehensive company research tool that crawls company websites to gather detailed information about businesses.
crawling: Extracts content from specific URLs, useful for reading articles, PDFs, or any web page when you have the exact URL.
competitor_finder: Identifies competitors of a company by searching for businesses offering similar products or services.
linkedin_search: Search LinkedIn for companies and people using Exa AI. Simply include company names, person names, or specific LinkedIn URLs in your query.
wikipedia_search_exa: Search and retrieve information from Wikipedia articles on specific topics, giving you accurate, structured knowledge from the world's largest encyclopedia.
github_search: Search GitHub repositories using Exa AI - performs real-time searches on GitHub.com to find relevant repositories, issues, and GitHub accounts.
You can choose which tools to enable by adding the --tools parameter to your Claude Desktop configuration:
</docs>

<feature_description>
Add an Exa AI-powered hotel search tool to our workflow. After generating travel ideas and weather-based activity suggestions, the workflow will use the Exa MCP server to search for hotels in the recommended city for the current week. The Exa tool will be integrated as a new step/agent, called after the travel agent, and will return a list of relevant hotels.
</feature_description>

<target_files>
src/mastra/tools/
src/mastra/workflows/index.ts
</target_files>

<libraries>
To implement this feature, use the Exa MCP server (see above for configuration) and integrate it as a tool in our Mastra workflow. If needed, install any Exa SDK or HTTP client for calling the Exa MCP server.
</libraries>

<expected_output>
When a user requests a travel plan:
1. The system fetches the weather for the week for a given city.
2. The travel agent suggests activities and travel ideas for that city.
3. The Exa AI tool is called as the final step, searching for hotels in the city and returning at least 3 relevant hotel options.
4. The workflow output includes the weather, activities, and hotel suggestions.
</expected_output>

Task: Implement <feature_description> in `</path/to/<target_files>>`.

Details:
- Scope: Search and work mainly in `<target_files>` but don't exclude other files/folders if you need them for context.
- Libraries we're going to add/adjust: <libraries>.
- Acceptance criteria:
  - When <input/condition>, the system should <expected_output>.

Notes:
- Keep the commit isolated to this feature.