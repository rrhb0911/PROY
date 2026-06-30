# Memstate MCP - Memory Storage

This project uses Memstate MCP for persistent, versioned memory across sessions.

## REQUIRED: Start and end every task with memory

**BEFORE starting any task**, load relevant context so you don't redo past work or revert intentional decisions. **Prefer targeted retrieval** — do not dump the full memory tree by default.

**Default — search by what you're working on:**
```
memstate_search(query="<task topic>", project_id="mi_proyecto")
```

**When you know the exact keypath — fetch that subtree only:**
```
memstate_get(project_id="mi_proyecto", keypath="<subtree>")
```

**AFTER completing any task**, save what you did so the next session has context:
```
memstate_remember(project_id="mi_proyecto", content="## Task Summary\n- What was done\n- Key decisions made\n- Files modified", source="agent")
```

## Tool reference

| Tool | When to use |
|------|-------------|
| memstate_search | **Default before tasks.** Find relevant memories by meaning. |
| memstate_get | Fetch a **specific subtree** when you know the keypath. |
| memstate_remember | **End of every task.** Save markdown summaries, notes, decisions. |
| memstate_set | Store a single key=value fact. |

## Project naming
Use a short snake_case name matching your repo or topic (e.g. mi_proyecto).
