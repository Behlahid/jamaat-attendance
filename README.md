# Jamaat Attendance

A modern web application for managing attendance at community events, built with **Next.js 16** and **React**. The app supports admin‑only event creation, scanner registration, and a simple self‑service attendance‑tracking interface.

---

## ✨ Features
- **Admin dashboard** for managing events, members, scanners, and settings.
- **First‑time admin setup** with automatic role detection.
- **Dynamic lazy‑loading** of heavy components (`Modal`, `Skeleton`, `Toast`) to reduce initial bundle size.
- **Progressive Web App (PWA)‑ready** – includes install‑prompt component.
- **Secure authentication** using Supabase.
- **Responsive UI** with a sleek dark‑mode ready design.
- **Bundle analysis** support via `@next/bundle-analyzer` (Webpack mode).
- **Comprehensive unit tests** using Jest & React Testing Library.

---

## 🛠️ Tech Stack
| Category | Technologies |
|----------|---------------|
| **Framework** | Next.js 16 (Turbopack) |
| **Language** | JavaScript (ES2024), JSX |
| **UI Library** | React 19, Lucide‑React icons |
| **Styling** | Tailwind‑CSS (via globals.css) – vanilla CSS utilities |
| **Authentication / DB** | Supabase (client & SSR) |
| **Testing** | Jest, React Testing Library, @testing-library/jest-dom, @testing-library/user-event |
| **Bundling / Analysis** | `@next/bundle-analyzer` (Webpack mode) |
| **Tooling** | ESLint, Prettier, Babel (for Jest) |

---

## 📦 Installation
```bash
# Clone the repository
git clone <repo‑url>
cd "Jamaat Attendance"

# Install dependencies (includes dev‑deps for testing and bundle analysis)
npm install
```

### Optional: Resolve reported vulnerabilities
```bash
npm audit fix --force   # use with caution – may introduce breaking changes
```

---

## ⚙️ Environment Variables
Create a `.env.local` file at the project root with the following keys:
```dotenv
NEXT_PUBLIC_SUPABASE_URL=<your‑supabase‑project‑url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your‑supabase‑anon‑key>
# Optional – enable bundle analysis (Webpack mode only)
ANALYZE=true
```
> **Note:** The app also reads any standard Next.js env variables (e.g., `NEXT_PUBLIC_…`).

---

## 🚀 Deployment
The app can be deployed to any platform that supports Node.js (Vercel, Netlify, Railway, etc.). Below is a Vercel‑focused guide.

1. **Push to Git** – Ensure your repository is connected to Vercel.
2. **Configure Build Settings**
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`
   - **Environment Variables:** Add the same variables you placed in `.env.local`.
3. **Enable Bundle Analyzer (optional)**
   - In Vercel's environment variables, set `ANALYZE=true`.
   - Set the **Build Command** to `npm run build -- --webpack` to use the Webpack analyzer.
4. **Deploy** – Vercel will automatically build and serve the application.

### Self‑Hosted (Docker)
```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG ANALYZE=false
ENV ANALYZE=$ANALYZE
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "server.js"]
```
```bash
# Build & run
docker build -t jamaat-attendance .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  jamaat-attendance
```
---

## 🧪 Testing
```bash
# Run the Jest test suite
npm test
```
All tests are located under `src/app/**/__tests__` and cover edge‑cases, missing data, and unexpected inputs.

---

## 📄 License
This project is licensed under the MIT License.

---

*Made with ❤️ by **RAJINFOSYS PRODUCTIONS** – © 2026 Jamaat Attendance App*
