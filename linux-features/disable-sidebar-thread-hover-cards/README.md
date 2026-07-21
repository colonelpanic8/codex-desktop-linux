# Disable Sidebar Thread Hover Cards

Optional performance workaround for the local thread rows in the sidebar.

Opening a thread hover card mounts repository, branch, worktree, and status
metadata. The current upstream implementation can start Git repository watchers
while the pointer moves through the thread list, dramatically stalling the
renderer on affected systems. This feature uses the row component's existing
`disableHoverCard` path, so navigation, status indicators, context menus, and
row actions remain available.

The feature is disabled by default. Enable it in
`linux-features/features.json`:

```json
{
  "enabled": [
    "disable-sidebar-thread-hover-cards"
  ]
}
```

The patch follows minified current-DMG code and fails softly if upstream changes
the local thread row shape. Run its tests with:

```bash
node --test linux-features/disable-sidebar-thread-hover-cards/test.js
```
