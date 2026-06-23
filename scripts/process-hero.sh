#!/bin/bash
# process-hero.sh — Run once after pulling a new hero clip or project reel.
# Output: public/videos/hero_intro.mp4 and public/videos/frames/projects/*.jpg

set -e

# Go to repository root
cd "$(dirname "$0")/.."

echo "Processing hero video: removing KlingAI watermark..."
# Remove KlingAI 3.0 watermark using FFmpeg content-aware delogo filter
# Video dimensions: 1280x720. Watermark is in the bottom-right.
ffmpeg -y -i New_hero_intro.mp4 \
  -vf "delogo=x=1090:y=668:w=170:h=36:show=0" \
  -c:v libx264 -crf 18 -preset slow \
  -movflags +faststart \
  -an \
  public/videos/hero_intro.mp4

echo "Hero video processed successfully!"

echo "Extracting project hologram frames..."
mkdir -p public/videos/frames/projects
ffmpeg -y -i "Extra Animation.mp4" \
  -vf "scale=640:-1" \
  -q:v 2 \
  public/videos/frames/projects/%03d.jpg
echo "Hologram frames extracted!"

