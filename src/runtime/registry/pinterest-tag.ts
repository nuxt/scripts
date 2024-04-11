import { type Input, object, string, optional } from "valibot";
import { useScript, validateScriptInputSchema } from "#imports";
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

export type PinterestFns = 
  ((type: "track", eventType: PinterestEventType | string, eventData: object | undefined) => void) &
  ((type: "load", id: string, email?: { em?: string }) => void) &
  ((type: "page") => void) &
  ((...params: any[]) => void) &
  (() => void)

export interface PinterestTagApi {
  pintrk: PinterestFns & { version: string, queue: any[] };
}

declare global {
  interface Window extends PinterestTagApi {
  }
}

export const PinterestTagOptions = object({
  id: string(),
  email: optional(string()),
});

export type PinterestTagOptions = Input<typeof PinterestTagOptions>;

export function usePinterestTag<T extends PinterestTagApi>(
  options?: PinterestTagOptions,
  _scriptOptions?: Omit<NuxtUseScriptOptions<T>, "beforeInit" | "use">
) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {};
  scriptOptions.beforeInit = () => {
    import.meta.dev && validateScriptInputSchema(PinterestTagOptions, options);
    if (import.meta.client && !window?.pintrk) {
      const pintrk: PinterestTagApi["pintrk"] = window.pintrk = function (...args: any[]) {
        window.pintrk.queue.push(Array.prototype.slice.call(args));
      } as PinterestTagApi["pintrk"];

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
      use() {
        return { pintrk: window.pintrk }
      },
    }
  );
}
