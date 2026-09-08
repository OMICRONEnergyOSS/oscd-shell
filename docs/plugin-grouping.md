# Plugin Grouping

> **Status:** Currently an `oscd-shell`-only extension of the plugin API,
> documented here so it can be reviewed and, if it proves useful, proposed
> back into [`@openscd/oscd-api`](https://github.com/OMICRONEnergyOSS/oscd-api)
> for adoption by other shells. The `PluginGroup` type and all grouping logic
> today live in `oscd-shell`, not `oscd-api`.

## Overview

Plugin grouping lets a distro developer organize related `menu` and `editor`
plugins under a shared, collapsible heading (with its own icon and label)
instead of listing every plugin as a flat sibling.

**This is entirely optional buy-in.** If you don't know grouping exists, or
choose not to use it, nothing changes: your `plugins.menu` and
`plugins.editor` arrays keep working exactly as they do today, rendered as a
flat list. Grouping only activates for the specific entries you choose to
wrap in a group - the rest of your plugin set is unaffected.

## The `PluginGroup` type

```typescript
export interface PluginBase {
  name: string;
  translations?: Record<string, string>;
  icon: string;
}

export interface PluginEntry extends PluginBase {
  tagName: string;
  requireDoc?: boolean;
}

export interface PluginGroup<P extends Partial<PluginBase> = PluginEntry>
  extends PluginBase {
  plugins: P[];
}
```

A `PluginGroup` carries the same `name` / `translations` / `icon` fields as a
plugin (so it renders with its own label and icon), plus a `plugins` array of
the actual leaf `PluginEntry` items it contains.

Groups are a **single level deep** - `plugins` is an array of plugin entries,
not of further groups. Nesting a group inside a group is not supported.

## Where groups can be used

```typescript
export interface PluginSet<P extends Partial<PluginBase> = PluginEntry> {
  menu: (P | PluginGroup<P>)[];
  editor: (P | PluginGroup<P>)[];
  background: P[];
}
```

- `menu` and `editor` entries may each be either a plain plugin or a group.
- `background` plugins do **not** support grouping - they're never shown in a
  list for the user to pick from, so a group heading wouldn't have anything to
  attach to.

## Example

Ungrouped (works today, unchanged):

```javascript
shell.plugins = {
  editor: [substationEditor, subscriberEditor, compareEditor],
  menu: [importPlugin],
  background: [],
};
```

Grouping two of those editors under a "Subscription" heading:

```javascript
shell.plugins = {
  editor: [
    substationEditor,
    {
      name: 'Subscription',
      icon: 'link',
      translations: { de: 'Abonnement' },
      plugins: [subscriberEditor, compareEditor],
    },
  ],
  menu: [importPlugin],
  background: [],
};
```

`substationEditor` still renders exactly as before; only `subscriberEditor`
and `compareEditor` now render nested under the new "Subscription" group.

## Rendering behavior

- **Editor side panel**: a group renders as a collapsible node with its own
  icon/label; its `plugins` render indented beneath it. The group heading
  itself isn't a selectable editor - only its leaf plugins are. Expand/collapse
  state is remembered per group.
- **App menu** (`menu` plugins): a group renders as a submenu (flyout), opened
  via an arrow accessory next to the group's icon/label.
- **Pinning**: pinning is always per leaf plugin (by `tagName`), never per
  group. Once pinned, a plugin appears in the flat "Pinned" section
  regardless of which group (if any) it belongs to in the main list - pinning
  intentionally has no concept of groups.
- **Search**: search matches leaf plugin names (and their localized labels
  via `translations`) only; group names themselves are not matched. Groups
  with no matching children are hidden; groups with at least one match keep
  their structure so the match is still shown nested under its group.

## Backward compatibility

- Existing flat `menu` / `editor` / `background` arrays require no changes.
- A distro that never introduces a `PluginGroup` will never see any grouped
  UI (no collapsible headings, no submenus) - the panel and menu render
  exactly as they did before grouping existed.
- Adding a group later is non-breaking: wrap the relevant plugin entries in a
  `PluginGroup` object; everything else in the plugin set is unaffected.
