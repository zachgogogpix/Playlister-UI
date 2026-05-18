# Playlister UI - Technical Documentation

## Overview

Playlister is a web-based video content management and playlist curation application built for Vibe Stream. It provides an intuitive interface for browsing, searching, organizing, and managing video content with support for HLS video streaming, clip editing, and playlist management.

**Version:** 0.3
**Tech Stack:** Vanilla JavaScript (ES6+), Vite, HLS.js, Sortable.js
**Architecture:** Single Page Application (SPA) with tab-based navigation

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Core Features](#core-features)
4. [API Layer](#api-layer)
5. [Component Documentation](#component-documentation)
6. [Data Flow](#data-flow)
7. [UI/UX Patterns](#uiux-patterns)
8. [Development Guide](#development-guide)

---

## Architecture Overview

### Technology Stack

- **Build Tool:** Vite 5.2+ — Modern build tool with fast HMR
- **Module System:** ES6 Modules — Native browser module support
- **Video Streaming:** HLS.js 1.5+ — Adaptive HTTP Live Streaming playback
- **Drag & Drop:** Sortable.js 1.15+ — Reorderable playlist items
- **HTTP Client:** Fetch API — Native browser fetch with custom wrapper
- **Event Streaming:** EventSource — Server-Sent Events for clip generation

### Application Structure

The application follows a component-based architecture with:
- **Single entry point** (`main.js`) that initializes the tab system
- **API client layer** (`api.js`) that abstracts all backend communication
- **Component modules** that encapsulate specific UI features
- **Global modal system** for overlays and popups
- **State management** via module-scoped state objects

### Key Design Patterns

1. **Component Modules:** Each component exports functions that render and manage their own DOM
2. **Event Delegation:** Click handlers attached after DOM rendering
3. **Modal System:** Centralized backdrop and container for all modals
4. **Callback Pattern:** Parent components pass callbacks to child components for state updates
5. **Optimistic UI:** Immediate UI updates with error rollback on API failures

---

## Project Structure

```
Playlister-UI/
├── index.html              # Main HTML entry point
├── package.json            # Project dependencies and scripts
├── vite.config.js          # Vite configuration
├── public/                 # Static assets
│   └── favicon.png
└── src/
    ├── main.js             # Application entry point
    ├── api.js              # API client layer
    ├── styles/             # CSS files
    │   └── main.css
    └── components/         # Feature components
        ├── videoList.js         # Video browsing and table
        ├── videoPlayer.js       # HLS video player modal
        ├── clipEditor.js        # Clip time editor and generator
        ├── playlists.js         # Playlist grid view
        ├── playlistDetail.js    # Playlist detail/edit view
        ├── filters.js           # Video search filters
        ├── imageViewer.js       # Image/artwork modal
        ├── addToPlaylist.js     # Add video to playlist modal
        └── toast.js             # Toast notification system
```

---

## Core Features

### 1. Video Management
- Browse paginated video library (100 videos per page)
- Advanced filtering by artist, title, label, partner, release date, and ID
- Real-time search with debounced input (400ms)
- View video metadata including artist, title, label, partner, release date
- Click any row to play video in modal player

### 2. Video Player
- HLS video streaming with adaptive bitrate
- Full browser controls (play, pause, seek, volume, fullscreen)
- Thumbnail preview with fade-out animation on playback start
- Autoplay on modal open
- Supports both HLS.js (modern browsers) and native HLS (Safari)

### 3. Clip Editor
- Edit clip start/end times with MM:SS.ms format
- Real-time duration calculation
- Server-side clip generation with EventSource progress tracking
- Download generated clips directly from browser
- Two-stage workflow: save times → download clip

### 4. Playlist Management
- Grid view with artwork, name, video count, and last updated date
- Create playlists with custom artwork (recommended: 1600×900px)
- Search/filter playlists by name
- Inline title editing (click to edit, blur to save)
- Update playlist artwork
- Archive playlists (soft delete)

### 5. Playlist Detail View
- Drag-and-drop video reordering with visual feedback
- Filter videos in playlist by title/artist
- Remove videos from playlist
- Play videos directly from playlist
- Add videos via multi-field search (artist, title, label)
- Deduplicated search results across all search fields
- Visual indicators for videos already in playlist

### 6. Image Viewer
- View video thumbnails and album artwork side-by-side
- Display external link-out URLs
- Lazy loading for performance

### 7. Add to Playlist
- Quick-add modal showing all available playlists
- Visual indication of playlists already containing the video
- Parallel API requests for optimal load time
- Prevent duplicate additions

---

## API Layer

### File: `src/api.js`

The API layer provides a clean abstraction over the backend REST API with automatic error handling and JSON serialization.

#### Core Request Function

```javascript
async function req(method, path, body, isForm = false)
```

**Purpose:** Generic HTTP request wrapper with error handling

**Parameters:**
- `method` (string): HTTP method (GET, POST, PATCH, DELETE)
- `path` (string): API endpoint path (relative to `/api`)
- `body` (object|FormData): Request body
- `isForm` (boolean): If true, sends FormData; if false, sends JSON

**Returns:** Promise resolving to parsed JSON response, or `null` for 204 No Content

**Error Handling:** Throws Error with `${statusCode}: ${errorMessage}` format

**Features:**
- Automatic JSON stringification for non-form requests
- Content-Type header management
- Error text extraction with fallback to statusText
- 204 No Content handling

---

### Video Endpoints

#### `fetchVideos(params = {})`
**Purpose:** Fetch paginated, filtered video list

**Parameters:**
- `params` (object): Query parameters
  - `artist` (string): Filter by artist name
  - `title` (string): Filter by video title
  - `record_label` (string): Filter by record label
  - `partner_account` (string): Filter by partner
  - `video_id` (string): Filter by specific video ID/UUID
  - `date_op` (string): Date comparison operator (`eq`, `gt`, `lt`)
  - `date_val` (string): Date value (YYYY-MM-DD)
  - `page` (number): Page number (1-indexed)
  - `limit` (number): Results per page

**Returns:**
```javascript
{
  videos: Array<Video>,
  total: number,
  pages: number
}
```

**Implementation Notes:**
- Empty/null/undefined parameters are automatically filtered out
- Query string constructed via URLSearchParams

#### `fetchPartners()`
**Purpose:** Get list of all unique partner accounts

**Returns:** `Array<string>` — List of partner account names

**Usage:** Populate partner filter dropdown

#### `updateClipTimes(id, clip_start_ms, clip_end_ms)`
**Purpose:** Update clip start/end times for a video

**Parameters:**
- `id` (number): Video ID
- `clip_start_ms` (number): Clip start time in milliseconds
- `clip_end_ms` (number): Clip end time in milliseconds

**Returns:** Updated video object

#### `updateFlags(id, flags)`
**Purpose:** Update video metadata flags

**Parameters:**
- `id` (number): Video ID
- `flags` (object): Flag key-value pairs to update

**Returns:** Updated video object

---

### Playlist Endpoints

#### `fetchPlaylists()`
**Purpose:** Get all non-archived playlists

**Returns:** `Array<Playlist>`

**Playlist Schema:**
```javascript
{
  id: number,
  name: string,
  image_url: string | null,
  video_count: number,
  updated_at: string (ISO 8601),
  created_at: string (ISO 8601)
}
```

#### `fetchPlaylistsContainingVideo(videoId)`
**Purpose:** Get IDs of all playlists that contain a specific video

**Parameters:**
- `videoId` (number): Video ID to search for

**Returns:** `Array<number>` — Playlist IDs

**Usage:** Display "already in playlist" indicators in add-to-playlist modal

#### `fetchPlaylist(id)`
**Purpose:** Get full playlist details including all videos

**Parameters:**
- `id` (number): Playlist ID

**Returns:**
```javascript
{
  ...Playlist,
  videos: Array<{
    id: number,
    playlist_id: number,
    video_id: number,
    order: number,
    video: Video
  }>
}
```

#### `createPlaylist(formData)`
**Purpose:** Create new playlist with optional artwork

**Parameters:**
- `formData` (FormData):
  - `name` (string): Playlist title (required)
  - `image` (File): Playlist artwork image (optional)

**Returns:** Created playlist object

**Validation:**
- Name is required
- Image should be 1600×900px (warning shown if not)

#### `updatePlaylist(id, formData)`
**Purpose:** Update playlist name and/or artwork

**Parameters:**
- `id` (number): Playlist ID
- `formData` (FormData):
  - `name` (string): New playlist title (optional)
  - `image` (File): New artwork (optional)

**Returns:** Updated playlist object

#### `archivePlaylist(id)`
**Purpose:** Archive (soft delete) a playlist

**Parameters:**
- `id` (number): Playlist ID

**Returns:** Success response

**Note:** Archived playlists are hidden from main views but can be restored by admin

#### `deletePlaylist(id)`
**Purpose:** Permanently delete a playlist

**Parameters:**
- `id` (number): Playlist ID

**Returns:** Success response (204 No Content)

**Warning:** This is a destructive operation

#### `addVideoToPlaylist(playlistId, videoId)`
**Purpose:** Add a video to a playlist

**Parameters:**
- `playlistId` (number): Target playlist ID
- `videoId` (number): Video to add

**Returns:** Created playlist_video object

**Behavior:** Video is added to end of playlist

#### `removeVideoFromPlaylist(playlistId, videoId)`
**Purpose:** Remove a video from a playlist

**Parameters:**
- `playlistId` (number): Source playlist ID
- `videoId` (number): Video to remove

**Returns:** Success response (204 No Content)

#### `reorderPlaylistVideos(playlistId, items)`
**Purpose:** Reorder videos in a playlist after drag-and-drop

**Parameters:**
- `playlistId` (number): Playlist ID
- `items` (Array): New order specification
  ```javascript
  [{
    video_id: number,
    order: number  // 0-indexed position
  }]
  ```

**Returns:** Success response

**Usage:** Called after Sortable.js drag-and-drop events

---

### Clip Endpoints

#### `openClipEventStream(videoId)`
**Purpose:** Open Server-Sent Events connection for clip generation progress

**Parameters:**
- `videoId` (number): Video ID to generate clip for

**Returns:** `EventSource` instance

**Event Types:**
1. **`status`** — Progress update
   ```javascript
   {
     step: string,      // e.g., "1/4", "2/4"
     message: string    // e.g., "Downloading video..."
   }
   ```

2. **`done`** — Generation complete
   ```javascript
   {
     download_url: string,
     filename: string
   }
   ```

3. **`error`** — Generation failed
   ```javascript
   {
     message: string
   }
   ```

**Usage Example:**
```javascript
const es = openClipEventStream(videoId);
es.addEventListener('status', (e) => {
  const { step, message } = JSON.parse(e.data);
  // Update progress UI
});
es.addEventListener('done', (e) => {
  const { download_url } = JSON.parse(e.data);
  // Trigger download
  es.close();
});
es.addEventListener('error', (e) => {
  // Handle error
  es.close();
});
```

---

## Component Documentation

### 1. Main Application (`main.js`)

**Purpose:** Application entry point that initializes the tab navigation system

**Exported Functions:** None (self-executing module)

**Functionality:**
- Caches DOM references to tab panels and buttons
- Sets up click handlers for tab switching
- Initializes video and playlist tabs on page load

**Key Function:**
```javascript
function switchTab(name)
```
- Toggles `.active` class on tab buttons and panels
- Updates URL hash (implicit browser behavior)

**State Management:** Stateless (delegates to child components)

**Dependencies:**
- `renderVideoTab` from `videoList.js`
- `renderPlaylistsTab` from `playlists.js`

---

### 2. Video List (`videoList.js`)

**Purpose:** Main video browsing interface with filtering, pagination, and action buttons

**Module State:**
```javascript
{
  videos: Array<Video>,     // Current page videos
  total: number,            // Total video count
  page: number,             // Current page (1-indexed)
  limit: number,            // Videos per page (100)
  pages: number,            // Total page count
  filters: Object,          // Active filter values
  partners: Array<string>,  // Available partners for filter
  loading: boolean          // Prevent concurrent loads
}
```

**Exported Functions:**

#### `renderVideoTab(container)`
**Purpose:** Initialize and render the video tab

**Parameters:**
- `container` (HTMLElement): Tab panel element

**Behavior:**
1. Renders layout skeleton (filters, status, table, pagination)
2. Fetches partner list for filter dropdown
3. Initializes filter component with callback
4. Loads initial video page

---

**Internal Functions:**

#### `loadVideos(container)`
**Purpose:** Fetch and display videos based on current state

**Features:**
- Loading state management (prevents concurrent requests)
- Status text display: "Loading…" → "X videos · page Y of Z"
- Error handling with user-friendly error display
- Delegates rendering to `renderTable` and `renderPagination`

#### `renderTable(wrap, videos, container)`
**Purpose:** Render video data table with action buttons

**Features:**
- Empty state handling (shows 🎬 icon with message)
- Seven-column table: Actions, Artist, Title, Label, Partner, Release Date, ID
- Four action buttons per row:
  1. **Play (▶️)** — Opens video player
  2. **Images (🖼)** — Opens image viewer
  3. **Clip (✂️)** — Opens clip editor
  4. **Add to Playlist (＋)** — Opens add-to-playlist modal
- **Row click handler:** Opens video player (same as Play button)
- Event propagation management (action buttons stop propagation)
- XSS protection via `esc()` function

**Click Behavior:**
- Clicking row → plays video
- Clicking action button → performs specific action (doesn't trigger row click)

#### `renderPagination(mount, container)`
**Purpose:** Render pagination controls

**Features:**
- Hidden when only 1 page exists
- Previous/Next buttons with disabled state management
- Page info display: "Page X of Y"
- Updates state and triggers reload on button click

#### `esc(s)`
**Purpose:** HTML escape function for XSS protection

**Handles:**
- `null`/`undefined` → `"—"`
- Escapes: `&`, `<`, `>`, `"`

---

### 3. Video Player (`videoPlayer.js`)

**Purpose:** Modal video player with HLS streaming support

**Module State:**
```javascript
let hlsInstance = null;  // Current HLS.js instance
```

**Exported Functions:**

#### `openVideoPlayer(videoUrl, title, thumbnailUrl)`
**Purpose:** Open video player modal with HLS stream

**Parameters:**
- `videoUrl` (string): HLS manifest URL (`.m3u8`)
- `title` (string): Video title for modal header
- `thumbnailUrl` (string): Optional thumbnail for loading state

**Behavior:**
1. Closes any existing player
2. Shows modal backdrop
3. Renders player UI with controls
4. Initializes HLS playback:
   - **Modern browsers:** HLS.js with adaptive bitrate
   - **Safari:** Native HLS support
5. Displays thumbnail overlay that fades out after 800ms
6. Auto-plays video when manifest is loaded
7. Sets up close handlers (X button and backdrop click)

**HLS.js Integration:**
```javascript
if (Hls.isSupported()) {
  hlsInstance = new Hls();
  hlsInstance.loadSource(videoUrl);
  hlsInstance.attachMedia(video);
  hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => video.play());
}
```

**Thumbnail Animation:**
- Thumbnail shows immediately on open
- Fades out after 800ms with CSS transition
- Removed from DOM after 1.9s total (800ms + 1100ms fade)

#### `closeVideoPlayer()`
**Purpose:** Clean up and close video player

**Cleanup Steps:**
1. Destroy HLS.js instance (releases resources)
2. Pause video element
3. Clear video source (stops network requests)
4. Clear modal HTML
5. Hide backdrop

**Resource Management:** Critical for preventing memory leaks with HLS.js instances

---

### 4. Clip Editor (`clipEditor.js`)

**Purpose:** Edit video clip times and generate downloadable clips

**Exported Functions:**

#### `openClipEditor(video, onSaved)`
**Purpose:** Open clip editor modal

**Parameters:**
- `video` (Video): Video object with clip times
- `onSaved` (function): Callback invoked after successful save
  - Receives updated video object: `(updatedVideo) => void`

**Features:**
1. **Time Input Fields:** MM:SS.ms format (e.g., `01:23.456`)
2. **Duration Display:** Real-time calculation in "Xm Ys" format
3. **Save Times Button:** Persists times to database
4. **Download Clip Button:** Triggers server-side clip generation
5. **Progress Tracking:** Server-Sent Events with visual progress steps

**State Machine:**

```
Initial State:
  Save button: hidden
  Download button: enabled

User edits time:
  Save button: visible
  Download button: disabled

After save success:
  Save button: hidden (returns to initial state)
  Download button: enabled

During download:
  Download button: disabled
  Progress steps shown

After download complete:
  Download button: re-enabled
```

**Key Functions:**

#### `startClipGeneration(videoId, container, onDone)`
**Purpose:** Initiate server-side clip generation with progress tracking

**EventSource Events:**
1. **`status`** — Progress update
   - Shows step number and message
   - Updates UI with spinner
2. **`done`** — Generation complete
   - Shows download link
   - Closes EventSource
3. **`error`** — Generation failed
   - Shows error message
   - Closes EventSource

#### `msToTimecode(ms)` / `timecodeToMs(tc)`
**Purpose:** Bidirectional conversion between milliseconds and MM:SS.ms format

**Examples:**
- `msToTimecode(83456)` → `"01:23.456"`
- `timecodeToMs("01:23.456")` → `83456`

**Fallback:** Invalid timecode format falls back to `parseInt(tc)`

#### `formatDur(ms)`
**Purpose:** Human-readable duration formatting

**Example:** `formatDur(123000)` → `"2m 3s"`

---

### 5. Playlists Grid (`playlists.js`)

**Purpose:** Main playlist browsing interface with grid layout

**Module State:**
```javascript
let playlistsContainer = null;  // Reference to tab container
let currentView = 'grid';       // 'grid' | 'detail'
```

**Exported Functions:**

#### `renderPlaylistsTab(container)`
**Purpose:** Initialize playlist tab (entry point)

**Behavior:**
- Caches container reference for navigation
- Delegates to `showGrid()`

---

**Internal Functions:**

#### `showGrid(container)`
**Purpose:** Render playlist grid view

**Layout:**
- **Toolbar:** Title + "New Playlist" button
- **Search Bar:** Filter playlists by name (real-time)
- **Grid:** Card layout with artwork, name, video count, last updated

**Features:**
- Loads all playlists on mount
- Client-side filtering (no server round-trip)
- Empty state handling with friendly message
- Lazy-loaded images for performance

#### `loadGrid(container)`
**Purpose:** Fetch and render playlist cards

**Filtering Logic:**
```javascript
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = q
    ? allPlaylists.filter(pl => pl.name.toLowerCase().includes(q))
    : allPlaylists;
  renderCards(filtered);
});
```

**Card Click Behavior:**
- Navigates to playlist detail view
- Passes back callback to return to grid

#### `openNewPlaylistModal(container)`
**Purpose:** Show modal for creating new playlist

**Form Fields:**
1. **Title** (required) — Text input with autofocus
2. **Artwork** (optional) — File input with dimension validation

**Artwork Validation:**
- Recommended size: 1600×900px
- Shows warning if dimensions don't match
- Uses `Image` preload to get dimensions
- Warning is informational only (doesn't block submission)

**Submission Flow:**
1. Validate title is not empty
2. Construct FormData with name and optional image
3. Disable button and show "Creating…" text
4. Call API
5. Show success toast
6. Reload grid
7. Close modal

**Error Handling:**
- Re-enables button on error
- Shows error toast with message

---

### 6. Playlist Detail (`playlistDetail.js`)

**Purpose:** Detailed playlist view with video management and reordering

**Exported Functions:**

#### `renderPlaylistDetail(container, playlistId, onBack)`
**Purpose:** Render detailed playlist editor

**Parameters:**
- `container` (HTMLElement): Container to render into
- `playlistId` (number): Playlist to display
- `onBack` (function): Callback for back button

**Features:**
1. **Inline Title Editing:** Click title to edit, blur to save
2. **Artwork Upload:** File picker with instant update
3. **Archive Button:** Soft-delete with confirmation dialog
4. **Video List:** Current playlist videos with drag-to-reorder
5. **Video Search:** Add videos by searching artist/title/label
6. **Filter Playlist:** Client-side filter of playlist videos

**Layout:**
- **Left Section:** Playlist videos with filter
- **Right Section:** Video search and add interface

---

**Key Functions:**

#### `renderPlaylistVideos(container, playlist, existingIds)`
**Purpose:** Render list of videos in playlist with drag-and-drop

**Features:**
- Order number display (1, 2, 3...)
- Thumbnail with lazy loading
- Title and artist display
- Play and Remove buttons
- Drag handles for reordering

**Sortable.js Integration:**
```javascript
Sortable.create(list, {
  animation: 150,
  ghostClass: 'sortable-ghost',
  chosenClass: 'sortable-chosen',
  onEnd: async () => {
    // Extract new order
    const items = [...list.querySelectorAll('.pl-video-item')]
      .map((el, i) => ({
        video_id: parseInt(el.dataset.videoId),
        order: i,
      }));

    // Update display immediately
    list.querySelectorAll('.pl-video-order')
      .forEach((el, i) => { el.textContent = i + 1; });

    // Persist to server
    await reorderPlaylistVideos(playlist.id, items);
  },
});
```

**Remove Video Flow:**
1. Confirm action (implicit via button click)
2. Call API to remove
3. Update local playlist state
4. Re-render video list
5. Update video count in header
6. Show success toast

#### `setupVideoSelector(container, playlist, existingIds)`
**Purpose:** Initialize video search interface for adding videos

**Features:**
- Debounced search input (350ms)
- Multi-field parallel search (artist, title, label)
- Result deduplication
- "Already in playlist" indicators

**Search Implementation:**
```javascript
debounce = setTimeout(() => {
  // Parallel search across three fields
  const [artistResults, titleResults, labelResults] = await Promise.all([
    fetchVideos({ artist: query, limit: 40 }),
    fetchVideos({ title: query, limit: 40 }),
    fetchVideos({ record_label: query, limit: 40 }),
  ]);

  // Deduplicate by video ID
  const seen = new Set();
  const videos = [...artistResults.videos, ...titleResults.videos, ...labelResults.videos]
    .filter(v => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
}, 350);
```

**Add Video Flow:**
1. Click "Add" button
2. Disable button and show "…" loading state
3. Call API to add video
4. Add to local state and `existingIds` set
5. Re-render playlist videos
6. Update count
7. Change button to "✓ Added" and disable
8. Show success toast

**Why Multi-Field Search?**
Users may not know whether their search term is an artist name, song title, or label name. Searching all three simultaneously provides a better UX without requiring the user to specify.

---

### 7. Filters (`filters.js`)

**Purpose:** Video filtering interface with multiple search criteria

**Exported Functions:**

#### `renderFilters(container, partners, currentFilters, onChange)`
**Purpose:** Render filter bar with all search fields

**Parameters:**
- `container` (HTMLElement): Where to render filters
- `partners` (Array<string>): Partner options for dropdown
- `currentFilters` (Object): Initial filter values
- `onChange` (function): Callback when filters change
  - Receives new filter object: `(filters) => void`

**Filter Fields:**
1. **Artist** — Text input with live search
2. **Title** — Text input with live search
3. **Record Label** — Text input with live search
4. **Partner** — Dropdown (all/specific partner)
5. **Release Date** — Operator (Any/=/After/Before) + Date picker
6. **ID** — Text input for exact ID/UUID match

**Buttons:**
- **Apply** — Manually trigger filter (redundant due to live search)
- **Reset** — Clear all filters and reload

**Live Search:**
- Text inputs have 400ms debounce
- Automatically calls `onChange` after debounce period
- Provides responsive search without excessive API calls

**Reset Behavior:**
```javascript
container.querySelectorAll('input').forEach(i => i.value = '');
container.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
onChange({});  // Empty filters = show all
```

**Filter Object Structure:**
```javascript
{
  artist: string,
  title: string,
  record_label: string,
  video_id: string,
  partner_account: string,
  date_op: 'eq' | 'gt' | 'lt' | '',
  date_val: string  // YYYY-MM-DD
}
```

---

### 8. Image Viewer (`imageViewer.js`)

**Purpose:** Display video thumbnails, album artwork, and link-out URLs

**Exported Functions:**

#### `openImageViewer(thumbnailUrl, albumArtUrl, title, linkOut)`
**Purpose:** Open image viewer modal

**Parameters:**
- `thumbnailUrl` (string): Video thumbnail URL
- `albumArtUrl` (string): Album artwork URL
- `title` (string): Display title
- `linkOut` (string): External link URL

**Layout:**
- Two side-by-side image cards
  - Card 1: Video Thumbnail
  - Card 2: Album Artwork
- Link-out section below images

**Image Handling:**
- Lazy loading (`loading="lazy"`)
- Placeholder shown if URL is null/empty
- Images rendered in figure-like cards with labels

**Link-Out Display:**
- If present: Clickable link with `target="_blank"` and `rel="noopener noreferrer"`
- If absent: Shows "—" dash

#### `closeImageViewer()`
**Purpose:** Close modal and clean up

**Usage:** Called by close button and backdrop click

---

### 9. Add to Playlist (`addToPlaylist.js`)

**Purpose:** Quick-add modal for adding a video to one or more playlists

**Exported Functions:**

#### `openAddToPlaylistModal(video)`
**Purpose:** Show modal with all playlists and add buttons

**Parameters:**
- `video` (Video): Video to be added

**Loading Strategy:**
```javascript
const [playlists, containingIds] = await Promise.all([
  fetchPlaylists(),
  fetchPlaylistsContainingVideo(video.id),
]);
```

**Why Parallel Requests?**
- Reduces total load time by ~50% compared to sequential
- Both requests are independent and can run concurrently
- UI shows loading state until both complete

**UI Elements:**
- **Video Info:** Thumbnail + title + artist at top
- **Playlist List:** Scrollable list of all playlists
- **Playlist Row:** Artwork + name + video count + Add button

**Button States:**
- **Not in playlist:** `"+ Add"` button enabled
- **Already in playlist:** `"✓ In list"` button disabled with reduced opacity
- **Adding (loading):** `"…"` button disabled
- **After add:** `"✓ Added"` button disabled with reduced opacity

**Add Flow:**
1. Click "+ Add" button
2. Button disabled with "…" text
3. API call to add video
4. Update local state (`alreadyIn` Set)
5. Change button to "✓ Added"
6. Show success toast with playlist name

**Empty State:**
- Shows "No playlists yet" message if no playlists exist
- Prompts user to create a playlist first

---

### 10. Toast Notifications (`toast.js`)

**Purpose:** Transient notification system for user feedback

**Module State:**
```javascript
let toastContainer = null;  // Singleton container
```

**Exported Functions:**

#### `showToast(message, type = 'success', duration = 3000)`
**Purpose:** Display temporary notification

**Parameters:**
- `message` (string): Notification text
- `type` (string): Toast style (`'success'` | `'error'` | `'warning'`)
- `duration` (number): Display time in milliseconds

**Behavior:**
1. Lazy-creates toast container on first use
2. Creates toast element with message and type class
3. Appends to container (bottom-right of viewport)
4. Auto-removes after duration

**Container Singleton:**
```javascript
function getContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}
```

**Why Singleton?**
- Multiple toasts stack vertically
- Container positioned with CSS (fixed, bottom-right)
- Avoids creating duplicate containers

**Usage Examples:**
```javascript
showToast('Playlist created!', 'success');
showToast('Failed to load videos', 'error', 5000);
showToast('Image dimensions should be 1600×900', 'warning');
```

**CSS Requirements:**
- `.toast-container` — Fixed positioning
- `.toast` — Base toast styling
- `.toast-success`, `.toast-error`, `.toast-warning` — Type-specific colors

---

## Data Flow

### Video Browsing Flow

```
User Action → Filter Change
  ↓
filterComponent.onChange(newFilters)
  ↓
videoList.state.filters = newFilters
videoList.state.page = 1
  ↓
loadVideos()
  ↓
api.fetchVideos({...filters, page, limit})
  ↓
renderTable(videos)
  ↓
User sees updated results
```

### Playlist Reorder Flow

```
User drags video to new position
  ↓
Sortable.js onEnd event
  ↓
Extract new order from DOM
Update order numbers immediately (optimistic UI)
  ↓
api.reorderPlaylistVideos(playlistId, items)
  ↓
Update local playlist.videos array
  ↓
(If error: show toast, no rollback — user can try again)
```

### Clip Generation Flow

```
User clicks "Download Clip"
  ↓
openClipEventStream(videoId)
  ↓
Server processes video (4 steps typical):
  1. Downloading video
  2. Processing clip
  3. Encoding
  4. Uploading to CDN
  ↓
Each step sends 'status' event
  → UI shows progress with spinner
  ↓
'done' event received
  → Display download link
  → Close EventSource
  ↓
User clicks download link
  → Browser downloads file
```

### Add Video to Playlist Flow

```
User types in search box
  ↓
350ms debounce timer
  ↓
3 parallel API requests:
  - fetchVideos({artist: query})
  - fetchVideos({title: query})
  - fetchVideos({record_label: query})
  ↓
Deduplicate results by video ID
  ↓
Render search results
Mark videos already in playlist
  ↓
User clicks "+ Add" button
  ↓
api.addVideoToPlaylist(playlistId, videoId)
  ↓
Update local state
Re-render playlist videos
Update count
Show toast
```

---

## UI/UX Patterns

### Modal System

**Architecture:**
- Global backdrop element (`#modal-backdrop`)
- Global container element (`#modal-container`)
- CSS classes: `.modal`, `.modal-header`, `.modal-body`

**Open Pattern:**
```javascript
const backdrop = document.getElementById('modal-backdrop');
const container = document.getElementById('modal-container');

backdrop.classList.remove('hidden');
container.innerHTML = `<div class="modal">...</div>`;

// Close handlers
closeBtn.addEventListener('click', closeModal);
backdrop.addEventListener('click', closeModal, { once: true });
```

**Close Pattern:**
```javascript
function closeModal() {
  container.innerHTML = '';
  backdrop.classList.add('hidden');
}
```

**Why Global Backdrop/Container?**
- Single source of truth for modal state
- Prevents multiple overlapping modals
- Simplifies z-index management
- Easy to style consistently

### Optimistic UI Updates

**Pattern:** Update UI immediately, then sync to server

**Example (Video Removal):**
```javascript
// Update UI first
playlist.videos = playlist.videos.filter(v => v.id !== removedId);
renderPlaylistVideos();

// Then sync to server
await removeVideoFromPlaylist(playlistId, videoId);

// If error: rollback or show error
```

**Benefits:**
- Feels instant to users
- Reduces perceived latency
- Better UX for fast interactions

**Drawbacks:**
- Requires rollback logic on error (or re-fetch)
- Can show stale state if network is down

### Debounced Search

**Pattern:** Delay search execution until user stops typing

```javascript
let debounce;
input.addEventListener('input', () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    performSearch(input.value);
  }, 350);  // 350-400ms typical
});
```

**Benefits:**
- Reduces API calls (e.g., 10 keystrokes = 1 request instead of 10)
- Better server resource usage
- Avoids "jumpy" UI from rapid result changes

### Lazy Loading

**Pattern:** Load images only when in viewport

```html
<img src="..." loading="lazy" />
```

**Benefits:**
- Faster initial page load
- Reduced bandwidth for users who don't scroll
- Browser-native support (no library needed)

### Error Handling

**Pattern:** User-friendly error messages with toast notifications

```javascript
try {
  await api.fetchVideos();
} catch (e) {
  showToast(`Failed: ${e.message}`, 'error');
}
```

**Best Practices:**
- Always show error to user (never silent failures)
- Include context (what action failed)
- Suggest next steps when possible

---

## Development Guide

### Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Development Server:**
   ```bash
   npm run dev
   ```
   - Starts Vite dev server on `http://localhost:5173`
   - Hot Module Replacement (HMR) enabled

3. **Build for Production:**
   ```bash
   npm run build
   ```
   - Outputs to `dist/` directory
   - Minified and optimized

4. **Preview Production Build:**
   ```bash
   npm run preview
   ```

### Code Conventions

**File Organization:**
- One component per file
- Export public functions only
- Keep internal functions private (don't export)
- Use descriptive function names

**Naming Conventions:**
- `camelCase` for functions and variables
- `PascalCase` for classes (none currently used)
- `kebab-case` for CSS classes and file names
- `UPPER_SNAKE_CASE` for constants

**HTML String Templates:**
- Use template literals for multi-line HTML
- Escape all user-provided content via `esc()` function
- Keep templates close to rendering logic

**Event Handlers:**
- Attach after DOM insertion
- Use `addEventListener`, not inline attributes
- Clean up listeners when removing elements (or accept memory leak for modals)

**Error Handling:**
- Always `try/catch` async API calls
- Show user-friendly error messages
- Log errors to console for debugging

### Adding a New Component

1. Create file in `src/components/`
2. Export main rendering function
3. Import in parent component
4. Call rendering function with container element

**Template:**
```javascript
// src/components/myFeature.js

export function renderMyFeature(container, data, onChange) {
  container.innerHTML = `
    <div class="my-feature">
      <!-- Your HTML -->
    </div>
  `;

  // Attach event handlers
  container.querySelector('.my-button')
    .addEventListener('click', () => {
      // Handle click
    });
}
```

### Adding a New API Endpoint

1. Add function to `src/api.js`
2. Export the function
3. Document parameters and return type in this doc
4. Use consistent naming: `fetch*`, `create*`, `update*`, `delete*`, `archive*`

**Example:**
```javascript
// api.js
export function fetchSomething(id) {
  return req('GET', `/something/${id}`);
}

// Usage in component
import { fetchSomething } from '../api.js';

const data = await fetchSomething(123);
```

### Debugging Tips

**Network Issues:**
- Open DevTools → Network tab
- Look for failed requests (red)
- Check request/response bodies
- Verify API base URL in `api.js`

**State Issues:**
- Use `console.log(state)` liberally
- Check that callbacks are updating state
- Verify re-renders happen after state changes

**HLS Playback Issues:**
- Check browser console for HLS.js errors
- Verify `.m3u8` URL is valid
- Test URL directly in VLC or browser
- Check CORS headers on video CDN

**Modal Not Closing:**
- Verify close button has event listener
- Check `closeModal()` is actually called
- Look for JavaScript errors in console

### Performance Optimization

**Current Optimizations:**
- Lazy loading images (`loading="lazy"`)
- Debounced search inputs (400ms)
- Pagination (100 items per page)
- Parallel API requests where possible
- HLS.js instance cleanup (prevents memory leaks)

**Future Improvements:**
- Virtual scrolling for large playlists
- Image compression/responsive images
- Service worker for offline support
- IndexedDB caching for playlists

### Browser Support

**Minimum Requirements:**
- ES6 module support
- Fetch API
- EventSource (Server-Sent Events)
- CSS Grid and Flexbox

**Tested Browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**HLS Playback:**
- Chrome/Edge/Firefox: HLS.js (JavaScript)
- Safari: Native HLS support

---

## Appendix

### Video Object Schema

```javascript
{
  id: number,                    // Primary key
  artist: string,                // Artist name
  title: string,                 // Video title
  record_label: string,          // Record label name
  partner_account: string,       // Partner/distributor name
  originalreleasedate: string,   // YYYY-MM-DD format
  video_url: string,             // HLS manifest URL (.m3u8)
  thumbnail_url: string,         // Video thumbnail image
  album_artwork: string,         // Album cover art image
  link_out: string,              // External link (e.g., artist website)
  clip_start_ms: number,         // Clip start time (milliseconds)
  clip_end_ms: number,           // Clip end time (milliseconds)
  // ... other fields
}
```

### Common Patterns

**Escape HTML:**
```javascript
function esc(s) {
  if (s == null) return '—';  // or ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

**Modal Template:**
```javascript
const backdrop = document.getElementById('modal-backdrop');
const container = document.getElementById('modal-container');

backdrop.classList.remove('hidden');
container.innerHTML = `
  <div class="modal">
    <div class="modal-header">
      <h2>Title</h2>
      <button class="modal-close" id="close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <!-- Content -->
    </div>
  </div>
`;

function closeModal() {
  container.innerHTML = '';
  backdrop.classList.add('hidden');
}

container.querySelector('#close-btn').addEventListener('click', closeModal);
backdrop.addEventListener('click', closeModal, { once: true });
```

**API Call with Error Handling:**
```javascript
try {
  const data = await fetchSomething(id);
  // Use data
  showToast('Success!', 'success');
} catch (e) {
  showToast(`Failed: ${e.message}`, 'error');
}
```

---

## Changelog

### v0.3 (Latest)
- Added row click to play video
- Updated column order in video table
- Improved playlist detail UI

### v0.2
- Column reorder in video table
- Clip editor UX improvements
- Thumbnail fix in player
- Archive playlist feature
- Playlist filtering

### v0.1
- Initial release
- Video browsing and filtering
- HLS video player
- Playlist CRUD operations
- Clip editor
- Image viewer

---

## License & Credits

**Project:** Playlister by Vibe Stream
**Version:** 0.3
**Documentation Generated:** 2026-05-18

**Dependencies:**
- [Vite](https://vitejs.dev/) — Build tool
- [HLS.js](https://github.com/video-dev/hls.js/) — Video streaming
- [Sortable.js](https://sortablejs.github.io/Sortable/) — Drag and drop

---

*End of Documentation*
