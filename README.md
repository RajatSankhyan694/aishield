# AIShield - AI Content Detector & Humanizer

A powerful web application that detects AI-generated content and transforms it into human-like text instantly.

## Features

- **AI Content Detection**: Uses RoBERTa ML model to analyze text for AI-generated patterns
- **Text Humanization**: Powered by Groq's LLaMA model to rewrite detected AI content naturally
- **Privacy-First**: Content is only sent to Groq for rewriting—no storage or tracking
- **Real-time Scanning**: Instant analysis with progress tracking
- **Client-Side Processing**: All detection runs locally before humanization

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **ML Detection**: RoBERTa (via Transformers.js)
- **LLM API**: Groq (LLaMA model)
- **Hosting**: Azure Static Web Apps

## Getting Started

### Prerequisites

- A Groq API key (get one free at [console.groq.com](https://console.groq.com))
- For deployment: Azure subscription and GitHub account

### Local Development

1. Clone the repository
2. Open `index.html` in a browser
3. Enter your Groq API key
4. Paste text to detect and humanize

## Deployment

### Azure Static Web Apps (Recommended)

This project is configured for automatic deployment on Azure Static Web Apps with GitHub Actions.

#### Setup Steps:

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: AIShield deployment"
   git remote add origin https://github.com/YOUR_USERNAME/aishield.git
   git branch -M main
   git push -u origin main
   ```

2. **Create Azure Static Web App**
   - Visit [Azure Portal](https://portal.azure.com)
   - Create a new "Static Web App" resource
   - Link your GitHub repository
   - Select `main` branch
   - Build configuration: Leave defaults (app location: `/`)

3. **Or Deploy via Azure CLI**
   ```bash
   az staticwebapp create \
     --name aishield-prod-swa \
     --resource-group rg-aishield \
     --repo-url https://github.com/YOUR_USERNAME/aishield \
     --repo-token YOUR_GITHUB_TOKEN \
     --branch main \
     --location eastus
   ```

4. **Or Deploy via Bicep**
   ```bash
   az deployment group create \
     --resource-group rg-aishield \
     --template-file infra/main.bicep \
     --parameters infra/parameters.json \
     --parameters repositoryUrl=https://github.com/YOUR_USERNAME/aishield repositoryToken=YOUR_TOKEN
   ```

## Configuration

### GitHub Actions Secret

The GitHub Actions workflow requires:
- `AZURE_STATIC_WEB_APPS_API_TOKEN`: Generated automatically when connecting repo in Azure Portal

### Static Web App Configuration

The `staticwebapp.config.json` handles:
- Routing (SPA mode with fallback to index.html)
- MIME types
- Response overrides for 404 errors
- Authentication providers (GitHub)

## Environment Variables

No server-side environment variables needed. The app stores the Groq API key in browser localStorage.

## Architecture

```
Client Browser
    ↓
[Detection: Transformers.js + RoBERTa]
    ↓ (if AI detected)
[Call Groq API: LLaMA Humanization]
    ↓
Results Display
```

## Security & Privacy

- API keys are stored locally in browser storage only
- No backend server—direct API calls from client
- Content for humanization is only sent to Groq
- No analytics or tracking implemented

## Performance

- First load: ~2-3s (RoBERTa model download, ~150MB)
- Subsequent loads: Instant (cached)
- Detection: 1-3s per text
- Humanization: 3-5s via Groq

## Contributing

Contributions welcome! Feel free to submit issues or PRs.

## License

MIT

## Support

For issues or questions, please open a GitHub issue or check the [Groq API documentation](https://console.groq.com/docs).
