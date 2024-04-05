'use client'

export type Nullable<T> = { [P in keyof T]: T[P] | null }

export type RenderType = 'elevioInline' | 'elevioArticle' | 'elevioModule'

export interface OnEventTypes {
  /**
   * Called after the Elevio script has loaded, but before the Elevio app has been initialised.
   * You should modify initial settings here. As a convenience, the callback has window._elev as it’s first argument.
   */
  'load': (apiInstance: WindowElev) => void

  /** Called after the Elevio app has been initialised. */
  'ready': () => void

  /** Called after the widget is opened. */
  'widget:opened': () => void

  /** Called after the widget is closed. */
  'widget:closed': () => void

  /** Called after a module is loaded. The callback has the module type and any options that are relevant. */
  'module:loaded': (result: { type: string, data: object }) => void

  /** Called after a module is opened. The callback has the module ID as it’s first argument. */
  'module:opened': (moduleId: number) => void

  /** Called after a popup is opened. The callback has the article ID as it’s first argument. */
  'popup:opened': (articleId: string) => void

  /** Called after a popup is closed. The callback has the article ID as it’s first argument. */
  'popup:closed': (articleId: string) => void

  /**
   * Called when results for a search query are shown to user.
   * The callback has an object as it’s first argument, with `query` and `results` properties.
   */
  'search:query': (results: {
    query: string
    results: Array<{
      category_id: string
      id: string
      title: string
    }>
  }) => void

  /**
   * Called when results for a search query is clicked by a user.
   * The callback returns an object with the articleId, categoryId and the source.
   * The source is what is defined in the {@link https://api-docs.elevio.help/en/articles/48 | elevio search element } or defaults to 'custom-element' if not defined.
   * If the link is click inside the assistant then the source is 'assistant'.
   */
  'search:article:clicked': (result: {
    articleId: number
    categoryId: string
    source: string
  }) => void

  /**
   * Called when an article is clicked in the category display.
   * The callback returns an object with the articleId, categoryId and the source.
   * The source is what is defined in the elevio category custom element or defaults to 'custom-element' if not defined.
   * If the link is click inside the assistant then the source is 'assistant'.
   */
  'category:article:clicked': (result: {
    articleId: number
    categoryId: number
    source: string
  }) => void

  /**
   * Called after an article is viewed in the widget.
   * The callback has the article ID as it’s first argument.
   */
  'widget:article:view': (articleId: string | number) => void

  /**
   * Called when a helper is clicked.
   * The callback returns an object containing `actionId` (the article or module that the helper
   * opens), `type` ('elevioInline' for popup article, 'elevioArticle' for article that opens in
   * Assistant, 'elevioModule' for module that opens in Assistant) and `target` (the Element that the
   * helper is attached to).
   */
  'helper:clicked': (result: {
    actionId: string | number
    type: RenderType
    target: HTMLElement
  }) => void

  'suggestions:article:clicked': (result: {
    articleId: string
    source: string
  }) => void

  'related:article:clicked': (result: {
    articleId: string
    source: string
    relatedFrom: number | string
  }) => void

  'article:interlink:clicked': (result: {
    id: string
    type: string
    clickedFrom: string
  }) => void

  'article:feedback:reaction': (result: {
    id: string
    reaction: number
    title: string
  }) => void

  'article:feedback:text': (result: {
    id: string
    text: string
    title: string
  }) => void

  'article:kblink:clicked': (articleId: string) => void

  'page:view': (result: { pageUrl: string }) => void

  'article:data:loaded': (result: {
    articleId: string | number
    source: string
    title: string
    body: string
  }) => void

  'article:data:error': (result: {
    articleId: string | number
    source: string
  }) => void

  'category:data:loaded': (result: {
    id: string
    title: string
    source: string
    articles: Array<{ id: number, title: string }>
    subCategories: Array<{
      articles: Array<{ id: string, title: string }>
      articlesCount: number
      id: string
      title: string
    }>
  }) => void

  'article:feedback:loading': (result: {
    articleId: number | string
    source: string
    stage: 'reaction' | 'text' | 'email' | 'success'
  }) => void

  'article:feedback:loaded': (result: {
    articleId: number | string
    source: string
    stage: 'reaction' | 'text' | 'email' | 'success'
  }) => void

  'article:feedback:error': (result: {
    articleId: number | string
    source: string
    stage: 'reaction' | 'text' | 'email' | 'success'
  }) => void

  'article:related:loaded': (result: { source: string }) => void
  'suggestions:data:loaded': (result: { source: string }) => void
  'suggestions:data:error': (result: { source: string }) => void
}

export type OnEventKey = keyof OnEventTypes

export interface BaseWindowSettings {
  account_id: string
  q: Array<any>
}

export interface SettingsOptions {
  /**
   * Disable article feedback.
   * {@default true}
   */
  articleFeedbackEnabled: boolean

  /**
   * Auto open widget to article on page load if user was viewing it (default: true).
   */
  auto_open: boolean

  /**
   * Auto initialize Elevio app. See {@link https://api-docs.elevio.help/en/articles/47 | initialize}.
   */
  autoInitialize: boolean

  /**
   * Show automatic article suggestions based on context and user behaviour (default: true).
   */
  autosuggest: boolean

  /**
   * Disables some features that are known to conflict with strict CSP policies.
   * The disabled features are: article interlinking, clicking on image in article displays enlarged lightbox, and trigger modules. (default: false)
   */
  cspStrictCompatibility: boolean

  /**
   * Allows you to set a nonce for the script that is inlined to handle article clicks when viewing an article in the Assistant.
   * If you set this option remember to add that hash to your pages CSP settings!
   */
  cspInlineScriptNonce: string

  /**
   * Disables Elevio errors and warnings from appearing in the browser console (not recommended, default: false).
   */
  disableDevelopmentWarnings: boolean

  /**
   * Automatically detect changes in the URL and set page_url (default: false).
   */
  disablePushState: boolean

  /**
   * Adjusts the height and width of the widget, (default: 'full').
   */
  display_type: 'full' | 'compressed'

  /**
   * The position of the launcher button that opens the widget. Also see options.side below, (default: 'wall').
   */
  docked_position: 'wall' | 'floor' | 'button'

  /**
   * HTTP(S) link to CSS file to style Elevio articles.
   * Note this is for articles only (they cannot be styled normally since they are in an iframe).
   * See {@link https://api-docs.elevio.help/en/articles/53 | custom styling}.
   */
  embeddable_css_file: string | null

  /**
   * Disable Elevio entirely, (default: false).
   */
  enabled: boolean

  /**
   * Hide the launcher button that opens the Elevio widget.
   * See open for how to {@link https://api-docs.elevio.help/en/articles/31 | open} the widget yourself, (default: false).
   */
  hideLauncher: boolean

  /**
   * Override the link to your knowledge base URL that appears beside an article title in the widget.
   * See: {@link https://api-docs.elevio.help/en/articles/41 | setSettings}.
   */
  kbLink: (params: {
    languageId: string
    externalId: string
    id: string
    title: string
    body: string
  }) => string

  /**
   * An array of keywords for this page. Also see the helper {@link https://api-docs.elevio.help/en/articles/29 | setKeywords}.
   * {@default []}
   */
  keywords: Array<string>

  /**
   * Disable Elevio entirely if user is not set. See {@link https://api-docs.elevio.help/en/articles/24 | setUser}.
   * {@default false}
   */
  loggedin_only: boolean

  /**
   * Shows the menu in the widget until the user explicitly clicks the menu icon to close it.
   * {@default false}
   */
  menuShowUntilClosed: boolean

  /**
   *A string to set the URL for page settings. By default, Elevio watches the browser URL.
   * Also see the {@link https://api-docs.elevio.help/en/articles/27 | helper setPage}.
   */
  page_url: string

  /**
   * On widget open set an equivalent width margin on the `body` element.
   * Useful to avoid overlapping site content.
   * {@default false}
   */
  pushin: boolean

  /**
   * Set the main color that appears on various elements throughout Elevio.
   * CSS color (e.g. hex, rgb, etc).
   */
  main_color: string

  /**
   * Reinitialize Elevio when the browser URL changes.
   * @remarks
   *  This setting should *only* be used if you are using **Turbolinks**.
   * {@default false}
   */
  reinitializeOnUrlChange: boolean

  /**
   * Set the text that appears on the launcher button.
   */
  tab_teaser: string

  /**
   * The position of the launcher button and the Assistant.
   * Also see `docked_position`. {@default "right"}
   */
  side: 'left' | 'right'
}

export interface User {
  /**
   * String of user’s email address.
   */
  email: string

  /**
   * String of user’s first name.
   */
  first_name: string

  /**
   * String of user’s last name.
   */
  last_name: string

  /**
   * When sending an email you MUST also send a matching user_hash.
   * The user_hash verifies to Elevio that the email address is legitimate.
   * It should be generated as a HashMac using the user details, and your account secret which you can find {@link https://app.elev.io/settings | here}.
   * See {@link https://api-docs.elevio.help/en/articles/24 | here} for example code.
   */
  user_hash: string

  /**
   * Timestamp of when the user registered for your system (in milliseconds).
   */
  registered_at: number

  /**
   * Array of user’s groups.
   */
  groups: Array<string>

  /**
   * Object of user’s traits.
   */
  traits: Object
}

export interface ModuleDetails {
  /**
   * A string or number to uniquely identify the module. Used to later remove the module.
   */
  id: string | number

  /**
   * One of the following:
   *   webpage: open url inside the widget
   *   linkout: open url in a new browser tab
   *   trigger: publish an event. See the `module:opened` event {@link https://api-docs.elevio.help/en/articles/26 | here }.
   */
  type: 'webpage' | 'linkout' | 'trigger'

  /**
   * The title to display in the menu.
   */
  title: string

  /**
   * The URL to open in the widget. Only applicable for types `webpage` and `linkout`.
   */
  url: string

  /**
   * The icon to display in the menu.
   * See the list of available icons {@link https://api-docs.elevio.help/en/articles/61-addmodule | here}
   */
  icon: string

  /**
   * The position of the module in the menu.
   */
  order: number
}

export interface ElevioButtonOptions {
  type: RenderType

  /**
   * For types `elevioInline` and `elevioArticle` it is the ID of the article that should be opened. For type elevioModule it is the ID of the module that should be opened.
   */
  actionId: string

  /**
   * Defaults to underline.
   */
  display_type?: 'nothing' | 'underline' | 'throbber' | 'qmark'
}

export type ElevioElement = HTMLElement & {
  /**
   * Inserts the component into the DOM.
   * If it’s of `display_type` `nothing` or `underline` some CSS classes and a click handler are attached to the target. If display_type is throbber or qmark a new element is inserted to the DOM and attempts to position itself at the top right of the target.
   */
  insert: () => void

  /**
   * Undoes insert logic and destroys component. Instance cannot be used after this is called.
   */
  _destroy: () => void
}

export type ComponentOptions =
  | {
    type:
      | 'addon'
      | 'article'
      | 'article-feedback'
      | 'article-related'
      | 'category'
      | 'iframe'
    id: string
  }
  | {
    type: 'menu' | 'search' | 'suggestions'
    id?: null
  }

export type WindowElev = {
  /**
   * Add a custom module that can open a webpage in the widget, linkout to a website or trigger an event.
   * @param moduleDetails details of module to add.
   */
  addModule: (moduleDetails: ModuleDetails) => void

  /**
   * This will reinitialise Elevio with the new account id set.
   */
  setAccountId: (accountId: string) => void

  /**
   * Returns an instance of a button component that can attach itself to a target and trigger an action on click.
   * @param target The DOM node that the button will attach itself to.
   * @param options Options to setup the button.
   */
  buttonComponent: (
    target: Element,
    options: ElevioButtonOptions
  ) => ElevioElement

  /**
   * Closes the widget, if open.
   */
  close: () => void

  /**
   * Close any open popup on the page.
   */
  closeAllPopups: () => void

  /**
   * Close the popup for given article ID.
   * @param articleId The article ID for the popup that should be closed.
   */
  closePopup: (articleId: string) => void

  /**
   * Returns a custom element DOM node for the given type that you can embed anywhere on your site.
   */
  component: (options: ComponentOptions) => Element

  /**
   * Disables the given modules so they cannot be accessed by the user, even if enabled in the dashboard.
   */
  disableModules: (moduleIds: Array<string>) => void

  /**
   * Enables the given modules so they can be accessed by the user.
   * NOTE:
   * Note that this only reverses disableModules. Modules disabled in the dashboard cannot be enabled by this API.
   */
  enableModules: (moduleIds: Array<string | number>) => void

  /**
   * Hides the given modules so they cannot be seen in the menu by the user, even if enabled.
   */
  hideModules: (moduleIds: Array<string | number>) => void

  /**
   * By default, Elevio auto-initializes itself on page load. In rare cases you may want to initialize Elevio yourself.
   * @example
   * ```js
       window._elev.on('load', function(_elev) {
        _elev.setSettings({
          autoInitialize: false,
        });
        setTimeout(function() {
          _elev.initialize();
        }, 10000);
      });
       ```
   */
  initialize: () => void

  /** Returns whether or not Elevio is supported in this browser. If it is not, Elevio will not load. */
  isSupportedBrowser: () => boolean

  /** Logs out the current user, reversing any calls to `setUser()`. */
  logoutUser: () => void

  /**
   * Listen to events emitted by Elevio.
   * Note that this is the only method that can be called before the load event is emitted.
   * See {@link https://api-docs.elevio.help/en/articles/26-on | On} for details about all the different events.
   */
  on: <T extends Readonly<OnEventKey>>(
    elevioEvent: T,
    cb: OnEventTypes[T]
  ) => void

  /** Open the widget to the last page the user was on. */
  open: () => void

  /** Open the widget to the article with given ID. */
  openArticle: (articleId: string) => void

  /** Open the widget to the category with given ID. The ID of the index category is ’index’. */
  openCategory: (categoryId: string) => void

  /** Open the widget to the home page. */
  openHome: () => void

  /** Open the widget to the module with given ID. */
  openModule: (moduleId: string) => void

  /** Open the popup for given article ID. */
  openPopup: (articleId: string) => void

  /**
   * Returns an instance of a popup component that displays an article next to a target DOM node.
   * See {@link https://api-docs.elevio.help/en/articles/46-popupcomponent | Popup component} for more info.
   */
  popupComponent: (
    target: Element,
    options: { articleId: string }
  ) => ElevioElement

  /** Remove a custom module. */
  removeModule: (uniqueModuleId: string) => void

  /**
   * Overrides keywords set in the dashboard from {@link https://app.elev.io/pages | page} settings.
   * Can be used to determine which articles are displayed in suggestions.
   */
  setKeywords: (keywords?: Array<string>) => void

  /**
   * Overrides the language that Elevio uses for localization.
   * The language must be both supported and enabled in your dashboard.
   * By default, Elevio uses the user’s system language.
   * Also see {@link https://api-docs.elevio.help/en/articles/42 | setTranslations}.
   * See {@link https://api-docs.elevio.help/en/articles/25-setlanguage | setLanguage} for a list of language codes.
   */
  setLanguage: (languageCode?: string) => void

  /**
   * Overrides the page URL, which by default is the browser’s current URL.
   * The URL is used to determine {@link https://app.elev.io/pages | page settings}.
   * You should only use this in rare cases, since Elevio automatically detects browser URL changes.
   */
  setPage: (url?: string) => void

  /**
   * Overrides settings from dashboard, and exposes some new settings.
   * @param settings see {@link https://api-docs.elevio.help/en/articles/41-setsettings | Settings}
   */
  setSettings: (setting: Partial<Nullable<SettingsOptions>>) => void

  /**
   * Overrides the translations that Elevio uses for localization.
   * Also see {@see setLanguage}.
   * See {@link https://api-docs.elevio.help/en/articles/42-settranslations | set translations} for a description of the objects shape.
   */
  setTranslations: (translations?: Object) => void

  /**
   * Identify the current user. {@link https://api-docs.elevio.help/en/articles/4 | Read more about why.}
   * @param user the user object
   */
  setUser: (user?: Partial<Nullable<User>>) => void

  /**
   * Shows the given modules so they can be seen in the menu by the user.
   * Reverses calls to hideModules.
   */
  showModules: (moduleIds: Array<string | number>) => void

  /** Toggle the popup for given article ID. Opens the popup if closed, and vice versa. */
  togglePopup: (aritcleId: string) => void

  /**
   * Disables helpers so they cannot be seen or used by the user.
   * If helperIds are not provided, all helpers will be disabled.
   * See {@link https://api-docs.elevio.help/en/articles/81-disablehelpers | disableHelpers} for more info.
   */
  disableHelpers: (helperIds?: Array<number>) => void

  /**
   * Enables helpers so that they can be seen and used by the user.
   * If helperIds are not provided, all helpers will be enabled.
   * See {@link https://api-docs.elevio.help/en/articles/82-enablehelpers | enableHelpers} for more info.
   */
  enableHelpers: (helperIds?: Array<number>) => void

  /**
   * Identify user that has been set. {@link https://api-docs.elevio.help/en/articles/24 | Set user}
   */
  getUser: () => Nullable<User>
} & BaseWindowSettings
