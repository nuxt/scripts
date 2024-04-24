<script lang="ts" setup>
const list = ref()
// list is a html element, we need to set up a transition to scroll it to the bottom
onMounted(async () => {
  const el = list.value as HTMLElement

  const scroll = () => {
    if (el.scrollTop + el.clientHeight >= el.scrollHeight / 2) {
      const firstChild = el.firstChild.cloneNode(true)
      el.appendChild(firstChild)
      el.removeChild(el.firstChild)
      el.scrollTop -= firstChild.clientHeight // Adjust the scroll position to remove the jump
    }
    else {
      el.scrollTop += 1
    }
    requestAnimationFrame(scroll)
  }

  await nextTick()
  requestAnimationFrame(scroll)
})
// on window scroll, we scroll the list to the bottom
</script>

<template>
  <div ref="list" class="max-h-[400px] -mt-[80px] space-y-3 font-mono overflow-hidden pointer-events-none">
    <slot />
    <slot />
  </div>
</template>
