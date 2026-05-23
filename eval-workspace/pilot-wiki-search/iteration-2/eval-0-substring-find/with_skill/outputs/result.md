# Wiki-search results: "progressive disclosure"

**Query**: literal phrase `"progressive disclosure"` against `https://pod.vardeman.me/vault/wiki/` via the Pod's `?ext=search-grep` affordance (D87).

**Total matches**: 1

## Matches

### 1. https://pod.vardeman.me/vault/wiki/concepts/progressive-disclosure.md

- **Score**: 80
- **First match line**: 8
- **Snippet**:

  > …ted: 2026-05-23T00:00:00Z modified: 2026-05-23T00:00:00Z maturity: draft --- # Progressive Disclosure Progressive disclosure is the retrieval pattern of starting from a high-level…

## Method

```
solid-pod wiki-search https://pod.vardeman.me/vault/wiki/ "progressive disclosure" --page-size 100
```

CLI handles OSLC §7.3 quoting + URL encoding. Recursive substring AND-search over markdown bodies (case-insensitive literal match). The single quoted argument is a single phrase term — every match contains the full phrase.
