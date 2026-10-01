# Lista da Avó

A real-time collaborative shopping-list **PWA** designed for family use.

The application lets multiple family members build the weekly shopping list together, track items while shopping and keep a reusable history of previous purchases.

## Highlights

- Shared shopping lists
- Real-time synchronization
- Product categories
- Quantity controls
- Frequently purchased items
- Duplicate protection
- Shopping history
- Repeat previous shopping list
- Product search through Open Food Facts
- Installable PWA

## Tech stack

- HTML
- CSS
- JavaScript
- Supabase
- PostgreSQL
- Supabase Realtime
- Open Food Facts API
- GitHub Pages

## How it works

A family creates or joins a shared space using a family identifier. Everyone connected to that family sees the same shopping list and receives updates in real time.

Items can be:

- categorized
- assigned quantities
- marked as collected
- reused from previous shopping sessions
- promoted to frequently purchased products

The backend also prevents duplicate active products at database level.

## Product data

Product search uses the **Open Food Facts** API to retrieve information such as:

- product name
- brand
- image
- barcode

The project can also integrate with Open Prices data where coverage is available.

## Architecture

**Frontend**
- static PWA
- mobile-first shopping workflow
- offline-capable application shell

**Backend**
- Supabase database
- Realtime subscriptions
- relational shopping history
- family-scoped data

## Setup

1. Create a Supabase project.
2. Run `supabase.sql` in the SQL Editor.
3. Configure the public Supabase URL and anon key.
4. Deploy the repository through GitHub Pages.

## Security

The current model uses a non-guessable family identifier to scope shared data.

For more sensitive use cases, the architecture can be upgraded to Supabase Auth with policies based on authenticated user IDs.
