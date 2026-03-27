const https = require('https');

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
    https.get(url.toString(), (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const results = (json.items || []).map(item => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
          }));
          resolve({ results, skipped: false });
        } catch {
          resolve({ results: [], skipped: false, error: 'Parse error' });
        }
      });
    }).on('error', (err) => {
      resolve({ results: [], skipped: false, error: err.message });
    });
  });
}

async function enrichLead(lead) {
  const name = lead.business_name;
  const city = lead.city || 'Jacksonville';
  const cat = lead.category || '';

  const [general, reviews] = await Promise.all([
    googleSearch(`"${name}" ${city} ${cat}`),
    googleSearch(`"${name}" reviews`),
  ]);

  const allSnippets = [
    ...general.results.map(r => `[${r.title}] ${r.snippet} (${r.link})`),
    ...reviews.results.map(r => `[${r.title}] ${r.snippet} (${r.link})`),
  ].join('\n');

  const sources = [
    ...general.results.map(r => r.link),
    ...reviews.results.map(r => r.link),
  ].filter(Boolean);

  // Try to extract website from results
  let website = lead.website;
  if (!website && general.results.length > 0) {
    const first = general.results[0];
    if (first.link && !first.link.includes('yelp.com') && !first.link.includes('google.com')) {
      website = first.link;
    }
  }

  return { snippets: allSnippets, sources, website, skipped: general.skipped };
}

module.exports = { enrichLead, googleSearch };
