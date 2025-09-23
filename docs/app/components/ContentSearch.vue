<template>
  <UModal v-model="isOpen" :overlay="!smallerThanSm" :transition="!smallerThanSm" :ui="ui">
    <UCommandPalette
      ref="commandPaletteRef"
      :model-value="[]"
      :groups="groups"
      :ui="ui.commandPalette"
      :close-button="ui.default.closeButton"
      :fuse="fuse"
      multiple
      v-bind="attrs"
      @update:model-value="onSelect"
      @close="isOpen = false"
    >
      <template v-for="(_, name) in $slots" #[name]="slotData: any">
        <slot :name="name" v-bind="slotData" />
      </template>
    </UCommandPalette>
  </UModal>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { defu } from 'defu'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import type { ParsedContent, NavItem, MarkdownNode } from '@nuxt/content'
import type { UseFuseOptions } from '@vueuse/integrations/useFuse'
import type { Group, Command } from '#ui/types'
import type { ContentSearchLink } from '#ui-pro/types'

defineOptions({
  inheritAttrs: false,
})

const appConfig = useAppConfig()

const config = computed(() => ({
  padding: 'p-0 sm:p-4',
  rounded: 'rounded-none sm:rounded-lg',
  width: 'sm:max-w-3xl',
  height: 'h-dvh sm:h-[28rem]',
  commandPalette: {
    input: {
      height: 'h-[--header-height] sm:h-12',
      icon: {
        size: 'h-5 w-5',
        padding: 'ps-11',
      },
    },
    group: {
      command: {

        prefix: `!text-foreground after:content-['_>']`,
      },
    },
    container: 'scroll-py-10',
  },
  fileIcon: {
    name: 'i-heroicons-document-text',
  },
  default: {
    closeButton: {
      icon: appConfig.ui.icons.close,
      color: 'gray' as const,
      variant: 'ghost' as const,
      size: 'sm' as const,
    },
  },
}))

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: undefined,
  },
  files: {
    type: Array as PropType<ParsedContent[]>,
    default: () => [],
  },
  navigation: {
    type: Array as PropType<NavItem[]>,
    default: () => [],
  },
  links: {
    type: Array as PropType<ContentSearchLink[]>,
    default: () => [],
  },
  groups: {
    type: Array as PropType<Group[]>,
    default: () => [],
  },
  fuse: {
    type: Object as PropType<UseFuseOptions<Command>>,
    default: () => ({}),
  },
  hideColorMode: {
    type: Boolean,
    default: false,
  },
  ui: {
    type: Object as PropType<Partial<typeof config.value>>,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:modelValue'])

const router = useRouter()
const { usingInput } = useShortcuts()
const { isContentSearchModalOpen } = useUIState()
const breakpoints = useBreakpoints(breakpointsTailwind)
const colorMode = useColorMode()
const { ui, attrs } = useUI('content.search', toRef(props, 'ui'), config, undefined, true)

const smallerThanSm = breakpoints.smaller('sm')

const commandPaletteRef = ref<HTMLElement & { query: Ref<string>, results: { item: Command }[] }>()

function fileIcon(file: ParsedContent) {
  if (file.icon) return file.icon
  if (file.navigation?.icon) return file.navigation.icon
  if (props.navigation) {
    file.icon = props.navigation.icon
  }
  return file.icon || ui.value.fileIcon.name
}

// Computed

const isOpen = computed({
  get() {
    return props.modelValue !== undefined ? props.modelValue : isContentSearchModalOpen.value
  },
  set(value) {
    if (props.modelValue !== undefined) {
      emit('update:modelValue', value)
    }
    else {
      isContentSearchModalOpen.value = value
    }
  },
})

const fuse: ComputedRef<Partial<UseFuseOptions<Command>>> = computed(() => defu({}, props.fuse, {
  fuseOptions: {
    ignoreLocation: true,
    includeMatches: true,
    threshold: 0.1,
    keys: [
      { name: 'title', weight: 5 },
      { name: 'label', weight: 5 },
      { name: 'suffix', weight: 3 },
      'children.children.value',
      'children.children.children.value',
      'children.children.children.children.value',
      'children.children.children.children.children.value',
    ],
  },
  resultLimit: 12,
}))

function filter(query: string, commands: Command[]) {
  if (!query) {
    return commands?.filter(command => !command.child)
  }

  return commands
}

const groups = computed(() => {
  let navigationGroups: Group[] = []
  if (props.navigation?.length) {
    if (props.navigation.some(link => !!link.children?.length)) {
      navigationGroups = (props.navigation || []).map((link) => {
        return {
          key: link.path,
          label: link.title,
          commands: (props.files || []).filter(file => file.path?.startsWith(link.path)).flatMap(file => mapFile(file, link)),
          filter,
        }
      })
    }
    else {
      navigationGroups = [{
        key: 'docs',
        commands: (props.files || []).flatMap(file => mapFile(file)),
        filter,
      }]
    }
  }

  return [props.links?.length && {
    key: 'links',
    label: 'Links',
    commands: props.links.flatMap((link) => {
      return [link.to && {
        id: router.resolve(link.to).fullPath,
        ...link,
        icon: link.icon || ui.value.fileIcon.name,
      }, ...(link.children || []).map((child: { to: string, description: any, icon: any }) => {
        return {
          id: router.resolve(child.to as string).fullPath,
          prefix: link.label,
          suffix: child.description,
          ...child,
          icon: child.icon || link.icon || ui.value.fileIcon.name,
        }
      })]
    }).filter(Boolean),
  }, ...navigationGroups, ...(props.groups || []), !colorMode?.forced && !props.hideColorMode && {
    key: 'theme',
    label: 'Theme',
    commands: [{
      id: 'theme-light',
      label: 'Light',
      icon: appConfig.ui.icons.light,
      disabled: colorMode.preference === 'light',
      click: () => {
        colorMode.preference = 'light'
      },
    }, {
      id: 'theme-dark',
      label: 'Dark',
      icon: appConfig.ui.icons.dark,
      disabled: colorMode.preference === 'dark',
      click: () => {
        colorMode.preference = 'dark'
      },
    }],
  }].filter(Boolean) as Group[]
})

// avoid conflicts between multiple meta_k shortcuts
const canToggleModal = computed(() => isOpen.value || !usingInput.value)

// Methods

function mapFile(file: ParsedContent, link?: NavItem): Command[] {
  // @ts-ignore - link.children type mismatch with findPageBreadcrumb parameter
  const prefix = findPageBreadcrumb(link?.children || [], file)?.map(({ title }) => title).join(' > ')

  return [{
    id: file._id,
    label: file.navigation?.title || file.title,
    title: file.navigation?.title || file.title,
    prefix,
    to: file.path,
    suffix: file.description,
    children: concatChildren(extractUntilFirstTitle(file?.body?.children || [])),
    icon: fileIcon(file),
  }, ...Object.entries(groupByHeading(file?.body?.children || [])).map(([hash, { title, children }]) => {
    if (!title) {
      return
    }

    return {
      id: `${file.path}${hash}`,
      label: title,
      prefix: (prefix ? `${prefix} > ` : '') + `${file.navigation?.title || file.title}`,
      to: `${file.path}${hash}`,
      children: concatChildren(children),
      icon: fileIcon(file),
      child: true,
    }
  })].filter(Boolean) as Command[]
}

function remapChildren(children: MarkdownNode[]) {
  return children?.map((grandChild) => {
    if (['code', 'code-inline', 'em', 'a', 'strong'].includes(grandChild.tag as string)) {
      return { type: 'text', value: grandChild.children?.find(child => child.type === 'text')?.value || '' }
    }
    else if (grandChild.type === 'text') {
      return grandChild
    }
  }).filter(Boolean) as MarkdownNode[] || []
}

function concatChildren(children: MarkdownNode[]): any[] {
  return children.map((child) => {
    if (['pre', 'style', 'video'].includes(child.tag as string)) {
      return
    }

    let grandChildren = [...(child.children || [])]

    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th'].includes(child.tag as string) && grandChildren.length) {
      // @ts-ignore - grandChildren type not matching reduce callback expectations
      grandChildren = remapChildren(grandChildren).reduce((acc: MarkdownNode[], grandChild) => {
        // @ts-ignore - accessing type property on unknown array element
        if (acc.length && acc[acc.length - 1].type === 'text') {
          // @ts-ignore - accessing value property on unknown types
          acc[acc.length - 1].value += grandChild.value || ''
        }
        else {
          acc.push({ ...grandChild })
        }
        return acc
      }, [])

      return {
        ...child,
        children: grandChildren,
      }
    }

    return {
      ...child,
      children: concatChildren(grandChildren),
    }
  }).filter(Boolean) as MarkdownNode[]
}

function extractUntilFirstTitle(children: MarkdownNode[]) {
  const extracted: MarkdownNode[] = []
  for (const child of children) {
    if (['h1', 'h2', 'h3'].includes(child.tag as string)) {
      break
    }
    extracted.push(child)
  }
  return extracted
}

function groupByHeading(children: MarkdownNode[]) {
  const groups: Record<string, { title?: string, children: MarkdownNode[] }> = {} // grouped by path
  let hash = '' // file.page with potential `#anchor` concat
  let title: string = ''
  for (const node of children) {
    // if heading found, udpate current path
    if (['h1', 'h2', 'h3'].includes(node.tag as string)) {
      // find heading text value
      title = node.children?.map((child) => {
        if (child.type === 'text') {
          return child.value
        }

        if (['code', 'code-inline', 'em', 'a', 'strong'].includes(child.tag as string)) {
          return child.children?.find(child => child.type === 'text')?.value
        }
      })?.filter(Boolean)?.join(' ') || ''

      if (title && node.props?.id) {
        hash = `#${encodeURIComponent(node.props.id)}`
      }
    }
    // push to existing/new group based on path
    if (groups[hash]) {
      // @ts-ignore - groups[hash] type mismatch with expected interface
      groups[hash].children.push(node)
    }
    else {
      // @ts-ignore - assigning to groups with dynamic key type
      groups[hash] = { children: [node], title }
    }
  }
  return groups
}

function onSelect(options: Command[]) {
  isOpen.value = false

  const option = options[0]
  if (!option) {
    return
  }

  if (option.click) {
    option.click()
  }
  else if (option.to) {
    if (option.target === '_blank' || option.to.startsWith('http')) {
      window.open(option.to, option.target || '_blank')
    }
    else {
      router.push(option.to)
    }
  }
  else if (option.href) {
    window.open(option.href, '_blank')
  }
}

// Shortcuts

defineShortcuts({
  meta_k: {
    usingInput: true,
    whenever: [canToggleModal],
    handler: () => {
      isOpen.value = !isOpen.value
    },
  },
  escape: {
    usingInput: true,
    whenever: [isOpen],
    handler: () => { isOpen.value = false },
  },
})

// Expose

defineExpose({
  commandPaletteRef,
})
</script>
