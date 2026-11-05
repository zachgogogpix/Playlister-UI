# Emoji Keys API Specification

## Overview

This document outlines the API endpoints and data structures required to support the Emoji Keying Tool feature in Playlister 2.0.

The emoji keying feature allows users to tag videos with emoji-based metadata across three key groups:
- **Genre** (keyed genre, separate from the existing `video.genre` field)
- **Mood**
- **Tags**

## Database Schema Changes

### New Table 1: `key_choices_menu`

This table defines the available emoji key options that appear in the UI.

```sql
CREATE TABLE key_choices_menu (
    id SERIAL PRIMARY KEY,
    key_group VARCHAR(20) NOT NULL,  -- 'genre', 'mood', or 'tags'
    key_value VARCHAR(50) NOT NULL UNIQUE,  -- 'metal', 'happy', 'cinematic'
    emoji VARCHAR(10) NOT NULL,  -- '🤘', '😊', '🎬'
    label VARCHAR(100) NOT NULL,  -- 'Metal', 'Happy', 'Cinematic'
    display_order INTEGER NOT NULL DEFAULT 0,  -- For ordering in UI
    is_active BOOLEAN DEFAULT true,  -- Can disable without deleting
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(key_group, key_value)
);

CREATE INDEX idx_key_choices_menu_group ON key_choices_menu(key_group);
CREATE INDEX idx_key_choices_menu_active ON key_choices_menu(is_active);
```

**Purpose:**
- Single source of truth for all emoji key options
- Used by the UI to display available choices
- Used by video filtering/search to validate keys
- Allows adding/removing emoji options without code changes

### New Table 2: `video_emoji_keys`

This table stores the actual emoji keys assigned to each video.

```sql
CREATE TABLE video_emoji_keys (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    key_group VARCHAR(20) NOT NULL,  -- 'genre', 'mood', or 'tags'
    key_value VARCHAR(50) NOT NULL,  -- e.g., 'metal', 'happy', 'cinematic'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(video_id, key_group, key_value),
    FOREIGN KEY (key_value) REFERENCES key_choices_menu(key_value)
);

CREATE INDEX idx_video_emoji_keys_video_id ON video_emoji_keys(video_id);
CREATE INDEX idx_video_emoji_keys_key_group ON video_emoji_keys(key_group);
CREATE INDEX idx_video_emoji_keys_key_value ON video_emoji_keys(key_value);
```

### Notes:
- The `video.genre` field should remain unchanged and continue to store the original/overall genre
- The new emoji keys are stored separately in the `video_emoji_keys` table
- Multiple keys can be associated with a video for each key group
- The `key_value` column stores the string value (e.g., 'metal', 'happy') not the emoji itself
- Foreign key to `key_choices_menu` ensures only valid keys can be assigned

## API Endpoints

### 1. GET /api/emoji-keys/definitions

Fetch all available emoji key options. This is used by the frontend to populate the emoji selection interface.

**Request:**
```
GET /api/emoji-keys/definitions
```

**Response (200 OK):**
```json
{
  "genre": [
    {"value": "alternative", "emoji": "🎸", "label": "Alternative"},
    {"value": "indie", "emoji": "🚴", "label": "Indie"},
    {"value": "folk", "emoji": "🌻", "label": "Folk"},
    {"value": "rnb_soul", "emoji": "❤️‍🔥", "label": "R&B / Soul"},
    {"value": "hip_hop_rap", "emoji": "🎙", "label": "Hip Hop / Rap"},
    {"value": "electronic_dance", "emoji": "🎛️", "label": "Electronic / Dance"},
    {"value": "pop", "emoji": "💋", "label": "Pop"},
    {"value": "psych", "emoji": "😵‍💫", "label": "Psych"},
    {"value": "punk_rock", "emoji": "🏴", "label": "Punk Rock"},
    {"value": "metal", "emoji": "🤘", "label": "Metal"},
    {"value": "country", "emoji": "🤠", "label": "Country"},
    {"value": "jazz", "emoji": "🎷", "label": "Jazz"},
    {"value": "classical", "emoji": "🎻", "label": "Classical"}
  ],
  "mood": [
    {"value": "energized", "emoji": "⚡", "label": "Energized"},
    {"value": "celebrating", "emoji": "🙌", "label": "Celebrating"},
    {"value": "focused", "emoji": "⏳", "label": "Focused"},
    {"value": "happy", "emoji": "😀", "label": "Happy"},
    {"value": "chillin", "emoji": "😎", "label": "Chillin"},
    {"value": "romantic", "emoji": "🥰", "label": "Romantic"},
    {"value": "mellow", "emoji": "🍄", "label": "Mellow"},
    {"value": "meditation", "emoji": "🧘🏽‍♂️", "label": "Meditation"},
    {"value": "sad", "emoji": "😓", "label": "Sad"},
    {"value": "drab", "emoji": "🥀", "label": "Drab"},
    {"value": "mad", "emoji": "😡", "label": "Mad"},
    {"value": "blown_away", "emoji": "🤯", "label": "Blown Away"},
    {"value": "rebellious", "emoji": "😈", "label": "Rebellious"},
    {"value": "inspired", "emoji": "💡", "label": "Inspired"},
    {"value": "heartbroken", "emoji": "❤️‍🩹", "label": "Heartbroken"}
  ],
  "tags": [
    {"value": "wildcard", "emoji": "🃏", "label": "Wildcard "},
    {"value": "turn_ups", "emoji": "🔥", "label": "Turn Ups"},
    {"value": "gamer-friendly", "emoji": "🎮", "label": "Gamer Friendly"},
    {"value": "surreal", "emoji": "🪐", "label": "surreal"},
    {"value": "shiny_new_pop", "emoji": "💎", "label": "Shiny, New Pop"},
    {"value": "workout", "emoji": "💪", "label": "Workout"},
    {"value": "dope", "emoji": "💯", "label": "Dope"},
    {"value": "spiritual", "emoji": "🕉️", "label": "Spiritual"},
    {"value": "hey_girl", "emoji": "🍒", "label": "Hey Girl!"},
    {"value": "sunny_day", "emoji": "🌞", "label": "Sunny Day"},
    {"value": "fourtwenty_friendly", "emoji": "💨", "label": "420 Friendly"},
    {"value": "christian", "emoji": "✝️", "label": "Christian"},
    {"value": "farm_and_field", "emoji": "🌾", "label": "Farm and Field"},
    {"value": "manly", "emoji": "🪓", "label": "Manly"},
    {"value": "late_night", "emoji": "🌙", "label": "Late Night"}
  ]
}
```

**Implementation Notes:**
- Query `key_choices_menu` table WHERE `is_active = true`
- Order by `display_order` ASC within each key_group
- Group results by `key_group`
- This endpoint should be cached aggressively (data rarely changes)

**SQL Query Example:**
```sql
SELECT key_group, key_value, emoji, label
FROM key_choices_menu
WHERE is_active = true
ORDER BY key_group, display_order;
```

### 2. GET /api/videos/:videoId/emoji-keys

Fetch all emoji keys for a specific video.

**Request:**
```
GET /api/videos/12345/emoji-keys
```

**Response (200 OK):**
```json
{
  "genre": ["metal", "electronic_dance"],
  "mood": ["energized", "drab"],
  "tags": ["workout", "turn_ups"]
}
```

**Response (404 Not Found):**
```json
{
  "error": "Video not found"
}
```

**Notes:**
- Returns empty arrays for key groups with no selections
- If the video has no emoji keys at all, still return the structure with empty arrays

### 3. PATCH /api/videos/:videoId/emoji-keys

Update emoji keys for a specific video. This endpoint performs a **partial update** - only the key groups included in the request body will be updated.

**Request:**
```
PATCH /api/videos/12345/emoji-keys
Content-Type: application/json

{
  "genre": ["metal", "punk_rock"],
  "mood": ["energized"]
}
```

**Response (200 OK):**
```json
{
  "genre": ["metal", "punk_rock"],
  "mood": ["energized"],
  "tags": ["workout", "turn_ups"]
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Invalid key group or value"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Video not found"
}
```

**Implementation Notes:**
- For each key group in the request:
  1. Delete all existing keys for that key group and video_id
  2. Insert new keys from the array
- Key groups not included in the request should remain unchanged
- Empty arrays are valid and should delete all keys for that group
- Return the complete updated emoji keys object

**Validation:**
- `key_group` must be one of: `genre`, `mood`, `tags`
- `key_value` must exist in `key_choices_menu` table with `is_active = true`
- Maximum of 10 keys per group (to prevent abuse)

**Validation SQL:**
```sql
SELECT COUNT(*) FROM key_choices_menu
WHERE key_value = ? AND is_active = true;
-- Should return 1 for valid keys
```

## Implementation Checklist

### Database Setup
- [ ] Create `key_choices_menu` table with proper indexes
- [ ] Seed `key_choices_menu` with initial emoji options (see seed data below)
- [ ] Create `video_emoji_keys` table with proper indexes and foreign keys
- [ ] Verify CASCADE DELETE on video_id and key_value foreign keys

### API Endpoints
- [ ] Implement GET `/api/emoji-keys/definitions` endpoint
- [ ] Implement GET `/api/videos/:videoId/emoji-keys` endpoint
- [ ] Implement PATCH `/api/videos/:videoId/emoji-keys` endpoint

### Validation & Error Handling
- [ ] Validate key_group values (must be: genre, mood, or tags)
- [ ] Validate key_value against `key_choices_menu` table
- [ ] Add proper error handling (404 for missing videos, 400 for invalid data)
- [ ] Enforce maximum 10 keys per group
- [ ] Handle inactive keys gracefully (is_active = false)

### Testing
- [ ] Test fetching emoji definitions
- [ ] Test partial updates (updating only one key group)
- [ ] Test deleting keys (passing empty arrays)
- [ ] Test multiple keys per group
- [ ] Test with invalid key_value (should reject)
- [ ] Test with inactive key_value (should reject)

## Testing Examples

### Test Case 1: Initial Empty State
```bash
GET /api/videos/123/emoji-keys
# Expected: {"genre": [], "mood": [], "tags": []}
```

### Test Case 2: Add Genre Keys
```bash
PATCH /api/videos/123/emoji-keys
Body: {"genre": ["metal", "electronic_dance"]}
# Expected: {"genre": ["metal", "electronic_dance"], "mood": [], "tags": []}
```

### Test Case 3: Add Mood Keys (Partial Update)
```bash
PATCH /api/videos/123/emoji-keys
Body: {"mood": ["energized", "drab"]}
# Expected: {"genre": ["metal", "electronic_dance"], "mood": ["energized", "drab"], "tags": []}
```

### Test Case 4: Update Genre (Replace)
```bash
PATCH /api/videos/123/emoji-keys
Body: {"genre": ["punk_rock"]}
# Expected: {"genre": ["punk_rock"], "mood": ["energized", "drab"], "tags": []}
```

### Test Case 5: Clear Mood Keys
```bash
PATCH /api/videos/123/emoji-keys
Body: {"mood": []}
# Expected: {"genre": ["punk_rock"], "mood": [], "tags": []}
```

## Seed Data for key_choices_menu

> Synced from the live API (`GET /api/emoji-keys/definitions`) on 2026-11-05 as a backup of the production `key_choices_menu` table. `display_order` reflects the order returned by the API.

```sql
INSERT INTO key_choices_menu (key_group, key_value, emoji, label, display_order) VALUES
-- Genre
('genre', 'alternative', '🎸', 'Alternative', 1),
('genre', 'indie', '🚴', 'Indie', 2),
('genre', 'folk', '🌻', 'Folk', 3),
('genre', 'rnb_soul', '❤️‍🔥', 'R&B / Soul', 4),
('genre', 'hip_hop_rap', '🎙', 'Hip Hop / Rap', 5),
('genre', 'electronic_dance', '🎛️', 'Electronic / Dance', 6),
('genre', 'pop', '💋', 'Pop', 7),
('genre', 'psych', '😵‍💫', 'Psych', 8),
('genre', 'punk_rock', '🏴', 'Punk Rock', 9),
('genre', 'metal', '🤘', 'Metal', 10),
('genre', 'country', '🤠', 'Country', 11),
('genre', 'jazz', '🎷', 'Jazz', 12),
('genre', 'classical', '🎻', 'Classical', 13),

-- Mood
('mood', 'energized', '⚡', 'Energized', 1),
('mood', 'celebrating', '🙌', 'Celebrating', 2),
('mood', 'focused', '⏳', 'Focused', 3),
('mood', 'happy', '😀', 'Happy', 4),
('mood', 'chillin', '😎', 'Chillin', 5),
('mood', 'romantic', '🥰', 'Romantic', 6),
('mood', 'mellow', '🍄', 'Mellow', 7),
('mood', 'meditation', '🧘🏽‍♂️', 'Meditation', 8),
('mood', 'sad', '😓', 'Sad', 9),
('mood', 'drab', '🥀', 'Drab', 10),
('mood', 'mad', '😡', 'Mad', 11),
('mood', 'blown_away', '🤯', 'Blown Away', 12),
('mood', 'rebellious', '😈', 'Rebellious', 13),
('mood', 'inspired', '💡', 'Inspired', 14),
('mood', 'heartbroken', '❤️‍🩹', 'Heartbroken', 15),

-- Tags
('tags', 'wildcard', '🃏', 'Wildcard ', 1),
('tags', 'turn_ups', '🔥', 'Turn Ups', 2),
('tags', 'gamer-friendly', '🎮', 'Gamer Friendly', 3),
('tags', 'surreal', '🪐', 'surreal', 4),
('tags', 'shiny_new_pop', '💎', 'Shiny, New Pop', 5),
('tags', 'workout', '💪', 'Workout', 6),
('tags', 'dope', '💯', 'Dope', 7),
('tags', 'spiritual', '🕉️', 'Spiritual', 8),
('tags', 'hey_girl', '🍒', 'Hey Girl!', 9),
('tags', 'sunny_day', '🌞', 'Sunny Day', 10),
('tags', 'fourtwenty_friendly', '💨', '420 Friendly', 11),
('tags', 'christian', '✝️', 'Christian', 12),
('tags', 'farm_and_field', '🌾', 'Farm and Field', 13),
('tags', 'manly', '🪓', 'Manly', 14),
('tags', 'late_night', '🌙', 'Late Night', 15);
```

## Future Enhancements (Optional)

These are not required for the initial implementation but may be useful:

1. **Bulk Update Endpoint**: Allow updating emoji keys for multiple videos at once
2. **Search/Filter**: Add query parameters to the videos endpoint to filter by emoji keys
3. **Analytics**: Track which emoji keys are most commonly used
4. **Key Suggestions**: ML-based suggestions for emoji keys based on video metadata
5. **Custom Keys**: Allow users to create custom emoji keys beyond the predefined list
6. **Admin UI**: Build an interface to manage `key_choices_menu` (add/edit/disable options)
