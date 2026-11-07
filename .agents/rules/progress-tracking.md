# Rule: progress tracking

1. **Every piece of work has a board card** in `.agents/board/` (format: `board/template.md`,
   ids `syn-<number>`). Raise one in `open/` if it does not exist.
2. **Claim before working:** move the card `open/ → doing/`, set `status: doing` and `assignee`.
3. **Close when finished:** move it to `done/`, set `status: done`, and fill `Resolution` with what
   landed and the commit. Never delete cards.
4. **Keep `.agents/plans/roadmap.md` current** in the same change that moves a card (status icons,
   card ids). Raise cards for roadmap rows when they become the next two or three steps.
5. **End every reply to the human with a roadmap block:**

   ```markdown
   ### Roadmap
   - **Where we are:** <phase and the step just finished, with card id>
   - **Next:** <the next step and its card id>
   - **Left:** <remaining steps in this phase, then later phases in one line>
   ```

6. Decisions that block a card (e.g. syn-017) are called out in the roadmap block until resolved.
