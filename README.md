
# Intercen Website

## Overview

Intercen Website is a modern web application for managing and selling books, digital content, and related services. It provides features for users to browse products, manage carts, checkout, view profiles, and for admins to manage content and users. The system is designed for scalability, security, and ease of use, leveraging cloud backend functions and a modular frontend architecture.

## Key Features

- Book and content catalog with search and detail views
- Shopping cart and checkout with payment integration (Paystack)
- User authentication and profile management
- Content upload, update, versioning, and publishing
- Admin tools for content and user management
- Responsive UI with modern design

## Technologies Used

- **Vite** – Fast build tool and dev server
- **TypeScript** – Type-safe development
- **React** – Component-based UI
- **Tailwind CSS** – Utility-first styling
- **shadcn-ui** – UI components
- **Supabase** – Backend functions, authentication, and database

## Project Structure

- `src/` – Main application source code
	- `components/` – Reusable UI and feature components
	- `contexts/` – React context providers (e.g., cart)
	- `data/` – Mock data and static resources
	- `hooks/` – Custom React hooks
	- `lib/` – Utility libraries and API clients
	- `pages/` – Route-based pages (e.g., Books, Cart, Profile)
	- `types/` – TypeScript type definitions
- `public/` – Static assets
- `supabase/` – Edge functions and backend logic
- `migrations/` – Database schema migrations
- Config files: Vite, Tailwind, ESLint, PostCSS, etc.

## Getting Started

### Prerequisites

- Node.js & npm (recommended to use [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd intercen-website

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000` (or as shown in your terminal).

### Editing and Contributing

- Use your preferred IDE (VS Code recommended)
- Edit files in the `src/` directory for frontend changes
- Backend logic is in `supabase/functions/`
- Type definitions are in `types/`
- Push changes to your branch; use pull requests for collaboration

### Deployment

- Deploy via [Vercel](https://vercel.com/) or your preferred platform
- For Lovable users, use the Lovable dashboard to publish and manage your project

### Custom Domain

You can connect a custom domain via your deployment platform or through Lovable (see their docs for details).

## System Overview

The Intercen Website is designed to:

- Allow users to discover, purchase, and manage books and digital content
- Provide secure authentication and payment processing
- Enable content creators and admins to manage and publish content
- Support scalable backend operations using Supabase edge functions

## Useful Links

- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [shadcn-ui Documentation](https://ui.shadcn.com/)

---

For questions or support, please contact the repository owner or open an issue.
