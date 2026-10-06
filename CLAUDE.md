# Crown & Keep (formerly Tower Rush)

## Context hygiene
- Find code with Grep (-n) first, then Read with offset/limit around the hit. Read a whole file only if it is under ~300 lines.
- Do not re-read a file after editing it.
- Browser checks: use read_page, find or javascript_tool for state. Take a screenshot only to verify visuals, at most one per change.
- Hand broad searches to an Explore subagent; it returns only the conclusion.
- Run /compact or /clear between unrelated tasks.
