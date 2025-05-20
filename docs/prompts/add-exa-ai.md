<docs>


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