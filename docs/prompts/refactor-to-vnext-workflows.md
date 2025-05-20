<docs>
<!-- add related docs here -->
</docs>

<refactoring_goal>
We're upgrading from the old mastra.workflows system to the new mastra.workflows.vnext.
This is a refactor: you'll need to update imports, agent definitions, and tool usage according to the new vNext format.
</refactoring_goal>

<target_files>
src/mastra/workflows/index.ts
</target_files>

<libraries>
</libraries>

<expected_output>
1. Make sure to test agent behavior after the switch to confirm everything runs as expected.
</expected_output>

Task: Refactor `<target_files>` to <refactoring_goal> while preserving behavior.

Details:
- Scope: Search and work mainly in `<target_files>` but don't exclude other files/folders if you need them for context.
- Acceptance criteria:
  - When <input/condition>, the system should <expected_output>.

Notes:
- Keep the commit isolated to this feature.
- Document but do not fix unrelated problems you find.