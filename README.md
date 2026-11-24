# FoodBridge

FoodBridge is a surplus food redistribution platform connecting commercial donors, local NGOs, and volunteer couriers to eliminate food waste and fight food insecurity.

## Quick Start

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run test suite
npm test

# Build for production
npm run build
```

## Map Setup

FoodBridge uses [Leaflet](https://leafletjs.com/) with CARTO Voyager raster basemap tiles for interactive donor discovery and courier delivery tracking. CARTO basemap tiles require a free API key.

### 1. Where to Get a CARTO API Key
1. Sign up for a free account at [CARTO](https://carto.com).
2. In your CARTO dashboard, navigate to **Developers** > **API Keys**.
3. Create or copy your public API key for raster basemap tiles.

### 2. Environment Variable Configuration
Create a `.env.local` file in the root of the project (this file is excluded from Git):

```bash
VITE_CARTO_API_KEY=your_carto_api_key_here
```

Restart your Vite development server (`npm run dev`) after creating or modifying `.env.local`.

> **Note:** If `VITE_CARTO_API_KEY` is not provided, the application will display a small, theme-consistent notice inside the map container (`"Map tiles need a CARTO API key — see README"`) and render all markers and routes on a clean canvas without requesting broken tiles.

### 3. Restricting Your API Key
For security and quota protection, restrict your API key in the CARTO dashboard:
- **Allowed HTTP Referrers / Domains**:
  - `http://localhost:*` (or `http://localhost:5173`) for local development
  - `https://your-production-domain.com/*` for production deployments

### 4. Setting the Variable in Hosting Dashboards
When deploying to hosting providers (such as Vercel, Netlify, or Cloudflare Pages):
1. Navigate to your project settings in the hosting provider's dashboard.
2. Go to the **Environment Variables** section.
3. Add a new variable:
   - **Key**: `VITE_CARTO_API_KEY`
   - **Value**: Your restricted CARTO API key
4. Trigger a new deployment for the changes to take effect.
