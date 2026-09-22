<template>
  <!--
    The status renders inside a component that hydrates on visibility. Placed
    below the fold, so it hydrates long after the app suspense resolved, while
    the app no longer reports itself as hydrating.
  -->
  <div style="height: 150vh" />
  <LazyStatusClient hydrate-on-visible />
</template>
