# AGBank - Modern Banking Platform

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Setup

Before running the application, you need to set up your environment variables. Create a `.env.local` file in the root directory with the following variables:

```bash
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=your_appwrite_endpoint_here
NEXT_PUBLIC_APPWRITE_PROJECT=your_project_id_here
NEXT_APPWRITE_KEY=your_api_key_here

# Appwrite Database IDs
APPWRITE_DATABASE_ID=your_database_id_here
APPWRITE_TRANSACTION_COLLECTION_ID=your_transaction_collection_id_here
APPWRITE_BANK_COLLECTION_ID=your_bank_collection_id_here
APPWRITE_USER_COLLECTION_ID=your_user_collection_id_here

# Plaid Configuration
PLAID_CLIENT_ID=your_plaid_client_id_here
PLAID_SECRET=your_plaid_secret_here

# Dwolla Configuration (if using Dwolla for transfers)
DWOLLA_CLIENT_ID=your_dwolla_client_id_here
DWOLLA_CLIENT_SECRET=your_dwolla_client_secret_here
DWOLLA_ENVIRONMENT=sandbox

# Sentry Configuration (optional)
SENTRY_DSN=your_sentry_dsn_here
```

### Required Appwrite Setup:

1. **Create a Database** in your Appwrite console
2. **Create Collections** for:
   - Users
   - Banks
   - Transactions
3. **Get your Project ID** from the Appwrite console
4. **Create an API Key** with the necessary permissions
5. **Update the environment variables** with your actual values

## Getting Started

First, set up your environment variables as described above, then run the development server:

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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
