# Spotify downloader feature

## Overview

The Spotify downloader feature adds a lightweight command handler that looks up a Spotify track and returns a formatted message with the song title, artist, duration, thumbnail, and download link.

## Commands

- .spotify <song>
- .play <song>

## Implementation notes

- The handler lives in lib/commands/downloader/spotify.js.
- The lookup logic lives in lib/services/spotify.service.js.
- The command is discovered automatically by the existing command loader.
- The feature uses the existing middleware, logger, config, and event pipeline.

## Configuration

The feature expects a Spotify access token in the API config under api.spotify.
