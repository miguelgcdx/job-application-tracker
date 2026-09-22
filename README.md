# Job Application Tracker

A full-stack job application tracking system built with Next.js, featuring a Kanban board interface for managing your job search. This project is part of a YouTube tutorial series where you'll learn how to build this application step by step.

Explore the code with the [Architecture and learning guide](docs/architecture-and-learning-guide.md).

## 🎥 Tutorial

This project accompanies a YouTube tutorial series. Follow along to learn how to build a complete job application tracker with authentication, drag-and-drop functionality, and real-time updates.

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Database**: MongoDB with Mongoose
- **Authentication**: Better Auth
- **Drag & Drop**: dnd-kit
- **UI Components**: Radix UI
- **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites

- Node.js 22.x installed (`.node-version`; supported range: `>=22 <23`)
- MongoDB replica set or sharded deployment with transaction support
  (standalone MongoDB servers are not supported)
- pnpm 12.4.1

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd job-application-tracker
```

2. Install dependencies:

```bash
pnpm install --frozen-lockfile
```

3. Supply the variables in the [environment contract](#-environment-variables)
through your local process environment or approved secret manager. Do not commit
credentials. This README is the environment template; no environment file is
required to document the contract.

4. Run the development server:

```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📚 Tutorial: Building the Application

This section walks you through the key parts of the codebase and how they work together.

### 1. Database Setup (`lib/db.ts`)

The database connection uses a caching pattern to prevent multiple connections in development:

```typescript
// Connection is cached globally to prevent multiple connections
let cached: MongooseCache = global.mongoose || { conn: null, promise: null };
```

**Key Concepts:**

- Global caching prevents connection issues during hot reloads
- Connection reuse improves performance
- Error handling ensures graceful failures

### 2. Data Models (`lib/models/`)

The application uses three main models with relationships:

**Board Model** (`board.ts`):

- Represents a user's job hunt board
- Contains references to columns
- The app uses a default "Job Hunt" board; the schema does not enforce one board per user

**Column Model** (`column.ts`):

- Represents Kanban columns (Wish List, Applied, Interviewing, etc.)
- Contains references to job applications
- Has an `order` field for sorting

**JobApplication Model** (`job-application.ts`):

- Stores individual job application data
- References both column and board
- Includes fields like company, position, location, salary, tags, etc.

**Relationship Structure:**

```
Board (1) → (many) Columns → (many) JobApplications
```

### 3. Authentication (`lib/auth/auth.ts`)

Better Auth is configured with MongoDB adapter:

```typescript
export const auth = betterAuth({
  database: mongodbAdapter(db, { client }),
  emailAndPassword: { enabled: true },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Attempt default-board initialization after account creation
          await initializeUserBoard(user.id);
        },
      },
    },
  },
});
```

**Key Features:**

- Email/password authentication
- Default-board initialization attempted on signup (not transactional or concurrency-safe)
- Session management with cookie caching

### 4. Server Actions (`lib/actions/job-applications.ts`)

Server actions handle all data mutations:

**createJobApplication:**

- Validates user session
- Verifies board and column ownership
- Calculates order for new job
- Updates column references

**updateJobApplication:**

- Handles moving jobs between columns
- Manages order updates with gap strategy (multiples of 100)
- Shifts other jobs when reordering

**deleteJobApplication:**

- Removes job from database
- Cleans up column references
- Revalidates cache

**Key Pattern:**

- All actions check authentication
- Ownership verification prevents unauthorized access
- `revalidatePath` ensures UI updates after mutations

### 5. Drag & Drop Implementation (`components/kanban-board.tsx`)

The Kanban board uses `@dnd-kit` for drag and drop:

**Components:**

- `DndContext`: Main drag and drop context
- `DroppableColumn`: Columns that accept dropped items
- `SortableJobCard`: Individual job cards that can be dragged
- `SortableContext`: Manages sortable items within columns

**Drag Flow:**

1. User starts dragging → `handleDragStart` sets active item
2. User drops → `handleDragEnd` calculates new position
3. Position calculation handles:
   - Dropping on column (appends to end)
   - Dropping on another job (inserts at that position)
   - Moving within same column (reorders)
4. `moveJob` hook updates database

**Key Features:**

- Visual feedback during drag (opacity, overlay)
- Collision detection with `closestCorners`
- Pointer sensor with activation distance to prevent accidental drags

### 6. Client State Management (`lib/hooks/useBoards.ts`)

Custom hook manages board state and provides mutation functions:

**Responsibilities:**

- Maintains local state synchronized with server
- Provides `moveJob` function for drag operations
- Optimistic updates for better UX

### 7. Dashboard Page (`app/dashboard/page.tsx`)

Server component that:

- Fetches user session
- Loads board data with populated relationships
- Uses React Suspense for loading states
- Redirects unauthenticated users

**Data Fetching Pattern:**

```typescript
const boardDoc = await Board.findOne({ userId, name: "Job Hunt" }).populate({
  path: "columns",
  populate: { path: "jobApplications" },
});
```

This single query loads the entire board structure efficiently.

### 8. Seeding the Database (`scripts/seed.ts`)

The seed script populates the database with sample job applications.

**Important Performance Note:**

For the seeding file, **strongly recommend using batch insert** (`await JobApplication.insertMany(applications)`) instead of creating jobs one by one. This reduces the number of round trips to MongoDB and significantly improves performance.

**Current Implementation:**
The current seed script uses sequential writes without rollback. A failure can leave partial data; it is also not optimized for large datasets.

**Recommended Approach:**

```typescript
// Collect all job applications to create
const applicationsToCreate = [];

for (const [columnName, jobs] of Object.entries(jobsByColumn)) {
  const columnId = columnMap[columnName];
  if (!columnId) continue;

  for (let i = 0; i < jobs.length; i++) {
    const jobData = jobs[i];
    applicationsToCreate.push({
      company: jobData.company,
      position: jobData.position,
      // ... other fields
      columnId: columnId,
      boardId: board._id,
      userId: USER_ID,
      status: columnName.toLowerCase().replace(" ", "-"),
      order: i,
    });
  }
}

// Batch insert all applications at once
const createdApplications = await JobApplication.insertMany(
  applicationsToCreate
);

// Then update columns with references
for (const column of columns) {
  const columnApps = createdApplications.filter(
    (app) => app.columnId.toString() === column._id.toString()
  );
  column.jobApplications = columnApps.map((app) => app._id);
  await column.save();
}
```

**Benefits:**

- Fewer round trips for job creation; column-reference saves still require separate writes
- Potentially faster execution with many jobs

Batch insertion alone is not atomic across documents or the later column updates. The example is a performance suggestion, not a rollback guarantee or production-safe seed; related writes would need a shared transaction for atomicity.

### 9. User Board Initialization (`lib/init-user-board.ts`)

When a user signs up, initialization attempts to create a default board with predefined columns:

- Wish List
- Applied
- Interviewing
- Offer
- Rejected

Initialization is not transactional or idempotent under concurrency: simultaneous calls can create duplicates, and failed writes can leave an incomplete board. An existing board is returned without repairing missing columns, so complete initialization is not guaranteed.

## 🎯 Key Learning Points

1. **Server Components vs Client Components**: Understanding when to use each
2. **Server Actions**: Type-safe mutations without API routes
3. **Database Relationships**: Mongoose populate for efficient queries
4. **Drag & Drop**: Implementing complex interactions with dnd-kit
5. **Authentication**: Better Auth integration with database hooks
6. **State Management**: Combining server state with client state
7. **Performance**: Batch operations for database efficiency

## 📝 Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm test` - Run Vitest unit/component tests and mocked integration seams
- `pnpm test:coverage` - Run Vitest with coverage
- `pnpm exec tsc --noEmit --incremental false` - Check TypeScript without build output
- `pnpm test:e2e` - Run Playwright (requires approved browsers, configuration, and isolated services)
- `pnpm seed:jobs` - Seed database with sample jobs (only an explicitly approved non-production database)

## 🔐 Environment Variables

Keep local, Vercel Preview, and Vercel Production configuration separate. Preview
must use an isolated non-production database and matching auth URLs. Configure
secrets through approved secret storage, never in source code or `NEXT_PUBLIC_*`.
No real values are included here.

| Variable | Exposure | Requiredness and purpose | Consumed when |
| --- | --- | --- | --- |
| `MONGODB_URI` | Secret; server only | Required MongoDB connection string. Use a replica set or sharded cluster with transaction support, not standalone MongoDB. | Server runtime **and build**: server auth currently connects at module initialization. |
| `BETTER_AUTH_SECRET` | Secret; server only | Required stable, securely generated auth signing/encryption secret; at least 32 characters. | Server runtime; also provide during build-time auth initialization. |
| `BETTER_AUTH_URL` | Non-secret URL; server configuration | Required auth base URL for the selected environment. Must match the deployed app origin. | Server runtime; also provide during build-time auth initialization. |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Public; browser-visible | Required client auth base URL matching `BETTER_AUTH_URL`. | Inlined at build; used by the browser at runtime. |
| `NEXT_PUBLIC_SENTRY_DSN` | Public; browser-visible, not an upload token | Optional HTTPS Sentry ingestion DSN. Missing/invalid DSN disables SDK initialization. | Inlined at build for browser runtime; also read by server/edge runtime. |
| `SENTRY_ORG` | Non-secret; build-only identifier | Required only for source-map uploads, together with project and token. | Build configuration/upload only. |
| `SENTRY_PROJECT` | Non-secret; build-only identifier | Required only for source-map uploads, together with org and token. | Build configuration/upload only. |
| `SENTRY_AUTH_TOKEN` | Secret; CI/build only | Optional source-map upload credential. Restrict scope; never expose to browser code or application runtime. Uploads are disabled unless org, project, and token are all present. | Build upload only. |
| `SENTRY_RELEASE` | Non-secret; public telemetry label | Optional explicit Sentry release; takes precedence over commit SHA. Use at most 64 letters, digits, dots, underscores, or hyphens, starting with a letter/digit. | Build and server/edge runtime; sanitized label is inlined for the browser. |
| `VERCEL_GIT_COMMIT_SHA` | Non-secret; public release identifier | Vercel-provided Sentry release fallback; structured logs accept only a full 40-character hexadecimal commit SHA. Optional locally. | Build and server/edge runtime. |
| `VERCEL_ENV` | Non-secret; public environment label | Vercel-provided deployment environment (`development`, `preview`, or `production`); optional locally, where `NODE_ENV` is the fallback. | Build and server/edge runtime; bounded label is inlined for browser telemetry. |

`next.config.ts` derives `NEXT_PUBLIC_SENTRY_ENVIRONMENT` and
`NEXT_PUBLIC_SENTRY_RELEASE`; do not supply these separately. Public variables and
derived labels are baked into client bundles: change them through a rebuild and
redeploy. Keep release/environment labels aligned between build and runtime.
Sentry filters event data, disables default PII and replay, and uses bounded trace
sampling; configuration alone does not prove ingestion or source-map resolution.

### Vercel and production checks

Select **Node.js 22.x** in the Vercel project settings. Use pnpm exclusively:

- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Local production server: `pnpm start` (after a successful build)
- CI checks: `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit --incremental false`
- Lockfile consistency: `pnpm install --lockfile-only --frozen-lockfile`
- Authorized isolated browser smoke checks: `pnpm test:e2e`

The current module-level database/auth initialization means a build can require
reachable, appropriately scoped MongoDB and auth configuration; a successful unit
test run is not build or database evidence. Use a transaction-capable isolated
service for previews/tests and never run fixtures against production.

The canonical production domain is **deferred**. Metadata intentionally has no
canonical URL or `metadataBase`; choose the domain before configuring production
auth origins and canonical metadata. Deployment, real authentication/persistence,
browser journeys, Sentry ingestion/source maps, and rollback remain unverified
until credentials, browser tooling, and deployment access are explicitly supplied
and those checks are run.

## 📖 Project Structure

```
job-application-tracker/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Main dashboard page
│   └── sign-in/           # Authentication pages
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── kanban-board.tsx  # Main Kanban component
├── lib/
│   ├── actions/          # Server actions
│   ├── auth/             # Authentication setup
│   ├── hooks/            # Custom React hooks
│   ├── models/           # Mongoose models
│   └── db.ts             # Database connection
└── scripts/              # Utility scripts
    └── seed.ts           # Database seeding
```

## 🎓 Next Steps

After completing this tutorial, consider:

- Adding job application status history
- Implementing search and filtering
- Adding email notifications for status changes
- Creating multiple boards per user
- Adding job application notes/attachments
- Implementing analytics dashboard

## 📄 License

This project is created for educational purposes as part of a YouTube tutorial series.
