# Reka Vision Integration

## Overview

Reka Vision is a multimodal AI that analyzes images and video. We use it to analyze screenshots captured during Yutori browsing agent trajectories, detecting phishing pages, dark web forum content, and malware C2 panels.

## Why Reka Vision?

1. **Natural fit** — Yutori browsing trajectories already capture `screenshot_url` at each step
2. **Phishing detection** — Visual analysis catches phishing that text-only analysis misses
3. **Dark web analysis** — Forum screenshots reveal threat intelligence that can't be scraped as text
4. **Malware panel identification** — C2 panels have distinctive visual signatures

## Integration Points

### 1. Pipeline Step 2.5: Automatic Screenshot Analysis

After Tavily enrichment and before deep extraction, the pipeline checks for screenshot URLs in the scout update data. Any screenshots are analyzed by Reka for threat indicators.

### 2. Trajectory Bulk Analysis (`/api/reka/trajectory-analyze`)

When viewing a Yutori browsing investigation, the system can analyze all screenshots in the trajectory at once:

```
Yutori Trajectory -> [Step 1: screenshot_url] -> Reka Analysis -> phishing? indicators? entities?
                  -> [Step 2: screenshot_url] -> Reka Analysis -> ...
                  -> [Step N: screenshot_url] -> Reka Analysis -> ...
                  -> Aggregate Summary
```

### 3. TrajectoryViewer UI Integration

Each trajectory step with a screenshot gets an "Analyze with Reka" button. Results display inline:
- Risk level badge (color-coded)
- Phishing confidence percentage
- Threat indicators list
- Extracted entities

### 4. Dashboard Sponsors Tab

The Vision Analysis panel shows the most recent Reka analysis with screenshot thumbnail, risk assessment, and findings.

## Analysis Types

### Phishing Detection
Prompt focuses on:
- Suspicious URLs and domain spoofing
- Fake login forms mimicking legitimate services
- Brand impersonation indicators
- Urgency tactics and social engineering
- Certificate mismatches
- Poor grammar / localization artifacts

### Dark Web Forum Analysis
Extracts from forum screenshots:
- Threat actor handles and aliases
- Malware names and versions
- CVE references being discussed
- Target organizations mentioned
- Attack techniques described

### Malware Panel Identification
Identifies from C2 panel screenshots:
- Malware family and variant
- C2 infrastructure indicators
- Victim statistics and geography
- Campaign operational details

## API Reference

### `POST /api/reka/analyze`
```json
{
  "imageUrl": "https://example.com/screenshot.png",
  "analysisType": "phishing",  // optional: phishing, forum, malware, general
  "context": "Found during NVD monitoring"  // optional
}
```

Response:
```json
{
  "success": true,
  "analysis": {
    "imageUrl": "...",
    "analysisType": "phishing",
    "isPhishing": true,
    "confidence": 0.92,
    "riskLevel": "critical",
    "indicators": ["Fake Microsoft login", "Suspicious domain"],
    "entitiesFound": [{"type": "Organization", "name": "Microsoft"}],
    "summary": "High-confidence phishing page...",
    "model": "reka-flash"
  }
}
```

### `POST /api/reka/trajectory-analyze`
```json
{
  "taskId": "yutori-task-id-here"
}
```

## Configuration

```env
REKA_API_KEY=<from_hackathon>
```
