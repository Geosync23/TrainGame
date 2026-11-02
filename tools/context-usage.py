#!/usr/bin/env python3
"""How full is this lead session's memory (context)? Exact figure, read from the session's own log.

Usage: python3 tools/context-usage.py [window_tokens]
Reads the newest session log under ~/.claude/projects/, takes the last reply of the main session
(not helpers), and adds up the tokens that reply read: input + cache read + cache creation.
The window is 1,000,000 tokens for the lead model in these cloud sessions (a lead has used 265,000
without any automatic summary, and a helper 745,000 in one go, so it is not 200,000).
Pass a different window size as the first argument if that ever changes.
"""
import glob, json, os, sys

window = int(sys.argv[1]) if len(sys.argv) > 1 else 1_000_000
logs = glob.glob(os.path.expanduser('~/.claude/projects/*/*.jsonl'))
if not logs:
    sys.exit('No session log found under ~/.claude/projects/')
log = max(logs, key=os.path.getmtime)
last = None
with open(log) as f:
    for line in f:
        try:
            d = json.loads(line)
        except ValueError:
            continue
        m = d.get('message')
        if d.get('type') == 'assistant' and not d.get('isSidechain') and isinstance(m, dict) and m.get('usage'):
            last = (d.get('timestamp'), m.get('model'), m['usage'])
if not last:
    sys.exit('No replies with usage found in ' + log)
t, model, u = last
used = u.get('input_tokens', 0) + u.get('cache_read_input_tokens', 0) + u.get('cache_creation_input_tokens', 0)
pct = 100 * used / window
print(f'{used:,} of {window:,} tokens used ({pct:.0f}%), model {model}, as of {t}')
if pct < 50:
    print('Under 50%: do not hand over (CLAUDE.md).')
elif pct < 80:
    print('50% to 80%: hand over only before a big task, per CLAUDE.md.')
else:
    print('At or over the 80% cap: hand over now.')
