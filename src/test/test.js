import { test, expect } from 'vitest'
import IMDBScraper from '../imdb-scraper.js'

test('parses title page correctly', async () => {
  const mockHtml = `
    <html>
      <h1>Test Movie</h1>
      <meta property="pageId" content="tt1234567" />
      <span data-testid="hero-rating-bar__aggregate-rating__score">8.5</span>
    </html>
  `
  
  const result = IMDBScraper.parseTitlePage(mockHtml)
  expect(result.title).toBe('Test Movie')
  expect(result.id).toBe('tt1234567')
  expect(result.rating).toBe('8.5')
})
