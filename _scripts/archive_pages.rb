#!/usr/bin/env ruby
# For a small, manually curated list of pages that are worth previewing live
# but whose domain blocks iframe embedding (see _data/live-link-domains.json),
# this uses a real headless browser to save a static DOM snapshot into the
# repo. The popover then iframes that local, same-origin copy instead of the
# live page - the exact trick gwern's own archive system uses (see
# build/LinkArchive.hs in a gwern.net checkout: SingleFile + headless Chromium
# saving mirrors server-side, framed instead of the original), just applied to
# a handful of specific links instead of gwern's ~14,000-page archive.
#
# Run manually: ruby _scripts/archive_pages.rb
# Also run in CI before `jekyll build` - GitHub-hosted ubuntu runners ship
# Google Chrome preinstalled, so no extra setup step is needed there.
#
# Snapshots are captured once and committed, so they WILL drift from the live
# page over time - this is a preview, not a live mirror. Delete the URL's
# entry from _data/local-archives.json (and its file under assets/archive/)
# and re-run to refresh one.

require "json"
require "fileutils"
require "digest"

ROOT = File.expand_path("..", __dir__)
ARCHIVE_DIR = File.join(ROOT, "assets", "archive") # not _archive/ - Jekyll would exclude an underscore-prefixed dir
MANIFEST_FILE = File.join(ROOT, "_data", "local-archives.json")
CHROME_CANDIDATES = %w[google-chrome-stable google-chrome chromium-browser chromium].freeze

# Add a URL here when you want a local live-preview snapshot for a page whose
# domain is marked blocked in _data/live-link-domains.json.
URLS = [
  "https://www.research.samsung.com/",
  # openreview.net returns a bot-challenge (403 "ChallengeRequiredError") to
  # any plain HTTP client, API included - a real browser may get through
  # where scraping/API access cannot.
  "https://openreview.net/forum?id=O3Y56aqpChA"
].freeze

def chrome_bin
  ENV["CHROME_BIN"] || CHROME_CANDIDATES.find { |bin| system("which #{bin} > /dev/null 2>&1") }
end

def slug_for(url)
  Digest::SHA1.hexdigest(url)[0, 16]
end

def dump_dom(bin, url, out_path)
  ok = system(bin, "--headless=new", "--disable-gpu", "--no-sandbox",
              "--virtual-time-budget=15000", "--dump-dom", url,
              out: out_path, err: File::NULL)
  ok && File.size?(out_path).to_i > 0
end

# `--dump-dom` exits 0 and happily writes a full HTML document even when the
# navigation itself failed - Chrome just serializes its own built-in
# network-error page (e.g. a real "www.research.samsung.com's DNS address
# could not be found" page got committed as if it were a real snapshot before
# this check existed), or a bot-challenge interstitial (openreview.net served
# "Verifying your browser" instead of the real page to a plain scraper).
# Detect both and reject rather than archive garbage.
def navigation_failed?(html)
  html.include?('"errorCode":') || html.include?("chrome-error://") ||
    html =~ /<title>[^<]*(can.t be reached|ERR_[A-Z_]+)/i ||
    html =~ /<title>[^<]*(verifying your browser|just a moment|attention required|access denied|checking your browser)/i
end

# relative asset/link URLs in the dumped HTML need to resolve against the
# ORIGINAL page, not our own origin - inject a <base> tag to make that happen.
# This also happens to be why the archived copy isn't blocked by the original
# site's X-Frame-Options/CSP: those are response headers from the original
# server, which we are no longer the one sending.
def rebase(out_path, url)
  html = File.read(out_path, encoding: "UTF-8")
  base_tag = "<base href=\"#{url}\">"
  html = if html =~ /<head[^>]*>/i
           html.sub(/<head[^>]*>/i) { |m| "#{m}#{base_tag}" }
         else
           base_tag + html
         end
  File.write(out_path, html)
end

def main
  bin = chrome_bin
  abort "No Chrome/Chromium binary found (set CHROME_BIN to its path)" unless bin

  manifest = File.exist?(MANIFEST_FILE) ? JSON.parse(File.read(MANIFEST_FILE)) : {}
  new_urls = URLS.reject { |u| manifest.key?(u) }
  FileUtils.mkdir_p(ARCHIVE_DIR)

  puts "#{URLS.size} archived URLs configured (#{new_urls.size} new)."

  new_urls.each do |url|
    slug = slug_for(url)
    out_path = File.join(ARCHIVE_DIR, "#{slug}.html")
    print "Archiving #{url} ... "

    unless dump_dom(bin, url, out_path)
      File.delete(out_path) if File.exist?(out_path)
      puts "failed (chrome couldn't run)"
      next
    end

    if navigation_failed?(File.read(out_path, encoding: "UTF-8"))
      File.delete(out_path)
      puts "failed (chrome hit a network/DNS error reaching the page)"
      next
    end

    rebase(out_path, url)
    manifest[url] = "/assets/archive/#{slug}.html"
    puts "ok -> #{manifest[url]}"
  end

  File.write(MANIFEST_FILE, JSON.pretty_generate(manifest.sort.to_h))
  puts "Wrote #{manifest.size} entries to #{MANIFEST_FILE}"
end

main if __FILE__ == $PROGRAM_NAME
