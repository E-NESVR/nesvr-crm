const https = require('https');

// Domains that are directories/aggregators — not the business's own website
const DIRECTORY_DOMAINS = [
  'yelp.com', 'google.com', 'facebook.com', 'yellowpages.com',
  'angieslist.com', 'thumbtack.com', 'bbb.org', 'houzz.com',
  'homeadvisor.com', 'birdeye.com', 'nextdoor.com', 'manta.com',
  'mapquest.com', 'superpages.com', 'citysearch.com', 'foursquare.com',
  'tripadvisor.com', 'linkedin.com', 'twitter.com', 'instagram.com',
  'bing.com', 'yahoo.com', 'wikipedia.org', 'amazon.com',
];

function isDirectoryUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return DIRECTORY_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

async function googleSearch(query) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !cx) {
    return { results: [], skipped: true };
  }

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', query);
  url.searchParams.set('num', '5');

  return new Promise((resolve) => {
    const req = https.get(url.toString(), (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const results = (json.items || []).map(item => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            // displayLink may be the canonical business website
            displayLink: item.displayLink,
          }));
          resolve({ results, skipped: false });
        } catch {
          resolve({ results: [], skipped: false, error: 'Parse error' });
        }
      });
    });
    req.setTimeout(10000, () => {
      req.destroy(new Error('Request timeout'));
    });
    req.on('error', (err) => {
      resolve({ results: [], skipped: false, error: err.message });
    });
  });
}

// Fetch a URL and return the first N characters of its text body (best-effort)
async function fetchPageText(url, maxChars = 2000) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const lib = parsedUrl.protocol === 'https:' ? require('https') : require('http');
      const req = lib.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NESVR-CRM-Enrichment/1.0)' },
        timeout: 8000,
      }, (res) => {
        // Follow one redirect
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          resolve(fetchPageText(res.headers.location, maxChars));
          return;
        }
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
          if (body.length > maxChars * 4) res.destroy();
        });
        res.on('end', () => {
          // Strip HTML tags, collapse whitespace
          const text = body
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, maxChars);
          resolve(text || null);
        });
        res.on('error', () => resolve(null));
      });
      req.setTimeout(8000, () => { req.destroy(); resolve(null); });
      req.on('error', () => resolve(null));
    } catch {
      resolve(null);
    }
  });
}

async function enrichLead(lead) {
  const name = lead.business_name;
  const city = lead.city || 'Jacksonville';
  const cat = lead.category || '';
  const phone = lead.phone || '';

  // Run multiple searches in parallel for richer context
  const [general, reviews, directories, news, phoneSearch] = await Promise.all([
    googleSearch(`"${name}" ${city} ${cat}`),
    googleSearch(`"${name}" reviews Jacksonville`),
    googleSearch(`"${name}" site:yelp.com OR site:bbb.org OR site:google.com/maps`),
    googleSearch(`"${name}" news OR announcement OR award Jacksonville`),
    phone ? googleSearch(`"${phone}" ${city}`) : Promise.resolve({ results: [], skipped: false }),
  ]);

  const allResults = [
    ...general.results,
    ...reviews.results,
    ...directories.results,
    ...news.results,
    ...phoneSearch.results,
  ];

  const allSnippets = allResults
    .map(r => `[${r.title}] ${r.snippet} (${r.link})`)
    .join('\n');

  const sources = allResults.map(r => r.link).filter(Boolean);

  // Extract business website — loop through all general results, skip directories
  let website = lead.website || null;
  if (!website) {
    for (const result of general.results) {
      if (result.link && !isDirectoryUrl(result.link)) {
        website = result.link;
        break;
      }
    }
  }

  // Fetch homepage content if we found (or already have) a website
  let homepageText = null;
  const websiteToFetch = website || lead.website;
  if (websiteToFetch) {
    homepageText = await fetchPageText(websiteToFetch);
  }

  const queriesUsed = [
    `"${name}" ${city} ${cat}`,
    `"${name}" reviews Jacksonville`,
    `"${name}" site:yelp.com OR site:bbb.org OR site:google.com/maps`,
    `"${name}" news OR announcement OR award Jacksonville`,
    phone ? `"${phone}" ${city}` : null,
  ].filter(Boolean);

  return {
    snippets: allSnippets,
    sources,
    website,
    homepageText,
    queriesUsed,
    skipped: general.skipped,
  };
}

module.exports = { enrichLead, googleSearch };
