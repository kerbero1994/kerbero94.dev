## What and why

<!-- What changes for a visitor, and why. Link the issue if there is one. -->

## How to check it

<!-- The preview link arrives in the quality report below. Say which pages or styles to look at. -->

## Checklist

The gate covers validity, tests, accessibility, visuals, performance and the CSP. These are the parts it can't judge:

- [ ] Read the changed copy aloud. The spell check catches typos, not tone or claims that need a source.
- [ ] Every number on the page has its source and date.
- [ ] Looked at the preview in at least one light and one dark style, and on a phone.
- [ ] If visual baselines changed (label `update-visuals`), reviewed each new image in the diff.
- [ ] If inline CSS or JS changed, ran `npm run csp`. The gate fails otherwise.
- [ ] README updated if the process changed.
