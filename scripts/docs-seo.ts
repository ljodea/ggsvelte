import sveltePackage from "../packages/svelte/package.json";

const REPOSITORY_URL = "https://github.com/ljodea/ggsvelte";
const SOCIAL_IMAGE_PATH = "/previews/interaction-tooltip-light.png";

export interface SeoRoute {
  path: string;
  title: string;
  description: string;
  canonicalPath: string;
  shell: "site" | "docs";
  navigation?: { section: string; label: string };
  primaryNavigationOwner?: "reference";
}

export interface SeoImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

export interface SeoDocument {
  title: string;
  description: string;
  canonical: string;
  image: SeoImage;
  twitterCard: "summary_large_image";
  structuredData: object[];
}

function absoluteUrl(canonicalBase: string, path: string): string {
  return `${canonicalBase.replace(/\/$/, "")}${path}`;
}

export function serializeStructuredData(data: readonly object[]): string {
  return JSON.stringify(data)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function renderStructuredDataScript(data: readonly object[]): string {
  if (data.length === 0) return "";
  return `<script type="application/ld+json">${serializeStructuredData(data)}</script>`;
}

export function buildSeoDocument(route: SeoRoute, canonicalBase: string): SeoDocument {
  const canonical = absoluteUrl(canonicalBase, route.canonicalPath);
  const structuredData: object[] = [];
  if (route.path === "/") {
    structuredData.push(
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "ggsvelte",
        url: canonical,
        description: route.description,
      },
      {
        "@context": "https://schema.org",
        "@type": "SoftwareSourceCode",
        name: "ggsvelte",
        codeRepository: REPOSITORY_URL,
        programmingLanguage: ["TypeScript", "Svelte"],
        license: "https://spdx.org/licenses/MIT.html",
        runtimePlatform: "Node.js 22 or newer",
        url: canonical,
        version: sveltePackage.version,
      },
    );
  }
  if (route.shell === "docs") {
    const reference =
      route.primaryNavigationOwner === "reference" ||
      route.path.startsWith("/reference") ||
      route.navigation?.section === "Reference";
    const rootName = reference ? "Reference" : "Docs";
    const rootPath = reference ? "/reference" : "/docs";
    if (route.path !== rootPath) {
      structuredData.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: rootName,
            item: absoluteUrl(canonicalBase, rootPath),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: route.navigation?.label ?? route.title.replace(" — ggsvelte", ""),
            item: canonical,
          },
        ],
      });
    }
  }

  return {
    title: route.title,
    description: route.description,
    canonical,
    image: {
      url: absoluteUrl(canonicalBase, SOCIAL_IMAGE_PATH),
      width: 640,
      height: 400,
      alt: "An interactive ggsvelte scatter plot with a pinned data inspection.",
    },
    twitterCard: "summary_large_image",
    structuredData,
  };
}
