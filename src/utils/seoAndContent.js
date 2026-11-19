export const FALLBACK_IMAGE = 'https://placehold.co/1200x700/1e3a8a/ffffff.webp?text=Idraulico+Reggio+Emilia';

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function stripInlineMarkdownLinks(rawText) {
  return String(rawText ?? '').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
}

export function normalizeAstroHref(rawHref) {
  const trimmed = String(rawHref || '').trim();
  if (!trimmed) return '/';
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return '/';
  if (/^(tel:|mailto:|https?:\/\/)/i.test(trimmed)) return trimmed;

  if (trimmed.startsWith('#')) {
    const clean = trimmed.slice(1).replace(/^\/+/, '').replace(/\/+$/, '');
    if (!clean || clean === 'home') return '/';
    if (['servizi', 'chi-siamo', 'blog', 'contatti'].includes(clean)) return `/${clean}`;
    if (clean === 'chiSiamo') return '/chi-siamo';
    if (clean.startsWith('servizi/') || clean.startsWith('blog/')) return `/${clean}`;
    return trimmed;
  }

  if (trimmed === '/home') return '/';
  return trimmed;
}

export function renderInlineRichText(rawText) {
  const str = String(rawText ?? '');
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let html = '';
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      html += escapeHtml(str.slice(lastIndex, match.index));
    }
    const anchor = escapeHtml(match[1]);
    const href = normalizeAstroHref(match[2]);
    const isExternal = /^https?:\/\//i.test(href);
    const linkClass = 'text-brand-light font-semibold underline decoration-sky-300 underline-offset-4 hover:text-brand-blue transition-colors';

    if (isExternal) {
      html += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="${linkClass}">${anchor}</a>`;
    } else {
      html += `<a href="${escapeHtml(href)}" class="${linkClass}">${anchor}</a>`;
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    html += escapeHtml(str.slice(lastIndex));
  }
  return html;
}

export function optimizeImageUrlToWebp(rawUrl) {
  const u = String(rawUrl || '').trim();
  if (!u) return FALLBACK_IMAGE;
  if (u.startsWith('blob:') || u.startsWith('data:')) return u;

  if (u.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(u);
      parsed.searchParams.set('fm', 'webp');
      if (!parsed.searchParams.has('q')) parsed.searchParams.set('q', '80');
      return parsed.toString();
    } catch {
      return u.includes('?') ? `${u}&fm=webp` : `${u}?fm=webp`;
    }
  }

  if (u.includes('placehold.co') && !/\.(webp|svg)(\?|$)/i.test(u)) {
    return u.replace(/(\?|$)/, '.webp$1');
  }

  return u;
}

export function buildResponsiveSrcset(rawUrl) {
  const primarySrc = optimizeImageUrlToWebp(rawUrl || FALLBACK_IMAGE);
  if (!primarySrc.includes('images.unsplash.com')) return undefined;
  try {
    return [480, 800, 1200]
      .map((w) => {
        const parsed = new URL(primarySrc);
        parsed.searchParams.set('w', String(w));
        parsed.searchParams.set('fm', 'webp');
        parsed.searchParams.set('q', '80');
        return `${parsed.toString()} ${w}w`;
      })
      .join(', ');
  } catch {
    return undefined;
  }
}

export function buildJsonLdGraph(siteData, routeContext, entity) {
  const g = siteData.global;
  const seo = entity?.seo || {};
  const domain = (g.domain || 'https://idraulico-a-reggio-emilia.it').replace(/\/+$/, '');
  const lat = parseFloat(g.defaultLatitude) || 44.6989;
  const lng = parseFloat(g.defaultLongitude) || 10.6297;

  if (seo.customJsonLdMode === 'override' && seo.customJsonLd && seo.customJsonLd.trim()) {
    try {
      return JSON.parse(seo.customJsonLd);
    } catch {
      // Fallback al grafo automatico
    }
  }

  const graph = [];

  const plumberEntity = {
    '@type': 'Plumber',
    '@id': `${domain}/#organization`,
    name: g.businessName,
    legalName: g.legalName,
    url: `${domain}/`,
    telephone: g.phoneDisplay,
    email: g.email,
    priceRange: g.priceRange,
    address: {
      '@type': 'PostalAddress',
      streetAddress: g.streetAddress,
      addressLocality: g.locality,
      postalCode: g.postalCode,
      addressRegion: g.regionCode,
      addressCountry: 'IT'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: lat,
      longitude: lng
    },
    areaServed: [
      {
        '@type': 'GeoCircle',
        geoMidpoint: {
          '@type': 'GeoCoordinates',
          latitude: lat,
          longitude: lng
        },
        geoRadius: Number(g.serviceRadiusMeters) || 35000
      },
      ...(g.areaServed || []).map((city) => ({
        '@type': 'City',
        name: city
      }))
    ],
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: g.openingDaysSchema,
      opens: g.opensTime,
      closes: g.closesTime
    },
    knowsAbout: g.knowsAbout || [],
    sameAs: g.sameAs || [],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Servizi Idraulici Residenziali a Reggio Emilia',
      itemListElement: (siteData.services || []).map((srv) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: srv.h1,
          url: `${domain}/servizi/${srv.slug}`
        }
      }))
    }
  };

  if (g.logoImageUrl && String(g.logoImageUrl).trim() && !String(g.logoImageUrl).startsWith('data:')) {
    plumberEntity.logo = optimizeImageUrlToWebp(g.logoImageUrl);
  }
  graph.push(plumberEntity);

  const breadcrumbs = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${domain}/` }
  ];

  if (routeContext.type === 'page' && routeContext.id !== 'home') {
    breadcrumbs.push({
      '@type': 'ListItem',
      position: 2,
      name: entity.label || entity.h1,
      item: `${domain}/${entity.slug}`
    });
  } else if (routeContext.type === 'service') {
    breadcrumbs.push(
      { '@type': 'ListItem', position: 2, name: 'Servizi', item: `${domain}/servizi` },
      { '@type': 'ListItem', position: 3, name: entity.shortTitle, item: `${domain}/servizi/${entity.slug}` }
    );
  } else if (routeContext.type === 'post') {
    breadcrumbs.push(
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${domain}/blog` },
      { '@type': 'ListItem', position: 3, name: entity.title, item: `${domain}/blog/${entity.slug}` }
    );
  }

  graph.push({
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs
  });

  if (routeContext.type === 'service') {
    const serviceSchema = {
      '@type': 'Service',
      name: entity.h1,
      description: seo.description || entity.subtitle,
      provider: { '@id': `${domain}/#organization` },
      areaServed: (g.areaServed || []).map((c) => ({ '@type': 'City', name: c })),
      url: `${domain}/servizi/${entity.slug}`
    };
    if (entity.priceOffer) {
      serviceSchema.offers = {
        '@type': 'Offer',
        price: String(entity.priceOffer),
        priceCurrency: entity.priceCurrency || 'EUR'
      };
    }
    graph.push(serviceSchema);
  } else if (routeContext.type === 'post') {
    graph.push({
      '@type': 'BlogPosting',
      headline: entity.title,
      description: seo.description || entity.excerpt,
      image: optimizeImageUrlToWebp(entity.coverImage),
      datePublished: entity.dateIso || '2026-10-01',
      dateModified: entity.dateIso || '2026-10-01',
      author: { '@id': `${domain}/#organization` },
      publisher: { '@id': `${domain}/#organization` },
      mainEntityOfPage: `${domain}/blog/${entity.slug}`
    });
  }

  if (Array.isArray(entity.faqs) && entity.faqs.length > 0) {
    const validFaqs = entity.faqs.filter((f) => f.question && f.answer);
    if (validFaqs.length > 0) {
      graph.push({
        '@type': 'FAQPage',
        mainEntity: validFaqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer
          }
        }))
      });
    }
  }

  if (Array.isArray(entity.blocks)) {
    const howToBlock = entity.blocks.find(
      (b) => b.type === 'list' && b.listType === 'howto' && Array.isArray(b.items) && b.items.length > 0
    );
    if (howToBlock) {
      graph.push({
        '@type': 'HowTo',
        name: entity.h1 || entity.title,
        step: howToBlock.items.map((stepText, idx) => ({
          '@type': 'HowToStep',
          position: idx + 1,
          text: stripInlineMarkdownLinks(stepText)
        }))
      });
    }
  }

  if (seo.customJsonLd && seo.customJsonLd.trim()) {
    try {
      const parsedCustom = JSON.parse(seo.customJsonLd);
      if (Array.isArray(parsedCustom)) {
        graph.push(...parsedCustom);
      } else if (parsedCustom && typeof parsedCustom === 'object') {
        if (Array.isArray(parsedCustom['@graph'])) {
          graph.push(...parsedCustom['@graph']);
        } else {
          const clone = { ...parsedCustom };
          delete clone['@context'];
          graph.push(clone);
        }
      }
    } catch {
      // Ignora JSON non valido
    }
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  };
}

export function generateSitemapXml(siteData) {
  const domain = (siteData.global.domain || 'https://idraulico-a-reggio-emilia.it').replace(/\/+$/, '');
  const today = new Date().toISOString().split('T')[0];
  const urls = [];

  Object.values(siteData.pages || {}).forEach((p) => {
    const loc = p.slug ? `${domain}/${p.slug}` : `${domain}/`;
    urls.push({
      loc,
      lastmod: today,
      changefreq: p.seo?.changefreq || 'weekly',
      priority: p.seo?.priority || '0.8'
    });
  });

  (siteData.services || []).forEach((s) => {
    urls.push({
      loc: `${domain}/servizi/${s.slug}`,
      lastmod: today,
      changefreq: s.seo?.changefreq || 'monthly',
      priority: s.seo?.priority || '0.85'
    });
  });

  (siteData.posts || []).forEach((post) => {
    urls.push({
      loc: `${domain}/blog/${post.slug}`,
      lastmod: post.dateIso || today,
      changefreq: post.seo?.changefreq || 'monthly',
      priority: post.seo?.priority || '0.75'
    });
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) =>
        `  <url>\n    <loc>${escapeHtml(u.loc)}</loc>\n    <lastmod>${escapeHtml(u.lastmod)}</lastmod>\n    <changefreq>${escapeHtml(u.changefreq)}</changefreq>\n    <priority>${escapeHtml(u.priority)}</priority>\n  </url>`
    ),
    '</urlset>'
  ].join('\n');
}

export function generateRobotsTxt(siteData) {
  const domain = (siteData.global.domain || 'https://idraulico-a-reggio-emilia.it').replace(/\/+$/, '');
  return ['User-agent: *', 'Allow: /', 'Disallow: /admin', '', `Sitemap: ${domain}/sitemap.xml`].join('\n');
}

export function generateLlmsTxt(siteData) {
  const g = siteData.global;
  const domain = (g.domain || 'https://idraulico-a-reggio-emilia.it').replace(/\/+$/, '');
  return [
    `# ${g.businessName}`,
    '',
    `> ${siteData.pages.home.heroSubtitle}`,
    '',
    '## Informazioni Aziendali e Copertura Locale',
    `- Sede: ${g.address}`,
    `- Telefono: ${g.phoneDisplay}`,
    `- Email: ${g.email}`,
    `- Orari: ${g.hours}`,
    `- Comuni serviti: ${(g.areaServed || []).join(', ')}`,
    '',
    '## Servizi Idraulici Residenziali',
    ...(siteData.services || []).map((s) => `- [${s.h1}](${domain}/servizi/${s.slug}): ${s.subtitle}`),
    '',
    '## Guide Tecniche e Blog',
    ...(siteData.posts || []).map((p) => `- [${p.title}](${domain}/blog/${p.slug}): ${p.excerpt}`)
  ].join('\n');
}
