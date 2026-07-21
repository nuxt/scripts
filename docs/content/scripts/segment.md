---
title: Segment
description: Load Segment Analytics.js and queue page, event, identity, and group calls.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/segment.ts
  size: xs
---

[Segment](https://www.twilio.com/en-us/segment) routes events from your site to analytics, marketing, and data warehouse destinations.

Use [`useScriptSegment()`{lang="ts"}](/scripts/segment){lang="ts"} to load Analytics.js and access its tracking methods. Segment's [Analytics.js quickstart](https://www.twilio.com/docs/segment/connections/sources/catalog/libraries/website/javascript/quickstart) explains write keys and the `page`, `track`, and `identify` calls exposed by the library.

The client initializer queues one `page()`{lang="ts"} call before Analytics.js loads. Avoid sending another page call for the initial route unless you intend to count it twice.

::script-stats
::

::script-docs
::

::script-types
::
