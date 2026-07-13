import test from "node:test"
import assert from "node:assert/strict"

import { SpotifyService } from "../lib/services/spotify.service.js"
import { handleSpotify } from "../lib/commands/downloader/spotify.js"

test("SpotifyService normalizes a Spotify track payload", async () => {
  const originalFetch = globalThis.fetch
  const originalToken = process.env.SPOTIFY_ACCESS_TOKEN
  process.env.SPOTIFY_ACCESS_TOKEN = "token"
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      tracks: {
        items: [{
          name: "Midnight City",
          artists: [{ name: "M83" }],
          duration_ms: 240000,
          album: { images: [{ url: "https://img.example/cover.jpg" }] },
          external_urls: { spotify: "https://open.spotify.com/track/123" }
        }]
      }
    })
  })

  try {
    const service = new SpotifyService({ apiKey: "token" })
    const result = await service.getTrack("Midnight City", { accessToken: "token" })

    assert.equal(result.title, "Midnight City")
    assert.equal(result.artist, "M83")
    assert.equal(result.duration, "4:00")
    assert.equal(result.thumbnail, "https://img.example/cover.jpg")
    assert.equal(result.downloadLink, "https://open.spotify.com/track/123")
  } finally {
    globalThis.fetch = originalFetch
    if (originalToken === undefined) {
      delete process.env.SPOTIFY_ACCESS_TOKEN
    } else {
      process.env.SPOTIFY_ACCESS_TOKEN = originalToken
    }
  }
})

test("handleSpotify replies with the requested metadata fields", async () => {
  const originalFetch = globalThis.fetch
  const originalToken = process.env.SPOTIFY_ACCESS_TOKEN
  process.env.SPOTIFY_ACCESS_TOKEN = "token"
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      tracks: {
        items: [{
          name: "Midnight City",
          artists: [{ name: "M83" }],
          duration_ms: 240000,
          album: { images: [{ url: "https://img.example/cover.jpg" }] },
          external_urls: { spotify: "https://open.spotify.com/track/123" }
        }]
      }
    })
  })

  try {
    const sent = []
    const sock = {
      sendMessage: async (_from, payload) => {
        sent.push(payload)
      }
    }

    const msg = {
      key: { remoteJid: "123@g.us" },
      message: { conversation: ".spotify Midnight City" }
    }

    const result = await handleSpotify(sock, msg)

    assert.equal(result, true)
    assert.ok(sent.length >= 2)
    const text = sent.at(-1).text
    assert.match(text, /Song:/)
    assert.match(text, /Artist:/)
    assert.match(text, /Duration:/)
    assert.match(text, /Thumbnail:/)
    assert.match(text, /Download link:/)
  } finally {
    globalThis.fetch = originalFetch
    if (originalToken === undefined) {
      delete process.env.SPOTIFY_ACCESS_TOKEN
    } else {
      process.env.SPOTIFY_ACCESS_TOKEN = originalToken
    }
  }
})
