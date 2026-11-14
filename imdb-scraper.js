const CACHE_TTL = 60 * 60 * 6 // 6 hours cache
const UA = 'Mozilla/5.0 (compatible; OpenCodex-IMDb-Scraper/1.0)'

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url)
      const path = url.pathname
      const cacheKey = new Request(url.toString(), request)
      const cache = caches.default

      // Check cache first
      if (request.method === 'GET') {
        const cached = await cache.match(cacheKey)
        if (cached) return cached
      }

      // API endpoints
      if (path.startsWith('/title/')) {
        const imdbId = path.split('/')[2]
        if (!/^tt\d+$/.test(imdbId)) {
          return errorResponse('Invalid IMDb ID format', 400)
        }
        return handleTitleRequest(imdbId, cacheKey, cache)
      }

      if (path.startsWith('/search/')) {
        const query = decodeURIComponent(path.split('/')[2])
        return handleSearchRequest(query, cacheKey, cache)
      }

      return errorResponse('Not Found', 404)
    } catch (err) {
      return errorResponse('Internal Server Error', 500)
    }
  }
}

async function handleTitleRequest(imdbId, cacheKey, cache) {
  const html = await fetchIMDb(`https://www.imdb.com/title/${imdbId}/`)
  const data = parseTitlePage(html)
  
  const response = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL}`
    }
  })
  
  cache.put(cacheKey, response.clone())
  return response
}

async function handleSearchRequest(query, cacheKey, cache) {
  const html = await fetchIMDb(`https://www.imdb.com/find?q=${encodeURIComponent(query)}`)
  const results = parseSearchResults(html)
  
  const response = new Response(JSON.stringify({ results }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL}`
    }
  })
  
  cache.put(cacheKey, response.clone())
  return response
}

async function fetchIMDb(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    cf: { cacheTtl: CACHE_TTL }
  })
  return await res.text()
}

function parseTitlePage(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  
  return {
    id: doc.querySelector('[property="pageId"]')?.content,
    title: doc.querySelector('h1')?.textContent.trim(),
    year: doc.querySelector('.sc-8c396aa2-1')?.textContent.trim(),
    rating: doc.querySelector('[data-testid="hero-rating-bar__aggregate-rating__score"]')?.textContent.trim(),
    votes: doc.querySelector('[data-testid="hero-rating-bar__aggregate-rating__vote-count"]')?.textContent.trim(),
    duration: doc.querySelector('.sc-8c396aa2-1 + li')?.textContent.trim(),
    genres: [...doc.querySelectorAll('[data-testid="genres"] a')].map(el => el.textContent.trim()),
    description: doc.querySelector('[data-testid="plot"]')?.textContent.trim(),
    poster: doc.querySelector('.ipc-media--poster img')?.src,
    cast: [...doc.querySelectorAll('.principal-credits__section--cast .ipc-metadata-list-item__label')]
      .map(el => el.textContent.trim()),
    directors: [...doc.querySelectorAll('.principal-credits__section--director .ipc-metadata-list-item__label')]
      .map(el => el.textContent.trim()),
    keywords: [...doc.querySelectorAll('[data-testid="storyline-plot-keywords"] a')]
      .map(el => el.textContent.trim())
  }
}

function parseSearchResults(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return [...doc.querySelectorAll('.find-result-item')].map(item => ({
    id: item.querySelector('a')?.href.split('/')[2],
    title: item.querySelector('a')?.textContent.trim(),
    year: item.querySelector('.result-item-year')?.textContent.trim(),
    type: item.querySelector('.result-item-type')?.textContent.trim(),
    image: item.querySelector('img')?.src
  }))
}

function errorResponse(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
