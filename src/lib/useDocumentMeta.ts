import { useEffect } from "react";

interface Meta {
  title?: string;
  description?: string;
  canonicalPath?: string; // e.g. "/auth"
  ogTitle?: string;
  ogDescription?: string;
}

function upsertMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

const BASE = "https://usevolant.app";

export function useDocumentMeta({ title, description, canonicalPath, ogTitle, ogDescription }: Meta) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      upsertMeta('meta[name="description"]', "name", "description", description);
    }
    if (canonicalPath !== undefined) {
      const url = `${BASE}${canonicalPath}`;
      upsertCanonical(url);
      upsertMeta('meta[property="og:url"]', "property", "og:url", url);
    }
    const ot = ogTitle ?? title;
    const od = ogDescription ?? description;
    if (ot) {
      upsertMeta('meta[property="og:title"]', "property", "og:title", ot);
      upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", ot);
    }
    if (od) {
      upsertMeta('meta[property="og:description"]', "property", "og:description", od);
      upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", od);
    }
  }, [title, description, canonicalPath, ogTitle, ogDescription]);
}
