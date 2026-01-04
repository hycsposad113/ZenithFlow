<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ZenithFlow

This project is a React application built with Vite. It contains everything you need to run your app locally and deploy it online.

View your app in AI Studio: https://ai.studio/apps/drive/1SVQ1njcI_ibnZQkAVxfPl3wx9yL2OfOY

## 🚀 Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Run Locally

1. Create a `.env` file in the root directory and add your API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
   *(Note: The `vite.config.ts` maps this to the application, so no `VITE_` prefix is needed here)*

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

## 📦 Build and Deployment

### Build Locally

To build the project for production:

```bash
npm run build
```

The output will be in the `dist` folder.

### 🌐 Deploy to GitHub Pages

This project is configured with a GitHub Action to automatically deploy to GitHub Pages when you push to the `main` branch.

**Setup Steps:**

1. Go to your repository **Settings**.
2. Navigate to **Pages** sidebar menu.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. Push your code to `main`.
5. The specific workflow defined in `.github/workflows/deploy.yml` will trigger, build the app, and deploy it.

## 🛡️ Project Structure

- `src/`: Source code
- `.github/workflows`: CI/CD configurations
- `.gitignore`: Configured to ignore system files, logs, and sensitive environment variables.

## 📄 License

[MIT](LICENSE)
