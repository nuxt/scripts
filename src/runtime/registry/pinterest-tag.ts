import { type Input, object, string } from "valibot";
import { useScript } from "#imports";
import type { NuxtUseScriptOptions } from "#nuxt-scripts";

export type PinterestEventType =
  | "checkout"
  | "addtocart"
  | "pagevisit"
  | "signup"
  | "watchvideo"
  | "lead"
  | "search"
  | "viewcategory"
  | "custom";

export interface PinterestTagApi {
  trackPageview: () => void;
  trackEvent: (
    eventType: PinterestEventType | string,
    eventData?: object
  ) => void;
}

export const PinterestTagOptions = object({
  id: string(),
  email: string(),
});

export type PinterestTagOptions = Input<typeof PinterestTagOptions>;

export function usePinterestTag<T extends PinterestTagApi>(
  options?: PinterestTagOptions,
  _scriptOptions?: Omit<NuxtUseScriptOptions<T>, "beforeInit" | "use">
) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {};
  scriptOptions.beforeInit = () => {
    if (import.meta.client && !window?.pintrk) {
      window.pintrk = function () {
        window.pintrk.queue.push(Array.prototype.slice.call(arguments));
      };

      const pintrk = window.pintrk;
      pintrk.queue = [];
      pintrk.version = "3.0";
      pintrk("load", options?.id, options?.email ? { em: options.email } : {});
    }
  };
  return useScript<PinterestTagApi>(
    {
      key: "pinterestTag",
      src: "https://s.pinimg.com/ct/core.js",
      ...options,
    },
    {
      ...scriptOptions,
      use: () => ({
        trackPageview: () => window.pintrk("page"),
        trackEvent: (
          eventType: PinterestEventType | string,
          eventData?: object
        ) => window.pintrk("track", eventType, eventData),
      }),
    }
  );
}
