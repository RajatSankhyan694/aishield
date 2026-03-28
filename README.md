# AIShield - AI Content Detector & Humanizer

A powerful web application that detects AI-generated content and transforms it into human-like text instantly.

## Features

- **AI Content Detection**: Uses RoBERTa ML model to analyze text for AI-generated patterns
- **Text Humanization**: Powered by Groq's LLaMA model to rewrite detected AI content naturally
- **Privacy-First**: Content is only sent to Groq for rewriting—no storage or tracking
- **Real-time Scanning**: Instant analysis with progress tracking
- **Progress Bar Loader**: Visual feedback with color-changing progress (Red → Yellow → Green)
- **Client-Side Processing**: All detection runs locally before humanization

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **ML Detection**: RoBERTa (via Transformers.js)
- **LLM API**: Groq (LLaMA model)
- **Hosting**: GitHub Pages
- **Model CDN**: Hugging Face (Transformers.js)

## Getting Started

### Prerequisites

- A Groq API key (get one free at [console.groq.com](https://console.groq.com))

### Live Application

**Visit:** [https://rajatsankhyan694.github.io/aishield/](https://rajatsankhyan694.github.io/aishield/)

1. Open the link above
2. Enter your Groq API key in the top-right
3. Paste text to detect and humanize
4. Watch the progress bar as the model downloads on first load

### Local Development

1. Clone the repository
   ```bash
   git clone https://github.com/RajatSankhyan694/aishield.git
   cd aishield
   ```
2. Open `index.html` in a browser
3. Enter your Groq API key
4. Paste text to detect and humanize

## Deployment

### GitHub Pages (Live)

The app is automatically deployed to GitHub Pages whenever you push to the `main` branch.

**Live URL:** [https://rajatsankhyan694.github.io/aishield/](https://rajatsankhyan694.github.io/aishield/)

#### To Deploy Your Own Fork:

1. **Fork the repository**
   - Visit [https://github.com/RajatSankhyan694/aishield](https://github.com/RajatSankhyan694/aishield)
   - Click "Fork"

2. **Enable GitHub Pages**
   - Go to **Settings → Pages**
   - Select **Deploy from a branch**
   - Choose **main** branch and **/ (root)** folder
   - Click **Save**

3. **Wait for deployment** (1-2 minutes)
   - Your app will be live at: `https://YOUR_USERNAME.github.io/aishield/`

#### To Push Updates:

```bash
git add .
git commit -m "Your feature description"
git push origin main
```

GitHub Pages automatically redeploys on every push to `main`.

## Configuration

**No build step or server needed!** This is a static web application.

- The Groq API key is stored in browser localStorage (never sent to servers)
- The `staticwebapp.config.json` handles SPA routing with fallback to `index.html`
- Model is cached after first download (stored in browser cache)

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

- **First load**: ~30-50s (RoBERTa model download, ~50MB quantized)
  - Visual progress bar shows download status
  - Color transitions: Red (0%) → Yellow (50%) → Green (100%)
- **Subsequent loads**: Instant (cached in browser)
- **Detection**: 1-3s per text
- **Humanization**: 3-5s via Groq

## Contributing

Contributions welcome! Feel free to submit issues or PRs.

## License

MIT

## Troubleshooting

**"Model download is slow"**
- First download: ~30-50s for the 50MB model
- Watch the progress bar for real-time feedback
- Subsequent visits: instant (cached)

**"Groq API error"**
- Verify your API key at [console.groq.com](https://console.groq.com)
- Check that the key starts with `gsk_`
- Ensure the key has the `keys.read` permission

**"Detection not working"**
- Open browser DevTools (F12) and check the Console tab
- Ensure you have at least 30 words of text
- Try refreshing the page if the model fails to load

## Support

For issues or questions, please:
- Open a [GitHub issue](https://github.com/RajatSankhyan694/aishield/issues)
- Check the [Groq API documentation](https://console.groq.com/docs)
- Review [Transformers.js docs](https://github.com/xenova/transformers.js)
