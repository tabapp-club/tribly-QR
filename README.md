# Tribly QR

This is a [Next.js](https://nextjs.org/) project bootstrapped with TypeScript, Tailwind CSS, ESLint, and [shadcn/ui](https://ui.shadcn.com/).

## Getting Started

### Prerequisites

1. **Google Places API Key** (Required for business search functionality)
   - Get your API key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Enable the following APIs:
     - Places API
     - Places API (New)
   - Create a `.env.local` file in the root directory:
     ```env
     NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
     ```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## Project Structure

- `src/app/` - App Router directory containing pages and layouts
- `src/components/ui/` - shadcn/ui components (Button, Card, etc.)
- `src/components/` - Reusable feature components that compose shadcn components
- `src/lib/` - Utility functions (including `cn` for className merging)
- `public/` - Static assets

## Component Library: shadcn/ui

This project uses **shadcn/ui** as the exclusive component library. All UI components should be built using shadcn components.

### Adding New Components

To add new shadcn components, use the CLI:

```bash
npx shadcn@latest add [component-name]
```

For example:
```bash
npx shadcn@latest add input
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
```

### Component Reuse Guidelines

**✅ Always:**
- Import and reuse shadcn components from `@/components/ui`
- Use the index file for cleaner imports: `import { Button, Card } from "@/components/ui"`
- Compose shadcn components to create feature-specific components
- Check existing components before creating new ones

**❌ Never:**
- Create duplicate button/card/input components - use shadcn components
- Import from other component libraries (Material-UI, Ant Design, etc.)
- Duplicate component logic - always check if a shadcn component exists first

### Example Usage

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Feature</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  );
}
```

See `src/components/README.md` for more detailed component reuse guidelines.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library built on Radix UI and Tailwind CSS
- **ESLint** - Code linting

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [shadcn/ui Documentation](https://ui.shadcn.com/) - component library documentation
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - utility-first CSS framework

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
