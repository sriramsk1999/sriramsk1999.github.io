#!/usr/bin/env ruby
# Scans site content for external links, fetches title/description/favicon for any
# not already cached, and merges the result into _data/link-metadata.json (which
# Jekyll loads as site.data['link-metadata'] and _includes/scripts.html embeds
# inline for assets/js/popovers.js to read).
#
# Run manually: ruby _scripts/fetch_link_metadata.rb
# Also run in CI (see .github/workflows/deploy.yml) before `jekyll build`, so
# newly-added links pick up metadata automatically. Existing entries are never
# re-fetched, so this stays fast and doesn't hammer external sites on every build.

require "net/http"
require "uri"
require "json"
require "nokogiri"
require "fileutils"
require "yaml"

ROOT = File.expand_path("..", __dir__)
DATA_FILE = File.join(ROOT, "_data", "link-metadata.json")
CONTENT_DIRS = %w[_posts _pages _publications _talks _mlmonad].map { |d| File.join(ROOT, d) }
USER_AGENT = "Mozilla/5.0 (compatible; sriramsk1999.github.io-linkbot/1.0; +https://sriramsk1999.github.io)".freeze
TIMEOUT_SECONDS = 8
MAX_FIELD_LENGTH = 300
MAX_REDIRECTS = 4

LINK_RE = /\[[^\]]*\]\((https?:\/\/[^\s)]+)\)|href=["'](https?:\/\/[^"']+)["']/.freeze

def collect_urls
  urls = []
  CONTENT_DIRS.each do |dir|
    next unless Dir.exist?(dir)
    Dir.glob(File.join(dir, "**", "*")).each do |path|
      next unless File.file?(path) && path =~ /\.(md|markdown|html)\z/
      text = File.read(path, encoding: "UTF-8")
      text.scan(LINK_RE) do |md, html|
        url = md || html
        urls << url if url
      end
    end
  end
  (urls + social_profile_urls).uniq
end

# The sidebar's social icons (github/linkedin/twitter/...) are built by
# _includes/author-profile.html from _config.yml's `author:` block, so their
# URLs never appear literally in any content file for collect_urls to find.
# Mirror that same URL-building logic here.
def social_profile_urls
  config = YAML.load_file(File.join(ROOT, "_config.yml"))
  author = config["author"] || {}
  urls = []
  urls << author["uri"]
  urls << author["arxiv"]
  urls << author["googlescholar"]
  urls << author["semantic"]
  urls << author["impactstory"]
  urls << author["orcid"]
  urls << author["pubmed"]
  urls << "https://www.researchgate.net/profile/#{author['researchgate']}" if author["researchgate"]
  urls << "https://github.com/#{author['github']}" if author["github"]
  urls << "https://www.linkedin.com/in/#{author['linkedin']}" if author["linkedin"]
  urls << "https://twitter.com/#{author['twitter']}" if author["twitter"]
  urls.compact.select { |u| u.to_s.start_with?("http") }
end

def sanitize(str)
  return nil if str.nil?
  cleaned = str.gsub(/[\r\n\t]+/, " ").gsub(/\s+/, " ").strip
  cleaned = cleaned.gsub(%r{</?script}i, "") # defense in depth, on top of the Liquid-side escape at embed time
  cleaned.empty? ? nil : cleaned[0, MAX_FIELD_LENGTH]
end

def fetch(url, redirects_left = MAX_REDIRECTS)
  return nil if redirects_left <= 0
  uri = URI.parse(url)
  return nil unless uri.is_a?(URI::HTTP)

  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = (uri.scheme == "https")
  http.open_timeout = TIMEOUT_SECONDS
  http.read_timeout = TIMEOUT_SECONDS

  request = Net::HTTP::Get.new(uri)
  request["User-Agent"] = USER_AGENT
  response = http.request(request)

  case response
  when Net::HTTPRedirection
    location = response["location"]
    return nil unless location
    fetch(URI.join(uri, location).to_s, redirects_left - 1)
  when Net::HTTPSuccess
    return nil unless response["content-type"].to_s.include?("html")
    response.body
  end
rescue StandardError
  nil
end

def resolve(base_url, href)
  URI.join(base_url, href).to_s
rescue StandardError
  nil
end

def extract_metadata(url, html)
  doc = Nokogiri::HTML(html)

  title = doc.at_css('meta[property="og:title"]')&.attr("content") ||
          doc.at_css("title")&.text
  description = doc.at_css('meta[property="og:description"]')&.attr("content") ||
                doc.at_css('meta[name="description"]')&.attr("content")
  favicon_href = doc.at_css('link[rel="icon"]')&.attr("href") ||
                 doc.at_css('link[rel="shortcut icon"]')&.attr("href")

  {
    "title" => sanitize(title),
    "description" => sanitize(description),
    "favicon" => favicon_href ? resolve(url, favicon_href) : nil
  }.compact
end

def save(data)
  FileUtils.mkdir_p(File.dirname(DATA_FILE))
  File.write(DATA_FILE, JSON.pretty_generate(data.sort.to_h))
end

def main
  existing = File.exist?(DATA_FILE) ? JSON.parse(File.read(DATA_FILE)) : {}
  urls = collect_urls
  new_urls = urls.reject { |u| existing.key?(u) }

  puts "#{urls.size} external links found (#{new_urls.size} new)."

  new_urls.each_with_index do |url, i|
    print "Fetching #{url} ... "
    html = fetch(url)
    if html.nil?
      puts "skip (unreachable or non-HTML)"
      next
    end

    meta = extract_metadata(url, html)
    if meta["title"].nil? && meta["description"].nil?
      puts "skip (no usable metadata)"
      next
    end

    existing[url] = meta
    puts "ok"
    save(existing) if (i + 1) % 10 == 0 # checkpoint periodically so a slow/interrupted run doesn't lose progress
  end

  save(existing)
  puts "Wrote #{existing.size} entries to #{DATA_FILE}"
end

main if __FILE__ == $PROGRAM_NAME
